#!/bin/bash

# Production Start Script - Workaround for protected file restrictions
# NODE_ENV should be set as a deployment environment variable

echo "🚀 Starting application in production mode..."
echo "=============================================="

# Check if NODE_ENV is set
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  WARNING: NODE_ENV is not set to 'production'"
    echo "   Set NODE_ENV=production in your deployment environment variables"
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found"
    echo "   Please run the build process first:"
    echo "   bash deploy-fix.sh"
    exit 1
fi

# Check if main file exists
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: dist/index.js not found"
    echo "   Please run the build process first:"
    echo "   bash deploy-fix.sh"
    exit 1
fi

# Start the application
echo "Starting server..."
echo "Port: ${PORT:-3000}"
echo "Environment: ${NODE_ENV:-development}"
echo ""

export NODE_NO_WARNINGS=1

# Start without hardcoded NODE_ENV
exec node dist/index.js
