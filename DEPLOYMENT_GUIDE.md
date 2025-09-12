# Deployment Configuration Guide

This guide addresses the deployment issues identified and provides solutions for successful deployment to Replit's Cloud Run environment.

## Deployment Issues Identified

1. **NODE_ENV=production in build command** - Should be set as environment variable instead
2. **Complex port forwarding configuration** - Should rely on platform-provided PORT instead of manual port settings
3. **Missing CI environment variable** - Needed to prevent build warnings from causing failures
4. **Server port configuration** - Already correctly uses PORT environment variable

## Solutions and Workarounds

### 1. Override Build and Run Commands in Replit Deploy UI

**CRITICAL STEP**: The .replit file contains hardcoded NODE_ENV in build commands. You must override these in the Replit Deploy UI:

1. **Go to Replit Deploy Settings**
2. **Override Build Command** to: `npm run build`
3. **Override Run Command** to: `npm start`

### 2. Environment Variables Configuration

**Required Deployment Environment Variables:**

```bash
NODE_ENV=production
CI=true (optional - may help with build warnings)
```

**Important**: Do NOT set PORT manually - Cloud Run automatically provides the PORT environment variable.

**Additional Environment Variables:**
- Copy all variables from `.env.example` that are relevant to your deployment
- Ensure DATABASE_URL points to your production database
- Add all API keys (OPENAI_API_KEY, GOOGLE_CLIENT_ID, etc.)

### 3. Manual Deployment Configuration Steps

1. **Go to Replit Deploy Settings:**
   - Navigate to your Replit project
   - Go to the "Deploy" tab

2. **Override Commands (CRITICAL):**
   - **Build Command**: Change to `npm run build` (removes hardcoded NODE_ENV)
   - **Run Command**: Change to `npm start` (removes hardcoded NODE_ENV)

3. **Add Environment Variables:**
   ```
   NODE_ENV=production
   CI=true (optional - may help with build warnings)
   NPM_CONFIG_CACHE=/tmp/.npm-cache
   NODE_OPTIONS=--max-old-space-size=4096
   ```

4. **Port Configuration:**
   - Do NOT set PORT manually - Cloud Run provides it automatically
   - Server correctly uses `process.env.PORT || '5000'` with fallback
   - No manual port configuration needed

### 4. Build Command Fixes

The current build commands in .replit include hardcoded NODE_ENV. Since we cannot modify .replit directly, the deployment system should:

1. Remove `NODE_ENV=production` from build commands
2. Set NODE_ENV as an environment variable instead
3. Keep the optimized build settings: `NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096`

### 4. Verification Steps

After configuring the deployment:

1. **Check Environment Variables:**
   ```bash
   echo $NODE_ENV  # Should output: production
   echo $CI        # Should output: true (if set)
   echo $PORT      # Should output: any port provided by Cloud Run
   ```

2. **Verify Server Startup:**
   - Server should bind to the PORT provided by Cloud Run
   - Check logs for "serving on port [XXXX]" message

3. **Test Health Endpoint:**
   ```
   GET /api/health
   ```
   Should return `{"status":"ok","timestamp":"..."}`

### 5. Troubleshooting

**If deployment still fails:**

1. **Check Build Logs:** Look for npm audit warnings that might be treated as errors
2. **Memory Issues:** The build uses `NODE_OPTIONS=--max-old-space-size=4096` to handle large builds
3. **Port Binding:** Server should bind to the PORT shown in logs (provided by platform)
4. **Environment Variable Missing:** Verify all required env vars are set in deployment settings

**Common Issues:**

- **Build warnings as errors:** If build logs show warnings treated as errors, try setting `CI=true`
- **Memory exhaustion:** Increase memory limit with `NODE_OPTIONS=--max-old-space-size=4096`
- **Port binding issues:** Server should bind to the PORT shown in logs (automatically provided by Cloud Run)

### 6. Production Checklist

- [ ] NODE_ENV=production set as environment variable (not in build command)
- [ ] CI=true set optionally to help with build warnings
- [ ] PORT is NOT set manually (Cloud Run provides it automatically)
- [ ] Build and Run commands overridden in Deploy UI to remove hardcoded NODE_ENV
- [ ] All API keys and secrets configured in deployment environment variables
- [ ] Database URL points to production database
- [ ] Build optimization flags properly set
- [ ] Health endpoint responds correctly

## Current Server Configuration

The server is already properly configured for Cloud Run deployment:

```typescript
// Correctly uses PORT environment variable with fallback
const port = parseInt(process.env.PORT || '5000', 10);

// Binds to all interfaces as required by Cloud Run
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`serving on port ${port}`);
});
```

This configuration automatically adapts to Cloud Run's port assignment while maintaining compatibility with local development.