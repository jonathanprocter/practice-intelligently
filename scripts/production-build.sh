#!/bin/bash

echo "================================================"
echo "🚀 Production Build Script"
echo "================================================"

# Set production environment
export NODE_ENV=production

# Use the production vite config
echo "📦 Using production Vite configuration..."
cp vite.config.production.ts vite.config.ts

# Install terser if not present (needed for minification)
if ! npm list terser >/dev/null 2>&1; then
    echo "📦 Installing terser for minification..."
    npm install --save-dev terser
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/public

# Build the client
echo "🏗️ Building client application..."
npx vite build

# Check if client build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Client build successful"
else
    echo "❌ Client build failed"
    exit 1
fi

# Build the server
echo "🏗️ Building server application..."
npx esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outdir=dist \
    --minify

# Check if server build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Server build successful"
else
    echo "❌ Server build failed"
    exit 1
fi

# Create production package.json
echo "📄 Creating production package.json..."
cat > dist/package.json << 'EOF'
{
  "name": "practice-intelligence-production",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {}
}
EOF

# Copy necessary files
echo "📁 Copying production files..."
cp -r .env.example dist/ 2>/dev/null || true
cp -r migrations dist/ 2>/dev/null || true

# Create production README
cat > dist/README.md << 'EOF'
# Practice Intelligence - Production Build

## To Deploy:

1. Set environment variables in `.env` file
2. Run database migrations: `psql $DATABASE_URL < migrations/*.sql`
3. Start the server: `npm start`

## Environment Variables Required:
- DATABASE_URL
- OPENAI_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- SESSION_SECRET

## Port:
The application runs on port 5000 by default (configurable via PORT env var)
EOF

# Calculate build size
TOTAL_SIZE=$(du -sh dist | cut -f1)

echo ""
echo "================================================"
echo "✅ Production Build Complete!"
echo "================================================"
echo "📊 Build Statistics:"
echo "   Total Size: $TOTAL_SIZE"
echo "   Client: $(du -sh dist/public 2>/dev/null | cut -f1 || echo 'N/A')"
echo "   Server: $(du -h dist/index.js | cut -f1)"
echo ""
echo "📁 Build output: ./dist"
echo ""
echo "🚀 To start production server:"
echo "   cd dist && npm start"
echo "================================================"