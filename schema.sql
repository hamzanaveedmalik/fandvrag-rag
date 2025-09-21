-- Enable pgvector
create extension if not exists vector;

-- Documents table (raw chunks)
create table if not exists fv_docs (
  id uuid primary key default gen_random_uuid(),
  source text not null,              -- e.g., 'catalog.csv', 'faqs.csv', 'kb_leather_101.md'
  path text,                         -- file path or logical key
  chunk_index int not null default 0,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536)             -- for text-embedding-3-large
);

-- Similarity search index
create index if not exists fv_docs_embedding_idx on fv_docs using ivfflat (embedding vector_cosine_ops) with (lists = 200);

-- Simple upsert helper (optional unique constraint)
create unique index if not exists fv_docs_source_path_idx on fv_docs (source, path, chunk_index);