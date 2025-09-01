#!/bin/bash
export NODE=/nix/store/ys5qb8fr8gq3ifk2knndn5lgm5lvhabb-nodejs-18.20.8/bin/node
export NPM=/nix/store/ys5qb8fr8gq3ifk2knndn5lgm5lvhabb-nodejs-18.20.8/bin/npm

echo "Using Node.js 18..."
$NODE --version

echo "Starting server..."
$NODE node_modules/.bin/tsx server/index.ts
