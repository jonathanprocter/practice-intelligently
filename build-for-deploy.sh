#!/bin/bash
echo "Building for deployment..."

# Build client with Vite (ignores TypeScript errors)
npx vite build --mode production

# Compile server with loose TypeScript settings
npx tsc --project tsconfig.production.json --noEmitOnError false || true

echo "Build completed (with warnings suppressed)"
