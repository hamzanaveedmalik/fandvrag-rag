#!/bin/bash

# Deploy to Google Cloud Run
# Make sure you have gcloud CLI installed and authenticated

set -e

echo "🚀 Deploying FandVrag RAG Server to Google Cloud Run..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Please run:"
    echo "   gcloud auth login"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
if [ -z "$PROJECT_ID" ]; then
    echo "❌ No project ID set. Please run:"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo "📋 Using project: $PROJECT_ID"

# Navigate to server directory
cd server

# Build and deploy
echo "🔨 Building and deploying..."
gcloud builds submit --config cloudbuild.yaml

echo "✅ Deployment complete!"
echo "🌐 Your RAG server is now live at:"
gcloud run services describe fandvrag-server --region=us-central1 --format="value(status.url)"

echo ""
echo "🔧 Next steps:"
echo "1. Set environment variables in Cloud Run console"
echo "2. Test the webhook endpoint"
echo "3. Configure Tawk.to to use the new URL"
