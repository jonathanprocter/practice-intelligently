# Database & OAuth Configuration Guide

## Overview
This guide documents the comprehensive fixes and tools implemented to ensure proper database connectivity, data integrity, and OAuth authentication for the Therapy Practice Management System.

## Quick Start

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your actual credentials

# Run complete setup
npm run setup
```

### 2. System Health Check
```bash
# Run comprehensive system test
npm run test:system

# Run database diagnostic
npm run diagnose

# Fix OAuth issues
npm run fix:oauth
```

## Diagnostic Tools

### 1. **diagnostic_and_fix.js**
Comprehensive system diagnostic tool that:
- Checks environment variables
- Tests database connection
- Verifies database schema
- Checks data integrity
- Tests OAuth configuration
- Automatically fixes common issues

**Usage:**
```bash
npm run diagnose
```

### 2. **test-system.js**
Complete system testing suite that:
- Validates all environment configurations
- Tests database connectivity and tables
- Checks OAuth token status
- Tests API endpoints
- Provides detailed recommendations

**Usage:**
```bash
npm run test:system
```

### 3. **fix-oauth.js**
OAuth management tool that:
- Checks current token status
- Refreshes expired tokens automatically
- Guides through re-authentication if needed
- Tests Google Calendar connection

**Usage:**
```bash
npm run fix:oauth
```

### 4. **migrate-database.js**
Database migration tool that:
- Runs Drizzle migrations
- Creates missing tables
- Sets up default admin user
- Verifies database schema

**Usage:**
```bash
npm run migrate
```

## Environment Variables

### Required Variables
```env
DATABASE_URL=postgresql://user:password@host:port/database
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
```

### Optional Variables
```env
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_GEMINI_API_KEY=your-gemini-key
PERPLEXITY_API_KEY=your-perplexity-key
SENDGRID_API_KEY=your-sendgrid-key
SESSION_SECRET=your-session-secret
PORT=5000
TZ=America/New_York
```

## Database Issues Fixed

### 1. Connection Issues
- **Problem**: WebSocket connection failures with Neon database
- **Fix**: Properly configured WebSocket constructor in all database connections
- **File**: `server/db.ts`, all test scripts

### 2. Data Integrity
- **Orphaned Session Notes**: Automatically detected and cleaned
- **Invalid Client IDs**: Non-UUID values converted to NULL
- **Duplicate Google Event IDs**: Resolved by keeping most recent

### 3. Schema Issues
- **Missing Tables**: Detected and can be created via migrations
- **Missing Columns**: Added via migration scripts
- **Index Optimization**: Proper indexes on foreign keys and search fields

## OAuth Issues Fixed

### 1. Token Management
- **Automatic Refresh**: Tokens refresh 10 minutes before expiry
- **Persistent Storage**: Tokens saved to `.oauth-tokens.json`
- **Graceful Degradation**: Falls back to re-authentication when needed

### 2. Google Calendar Integration
- **Multiple Calendar Support**: Properly fetches all calendars including subcalendars
- **Date Range Handling**: Correct timeframe processing for historical data
- **Error Recovery**: Automatic retry with token refresh on 401/403 errors

### 3. Authentication Flow
- **Redirect URI**: Automatically detects environment (local/Replit)
- **Scope Management**: Proper scopes for Calendar and Drive access
- **Session Persistence**: Tokens survive server restarts

## Common Issues & Solutions

### Database Connection Failed
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection directly
npm run test:db

# If using Neon, ensure WebSocket support
npm install ws
```

### OAuth Token Expired
```bash
# Automatic fix
npm run fix:oauth

# Manual re-authentication
1. Start server: npm run dev
2. Visit: http://localhost:5000/api/auth/google
3. Complete OAuth flow
```

### Missing Database Tables
```bash
# Generate and run migrations
npm run db:migrate

# Or use SQL script
psql $DATABASE_URL -f init-database.sql
```

### Data Integrity Issues
```bash
# Run diagnostic to auto-fix
npm run diagnose

# Manual check
psql $DATABASE_URL -c "SELECT COUNT(*) FROM session_notes WHERE appointment_id IS NULL;"
```

## Monitoring & Maintenance

### Regular Health Checks
```bash
# Daily system check
npm run test:system

# Check OAuth token expiry
node -e "const t=require('./.oauth-tokens.json'); console.log('Expires:', new Date(t.expiry_date))"
```

### Database Maintenance
```bash
# Check for orphaned records
npm run diagnose

# Vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

## Troubleshooting

### Issue: "fetch failed" error
**Solution**: Install and configure WebSocket
```javascript
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
```

### Issue: OAuth keeps asking for re-authentication
**Solution**: Ensure refresh_token is saved
```bash
# Check tokens file
cat .oauth-tokens.json | jq '.refresh_token'
```

### Issue: Database timezone incorrect
**Solution**: Set timezone in connection string
```javascript
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=America/New_York'
});
```

## Next Steps

1. **Production Deployment**:
   - Use environment-specific .env files
   - Enable SSL for database connections
   - Set up monitoring and alerting

2. **Security Hardening**:
   - Rotate OAuth tokens regularly
   - Use secrets management service
   - Enable audit logging

3. **Performance Optimization**:
   - Add database connection pooling
   - Implement caching strategies
   - Optimize database queries

## Support

For additional help:
1. Check system status: `npm run test:system`
2. Review logs: Check console output and error messages
3. Database queries: Use `psql` for direct database access
4. OAuth issues: Re-run `npm run fix:oauth`

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run diagnose` | Run full diagnostic and auto-fix |
| `npm run test:system` | Comprehensive system test |
| `npm run fix:oauth` | Fix OAuth authentication |
| `npm run migrate` | Run database migrations |
| `npm run setup` | Complete initial setup |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |