#!/bin/bash
# NODE_ENV should be set as environment variable in deployment, not hardcoded
export NODE_NO_WARNINGS=1
echo "Starting production server..."
node dist/index.js
