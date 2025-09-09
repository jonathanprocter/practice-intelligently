#!/bin/bash

echo "Starting simple production build..."

# Create dist directories
mkdir -p dist/public
mkdir -p dist

# Build client with esbuild directly (much faster than Vite)
echo "Building client with esbuild..."
npx esbuild client/src/main.tsx \
  --bundle \
  --outfile=dist/public/app.js \
  --loader:.tsx=tsx \
  --loader:.ts=ts \
  --loader:.css=css \
  --loader:.png=dataurl \
  --loader:.jpg=dataurl \
  --loader:.svg=dataurl \
  --jsx=automatic \
  --platform=browser \
  --target=es2020 \
  --define:process.env.NODE_ENV=\"production\" \
  --alias:@=./client/src \
  --alias:@shared=./shared \
  --external:*.png \
  --external:*.jpg \
  --external:*.svg \
  2>&1

if [ $? -ne 0 ]; then
  echo "Client build failed"
  exit 1
fi

# Copy index.html and modify it
echo "Copying HTML..."
cat > dist/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Practice Portal</title>
    <style>
      /* Include critical CSS inline */
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, sans-serif; }
      #root { min-height: 100vh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="/app.js"></script>
  </body>
</html>
EOF

# Build server (server/index.ts already defines __dirname polyfill)
echo "Building server..."
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  2>&1

if [ $? -ne 0 ]; then
  echo "Server build failed"
  exit 1
fi

echo "Build complete!"
echo "Files created in dist/"
ls -la dist/