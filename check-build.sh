#!/bin/bash

echo "Starting TypeScript compilation check..."
echo "================================"

# Try to compile just the client
echo "Checking client compilation..."
cd client && npx tsc --noEmit 2>&1 | head -30
CLIENT_EXIT=$?
cd ..

echo ""
echo "================================"
echo "Checking server compilation..."
# Try to compile just the server
cd server && npx tsc --noEmit 2>&1 | head -30
SERVER_EXIT=$?
cd ..

echo ""
echo "================================"
if [ $CLIENT_EXIT -eq 0 ] && [ $SERVER_EXIT -eq 0 ]; then
  echo "✅ Both client and server compiled successfully!"
  exit 0
else
  echo "❌ Compilation errors found"
  [ $CLIENT_EXIT -ne 0 ] && echo "  - Client has errors"
  [ $SERVER_EXIT -ne 0 ] && echo "  - Server has errors"
  exit 1
fi