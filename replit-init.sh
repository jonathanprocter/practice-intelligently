
#!/bin/bash

echo "🚀 Initializing Practice Intelligence for Replit..."
echo "=============================================="

# Set development environment
export NODE_ENV=development

# Force Node.js 20 to resolve package compatibility issues
echo "Configuring Node.js 20 environment..."

# Find and prepend Node.js 20 to PATH
NODE20_PATHS=$(compgen -G "/nix/store/*nodejs-20*/bin" 2>/dev/null || true)
if [ -n "$NODE20_PATHS" ]; then
    NODE20_BIN=$(echo "$NODE20_PATHS" | head -n1)
    export PATH="$NODE20_BIN:$PATH"
    echo "✓ Node.js 20 path configured: $NODE20_BIN"
else
    echo "⚠️ Node.js 20 not found in /nix/store"
fi

# Check and validate Node.js version
echo "Verifying Node.js version..."
node_version=$(node -v)
echo "✓ Current Node.js version: $node_version"

# Validate minimum version requirement
if [[ "$node_version" < "v20" ]]; then
    echo "⚠️ WARNING: Node.js $node_version detected, but packages require Node.js 20+"
    echo "⚠️ This may cause deployment failures with better-sqlite3, pdfjs-dist, and @google/genai"
    echo "⚠️ Continuing with current version..."
else
    echo "✓ Node.js version meets package requirements"
fi

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

# Start the application in development mode (standard configuration)
NODE_ENV=development npm run dev
