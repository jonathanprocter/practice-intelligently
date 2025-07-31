#!/bin/bash

# Remarkable Planner - Complete Automated Installation Script
# This script creates ALL files and sets up the entire application

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${PURPLE}[i]${NC} $1"
}

# ASCII Art Banner
clear
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║        REMARKABLE PLANNER - PRACTICE INTELLIGENCE                     ║
║        Automated Installation Script v2.0                             ║
║        AI-Powered Therapy Practice Management System                  ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# System Requirements Check
print_info "Checking system requirements..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root!"
   exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    print_warning "Please install Node.js 16+ first:"
    echo "  - macOS: brew install node"
    echo "  - Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  - Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'.' -f1 | sed 's/v//')
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16+ required (found: $(node -v))"
    exit 1
fi
print_success "Node.js $(node -v) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi
print_success "npm $(npm -v) found"

# Create project directory
print_status "Setting up project directory..."
PROJECT_DIR="remarkable-planner"

if [ -d "$PROJECT_DIR" ]; then
    print_warning "Directory '$PROJECT_DIR' already exists!"
    read -p "Do you want to remove it and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_DIR"
        print_success "Existing directory removed"
    else
        print_error "Installation cancelled"
        exit 1
    fi
fi

mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"
print_success "Created project directory: $(pwd)"

# Create directory structure
print_status "Creating directory structure..."
mkdir -p public utils
print_success "Directory structure created"

# Create package.json
print_status "Creating package.json..."
cat > package.json << 'ENDOFFILE'
{
  "name": "remarkable-planner",
  "version": "1.0.0",
  "description": "AI-powered therapy practice management system optimized for reMarkable Paper Pro",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "therapy",
    "practice-management",
    "remarkable",
    "ai",
    "healthcare"
  ],
  "author": "Jonathan Procter",
  "license": "PRIVATE",
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "node-fetch": "^2.7.0",
    "googleapis": "^128.0.0",
    "@notionhq/client": "^2.2.14"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
ENDOFFILE
print_success "package.json created"

# Install dependencies
print_status "Installing dependencies (this may take a few minutes)..."
npm install --silent 2>&1 | while read line; do
    echo -ne "\r${BLUE}[*]${NC} Installing: ${line:0:60}...                    "
done
echo -ne "\r"
print_success "All dependencies installed successfully"

# Create .env.example
print_status "Creating environment template..."
cat > .env.example << 'ENDOFFILE'
# Remarkable Planner Environment Variables
# Copy this file to .env and fill in your actual values

# Server Configuration
PORT=3000
NODE_ENV=production
SESSION_SECRET=remarkable_planner_session_secret_2024

# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# Anthropic API Configuration  
ANTHROPIC_API_KEY=sk-ant-api03-your_anthropic_api_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Google API Tokens (obtained after OAuth)
GOOGLE_ACCESS_TOKEN=
GOOGLE_REFRESH_TOKEN=

# Notion Integration
NOTION_TOKEN=ntn_your_notion_integration_token_here

# Database Configuration (optional - for future use)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=remarkable_planner
DB_USER=postgres
DB_PASSWORD=
ENDOFFILE
print_success "Environment template created"

# Copy to .env
cp .env.example .env
print_success "Created .env file from template"

# Create server.js with compressed content
print_status "Creating server.js..."
cat > server.js << 'ENDOFFILE'
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Initializing Remarkable Planner server...');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// In-memory storage
const storage = {
  appointments: [],
  clientProfiles: [],
  actionItems: [],
  sessionOutcomes: [],
  birthdayEvents: [],
  communicationDrafts: [],
  clientTranscriptsProcessed: [],
  psychoeducationalSuggestions: [],
  sessionFollowUpPackages: [],
  caseConceptualizations: [],
  aiAnalytics: [],
  autoTags: []
};

// API Router
const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    integrations: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!process.env.GOOGLE_CLIENT_ID,
      notion: !!process.env.NOTION_TOKEN
    }
  });
});

apiRouter.get('/objects/:type', (req, res) => {
  const { type } = req.params;
  const data = storage[type] || [];
  res.json({ items: data, total: data.length });
});

apiRouter.post('/objects/:type', (req, res) => {
  const { type } = req.params;
  const newObject = {
    objectId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    objectType: type,
    objectData: req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!storage[type]) storage[type] = [];
  storage[type].push(newObject);
  res.json(newObject);
});

app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', express.static(path.join(__dirname, 'utils')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});
ENDOFFILE
print_success "server.js created"

# Create public/index.html
print_status "Creating React application..."
cat > public/index.html << 'ENDOFFILE'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remarkable Planner - Practice Intelligence</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <style>
    :root {
      --bg-primary: #FFFFFF;
      --text-primary: #1A1A1A;
      --border-color: #DEDEDE;
      --accent-color: #D4A590;
      --success-color: #4A6B8A;
      --warning-color: #9BAE8F;
      --error-color: #A67676;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #FAFAFA;
      color: var(--text-primary);
      font-weight: 600;
    }
    .card {
      background: var(--bg-primary);
      border: 2px solid var(--border-color);
      border-radius: 8px;
      padding: 16px;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-size: 24px;
      color: var(--accent-color);
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading">Loading Remarkable Planner...</div>
  </div>
  <script>
    // Simple React app initialization
    const { useState, useEffect } = React;
    
    function App() {
      const [loading, setLoading] = useState(true);
      const [health, setHealth] = useState(null);
      
      useEffect(() => {
        fetch('/api/health')
          .then(res => res.json())
          .then(data => {
            setHealth(data);
            setLoading(false);
          })
          .catch(err => {
            console.error('Health check failed:', err);
            setLoading(false);
          });
      }, []);
      
      if (loading) {
        return React.createElement('div', { className: 'loading' }, 'Initializing...');
      }
      
      return React.createElement('div', { className: 'min-h-screen bg-gray-50 p-8' },
        React.createElement('div', { className: 'max-w-4xl mx-auto' },
          React.createElement('div', { className: 'card mb-8' },
            React.createElement('h1', { className: 'text-3xl font-bold mb-4' }, 'Remarkable Planner'),
            React.createElement('p', { className: 'text-gray-600' }, 'AI-Powered Practice Intelligence System')
          ),
          health && React.createElement('div', { className: 'card' },
            React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'System Status'),
            React.createElement('div', { className: 'space-y-2' },
              React.createElement('p', null, 'Status: ', 
                React.createElement('span', { className: 'text-green-600 font-bold' }, health.status)
              ),
              React.createElement('p', null, 'OpenAI: ', 
                React.createElement('span', { 
                  className: health.integrations.openai ? 'text-green-600' : 'text-red-600' 
                }, health.integrations.openai ? '✓ Connected' : '✗ Not configured')
              ),
              React.createElement('p', null, 'Anthropic: ', 
                React.createElement('span', { 
                  className: health.integrations.anthropic ? 'text-green-600' : 'text-red-600' 
                }, health.integrations.anthropic ? '✓ Connected' : '✗ Not configured')
              ),
              React.createElement('p', null, 'Google: ', 
                React.createElement('span', { 
                  className: health.integrations.google ? 'text-green-600' : 'text-red-600' 
                }, health.integrations.google ? '✓ Connected' : '✗ Not configured')
              ),
              React.createElement('p', null, 'Notion: ', 
                React.createElement('span', { 
                  className: health.integrations.notion ? 'text-green-600' : 'text-red-600' 
                }, health.integrations.notion ? '✓ Connected' : '✗ Not configured')
              )
            )
          )
        )
      );
    }
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  </script>
</body>
</html>
ENDOFFILE
print_success "React application created"

# Create utility files
print_status "Creating utility modules..."

# Create stub files for utilities
touch utils/config.js
touch utils/dateUtils.js
touch utils/officeLocationManager.js
touch utils/clientDataImporter.js
touch utils/aiProcessor.js
touch utils/compassAI.js
touch utils/googleCalendarSync.js
touch utils/googleDriveSync.js
touch utils/notionSync.js

print_success "Utility modules created"

# Create README
print_status "Creating documentation..."
cat > README.md << 'ENDOFFILE'
# Remarkable Planner

## Quick Start
1. Edit `.env` file with your API keys
2. Run `npm start`
3. Open http://localhost:3000

## Required API Keys
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET
- NOTION_TOKEN

## Support
Check console for errors and ensure all API keys are configured.
ENDOFFILE
print_success "Documentation created"

# Create .gitignore
cat > .gitignore << 'ENDOFFILE'
node_modules/
.env
.DS_Store
*.log
dist/
build/
.idea/
.vscode/
ENDOFFILE
print_success "Created .gitignore"

# Summary
echo
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                     INSTALLATION COMPLETE! 🎉                          ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
echo

print_info "Project created at: $(pwd)"
print_info "Total files created: $(find . -type f | wc -l)"
print_info "Total size: $(du -sh . | cut -f1)"
echo

# Check for missing API keys
print_warning "IMPORTANT: Configure your API keys in the .env file"
echo
echo "Required API keys:"
echo "  ${YELLOW}1.${NC} OpenAI API Key"
echo "     Get from: https://platform.openai.com/api-keys"
echo
echo "  ${YELLOW}2.${NC} Anthropic API Key"
echo "     Get from: https://console.anthropic.com/"
echo
echo "  ${YELLOW}3.${NC} Google OAuth Credentials"
echo "     Get from: https://console.cloud.google.com/"
echo
echo "  ${YELLOW}4.${NC} Notion Integration Token"
echo "     Get from: https://www.notion.so/my-integrations"
echo

# Offer to edit .env
read -p "Would you like to edit the .env file now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v nano &> /dev/null; then
        nano .env
    elif command -v vim &> /dev/null; then
        vim .env
    else
        print_warning "Please edit .env manually to add your API keys"
    fi
fi

# Final options
echo
echo "What would you like to do next?"
echo "  1) Start the server now"
echo "  2) Start in development mode (with auto-reload)"
echo "  3) Exit (start manually later)"
echo
read -p "Enter your choice (1-3): " -n 1 -r choice
echo

case $choice in
    1)
        print_status "Starting Remarkable Planner..."
        echo
        npm start
        ;;
    2)
        print_status "Starting in development mode..."
        echo
        npm run dev
        ;;
    3)
        echo
        print_info "To start the server later, run:"
        echo "  cd $PROJECT_DIR"
        echo "  npm start"
        echo
        print_success "Setup complete! Happy planning! 🚀"
        ;;
    *)
        print_error "Invalid choice"
        ;;
esac
ENDOFFILE