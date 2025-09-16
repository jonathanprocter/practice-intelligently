#!/bin/bash
echo "Starting Therapy Practice Management System..."
PORT=5000 NODE_ENV=development npx tsx server/index.ts
#!/bin/bash
echo "🚀 Starting Practice Intelligence App..."

# Kill any existing processes
pkill -f "tsx.*server/index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Wait for processes to stop
sleep 2

# Set environment
export NODE_ENV=development
export PORT=5000

echo "Starting server on port 5000..."

# Start the application using the existing dev command
npm run dev

