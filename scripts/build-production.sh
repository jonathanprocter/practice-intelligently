#!/bin/bash

echo "Starting production build..."

# Create dist directories
mkdir -p server/public
mkdir -p dist

# Build client with vite (properly handles all assets and imports)
echo "Building client with Vite..."
npx vite build --outDir server/public --emptyOutDir

if [ $? -ne 0 ]; then
  echo "Client build failed"
  exit 1
fi

# Build production server 
echo "Building production server..."
npx esbuild server/production-server.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outfile=dist/production-server.js \
  2>&1

if [ $? -ne 0 ]; then
  echo "Production server build failed"
  exit 1
fi

echo "Build complete!"
echo "Files created:"
echo "  - Client: server/public/"
echo "  - Server: dist/production-server.js"
ls -la server/public/
ls -la dist/