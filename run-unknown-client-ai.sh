
#!/bin/bash

echo "🚀 Starting Unknown Client AI Processing..."
echo "=========================================="

# Check if required environment variables are set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY environment variable not set"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable not set"
    exit 1
fi

# Run the Python script
python3 unknown_client_ai_processor.py

echo ""
echo "✅ Unknown Client AI Processing completed!"
echo "Check the generated report file for detailed results."
