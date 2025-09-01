#!/bin/bash

echo "🔄 Replit-GitHub Synchronization Check"
echo "======================================="
echo ""
echo "Run this script in your Replit console to verify sync"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if [ -d .git ]; then
    echo -e "${GREEN}✅ Git repository detected${NC}"
else
    echo -e "${RED}❌ Not a git repository. You need to import from GitHub first${NC}"
    echo ""
    echo "To import in Replit:"
    echo "1. Create a new Repl"
    echo "2. Choose 'Import from GitHub'"
    echo "3. Use URL: https://github.com/jonathanprocter/practice-intelligence_clients"
    exit 1
fi

echo ""
echo "📊 Current Git Status:"
echo "----------------------"

# Check current branch
current_branch=$(git branch --show-current)
echo "Branch: $current_branch"

# Check latest commit
latest_commit=$(git rev-parse HEAD)
echo "Latest commit: ${latest_commit:0:7}"

# Check if this matches the expected commit
expected_commit="ca855b49fc722258d1aa11fe37661c931da4e1ec"
if [ "$latest_commit" = "$expected_commit" ]; then
    echo -e "${GREEN}✅ You have the latest version from GitHub${NC}"
else
    echo -e "${YELLOW}⚠️  Your version might be outdated${NC}"
    echo "Expected commit: ${expected_commit:0:7}"
    echo ""
    echo "To update from GitHub:"
    echo "git fetch origin"
    echo "git pull origin main"
fi

echo ""
echo "📁 Checking Critical Files:"
echo "---------------------------"

# Check for critical files
critical_files=(
    "server/document-fix.ts"
    "server/document-processor.ts"
    "server/documentProcessor.ts"
    "server/documentTagger.ts"
    "client/src/hooks/useDocuments.ts"
    "client/src/components/DocumentsView.tsx"
    "README.md"
    "REPLIT_SETUP.md"
    ".replit"
    "replit.nix"
    "package.json"
)

missing_files=0
for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $file"
    else
        echo -e "${RED}❌${NC} $file (MISSING)"
        missing_files=$((missing_files + 1))
    fi
done

echo ""
echo "📂 Checking Directories:"
echo "------------------------"

# Check for required directories
directories=(
    "uploads"
    "temp_uploads"
    "server"
    "client"
    "shared"
)

missing_dirs=0
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✅${NC} $dir/"
    else
        echo -e "${YELLOW}⚠️${NC} $dir/ (Creating...)"
        mkdir -p "$dir"
        missing_dirs=$((missing_dirs + 1))
    fi
done

echo ""
echo "🔐 Checking Environment Variables:"
echo "----------------------------------"

# Check for environment variables (in Replit they should be in Secrets)
env_vars=(
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
    "GEMINI_API_KEY"
    "PERPLEXITY_API_KEY"
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "SESSION_SECRET"
)

missing_env=0
for var in "${env_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}⚠️${NC} $var - Not set (Add in Replit Secrets)"
        missing_env=$((missing_env + 1))
    else
        echo -e "${GREEN}✅${NC} $var - Configured"
    fi
done

echo ""
echo "📦 Checking Node Modules:"
echo "------------------------"

if [ -d "node_modules" ]; then
    module_count=$(find node_modules -maxdepth 1 -type d | wc -l)
    echo -e "${GREEN}✅${NC} node_modules exists ($module_count packages)"
else
    echo -e "${YELLOW}⚠️${NC} node_modules missing - Run: npm install"
fi

echo ""
echo "======================================="
echo "📊 SYNCHRONIZATION SUMMARY"
echo "======================================="
echo ""

if [ $missing_files -eq 0 ] && [ $missing_dirs -eq 0 ]; then
    echo -e "${GREEN}✅ All files and directories are present${NC}"
    echo ""
    echo "Next steps:"
    
    if [ $missing_env -gt 0 ]; then
        echo "1. Add missing environment variables in Replit Secrets"
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "2. Install dependencies: npm install"
    fi
    
    echo "3. Setup database: npm run db:push"
    echo "4. Build application: npm run build"
    echo "5. Start server: npm start"
else
    echo -e "${RED}❌ Some files are missing${NC}"
    echo ""
    echo "This might mean:"
    echo "1. The import from GitHub was incomplete"
    echo "2. You're using an older version"
    echo ""
    echo "To fix:"
    echo "1. Run: git fetch origin"
    echo "2. Run: git pull origin main"
    echo "3. If that doesn't work, re-import from GitHub"
fi

echo ""
echo "GitHub Repository:"
echo "https://github.com/jonathanprocter/practice-intelligence_clients"
echo ""
echo "Latest commit should be: ca855b4"
echo "Your commit is: ${latest_commit:0:7}"