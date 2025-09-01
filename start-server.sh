#!/bin/bash
# Load environment variables from .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Start the server with tsx
npx tsx server/index.ts