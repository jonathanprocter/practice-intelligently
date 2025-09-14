#!/bin/bash
# Deployment build script optimized for Node.js 20
# This script will use the NODE_ENV set by Replit's Publishing environment variables

echo "🔨 Starting deployment build..."
echo "NODE_ENV is: ${NODE_ENV:-not set}"
echo "CI is: ${CI:-not set}"

# Force use of Node.js 20 if available
if command -v node20 &> /dev/null; then
    export PATH="$(dirname $(which node20)):$PATH"
    echo "✓ Using Node.js 20"
elif [ -d "/nix/store" ]; then
    NODEJS20_PATH=$(find /nix/store -maxdepth 2 -path "*/nodejs-20*/bin" -type d 2>/dev/null | head -1)
    if [ -n "$NODEJS20_PATH" ]; then
        export PATH="$NODEJS20_PATH:$PATH"
        echo "✓ Found and using Node.js 20 from Nix store"
    fi
fi

echo "📋 Node.js version: $(node -v)"

# Build command using npx for vite
echo "🔨 Building frontend with Vite..."
NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 npx vite build

echo "🔨 Building backend with esbuild..."
NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build completed"