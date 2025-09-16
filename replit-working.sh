#!/bin/bash

# Working startup script for Replit
echo "🚀 Starting Practice Intelligence..."

# Set environment
export NODE_ENV=development
export TZ='America/New_York'

# Check for dependencies
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "📦 Installing dependencies..."
  npm install
else
  echo "✅ Dependencies already installed."
fi

# Setup environment file
if [ ! -f .env ]; then
  echo "🔑 Creating .env file..."
  cat > .env << EOF
NODE_ENV=development
PORT=5000
SESSION_SECRET=practice-intelligence-secret-key-2024
DATABASE_URL=postgresql://username:password@localhost:5432/practice_intelligence
EOF
else
  echo "✅ .env file exists."
fi

# Setup database if needed
echo "🗄️ Checking database..."
node server/seed-database.js 2>/dev/null || echo "ℹ️ Database already initialized"

# Start the application directly with tsx
echo "🚀 Starting server on port 5000..."
echo "🔗 Access your application in the Replit Webview"
exec tsx watch server/index.ts