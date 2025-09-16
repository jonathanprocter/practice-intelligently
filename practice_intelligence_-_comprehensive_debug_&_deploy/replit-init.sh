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

# 4. Run System Audit
echo "🩺 Running comprehensive system audit..."
node comprehensive-system-audit.js

# 5. Start the application with PM2
echo "🚀 Launching application with PM2..."
# Check if the process is already running
pm2 describe practice-intelligence > /dev/null
if [ $? -ne 0 ]; then
  # Not running, so start it
  pm2 start --name "practice-intelligence" npm -- run dev
else
  # Already running, so restart it to apply changes
  pm2 restart practice-intelligence
fi

pm2 logs --lines 15

echo "✅ Initialization complete! Your application is running."
echo "🔗 Access it in the Replit Webview."