# FandVrag RAG System - Google Cloud Run Deployment

This guide will help you deploy your RAG system to Google Cloud Run for a production-grade, permanent HTTPS URL.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud CLI** installed and authenticated
3. **Docker** installed (for local testing)

## Step 1: Set Up Google Cloud

### 1.1 Install Google Cloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

### 1.2 Authenticate and Set Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create fandvrag-rag --name="FandVrag RAG System"

# Set the project
gcloud config set project fandvrag-rag

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Step 2: Deploy the RAG Server

### 2.1 Deploy Server

```bash
# Run the deployment script
./deploy.sh
```

### 2.2 Set Environment Variables

After deployment, set your environment variables in the Cloud Run console:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to Cloud Run → fandvrag-server
3. Click "Edit & Deploy New Revision"
4. Go to "Variables & Secrets" tab
5. Add these environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 2.3 Test the Deployment

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe fandvrag-server --region=us-central1 --format="value(status.url)")

# Test health endpoint
curl $SERVICE_URL/health

# Test webhook
curl -X POST $SERVICE_URL/webhooks/tawk \
  -H "Content-Type: application/json" \
  -d '{"event":"new_message","message":{"text":"test"}}'
```

## Step 3: Deploy Ingest Job (Optional)

### 3.1 Build Ingest Image

```bash
cd ingest
gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/fandvrag-ingest
```

### 3.2 Create Secrets

```bash
# Create secrets for sensitive data
gcloud secrets create openai-api-key --data-file=- <<< "your-openai-api-key"
gcloud secrets create supabase-url --data-file=- <<< "your-supabase-url"
gcloud secrets create supabase-service-key --data-file=- <<< "your-supabase-service-key"
```

### 3.3 Run Ingest Job

```bash
# Update job.yaml with your project ID
sed -i 's/PROJECT_ID/$(gcloud config get-value project)/g' job.yaml

# Deploy the job
gcloud run jobs replace job.yaml --region=us-central1
```

## Step 4: Configure Tawk.to

1. Go to your Tawk.to dashboard
2. Navigate to Settings → Webhooks
3. Add webhook URL: `https://your-service-url.run.app/webhooks/tawk`
4. Configure the webhook to send message events

## Step 5: Monitor and Maintain

### 5.1 View Logs

```bash
# View server logs
gcloud logs read --service=fandvrag-server --limit=50

# View job logs
gcloud logs read --job=fandvrag-ingest --limit=50
```

### 5.2 Update Deployment

```bash
# To update the server
./deploy.sh

# To update the ingest job
cd ingest && gcloud builds submit --tag gcr.io/$(gcloud config get-value project)/fandvrag-ingest
```

## Cost Estimation

**Google Cloud Run (Server):**

- Free tier: 2 million requests/month
- After free tier: ~$0.40 per million requests
- Memory: ~$0.0000024 per GB-second

**Google Cloud Run (Jobs):**

- Free tier: 2 million vCPU-seconds/month
- After free tier: ~$0.00002400 per vCPU-second

**Total estimated cost: <$5/month** for typical usage

## Alternative Deployment Options

### Option 1: Render

- **Pros**: Simple, good free tier, automatic deployments
- **Cons**: Less control, vendor lock-in
- **Cost**: $7/month for starter plan

### Option 2: Railway

- **Pros**: Developer-friendly, easy setup
- **Cons**: Newer platform, less enterprise features
- **Cost**: $5/month for hobby plan

### Option 3: Fly.io

- **Pros**: Global edge deployment, good performance
- **Cons**: More complex setup
- **Cost**: $1.94/month for shared-cpu-1x

## Troubleshooting

### Common Issues

1. **Build fails**: Check Dockerfile and dependencies
2. **Service won't start**: Check environment variables
3. **Webhook not working**: Verify Tawk.to configuration
4. **High costs**: Check memory allocation and request volume

### Useful Commands

```bash
# Check service status
gcloud run services describe fandvrag-server --region=us-central1

# View recent logs
gcloud logs read --service=fandvrag-server --limit=100

# Update environment variables
gcloud run services update fandvrag-server --region=us-central1 --set-env-vars="KEY=value"

# Delete service (if needed)
gcloud run services delete fandvrag-server --region=us-central1
```

## Security Best Practices

1. **Use secrets** for sensitive environment variables
2. **Enable IAM** and restrict access
3. **Use HTTPS** (automatic with Cloud Run)
4. **Monitor usage** and set up alerts
5. **Regular updates** of dependencies

Your RAG system is now production-ready! 🚀
