#!/bin/bash

# Deployment script with environment fixes for Replit deployment issues
echo "🚀 Starting deployment build with environment fixes..."

# Set environment variables to handle Nix directory caching issues
export NODE_ENV=production
export DISABLE_CARTOGRAPHER=true
export NIX_REMOTE=''
export NODE_NO_WARNINGS=1

# Add Node.js 20 path for consistency (fallback if nodejs_20 not available)
if [ -d "/nix/store" ]; then
  NODEJS20_PATH=$(find /nix/store -path "*/nodejs-20*/bin" -type d 2>/dev/null | head -1)
  if [ -n "$NODEJS20_PATH" ]; then
    export PATH="$NODEJS20_PATH:$PATH"
    echo "✓ Added Node.js 20 path: $NODEJS20_PATH"
  else
    echo "⚠️ Node.js 20 not found, using system Node.js"
  fi
fi

# Disable package caching to resolve Nix directory issues
export npm_config_cache="/tmp/.npm"
export npm_config_prefer_offline=false

# Additional environment fixes for deployment
export npm_config_update_notifier=false
export npm_config_fund=false

echo "✅ Environment configured for deployment:"
echo "   NODE_ENV=$NODE_ENV"
echo "   DISABLE_CARTOGRAPHER=$DISABLE_CARTOGRAPHER"
echo "   NIX_REMOTE=$NIX_REMOTE"  
echo "   NODE_NO_WARNINGS=$NODE_NO_WARNINGS"
echo "   npm_config_cache=$npm_config_cache"

# Clean any existing build artifacts
echo "🧹 Cleaning existing build artifacts..."
rm -rf dist/ || true

# Run the build with enhanced error handling and warning suppression
echo "🔨 Building frontend with Vite..."
if ! NODE_ENV=production DISABLE_CARTOGRAPHER=true NIX_REMOTE='' NODE_NO_WARNINGS=1 vite build 2>&1 | tee /tmp/vite-build.log | sed '/Warning:/d' | sed '/deprecated/i'; then
    echo "❌ Frontend build failed"
    echo "📋 Build log excerpt:"
    tail -10 /tmp/vite-build.log
    exit 1
fi

echo "🔨 Building backend with esbuild..."  
if ! NODE_ENV=production NODE_NO_WARNINGS=1 esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --log-level=error --allow-overwrite 2>&1 | tee /tmp/esbuild.log | sed '/Warning:/d'; then
    echo "❌ Backend build failed"
    echo "📋 Build log excerpt:"
    tail -10 /tmp/esbuild.log
    exit 1
fi

echo "✅ Deployment build completed successfully"
echo "📦 Build artifacts created in dist/ directory"