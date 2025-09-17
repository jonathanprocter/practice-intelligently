#!/bin/bash

echo "🔧 Fixing OpenSSL issue and starting server..."
echo "============================================="

# Stop all node processes
pkill -f node 2>/dev/null || true
pkill -f tsx 2>/dev/null || true

# Clear ports
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Start with plain Node.js (no tsx)
echo "Starting server with Node.js..."
node server/index.js