# Forth & Vale — Tawk AI Assist (Phase 1, v2)

This bundle includes:
- `catalog.csv` — UPDATED comprehensive catalog with `category` + `subcategory`
- `faqs.csv` — 20 Q&As for AI Assist grounding
- KB articles (`kb_*.md`) — Leather 101, Sampling & MOQ, Lead Times, Branding
- `utm_to_tawk.js` — capture UTM/referrer into Tawk visitor attributes
- `webhook_server.ts` + `.env.example` — Express webhook → Google Sheets
- `sheets_schema.csv` — headers for the “Chats” sheet tab

## How to use
1) In tawk: Add-ons → AI Assist → Create Agent → **Data Source**
   - Upload `catalog.csv`, `faqs.csv`, and the `kb_*.md` files
   - Paste the base prompt we drafted
2) Add `<script src="/utm_to_tawk.js"></script>` after the Tawk embed
3) (Optional) Deploy the webhook and paste its URL in tawk → Webhooks

### Catalog columns
- `category` and `subcategory` are included for better intents and filtering.
