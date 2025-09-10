#!/bin/bash

echo "Starting production server with proper API routing..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Ensure build exists
if [ ! -f "dist/production-server.js" ]; then
  echo "Production server not built. Building now..."
  ./scripts/build-production.sh
fi

# Start the production server
echo "Starting server on port ${PORT:-5000}..."
NODE_ENV=production node dist/production-server.js