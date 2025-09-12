# Cloud Run Deployment Fixes Guide

## Overview
This guide provides the exact steps to fix the deployment errors and successfully deploy to Cloud Run.

## Error Summary
The deployment failed with:
- `Failed to get Nix directories` error during container creation
- Hardcoded `NODE_ENV=production` in build commands conflicts with Cloud Run's environment variable management
- Nix package cache directories not accessible during containerization

## Required Fixes Applied

### ✅ 1. Updated Deployment Scripts
**Files Modified:**
- `deploy.sh` - Removed hardcoded NODE_ENV
- `start-production.sh` - Removed hardcoded NODE_ENV  
- `deploy-workaround.sh` - Removed hardcoded NODE_ENV

**Changes:** All hardcoded `NODE_ENV=production` values replaced with comments directing to use environment variables.

### ✅ 2. Updated Environment Variable Documentation
**File Modified:** `.env.example`

**Added Critical Deployment Section:**
```bash
# CRITICAL FOR CLOUD RUN DEPLOYMENT: 
# These must be set as ENVIRONMENT VARIABLES in Replit deployment settings
# DO NOT hardcode NODE_ENV in build commands - it causes 'Failed to get Nix directories' error

# Required deployment environment variables:
# NODE_ENV=production  (Set in deployment environment variables, NOT hardcoded)
# CI=true             (Prevents build warnings from failing deployment)

# Build optimization environment variables:
DISABLE_CARTOGRAPHER=true
NIX_REMOTE=
NODE_NO_WARNINGS=1
```

### ✅ 3. Verified Server Configuration
**File:** `server/index.ts` (lines 133, 148)
- ✅ Uses dynamic port: `process.env.PORT || '5000'`
- ✅ Binds to all interfaces: `host: "0.0.0.0"`
- ✅ Compatible with Cloud Run requirements

## Manual Configuration Required in Replit

### Critical: Package.json Cannot Be Modified
⚠️ **Important:** The `package.json` file cannot be edited directly in this environment. The following build commands still contain hardcoded `NODE_ENV=production`:

```json
{
  "build": "NODE_ENV=production NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js"
}
```

### Solution: Override in Replit Deployment Settings

#### Step 1: Update Build Command
In Replit deployment settings, override the build command:
```bash
# Instead of using npm run build (which has hardcoded NODE_ENV), use:
NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

#### Step 2: Update Run Command  
In Replit deployment settings, override the run command:
```bash
# Instead of npm start (which has hardcoded NODE_ENV), use:
node dist/index.js
```

#### Step 3: Set Environment Variables
In Replit deployment environment variables, add:

**Required:**
- `NODE_ENV=production`
- `CI=true`

**Build Optimization:**
- `NPM_CONFIG_CACHE=/tmp/.npm-cache`
- `NODE_OPTIONS=--max-old-space-size=4096`
- `DISABLE_CARTOGRAPHER=true`
- `NIX_REMOTE=` (empty value)
- `NODE_NO_WARNINGS=1`

**Application Variables:**
- `DATABASE_URL=your_postgresql_url`
- `GOOGLE_CLIENT_ID=your_google_client_id`
- `GOOGLE_CLIENT_SECRET=your_google_client_secret`
- `SESSION_SECRET=your_session_secret`
- (Add other API keys as needed)

**DO NOT SET:**
- `PORT` (Cloud Run provides this automatically)

## Deployment Steps

1. **Go to Replit Deploy Settings**
2. **Override Build Command** (remove hardcoded NODE_ENV)
3. **Override Run Command** (remove hardcoded NODE_ENV)
4. **Set Environment Variables** (including NODE_ENV=production)
5. **Deploy**

## Verification
After deployment:
1. Check that the application starts without "Failed to get Nix directories" errors
2. Verify the app responds on the provided Cloud Run URL
3. Test core functionality (database, OAuth, etc.)

## Alternative: Contact Replit Support
If you cannot modify the deployment commands directly, contact Replit support to help update the protected `.replit` configuration file to remove the hardcoded `NODE_ENV=production` values.

## Technical Details

### Why This Fixes the Error
- **Nix Directory Issue**: Hardcoded NODE_ENV in build commands interferes with Cloud Run's containerization process
- **Environment Separation**: Cloud Run expects environment variables to be set by the platform, not hardcoded in commands
- **Cache Management**: Using `/tmp/.npm-cache` provides a writable cache location in Cloud Run

### Server Compatibility
The server is already correctly configured for Cloud Run:
- Uses `process.env.PORT` for dynamic port assignment
- Binds to `0.0.0.0` (all interfaces)  
- Properly handles environment-based configuration

## Files Modified
- ✅ `deploy.sh` - Removed hardcoded NODE_ENV
- ✅ `start-production.sh` - Removed hardcoded NODE_ENV
- ✅ `deploy-workaround.sh` - Removed hardcoded NODE_ENV  
- ✅ `.env.example` - Added deployment configuration section
- ⚠️ `package.json` - **Cannot be modified** (requires manual deployment setting override)