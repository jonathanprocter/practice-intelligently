#!/bin/bash
export NODE_ENV=production
export PORT=${PORT:-5000}

# Try to run the compiled JavaScript first
if [ -f "dist/server/index.js" ]; then
  node dist/server/index.js
else
  # Fallback to ts-node if compilation failed
  npx ts-node --transpile-only --skip-project server/index.ts
fi
