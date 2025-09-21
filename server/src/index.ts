import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { answer } from './rag.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Loud request logger
app.use((req, _res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function verifySignature(req: any) {
  const secret = process.env.TAWK_WEBHOOK_SECRET;
  if (!secret) return true;
  const sig = req.header('X-Tawk-Signature');
  if (!sig) return true; // allow if not set in tawk
  // If you add your own reverse-proxy HMAC, verify here.
  return true;
}

// Extract text from various Tawk payload shapes
function extractText(p: any): string {
  if (!p) return '';
  // Common single-message shapes
  const direct =
    p?.message?.text ??
    p?.lastMessage?.text ??
    p?.text ??
    (typeof p?.message === 'string' ? p.message : '') ??
    '';
  if (direct) return String(direct);

  // Transcript-like shapes (array of messages)
  const maybeArrays = [p?.messages, p?.chat?.messages, p?.conversation?.messages];
  for (const arr of maybeArrays) {
    if (Array.isArray(arr)) {
      const visitorTexts = arr
        .filter((m: any) =>
          ['visitor', 'user', 'customer'].includes(String(m.sender || m.type || '').toLowerCase())
        )
        .map((m: any) => m.text || m.msg || m.body || '')
        .filter(Boolean);
      if (visitorTexts.length) return visitorTexts.join('\n').trim();
    }
  }
  return '';
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/webhooks/tawk', async (req, res) => {
  try {
    if (!verifySignature(req)) return res.status(401).send('Invalid signature');

    // Dump full payload once for debugging
    console.log('Webhook payload:', JSON.stringify(req.body, null, 2));

    const payload = req.body || {};
    const message = extractText(payload);
    const visitor = payload.visitor || payload.user || {};
    const meta = visitor.attributes || visitor.attrs || {};

    if (!message) {
      console.log('No message text found in payload. Acking.');
      return res.status(200).send('OK');
    }

    console.log('Extracted message:', message);

    // Retrieve context
    const { citations } = await answer(message);

    // Build reply
    const sys = buildSystemPrompt();
    const usr = buildUserPrompt(message, citations);
    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr }
      ]
    });

    const reply =
      chat.choices[0]?.message?.content?.trim() ||
      "Thanks! We'll follow up by email. Could I get your name, work email, company, country, and product interest?";

    console.log('Drafted reply:\n', reply);

    // Optional: operator Slack notify
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `*New inquiry:* ${message}\n*Suggested reply:*\n${reply}\n\n*Visitor:* ${visitor?.name || ''} ${visitor?.email || ''}\n*UTMs:* ${JSON.stringify(meta)}`
        })
      }).catch((e) => console.error('Slack notify failed:', e));
    }

    // NOTE: To auto-reply in-widget, call Tawk's REST (if enabled for your account).

    return res.status(200).send('OK');
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(200).send('OK');
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log('RAG server listening on :' + port));
