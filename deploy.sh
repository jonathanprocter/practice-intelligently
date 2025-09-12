#!/bin/bash

# Deployment script with environment fixes for Replit deployment issues
echo "🚀 Starting deployment build with environment fixes..."

# Set environment variables to handle Nix directory caching issues
export NODE_ENV=production
export NIX_REMOTE=''
export NODE_NO_WARNINGS=1

# Add Node.js 20 path for consistency
export PATH="/nix/store/*/bin:$PATH"

# Disable package caching to resolve Nix directory issues
export npm_config_cache="/tmp/.npm"
export npm_config_prefer_offline=false

# Additional environment fixes for deployment
export npm_config_update_notifier=false
export npm_config_fund=false

echo "✅ Environment configured for deployment:"
echo "   NODE_ENV=$NODE_ENV"
echo "   NIX_REMOTE=$NIX_REMOTE"  
echo "   NODE_NO_WARNINGS=$NODE_NO_WARNINGS"
echo "   npm_config_cache=$npm_config_cache"

# Clean any existing build artifacts
echo "🧹 Cleaning existing build artifacts..."
rm -rf dist/ || true

# Run the build with enhanced error handling and warning suppression
echo "🔨 Building frontend with Vite..."
NODE_ENV=production NIX_REMOTE='' vite build 2>&1 | sed '/Warning:/d' || {
    echo "❌ Frontend build failed"
    exit 1
}

echo "🔨 Building backend with esbuild..."
NODE_ENV=production esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --log-level=warning 2>&1 | sed '/Warning:/d' || {
    echo "❌ Backend build failed" 
    exit 1
}

echo "✅ Deployment build completed successfully"
echo "📦 Build artifacts created in dist/ directory"