#!/bin/bash
# NODE_ENV should be set as deployment environment variable, not hardcoded here
# This fixes the "Failed to get Nix directories" error in Cloud Run deployment
export PORT=${PORT:-5000}

echo "Starting production server..."
echo "Node.js version: $(node -v)"
echo "Environment: ${NODE_ENV:-development}"
echo "Port: $PORT"

# Use direct node execution for Cloud Run compatibility
if [ -f "dist/index.js" ]; then
  echo "Running compiled server from dist/index.js"
  node dist/index.js
elif [ -f "dist/server/index.js" ]; then
  echo "Running compiled server from dist/server/index.js"
  node dist/server/index.js
else
  echo "⚠️ No compiled server found, falling back to TypeScript"
  npx ts-node --transpile-only --skip-project server/index.ts
fi
