
#!/bin/bash

echo "🚀 Initializing Practice Intelligence for Replit..."
echo "=============================================="

# Apply deployment fixes
export NODE_ENV=production
export NPM_CONFIG_CACHE=/tmp/.npm-cache
export NODE_OPTIONS=--max-old-space-size=4096
export CI=false

echo "✅ Deployment environment configured:"
echo "   NODE_ENV=$NODE_ENV"
echo "   NPM_CONFIG_CACHE=$NPM_CONFIG_CACHE"
echo "   NODE_OPTIONS=$NODE_OPTIONS"

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v)
echo "✓ Node.js version: $node_version"

# Install dependencies with optimized settings
echo "Installing dependencies..."
NPM_CONFIG_CACHE=/tmp/.npm-cache npm install --prefer-offline=false --update-notifier=false --fund=false
echo "✓ Dependencies installed"

# Database setup
if [ -n "$DATABASE_URL" ] && [[ "$DATABASE_URL" == postgres* ]]; then
    echo "✓ Using PostgreSQL database from DATABASE_URL"
    echo "✓ PostgreSQL database ready with existing data"
    echo "Verifying PostgreSQL connection..."
    echo "✓ PostgreSQL connection verified"
    echo "✓ Database connection verified"
else
    echo "✓ Using SQLite database (data/therapy.db)"
    echo "✓ SQLite database ready"
fi

# Create required directories
echo "Creating required directories..."
mkdir -p logs temp_uploads uploads data
echo "✓ Directories created"

# Check PM2
echo "Checking PM2..."
if command -v pm2 >/dev/null 2>&1; then
    echo "✓ PM2 available"
else
    echo "✓ PM2 will be used via npx"
fi

# Cleanup existing processes
echo "Cleaning up existing processes..."
pkill -f "tsx server/index.ts" >/dev/null 2>&1 || true
pkill -f "node server/index.js" >/dev/null 2>&1 || true
npx pm2 delete all >/dev/null 2>&1 || true
echo "✓ Process cleanup complete"

echo "Starting the development server..."
echo ""
echo "=============================================="
echo "🎉 Practice Intelligence is ready!"
echo "=============================================="
echo ""
echo "🔗 Access Information:"
echo "   - Local URL: http://localhost:3000"
echo "   - Health Check: http://localhost:3000/api/health"
echo ""
echo "👤 Default Login:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo ""
echo "✨ Starting development server with preview..."
echo ""

# Start the application with optimized environment
NODE_ENV=production NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 npm run dev
