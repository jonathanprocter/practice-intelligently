#!/bin/bash
# Production deployment script for Replit Publishing
# This script ensures Node.js 20 compatibility and proper build execution

set -euo pipefail

echo "🚀 Starting production deployment build..."
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "Node.js version: $(node -v)"

# Environment setup
export NPM_CONFIG_CACHE="/tmp/.npm-cache"
export NODE_OPTIONS="--max-old-space-size=4096"
export DISABLE_CARTOGRAPHER=true

# Clean previous build
echo "🧹 Cleaning previous build artifacts..."
rm -rf dist/
mkdir -p dist

# Build frontend with Vite
echo "🔨 Building frontend..."
if [ -f "node_modules/.bin/vite" ]; then
    echo "Using vite from node_modules..."
    node_modules/.bin/vite build
else
    echo "Using vite via npx..."
    npx vite build
fi

# Build backend with esbuild
echo "🔨 Building backend..."
if [ -f "node_modules/.bin/esbuild" ]; then
    echo "Using esbuild from node_modules..."
    node_modules/.bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --allow-overwrite
else
    echo "Using esbuild via npx..."
    npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --allow-overwrite
fi

# Verify build artifacts
echo "🔍 Verifying build artifacts..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build validation failed: dist/index.js not found"
    exit 1
fi

if [ ! -f "dist/index.html" ]; then
    echo "❌ Build validation failed: dist/index.html not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo ""
echo "📦 Build artifacts:"
ls -lh dist/
echo ""
echo "🚀 Ready for deployment!"
echo "To start the production server: NODE_ENV=production node dist/index.js"