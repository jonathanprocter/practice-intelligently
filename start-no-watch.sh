#!/bin/bash

echo "🚀 Starting server without watch mode..."

# Kill any existing processes
pkill -f 'tsx.*server' 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

# Start without watch
NODE_ENV=development npx tsx server/index.ts