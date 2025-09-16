#!/bin/bash
# fix-dependencies.sh

echo "Fixing dependency conflicts..."

# Option 1: Use legacy peer deps (quickest fix)
npm install --legacy-peer-deps

# If that doesn't work, try Option 2: Update openai to a version compatible with zod v4
cat > fix-deps.js << 'EOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update openai to latest version that supports zod v4
pkg.dependencies["openai"] = "^4.67.0";
pkg.dependencies["zod"] = "^3.23.8";  // Downgrade zod to be compatible

// Or keep zod v4 and update openai
// pkg.dependencies["openai"] = "^4.73.0";  // Latest version may have better zod v4 support

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Updated package versions');
EOF

# Run the fix
node fix-deps.js

# Clean install with legacy peer deps
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Install ts-node with legacy flag
npm install --save-dev ts-node --legacy-peer-deps

echo "Dependencies fixed!"
