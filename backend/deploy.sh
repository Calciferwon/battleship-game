#!/bin/bash

# Battleship PvP - Backend Deployment Script
echo "🚀 Deploying Battleship Backend to Vercel..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it with: npm install -g vercel"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Deploy to Vercel
echo "� Deploying backend..."
vercel --prod --name battleship-backend

echo "✅ Backend deployment completed!"
echo "🌐 Your backend URL is shown in the Vercel output above"
echo ""
echo "📝 Don't forget to:"
echo "   1. Set environment variables in Vercel dashboard"
echo "   2. Configure custom domain if needed"
echo "   3. Test the deployment"