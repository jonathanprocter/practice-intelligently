#!/bin/bash
echo "Starting Therapy Practice Management System (Direct Mode)..."

# Kill any existing processes
pkill -f "server/index.ts" 2>/dev/null || true
pkill -f "tsx" 2>/dev/null || true

# Set environment variables
export NODE_ENV=development
export PORT=5000

# Try to start with tsx directly, ignoring OpenSSL warnings
echo "Attempting direct tsx start..."
npx tsx server/index.ts 2>&1 | grep -v "OPENSSL" &

# Give it time to start
sleep 5

# Check if it's running
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Server successfully started on port 5000"
    echo "🌐 Access your app at: http://localhost:5000"
else
    echo "❌ Server startup failed"
    echo "Checking server log..."
    tail -20 server.log 2>/dev/null || echo "No server log found"
fi