#!/bin/bash

# Deployment script with environment fixes for Replit deployment issues
set -euo pipefail  # Exit on any error, undefined vars, or pipeline failures

echo "🚀 Starting deployment build with environment fixes..."

# Set environment variables to handle Nix directory caching issues
export NODE_ENV=production
export DISABLE_CARTOGRAPHER=true
export NIX_REMOTE=''
export NODE_NO_WARNINGS=1

# Add Node.js 20 path for consistency (fallback if nodejs_20 not available)
if [ -d "/nix/store" ]; then
  NODEJS20_PATH=$(find /nix/store -maxdepth 2 -path "*/nodejs-20*/bin" -type d 2>/dev/null | head -1)
  if [ -n "$NODEJS20_PATH" ]; then
    export PATH="$NODEJS20_PATH:$PATH"
    echo "✓ Added Node.js 20 path: $NODEJS20_PATH"
  else
    echo "⚠️ Node.js 20 not found, using system Node.js"
  fi
fi

# Ensure node_modules binaries are available
export PATH="./node_modules/.bin:$PATH"

# Log current Node.js version for debugging
echo "📋 Current Node.js version: $(node -v)"
echo "📋 NPX version: $(npx --version)"

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
set +e  # Temporarily disable exit on error to capture build output
NODE_ENV=production DISABLE_CARTOGRAPHER=true NIX_REMOTE='' NODE_NO_WARNINGS=1 npx vite build > /tmp/vite-build.log 2>&1
VITE_EXIT_CODE=$?
set -e  # Re-enable exit on error

if [ $VITE_EXIT_CODE -ne 0 ]; then
    echo "❌ Frontend build failed"
    echo "📋 Build log excerpt:"
    tail -20 /tmp/vite-build.log
    exit 1
else
    echo "✅ Frontend build completed"
    # Show any warnings but don't fail
    grep -Ei "(warn|deprecated)" /tmp/vite-build.log || true
fi

echo "🔨 Building backend with esbuild..."
set +e  # Temporarily disable exit on error to capture build output
NODE_ENV=production NODE_NO_WARNINGS=1 npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --log-level=error --allow-overwrite > /tmp/esbuild.log 2>&1
ESBUILD_EXIT_CODE=$?
set -e  # Re-enable exit on error

if [ $ESBUILD_EXIT_CODE -ne 0 ]; then
    echo "❌ Backend build failed"
    echo "📋 Build log excerpt:"
    tail -20 /tmp/esbuild.log
    exit 1
else
    echo "✅ Backend build completed"
fi

# Post-build validation
echo "🔍 Validating build artifacts..."
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo "❌ Build artifacts missing or incomplete"
    ls -la dist/ || echo "dist/ directory not found"
    exit 1
fi

# Quick syntax check on the built server
echo "🔍 Testing server bundle loadability..."
if ! node --input-type=module -e 'await import("file://" + process.cwd() + "/dist/index.js").then(() => console.log("✅ Server bundle loads successfully"), (e) => { console.error("❌ Server bundle error:", e.message); process.exit(1); })'; then
    echo "❌ Built server has import errors"
    exit 1
fi

echo "✅ Build artifacts validated successfully"

echo "✅ Deployment build completed successfully"
echo "📦 Build artifacts created in dist/ directory"