#!/bin/bash
# Deployment build script without hardcoded NODE_ENV
# This script will use the NODE_ENV set by Replit's Publishing environment variables

echo "🔨 Starting deployment build..."
echo "NODE_ENV is: ${NODE_ENV:-not set}"
echo "CI is: ${CI:-not set}"

# Build command without hardcoded NODE_ENV
NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 npm run build

echo "✅ Build completed"