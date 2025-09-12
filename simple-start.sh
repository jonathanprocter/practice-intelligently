#!/bin/bash

echo "🚀 Starting Practice Intelligence with Simple Server..."
echo "=============================================="

# Set environment variables
export NODE_ENV=development
export DANGEROUSLY_DISABLE_HOST_CHECK=true

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Starting server on port 3000..."
echo ""
echo "🔗 Access your app at:"
echo "   - http://localhost:3000"
echo "   - Use the preview window in Replit"
echo ""
echo "👤 Default Login:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo ""

# Run with direct Vite command to bypass the custom server setup
cd client && npx vite --host 0.0.0.0 --port 3000 --clearScreen false