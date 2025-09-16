#!/bin/bash

# Simple development startup script that bypasses PM2
echo "🚀 Starting Practice Intelligence (Development Mode)..."

# Set environment
export NODE_ENV=development
export TZ='America/New_York'

# Install dependencies if needed
echo "📦 Checking dependencies..."
npm install 2>/dev/null || true

# Setup environment file
if [ ! -f .env ]; then
  echo "🔑 No .env file found. Copying from .env.development..."
  cp .env.development .env 2>/dev/null || echo "⚠️ No .env.development found"
else
  echo "✅ .env file exists."
fi

# Setup database if needed
echo "🗄️ Setting up database..."
node server/seed-database.js 2>/dev/null || echo "⚠️ Database already initialized"

# Start the application directly with tsx
echo "🚀 Starting server..."
exec tsx watch server/index.ts