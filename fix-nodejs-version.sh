#!/bin/bash
# Script to ensure Node.js 20 is used for deployment

echo "🔧 Fixing Node.js version configuration..."

# Find Node.js 20 in the nix store
NODE20_PATHS=$(compgen -G "/nix/store/*nodejs-20*/bin" 2>/dev/null || true)

if [ -n "$NODE20_PATHS" ]; then
    NODE20_BIN=$(echo "$NODE20_PATHS" | head -n1)
    echo "✅ Found Node.js 20 at: $NODE20_BIN"
    
    # Export the correct Node.js 20 path
    export PATH="$NODE20_BIN:$PATH"
    
    # Verify the version
    node_version=$(node -v)
    echo "✅ Using Node.js version: $node_version"
    
    if [[ "$node_version" == v20* ]]; then
        echo "✅ Node.js 20 is correctly configured"
    else
        echo "❌ Warning: Expected Node.js 20 but got $node_version"
        echo "This may cause deployment issues"
    fi
else
    echo "❌ Node.js 20 not found in /nix/store"
    echo "Attempting to use current Node.js version..."
    node_version=$(node -v)
    echo "Current version: $node_version"
fi

echo ""
echo "📝 Note: The Node.js version mismatch issue is caused by:"
echo "   - .replit declares 'nodejs-20' in modules"
echo "   - But PATH points to nodejs-18.20.8"
echo ""
echo "📌 To fix permanently:"
echo "   1. Remove the PATH override in .replit [env] section"
echo "   2. Let Replit use the nodejs-20 module declared"
echo "   3. Or manually update all references to use Node.js 20"
echo ""
echo "✅ This script has set up Node.js 20 for the current session"