#!/bin/bash

# Deployment Fix Script - Workaround for protected file restrictions
# This script builds and runs the application without hardcoded NODE_ENV
# NODE_ENV should be set as a deployment environment variable instead

echo "🚀 Deployment Fix Script - Building without hardcoded NODE_ENV"
echo "=============================================="

# Ensure NODE_ENV is not hardcoded - it should come from deployment environment
if [ -z "$NODE_ENV" ]; then
    echo "⚠️  NODE_ENV not set. It should be set as a deployment environment variable."
    echo "   For production deployment, set NODE_ENV=production in your deployment settings."
fi

# Set build environment variables (without NODE_ENV)
export NPM_CONFIG_CACHE=/tmp/.npm-cache
export NODE_OPTIONS=--max-old-space-size=4096

# Additional environment variables to prevent Nix caching issues
export CI=true
export DISABLE_CARTOGRAPHER=true
export NIX_REMOTE=
export NODE_NO_WARNINGS=1

echo "Building application..."
echo "----------------------"

# Build frontend with Vite
echo "Building frontend..."
npx vite build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

# Build backend with esbuild
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi

echo "✅ Build completed successfully!"

# For deployment, the start command would be:
echo ""
echo "To start the application in production:"
echo "  node dist/index.js"
echo ""
echo "Remember to set NODE_ENV=production in your deployment environment variables!"