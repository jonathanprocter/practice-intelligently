#!/bin/bash

echo "🔍 Finding Node.js 18..."

# Find Node 18 in the nix store
NODE18=$(find /nix/store -name node -type f 2>/dev/null | xargs -I {} sh -c '{} --version 2>/dev/null | grep -q "v18" && echo {}' | head -n 1)

if [ -z "$NODE18" ]; then
    echo "❌ Node 18 not found. Installing..."
    # Try to install Node 18 via nix
    nix-env -iA nixpkgs.nodejs-18_x 2>/dev/null || nix-env -iA nixpkgs.nodejs_18 2>/dev/null
    NODE18=$(find /nix/store -name node -type f 2>/dev/null | xargs -I {} sh -c '{} --version 2>/dev/null | grep -q "v18" && echo {}' | head -n 1)
fi

if [ ! -z "$NODE18" ]; then
    echo "✅ Found Node 18 at: $NODE18"
    echo "🚀 Starting server..."
    $NODE18 server/index.js
else
    echo "⚠️ Could not find Node 18, trying alternative..."
    # Try using nix-shell directly
    nix-shell -p nodejs-18_x --run "node server/index.js"
fi