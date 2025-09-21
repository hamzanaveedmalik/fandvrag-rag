import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import matter from 'gray-matter';

const DATA_DIR = process.env.DATA_DIR || './data';
const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;

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

function readFileSafe(p: string) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function analyzeFile(file: string, source: string) {
  const filePath = path.join(DATA_DIR, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  console.log(`\n📄 Analyzing: ${file}`);
  console.log(`   Source: ${source}`);
  
  if (file.endsWith('.csv')) {
    const raw = readFileSafe(filePath);
    const rows = parse(raw, { columns: true, skip_empty_lines: true });
    console.log(`   Rows: ${rows.length}`);
    
    // Analyze first few rows
    const sampleRows = rows.slice(0, 3);
    let totalChunks = 0;
    
    for (const row of sampleRows) {
      const logical = row.sku || row.name || 'row';
      const content = Object.entries(row).map(([k,v])=>`${k}: ${v}`).join('\n');
      const chunks = chunkText(content);
      totalChunks += chunks.length;
      console.log(`   Sample row "${logical}": ${chunks.length} chunks`);
    }
    
    const estimatedTotalChunks = Math.ceil((totalChunks / sampleRows.length) * rows.length);
    console.log(`   Estimated total chunks: ${estimatedTotalChunks}`);
    console.log(`   Estimated API calls needed: ${estimatedTotalChunks}`);
    
  } else if (file.endsWith('.md')) {
    const raw = readFileSafe(filePath);
    const { content } = matter(raw);
    const chunks = chunkText(content);
    console.log(`   Content length: ${content.length} characters`);
    console.log(`   Chunks: ${chunks.length}`);
    console.log(`   API calls needed: ${chunks.length}`);
  }
}

async function main() {
  console.log('🔍 Dry Run Analysis - No API calls will be made\n');
  
  const files = fs.readdirSync(DATA_DIR);
  const csvs = files.filter(f=>f.endsWith('.csv'));
  const mds = files.filter(f=>f.endsWith('.md'));

  console.log(`Found ${csvs.length} CSV files and ${mds.length} MD files`);
  
  let totalEstimatedCalls = 0;

  // Analyze CSVs
  for (const f of csvs) {
    analyzeFile(f, f);
  }

  // Analyze MDs
  for (const f of mds) {
    analyzeFile(f, f);
  }

  console.log('\n📊 Summary:');
  console.log('This analysis shows how many API calls would be needed.');
  console.log('If you\'re hitting rate limits, consider:');
  console.log('1. Processing files one at a time');
  console.log('2. Adding longer delays between requests');
  console.log('3. Upgrading your OpenAI plan');
  console.log('4. Using a cheaper embedding model');
}

main().catch(console.error);
