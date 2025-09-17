#!/bin/bash

echo "🚀 Quick Start - Practice Intelligence App"
echo "========================================="

# Function to kill processes on a port
kill_port() {
    local port=$1
    echo "Clearing port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
}

# Clean up
echo "🧹 Cleaning up existing processes..."
pkill -f 'tsx.*server' 2>/dev/null || true
pkill -f 'vite' 2>/dev/null || true
kill_port 5000
kill_port 5173
kill_port 3001

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "$1" == "--fresh" ]; then
    echo "📦 Installing dependencies..."
    rm -rf node_modules package-lock.json 2>/dev/null
    npm install --legacy-peer-deps
fi

# Start the server
echo "✅ Starting server..."
NODE_ENV=development npx tsx server/index.ts