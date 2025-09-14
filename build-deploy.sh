#!/bin/bash

# Build script for deployment that uses the correct Vite configuration

echo "Starting production build..."

# Set environment variables
# NODE_ENV should be set as deployment environment variable instead
# export NODE_ENV=production
export NPM_CONFIG_CACHE=/tmp/.npm-cache
export NODE_OPTIONS=--max-old-space-size=4096

# Build the frontend using the client vite config
echo "Building frontend..."
npx vite build --config client/vite.config.ts

# Build the backend
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build complete!"