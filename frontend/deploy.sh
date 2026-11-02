#!/bin/bash

# Battleship PvP - Frontend Deployment Script
echo "🚀 Deploying Battleship Frontend to Vercel..."

# Navigate to frontend directory
cd "$(dirname "$0")"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it with: npm install -g vercel"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building frontend..."
npm run build

# Deploy to Vercel
echo "🚀 Deploying frontend..."
vercel --prod --name battleship-frontend

echo "✅ Frontend deployment completed!"
echo "🌐 Your frontend URL is shown in the Vercel output above"
echo ""
echo "📝 Don't forget to:"
echo "   1. Set environment variables in Vercel dashboard"
echo "   2. Configure custom domain if needed"
echo "   3. Test the deployment"