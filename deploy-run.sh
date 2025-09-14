#!/bin/bash
# Deployment run script without hardcoded NODE_ENV
# This script will use the NODE_ENV set by Replit's Publishing environment variables

echo "🚀 Starting production server..."
echo "NODE_ENV is: ${NODE_ENV:-not set}"
echo "PORT is: ${PORT:-will be assigned by platform}"

# Run the server directly with node instead of npm start (which hardcodes NODE_ENV)
node dist/index.js