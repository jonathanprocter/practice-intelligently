# Replit Deployment Guide for Practice Intelligence

## Quick Setup for Replit

This guide ensures your Practice Intelligence system runs perfectly in Replit environment.

## 1. Environment Configuration

### Required Files for Replit

#### `.replit` Configuration (Already Present)
The `.replit` file is already configured. Ensure it contains:
```toml
run = "npm run dev"
entrypoint = "server/index.ts"

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "npm run start"]
```

#### `replit.nix` Configuration (Already Present)
The system dependencies are configured in `replit.nix`.

## 2. Database Setup for Replit

Since Replit doesn't have PostgreSQL by default, the system will automatically use SQLite. The database is already configured at `data/therapy.db`.

## 3. Environment Variables in Replit

### Step 1: Open Replit Secrets
In your Replit project:
1. Click the "Secrets" icon (lock icon) in the left sidebar
2. Add the following secrets:

### Required Secrets (Minimum for Basic Operation)
```
SESSION_SECRET=your-secret-key-here-change-this
NODE_ENV=development
PORT=3000
TZ=America/New_York
```

### Optional Secrets (For Full AI Features)
```
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
```

### Optional Secrets (For Email & OAuth)
```
SENDGRID_API_KEY=your-sendgrid-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 4. Starting the Application in Replit

### Option A: Using the Run Button
Simply click the "Run" button in Replit. The system will:
1. Install dependencies automatically
2. Start the server using PM2
3. Use SQLite database (no configuration needed)
4. Use mock AI services if API keys aren't provided

### Option B: Manual Start in Shell
```bash
# Install dependencies
npm install

# Initialize database with test data
node test-database.js

# Start the server
npm run dev

# Or use PM2 for better stability
npx pm2 start ecosystem.config.cjs
```

## 5. Accessing Your Application

### In Replit:
- The application will be available at the URL shown in the Webview panel
- Format: `https://[your-repl-name].[your-username].repl.co`

### API Endpoints:
- Health Check: `/api/health`
- Documents: `/api/documents`
- Document Search: `/api/documents/search?query=test`
- Clients: `/api/clients`

## 6. Database Management

### View Database Contents:
```bash
# Check database status
node test-database.js

# Run system audit
node comprehensive-system-audit.js
```

### Reset Database (if needed):
```bash
# Remove existing database
rm data/therapy.db

# Recreate with test data
node test-database.js
```

## 7. Troubleshooting in Replit

### Issue: Server won't start
```bash
# Check for port conflicts
lsof -i :3000

# Kill any existing processes
pkill -f "node"

# Restart
npm run dev
```

### Issue: Database errors
```bash
# Fix schema issues
node fix-database-schema.js

# Verify database
node test-database.js
```

### Issue: Memory/Performance
```bash
# Use PM2 for better resource management
npx pm2 start ecosystem.config.cjs
npx pm2 monit  # Monitor resources
```

## 8. Syncing with GitHub from Replit

### Setup Git in Replit Shell:
```bash
# Configure Git (use your info)
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# Check current status
git status

# Pull latest changes
git pull origin main

# Push your changes
git add .
git commit -m "Your commit message"
git push origin main
```

### If Authentication Fails:
1. Go to GitHub Settings > Developer Settings > Personal Access Tokens
2. Generate a new token with `repo` scope
3. Use token as password when pushing

## 9. Production Readiness Checklist

### ✅ Currently Working:
- [x] SQLite database with automatic setup
- [x] Mock AI services for development
- [x] All API endpoints functional
- [x] PM2 process management
- [x] Test data population
- [x] Document search and management

### ⚠️ To Add for Production:
- [ ] Real API keys for AI services
- [ ] PostgreSQL database (optional)
- [ ] SSL certificate (Replit provides this)
- [ ] Google OAuth credentials
- [ ] Email service configuration

## 10. Quick Commands Reference

```bash
# Start server
npm run dev

# Check status
npx pm2 status

# View logs
npx pm2 logs --nostream

# Run tests
node comprehensive-system-audit.js

# Add test data
node test-database.js

# Fix database issues
node fix-database-schema.js

# Stop server
npx pm2 stop all
```

## 11. Default Login Credentials

After running `node test-database.js`:
- Username: `admin`
- Password: `admin123`

## 12. API Testing in Replit

Use the Shell to test APIs:
```bash
# Health check
curl http://localhost:3000/api/health

# Search documents
curl "http://localhost:3000/api/documents/search?query=therapy"

# List clients
curl http://localhost:3000/api/clients
```

## Support

If you encounter issues:
1. Run `node comprehensive-system-audit.js` to diagnose
2. Check `logs/err.log` for error details
3. Ensure all environment variables are set in Replit Secrets
4. Verify the database exists at `data/therapy.db`

## Summary

The system is fully configured to run in Replit with:
- Automatic SQLite database fallback
- Mock AI services when keys aren't provided
- PM2 for process management
- Comprehensive error handling
- Test data for immediate use

Simply click "Run" in Replit and the system will start automatically!