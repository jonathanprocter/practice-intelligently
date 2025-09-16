#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Starting Practice Intelligence Initialization..."

# 1. Install Dependencies
echo "📦 Installing npm dependencies..."
npm install

# 2. Setup Environment
if [ ! -f .env ]; then
  echo "🔑 No .env file found. Copying from .env.development..."
  cp .env.development .env
else
  echo "✅ .env file already exists."
fi

# 3. Setup Database
echo "🗄️ Setting up SQLite database for development..."
# The script will create the db file if it doesn't exist
node server/seed-database.js

# 4. Start the application with PM2
echo "🚀 Launching application with PM2..."
# Kill any existing process first
pm2 delete practice-intelligence 2>/dev/null || true
sleep 2

# Start the application
pm2 start --name "practice-intelligence" npm -- run dev

# Wait for the server to start
echo "⏳ Waiting for server to start..."
sleep 5

pm2 logs --lines 15

# 5. Run System Audit after server is running
echo "🩺 Running comprehensive system audit..."
node comprehensive-system-audit.js

echo "✅ Initialization complete! Your application is running."
echo "🔗 Access it in the Replit Webview."