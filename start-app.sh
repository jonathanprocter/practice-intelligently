#!/bin/bash

echo "Starting Practice Intelligence Application..."

# Kill any existing server processes
pkill -f "tsx server/index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Wait for processes to stop
sleep 2

# Start the application
echo "Starting server on port 5000..."
NODE_ENV=development tsx server/index.ts &

# Wait for server to initialize
sleep 5

# Check if server is running
if curl -s http://localhost:5000 > /dev/null 2>&1; then
    echo ""
    echo "✅ Application is running successfully!"
    echo ""
    echo "🌐 Access your application at: http://localhost:5000"
    echo ""
    echo "📊 Practice Intelligence System is ready to use"
    echo "   - Client Management"
    echo "   - Appointment Scheduling"
    echo "   - Session Notes"
    echo "   - AI-Powered Insights"
else
    echo "⚠️  Server may still be starting up. Please wait a moment..."
fi

# Keep the script running
tail -f /dev/null