#!/bin/bash
export NODE_ENV=production
export NODE_NO_WARNINGS=1
echo "Starting production server..."
node dist/index.js
