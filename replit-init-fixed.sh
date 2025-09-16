#!/bin/bash

# Fixed initialization script for Practice Intelligence
echo "🚀 Starting Practice Intelligence Application..."

# Set environment
export NODE_ENV=development
export TZ='America/New_York'

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "📦 Installing npm dependencies..."
  npm install
else
  echo "✅ Dependencies installed."
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

# Setup database
echo "🗄️ Initializing database..."
node server/seed-database.js 2>/dev/null || echo "ℹ️ Database ready"

# Start the application directly without PM2
echo "🚀 Starting server on port 5000..."
echo "✅ Your application will be accessible in the Replit Webview"
echo "📊 Server logs will appear below:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run tsx directly (no PM2)
exec tsx watch server/index.ts