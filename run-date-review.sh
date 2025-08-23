
#!/bin/bash

echo "🔍 Starting Service Date Review..."
echo "=================================="

# Check if required environment variables are set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY environment variable is not set"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ Environment variables check passed"
echo ""

# Run the Node.js review script
echo "🚀 Starting AI-powered date extraction review..."
node review-service-dates.js

echo ""
echo "🏁 Review complete!"
