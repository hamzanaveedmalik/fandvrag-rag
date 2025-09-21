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
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
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
  console.log(`Processing ${chunks.length} chunks for ${source}#${logicalPath}`);
  
  for (let idx=0; idx<chunks.length; idx++) {
    const c = chunks[idx];
    
    // Add delay between requests
    if (idx > 0) {
      await sleep(200); // 200ms delay between requests
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

async function testIngestFile(filename: string) {
  const filePath = path.join(DATA_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  console.log(`Testing ingest for: ${filename}`);
  
  if (filename.endsWith('.csv')) {
    const raw = readFileSafe(filePath);
    const rows = parse(raw, { columns: true, skip_empty_lines: true });
    console.log(`Found ${rows.length} rows in CSV`);
    
    // Process only first 3 rows for testing
    const testRows = rows.slice(0, 3);
    for (const row of testRows) {
      const logical = row.sku || row.name || 'row';
      const content = Object.entries(row).map(([k,v])=>`${k}: ${v}`).join('\n');
      await embedAndUpsert(filename, logical, content);
    }
  } else if (filename.endsWith('.md')) {
    const raw = readFileSafe(filePath);
    const { content } = matter(raw);
    await embedAndUpsert(filename, path.basename(filename), content);
  }
  
  console.log(`✓ Completed test ingest for ${filename}`);
}

async function main() {
  const testFile = process.argv[2];
  
  if (!testFile) {
    console.log('Usage: npm run test-ingest <filename>');
    console.log('Available files:');
    const files = fs.readdirSync(DATA_DIR);
    files.forEach(f => console.log(`  - ${f}`));
    return;
  }
  
  await testIngestFile(testFile);
}

main().catch(e=>{ console.error(e); process.exit(1); });
