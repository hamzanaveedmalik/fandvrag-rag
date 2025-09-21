
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import matter from 'gray-matter';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const DATA_DIR = process.env.DATA_DIR || './data'; // point to your bundle dir with catalog.csv, faqs.csv, kb_*.md
const CHUNK_SIZE = 900; // approx chars
const CHUNK_OVERLAP = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + CHUNK_SIZE);
    let slice = text.slice(i, end);
    chunks.push(slice);
    i += (CHUNK_SIZE - CHUNK_OVERLAP);
  }
  return chunks;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function embedWithRetry(text: string, maxRetries = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });
      return emb.data[0].embedding;
    } catch (error: any) {
      if (error.status === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30s
        console.log(`Rate limited. Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}...`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed to get embedding after ${maxRetries} attempts`);
}

async function embedAndUpsert(source: string, logicalPath: string, content: string) {
  const chunks = chunkText(content);
  for (let idx=0; idx<chunks.length; idx++) {
    const c = chunks[idx];
    
    // Add delay between requests to avoid rate limiting
    if (idx > 0) {
      await sleep(100); // 100ms delay between requests
    }
    
    const vec = await embedWithRetry(c);
    const { error } = await supa.from('fv_docs').upsert({
      source,
      path: logicalPath,
      chunk_index: idx,
      content: c,
      metadata: {},
      embedding: vec as any
    }, { onConflict: 'source,path,chunk_index' });
    if (error) throw error;
    console.log(`Upserted ${source}#${logicalPath} [${idx+1}/${chunks.length}]`);
  }
}

function readFileSafe(p: string) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

async function ingestCSV(file: string, source: string) {
  const raw = readFileSafe(file);
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  for (const row of rows) {
    const logical = row.sku || row.name || 'row';
    const content = Object.entries(row).map(([k,v])=>`${k}: ${v}`).join('\n');
    await embedAndUpsert(source, logical, content);
  }
}

async function ingestMD(file: string, source: string) {
  const raw = readFileSafe(file);
  const { content } = matter(raw);
  await embedAndUpsert(source, path.basename(file), content);
}

async function checkIfProcessed(source: string, logicalPath: string): Promise<boolean> {
  const { data, error } = await supa
    .from('fv_docs')
    .select('chunk_index')
    .eq('source', source)
    .eq('path', logicalPath)
    .order('chunk_index', { ascending: true });
  
  if (error) throw error;
  return data && data.length > 0;
}

async function main() {
  const files = fs.readdirSync(DATA_DIR);
  const csvs = files.filter(f=>f.endsWith('.csv'));
  const mds = files.filter(f=>f.endsWith('.md'));

  console.log(`Found ${csvs.length} CSV files and ${mds.length} MD files to process`);

  // Ingest CSVs
  for (const f of csvs) {
    console.log(`\nProcessing CSV: ${f}`);
    await ingestCSV(path.join(DATA_DIR, f), f);
  }

  // Ingest MDs
  for (const f of mds) {
    console.log(`\nProcessing MD: ${f}`);
    await ingestMD(path.join(DATA_DIR, f), f);
  }

  console.log('\nIngest complete.');
}

main().catch(e=>{ console.error(e); process.exit(1); });
