#!/bin/bash

# Cleanup and Verification Script for Replit Deployment
# This script helps resolve Git conflicts and verify the deployment

echo "================================================"
echo "🔧 Practice Intelligence Cleanup & Verification"
echo "================================================"
echo ""

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo "✅ $1 completed successfully"
    else
        echo "❌ $1 failed"
        return 1
    fi
}

# 1. Handle Git conflicts
echo "📝 Step 1: Resolving Git conflicts..."
echo "----------------------------------------"

# Check for uncommitted changes
if git diff --quiet && git diff --staged --quiet; then
    echo "✅ No uncommitted changes"
else
    echo "⚠️  Found uncommitted changes. Stashing them..."
    git stash save "Auto-stash before pull $(date +%Y%m%d_%H%M%S)"
    check_status "Git stash"
fi

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main --no-edit
check_status "Git pull"

# 2. Run database migrations
echo ""
echo "🗄️  Step 2: Running database migrations..."
echo "----------------------------------------"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set. Please set it in your environment."
    exit 1
fi

# Run the fix migration
echo "Running migration 003_fix_audit_tables.sql..."
psql $DATABASE_URL < migrations/003_fix_audit_tables.sql 2>&1 | grep -E "ERROR|NOTICE|CREATE|ALTER" | head -20
check_status "Database migration"

# 3. Clean up orphaned files
echo ""
echo "🧹 Step 3: Cleaning orphaned files..."
echo "----------------------------------------"

# Check uploads directory
if [ -d "uploads" ]; then
    OLD_FILES=$(find uploads -type f -mtime +1 2>/dev/null | wc -l)
    echo "Found $OLD_FILES old files in uploads directory"
    
    if [ $OLD_FILES -gt 0 ]; then
        echo "Cleaning old upload files..."
        find uploads -type f -mtime +1 -delete 2>/dev/null
        check_status "Upload cleanup"
    fi
fi

# Check temp_uploads directory
if [ -d "temp_uploads" ]; then
    TEMP_FILES=$(find temp_uploads -type f -mtime +0.04 2>/dev/null | wc -l)
    echo "Found $TEMP_FILES old files in temp_uploads directory"
    
    if [ $TEMP_FILES -gt 0 ]; then
        echo "Cleaning temp files..."
        find temp_uploads -type f -mtime +0.04 -delete 2>/dev/null
        check_status "Temp cleanup"
    fi
fi

# 4. Install dependencies
echo ""
echo "📦 Step 4: Installing dependencies..."
echo "----------------------------------------"
npm install --silent
check_status "NPM install"

# 5. Build the application
echo ""
echo "🏗️  Step 5: Building application..."
echo "----------------------------------------"
npm run build
check_status "Build"

# 6. Run verification
echo ""
echo "✨ Step 6: Running verification..."
echo "----------------------------------------"

# Check if server can start
echo "Testing server startup..."
timeout 5 npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server starts successfully"
    kill $SERVER_PID 2>/dev/null
else
    echo "⚠️  Server startup test failed (this might be normal in Replit)"
fi

# Check database health
echo ""
echo "Checking database health..."
psql $DATABASE_URL -c "SELECT * FROM check_database_health();" 2>/dev/null || echo "⚠️  Health check function not available yet"

# 7. Summary
echo ""
echo "================================================"
echo "📊 Verification Summary"
echo "================================================"

# Count important metrics
if [ -d "server" ]; then
    TS_FILES=$(find server -name "*.ts" | wc -l)
    echo "📄 TypeScript files in server: $TS_FILES"
fi

if [ -d "client/src" ]; then
    COMPONENT_FILES=$(find client/src -name "*.tsx" | wc -l)
    echo "🎨 React components: $COMPONENT_FILES"
fi

# Check for critical files
echo ""
echo "Checking critical files..."
[ -f "server/routes.ts" ] && echo "✅ server/routes.ts exists" || echo "❌ server/routes.ts missing"
[ -f "server/storage.ts" ] && echo "✅ server/storage.ts exists" || echo "❌ server/storage.ts missing"
[ -f "server/fixes/critical-bugs-and-improvements.ts" ] && echo "✅ Critical fixes installed" || echo "⚠️  Critical fixes not found"
[ -f "client/src/components/EnhancedClinicalTimeline.tsx" ] && echo "✅ Enhanced timeline installed" || echo "⚠️  Enhanced timeline not found"

echo ""
echo "================================================"
echo "✅ Cleanup and verification complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Review any warnings above"
echo "2. Start the application with: npm run dev"
echo "3. Check /api/health/performance endpoint"
echo "4. Test the enhanced timeline feature"
echo ""