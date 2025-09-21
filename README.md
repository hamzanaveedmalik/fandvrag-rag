
# Option B — Custom RAG brain behind tawk.to

This repo gives you a minimal, production-friendly path:
tawk.to → **Webhook** → **RAG Server (TypeScript)** → Supabase (pgvector) → OpenAI → (optional) Slack notify → Human approves/pastes reply into Tawk, or use Tawk's private REST if enabled.

## What you get
- `/server`: Express API with `/webhooks/tawk` that:
  - retrieves similar chunks from your knowledge base (catalog, FAQs, KB)
  - composes a grounded answer (with inline [1] citations)
  - posts suggested reply to Slack (optional)
- `/ingest`: script to embed your CSV + Markdown files into Supabase **pgvector**
- `schema.sql`: pgvector schema + index + RPC for fast similarity
- `.env.example`: all env vars required

## Setup (15–30 min)
1) **Create Supabase project** → SQL editor → paste `schema.sql`.  
   Also create the RPC:
   ```sql
   create or replace function fv_match_docs(query_embedding vector(1536), match_count int, match_threshold float)
   returns table(content text, source text, similarity float)
   language sql stable as $$
     select content, source,
            1 - (fv_docs.embedding <=> query_embedding) as similarity
     from fv_docs
     where 1 - (fv_docs.embedding <=> query_embedding) >= match_threshold
     order by fv_docs.embedding <=> query_embedding
     limit match_count;
   $$;
   ```

2) **Prepare data**  
   Put the files from your Phase-1 bundle (`catalog.csv`, `faqs.csv`, `kb_*.md`) into a folder, e.g. `./data`.

3) **Install & run ingest**
   ```bash
   npm i
   cp .env.example .env    # fill in OPENAI_API_KEY, SUPABASE_URL, SERVICE_ROLE
   DATA_DIR=./data npm -w ingest run dev  # or: npm -w ingest start (after build)
   ```

4) **Run server**
   ```bash
   npm -w server run dev   # listens on :8787 (default)
   ```

5) **Wire tawk.to → Webhooks**
   - In Tawk: Administration → Webhooks → add POST URL `https://your-domain/webhooks/tawk`.
   - (Optional) add HMAC at your reverse proxy; Tawk’s own signing isn’t public.
   - Set Slack webhook in `.env` to notify operators with suggested replies.

> **Replying back into Tawk:** Tawk’s public webhooks are outbound only; posting messages back programmatically requires their private REST access or an approved integration. Until then, use Slack notifications for one-click paste by your agent, or enable **AI Assist** (Option A) in parallel for auto-replies.

## Prompt guardrails
- System prompt forces “context-only” answers; if missing, it asks for lead details.
- Inline citations like `[1]` refer to the chunk sources (catalog/faqs/kb filenames).

## Extend
- Add `price_tiers`/`brandable_areas` fields to `catalog.csv`; re-run ingest.
- Add a `/quote` endpoint that calculates ETA from `lead_time_days` and MOQ rules.
- Add analytics by logging each Q → hits → answer to Supabase.

---
**Tip:** Keep both: AI Assist for instant answers + this RAG server as the authoritative brain for complex queries and operator workflows.
