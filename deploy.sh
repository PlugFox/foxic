#!/bin/bash

# Firebase Deployment Script for Foxic
# Usage: ./deploy.sh [staging|production] [version]

set -e

ENVIRONMENT=${1:-production}
VERSION=${2:-}
PROJECT_ID=$(grep -o '"default": "[^"]*' .firebaserc | cut -d'"' -f4)

# Extract version from package.json if not provided
if [ -z "$VERSION" ]; then
    VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
fi

echo "🔥 Firebase Deployment Script"
echo "Environment: $ENVIRONMENT"
echo "Project ID: $PROJECT_ID"
echo "Version: $VERSION"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase first:"
    firebase login
fi

# Build the application
echo "🏗️  Building application..."
VITE_APP_VERSION=$VERSION npm run build:firebase

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy based on environment
if [ "$ENVIRONMENT" = "staging" ]; then
    echo "🚀 Deploying to staging channel..."
    firebase hosting:channel:deploy staging --project $PROJECT_ID

    # Get preview URL
    PREVIEW_URL=$(firebase hosting:channel:list --project $PROJECT_ID --json | grep -A 10 '"channelId": "staging"' | grep '"url"' | cut -d'"' -f4)
    echo "📱 Staging URL: $PREVIEW_URL"

elif [ "$ENVIRONMENT" = "production" ]; then
    echo "🚀 Deploying to production..."

    # Confirm production deployment
    read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi

    firebase deploy --only hosting --project $PROJECT_ID
    echo "📱 Production URL: https://$PROJECT_ID.web.app"

else
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

echo ""
echo "✅ Deployment completed successfully!"
echo "🔗 Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/hosting"