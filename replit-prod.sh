#!/bin/bash

echo "🚀 Starting Practice Intelligence in Production Mode..."
echo "=============================================="

# Set Node.js 20 path
NODE20_PATHS=$(compgen -G "/nix/store/*nodejs-20*/bin" 2>/dev/null || true)
if [ -n "$NODE20_PATHS" ]; then
    NODE20_BIN=$(echo "$NODE20_PATHS" | head -n1)
    export PATH="$NODE20_BIN:$PATH"
    echo "✓ Node.js 20 configured"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci
    echo "✓ Dependencies installed"
fi

# Build the application
echo "Building the application..."
npm run build
echo "✓ Build complete"

# Create required directories
mkdir -p logs temp_uploads uploads data

echo ""
echo "=============================================="
echo "🎉 Practice Intelligence is ready!"
echo "=============================================="
echo ""
echo "🔗 Access Information:"
echo "   - Local URL: http://localhost:3000"
echo "   - Use the preview window in Replit"
echo ""

# Start in production mode
# NODE_ENV should be set as deployment environment variable instead
PORT=3000 npm start