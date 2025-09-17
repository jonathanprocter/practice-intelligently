#!/bin/bash

echo "🔧 Practice Intelligence - Complete Fix & Start"
echo "=============================================="

# Step 1: Clean everything
echo "Step 1: Cleaning up..."
pkill -f tsx 2>/dev/null || true
pkill -f node 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Step 2: Fix dependencies
echo "Step 2: Fixing dependencies..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Step 3: Test basic server
echo "Step 3: Testing server..."
timeout 5 npx tsx test-server.ts &
TEST_PID=$!
sleep 3

if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Test server works! Port 5000 is accessible"
    kill $TEST_PID 2>/dev/null || true
    sleep 1

    # Step 4: Start real server
    echo "Step 4: Starting application server..."
    npx tsx server/server-fixed.ts
else
    echo "❌ Port 5000 is not accessible. Trying alternative..."
    kill $TEST_PID 2>/dev/null || true

    # Try simple server
    echo "Starting simple server instead..."
    npx tsx server/index-simple.ts
fi