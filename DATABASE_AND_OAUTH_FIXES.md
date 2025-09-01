# Database and OAuth Fixes - Therapy Practice Management System

## Overview
This document describes the comprehensive fixes implemented to resolve database connectivity and OAuth authentication issues in the Therapy Practice Management System.

## Issues Identified and Fixed

### 1. Database Connection Issues
**Problem**: The application was experiencing WebSocket connection failures with Neon serverless PostgreSQL and couldn't fall back to standard PostgreSQL connections.

**Solution**: Created an enhanced database connection handler (`server/db-enhanced.ts`) that:
- Automatically detects connection type (Neon vs standard PostgreSQL)
- Implements proper WebSocket configuration for Neon
- Provides fallback to standard PostgreSQL if Neon fails
- Includes automatic reconnection on connection errors
- Sets proper timezone configuration for both connection types

### 2. OAuth Token Expiration
**Problem**: OAuth tokens were expiring without automatic refresh, causing Google Calendar integration to fail.

**Solution**: Implemented OAuth Token Manager (`server/oauth-token-manager.ts`) that:
- Automatically refreshes tokens before expiration
- Provides periodic token validation checks
- Offers manual refresh capability
- Includes comprehensive token status reporting

### 3. Missing Database Tables
**Problem**: Several database tables required for new features were missing.

**Solution**: Created comprehensive SQL migration script (`create_missing_tables.sql`) that:
- Creates all missing tables with proper constraints
- Adds missing columns to existing tables
- Cleans up invalid data and orphaned records
- Maintains referential integrity

## Setup Instructions

### Step 1: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and provide your actual values:
```env
# Required - Get from Neon or your PostgreSQL provider
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Required - Get from Google Cloud Console
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Required - At least one AI service
OPENAI_API_KEY=sk-your-openai-key
```

### Step 2: Run Diagnostics

Check your system configuration:
```bash
npm run diagnose
```

This will:
- Verify environment variables
- Test database connection
- Check OAuth token status
- Identify missing database tables
- Provide specific fix instructions

### Step 3: Fix Database Issues

If database tables are missing:
```bash
# Using npm script (if psql is available)
npm run db:fix

# OR using Drizzle migrations
npm run db:migrate
```

### Step 4: Set Up OAuth Authentication

1. Start the application:
```bash
npm run dev
```

2. Visit the OAuth setup URL:
```
http://localhost:5000/api/auth/google
```

3. Complete Google authentication flow

### Step 5: Initialize Auto-Refresh

After authentication, initialize the token auto-refresh:
```bash
curl -X POST http://localhost:5000/api/auth/initialize
```

## API Endpoints for OAuth Management

### Check OAuth Status
```bash
GET /api/auth/status
```
Returns current token status including expiration time.

### Force Token Refresh
```bash
POST /api/auth/refresh
```
Manually refreshes OAuth tokens.

### Auto-Fix OAuth Issues
```bash
POST /api/auth/auto-fix
```
Automatically detects and fixes common OAuth problems.

### Test Calendar Connection
```bash
GET /api/auth/test-calendar
```
Verifies Google Calendar integration is working.

## Using the Enhanced Database Connection

The enhanced database connection (`db-enhanced.ts`) can be used as a drop-in replacement:

```typescript
import { db, pool, dbConnection } from './server/db-enhanced';

// Test connection
const isConnected = await dbConnection.testConnection();

// Use with Drizzle ORM
const users = await db.select().from(schema.users);

// Direct SQL queries
const result = await pool.query('SELECT * FROM clients');
```

## Troubleshooting

### Database Connection Fails
1. Verify DATABASE_URL is correct
2. For Neon: Check connection string at https://console.neon.tech
3. For local PostgreSQL: Ensure server is running
4. Check firewall/network settings

### OAuth Tokens Expire Frequently
1. Run `npm run diagnose` to check token status
2. Use `POST /api/auth/initialize` to start auto-refresh
3. Ensure system time is synchronized

### Missing Tables Error
1. Run `npm run db:fix` to create missing tables
2. Check PostgreSQL logs for permission issues
3. Verify database user has CREATE TABLE privileges

### WebSocket Connection Error (Neon)
The enhanced database connection automatically handles this by:
1. Configuring proper WebSocket settings
2. Falling back to standard PostgreSQL if needed
3. Implementing automatic reconnection

## Monitoring and Maintenance

### Regular Health Checks
Run diagnostics weekly:
```bash
npm run diagnose
```

### Token Refresh Logs
Monitor OAuth token refresh in application logs:
```bash
grep "OAuth" app.log
```

### Database Connection Monitoring
Check connection status:
```typescript
if (dbConnection.isReady()) {
  console.log(`Connected via: ${dbConnection.getConnectionType()}`);
}
```

## Security Considerations

1. **Never commit `.env` file** - Keep it in `.gitignore`
2. **Rotate OAuth tokens regularly** - Use the clear and re-authenticate flow monthly
3. **Use strong session secrets** - Generate with `openssl rand -base64 32`
4. **Enable SSL for database** - Required for production deployments
5. **Restrict OAuth scopes** - Only request necessary Google API permissions

## Support

For additional help:
1. Check diagnostic output: `npm run diagnose`
2. Review application logs for detailed error messages
3. Consult the main README.md for general application documentation
4. Check Google Cloud Console for OAuth configuration issues
5. Verify Neon/PostgreSQL dashboard for database connection details