# Migration from Tawk.to to Crisp Chat Widget

## Why Crisp is Better for RAG Systems

- ✅ **Real-time webhooks** - Every message triggers immediately
- ✅ **No rate limits** - Unlike Tawk.to, no API restrictions
- ✅ **Easy auto-reply** - Simple API for sending responses
- ✅ **Free forever** - No hidden costs or limitations
- ✅ **Modern UI** - Beautiful, responsive chat widget

## Step-by-Step Migration

### 1. Set Up Crisp Account

1. **Go to [crisp.chat](https://crisp.chat)**
2. **Sign up for free**
3. **Create a new website** in your dashboard
4. **Copy your Website ID** (you'll need this)

### 2. Get Crisp API Credentials

1. **In Crisp dashboard, go to Settings → API**
2. **Generate an API key**
3. **Copy the API key** (you'll need this)

### 3. Add Crisp Widget to Your Website

1. **In Crisp dashboard, go to Settings → Website**
2. **Copy the JavaScript code**
3. **Add it to your website** (before closing `</body>` tag)

### 4. Configure Webhook in Crisp

1. **In Crisp dashboard, go to Settings → Webhooks**
2. **Add new webhook:**
   - **URL**: `https://fandvrag-rag.onrender.com/webhooks/crisp`
   - **Events**: Select "Message Sent" (visitor messages)
   - **Status**: Enabled

### 5. Update Render Environment Variables

1. **Go to your Render dashboard**
2. **Click on "fandvrag-rag" service**
3. **Go to "Environment" tab**
4. **Add these variables:**
   - `CRISP_API_KEY` = your Crisp API key
   - `CRISP_WEBSITE_ID` = your Crisp website ID

### 6. Test the Integration

1. **Wait for Render to redeploy** (2-3 minutes)
2. **Open your website** in a new incognito window
3. **Start a chat** and ask: "What are your MOQ and lead times?"
4. **You should see the RAG response appear automatically!**

## Benefits of Crisp vs Tawk.to

| Feature         | Tawk.to                   | Crisp                     |
| --------------- | ------------------------- | ------------------------- |
| Webhook Events  | Limited (Chat Start only) | Real-time (every message) |
| API Rate Limits | Yes                       | No                        |
| Auto-reply      | Complex setup             | Simple API                |
| Free Plan       | Limited                   | Full features             |
| Modern UI       | Basic                     | Beautiful                 |
| RAG Integration | Difficult                 | Seamless                  |

## Your RAG Server Now Supports Both

- **Tawk.to**: `https://fandvrag-rag.onrender.com/webhooks/tawk`
- **Crisp**: `https://fandvrag-rag.onrender.com/webhooks/crisp`

You can migrate gradually or use both simultaneously!

## Troubleshooting

- **Webhook not firing**: Check Crisp webhook configuration
- **Auto-reply not working**: Verify API credentials in Render
- **Messages not appearing**: Check Crisp widget installation

## Next Steps

1. **Set up Crisp account** and get credentials
2. **Add environment variables** to Render
3. **Test the integration** with a real chat
4. **Remove Tawk.to** once Crisp is working perfectly

Your RAG system will be much more responsive with Crisp! 🚀
