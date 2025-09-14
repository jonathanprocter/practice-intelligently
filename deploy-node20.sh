#!/bin/bash
# Deployment script specifically configured for Node.js 20
# This ensures compatibility with all packages requiring Node.js >=20.0.0

set -euo pipefail

echo "🚀 Starting Node.js 20 deployment build..."

# Force Node.js 20 path
NODEJS20_BIN=""

# Try to find Node.js 20 in multiple locations
if [ -x "/nix/store/$(ls /nix/store | grep nodejs-20 | head -1)/bin/node" ] 2>/dev/null; then
    NODEJS20_BIN="/nix/store/$(ls /nix/store | grep nodejs-20 | head -1)/bin"
    echo "✓ Found Node.js 20 in Nix store"
elif command -v node20 &> /dev/null; then
    NODEJS20_BIN="$(dirname $(which node20))"
    echo "✓ Found node20 command"
elif [ -d "/nix/store" ]; then
    NODEJS20_PATH=$(find /nix/store -maxdepth 2 -path "*/nodejs-20*/bin" -type d 2>/dev/null | head -1)
    if [ -n "$NODEJS20_PATH" ]; then
        NODEJS20_BIN="$NODEJS20_PATH"
        echo "✓ Found Node.js 20 via search"
    fi
fi

# Set PATH to use Node.js 20
if [ -n "$NODEJS20_BIN" ]; then
    export PATH="$NODEJS20_BIN:$PATH"
    echo "📋 Using Node.js version: $($NODEJS20_BIN/node -v)"
else
    echo "⚠️ Node.js 20 not found in expected locations, using system Node.js"
    echo "📋 Using Node.js version: $(node -v)"
fi

# Set build environment
export NPM_CONFIG_CACHE="/tmp/.npm-cache"
export NODE_OPTIONS="--max-old-space-size=4096"
export DISABLE_CARTOGRAPHER=true
export NIX_REMOTE=''
export NODE_NO_WARNINGS=1

# Clean build directory
echo "🧹 Cleaning build artifacts..."
rm -rf dist/ || true
mkdir -p dist

# Build frontend
echo "🔨 Building frontend with Vite..."
if ! npx vite build; then
    echo "❌ Frontend build failed"
    exit 1
fi
echo "✅ Frontend build completed"

# Build backend
echo "🔨 Building backend with esbuild..."
if ! npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --allow-overwrite; then
    echo "❌ Backend build failed"  
    exit 1
fi
echo "✅ Backend build completed"

# Validate build
echo "🔍 Validating build artifacts..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build validation failed: dist/index.js not found"
    exit 1
fi

echo "✅ Deployment build completed successfully!"
echo "📦 Build artifacts ready in dist/ directory"
echo ""
echo "To start the production server, run:"
echo "  NODE_ENV=production node dist/index.js"