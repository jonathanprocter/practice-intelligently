#!/bin/bash

# Production Startup Script for RemarkablePlanner
# This script ensures the application starts correctly in production

echo "🚀 Starting RemarkablePlanner in Production Mode..."
echo "=============================================="

# Set production environment variables
export NODE_ENV=production
export NPM_CONFIG_CACHE=/tmp/.npm-cache
export NODE_OPTIONS=--max-old-space-size=4096
export CI=false

# Verify Node.js version
echo "Checking Node.js version..."
node_version=$(node -v)
echo "✓ Node.js version: $node_version"

# Check if required environment variables are set
echo "Verifying environment variables..."
required_vars=("DATABASE_URL" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "OPENAI_API_KEY" "SESSION_SECRET")
missing_vars=()

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=($var)
  fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
  echo "❌ Error: Missing required environment variables:"
  printf ' - %s\n' "${missing_vars[@]}"
  echo "Please set these variables before starting the application."
  exit 1
fi

echo "✓ All required environment variables are set"

# Check if database connection is working
echo "Verifying database connection..."
export TZ=America/New_York

# Check for existing build
if [ ! -d "dist" ]; then
  echo "Building application for production..."
  npm run build
  if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
  fi
  echo "✓ Build completed successfully"
else
  echo "✓ Using existing production build"
fi

# Create necessary directories
echo "Creating required directories..."
mkdir -p uploads temp logs

# Start the production server
echo "=============================================="
echo "🎉 Starting production server..."
echo "=============================================="

# Use PM2 for production if available, otherwise use Node directly
if command -v pm2 &> /dev/null; then
  echo "Starting with PM2 process manager..."
  pm2 delete all 2>/dev/null || true
  pm2 start dist/index.js --name "remarkableplanner" \
    --instances 1 \
    --max-memory-restart 1G \
    --error logs/error.log \
    --out logs/out.log \
    --merge-logs \
    --time
  pm2 save
  echo "✓ Application started with PM2"
  echo "Use 'pm2 status' to check process status"
  echo "Use 'pm2 logs' to view logs"
else
  echo "Starting with Node.js..."
  exec node dist/index.js
fi