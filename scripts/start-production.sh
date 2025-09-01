#!/bin/bash

echo "Starting production server..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Ensure dist directory exists
if [ ! -d "dist" ]; then
  echo "Error: dist directory not found. Please run build first."
  exit 1
fi

# Start the server with Node.js
echo "Starting server on port ${PORT:-3000}..."
cd dist && NODE_ENV=production node index.js