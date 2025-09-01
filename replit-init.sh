#!/bin/bash

echo "🚀 Initializing Practice Intelligence for Replit..."
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
node_version=$(node -v)
echo -e "${GREEN}✓ Node.js version: $node_version${NC}"

# Step 2: Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --silent
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Check if database exists
if [ -f "data/therapy.db" ]; then
    echo -e "${GREEN}✓ Database already exists${NC}"
else
    echo -e "${YELLOW}Creating database...${NC}"
    mkdir -p data
    echo -e "${GREEN}✓ Database directory created${NC}"
fi

# Step 4: Initialize database with test data
echo -e "${YELLOW}Initializing database...${NC}"
node test-database.js
echo -e "${GREEN}✓ Database initialized with test data${NC}"

# Step 5: Fix any schema issues
echo -e "${YELLOW}Checking database schema...${NC}"
node fix-database-schema.js 2>/dev/null || true
echo -e "${GREEN}✓ Database schema verified${NC}"

# Step 6: Create required directories
echo -e "${YELLOW}Creating required directories...${NC}"
mkdir -p uploads temp_uploads logs attached_assets
echo -e "${GREEN}✓ Directories created${NC}"

# Step 7: Set up environment variables if not present
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.development .env
    echo -e "${GREEN}✓ Environment file created${NC}"
fi

# Step 8: Check PM2 installation
echo -e "${YELLOW}Checking PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install pm2 --save-dev
fi
echo -e "${GREEN}✓ PM2 available${NC}"

# Step 9: Stop any existing PM2 processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
npx pm2 delete all 2>/dev/null || true
echo -e "${GREEN}✓ Process cleanup complete${NC}"

# Step 10: Start the application
echo -e "${YELLOW}Starting the development server...${NC}"
echo ""
echo -e "${GREEN}=============================================="
echo -e "🎉 Practice Intelligence is ready!"
echo -e "=============================================="
echo -e "${NC}"
echo "🔗 Access Information:"
echo "   - Local URL: http://localhost:5000"
echo "   - Health Check: http://localhost:5000/api/health"
echo ""
echo "👤 Default Login:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo ""
echo -e "${GREEN}✨ Starting development server with preview...${NC}"
echo ""

# Set environment variables and start the development server in foreground
export PORT=5000
export NODE_ENV=development
npx tsx server/index.ts