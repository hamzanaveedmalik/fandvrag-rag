
import { getSupabase } from './supabase.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supa = getSupabase();

export type DocHit = { content: string; source: string; score: number };

export async function retrieve(query: string, k = 6): Promise<DocHit[]> {
  // Embed the query
  const emb = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  const qvec = emb.data[0].embedding;

  // Call RPC using SQL via PostgREST (Supabase) — use match operator for cosine
  // Since supabase-js doesn't expose vector ops directly, we create an RPC via SQL or use a super lightweight fetch.
  // Easiest: use the REST filter with a stored function. For brevity, we'll do a direct request via fetch() to /rest/v1/rpc.
  const url = process.env.SUPABASE_URL + '/rest/v1/rpc/fv_match_docs';
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query_embedding: qvec, match_count: k, match_threshold: 0.78 })
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error('retrieve failed: ' + txt);
  }
  const rows = await resp.json() as any[];
  return rows.map(r => ({ content: r.content, source: r.source, score: r.similarity }));
}

/**
 * SQL for RPC (create once in your DB):
 * 
 * create or replace function fv_match_docs(query_embedding vector(1536), match_count int, match_threshold float)
 * returns table(content text, source text, similarity float)
 * language sql stable as $$
 *   select content, source,
 *          1 - (fv_docs.embedding <=> query_embedding) as similarity
 *   from fv_docs
 *   where 1 - (fv_docs.embedding <=> query_embedding) >= match_threshold
 *   order by fv_docs.embedding <=> query_embedding
 *   limit match_count;
 * $$;
 */

export async function answer(question: string) {
  const hits = await retrieve(question, 6);
  const citations = hits.map(h => ({ content: h.content.slice(0, 1200), source: h.source }));
  return { hits, citations };
}
