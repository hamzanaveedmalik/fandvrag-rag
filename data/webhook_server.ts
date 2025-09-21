import express from 'express';
import crypto from 'crypto';
import { google } from 'googleapis';

const app = express();
app.use(express.json({ limit: '1mb' }));

function verifySignature(req: any): boolean {
  const secret = process.env.TAWK_WEBHOOK_SECRET;
  if (!secret) return true;
  const sig = req.header('X-Tawk-Signature');
  if (!sig) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const body = JSON.stringify(req.body || {});
  hmac.update(body);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest));
}

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

app.post('/webhooks/tawk', async (req, res) => {
  try {
    if (!verifySignature(req)) return res.status(401).send('Invalid signature');

    const p = req.body || {};
    const event = p.event || p.type || 'unknown';
    const visitor = p.visitor || p.user || {};
    const message = p.message || p.lastMessage || {};
    const utms = (visitor.attributes || visitor.attrs || {});

    const row = [
      new Date().toISOString(),
      event,
      visitor.id || visitor.uuid || '',
      visitor.name || '',
      visitor.email || '',
      message.text || message.body || '',
      utms.utm_source || '',
      utms.utm_medium || '',
      utms.utm_campaign || '',
      utms.landing_page || '',
      utms.region || '',
      p.conversationId || p.chatId || ''
    ];

    if (process.env.SHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const sheets = await getSheets();
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.SHEET_ID,
        range: 'Chats!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      });
    } else {
      console.log('[LOG ONLY] Row:', row);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('Webhook error', e);
    res.sendStatus(200);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Tawk webhook listening on :' + port));
