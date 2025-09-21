import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import matter from 'gray-matter';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const DATA_DIR = process.env.DATA_DIR || './data';
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;
const MODEL = 'text-embedding-3-small'; // Cheaper model
const DELAY_MS = 500; // Longer delay between requests

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

async function embedWithRetry(text: string, maxRetries = 5): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const emb = await openai.embeddings.create({
        model: MODEL,
        input: text
      });
      return emb.data[0].embedding;
    } catch (error: any) {
      if (error.status === 429) {
        const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 60000); // Max 60s wait
        console.log(`Rate limited. Waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}...`);
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
  console.log(`Processing ${chunks.length} chunks for ${source}#${logicalPath}`);
  
  for (let idx=0; idx<chunks.length; idx++) {
    const c = chunks[idx];
    
    // Add delay between requests
    if (idx > 0) {
      await sleep(DELAY_MS);
    }
    
    console.log(`Processing chunk ${idx+1}/${chunks.length}...`);
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
    console.log(`✓ Upserted ${source}#${logicalPath} [${idx+1}/${chunks.length}]`);
  }
}

function readFileSafe(p: string) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

async function ingestCSV(file: string, source: string) {
  const raw = readFileSafe(file);
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  console.log(`Processing ${rows.length} rows from ${source}`);
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const logical = row.sku || row.name || `row_${i}`;
    const content = Object.entries(row).map(([k,v])=>`${k}: ${v}`).join('\n');
    await embedAndUpsert(source, logical, content);
  }
}

async function ingestMD(file: string, source: string) {
  const raw = readFileSafe(file);
  const { content } = matter(raw);
  await embedAndUpsert(source, path.basename(file), content);
}

async function main() {
  console.log(`🚀 Starting ingest with ${MODEL} model`);
  console.log(`⏱️  Delay between requests: ${DELAY_MS}ms`);
  
  const files = fs.readdirSync(DATA_DIR);
  const csvs = files.filter(f=>f.endsWith('.csv'));
  const mds = files.filter(f=>f.endsWith('.md'));

  console.log(`Found ${csvs.length} CSV files and ${mds.length} MD files to process`);

  // Ingest CSVs
  for (const f of csvs) {
    console.log(`\n📊 Processing CSV: ${f}`);
    await ingestCSV(path.join(DATA_DIR, f), f);
  }

  // Ingest MDs
  for (const f of mds) {
    console.log(`\n📝 Processing MD: ${f}`);
    await ingestMD(path.join(DATA_DIR, f), f);
  }

  console.log('\n✅ Ingest complete!');
}

main().catch(e=>{ 
  console.error('❌ Error:', e.message);
  process.exit(1); 
});
