# Deployment Configuration for Replit Publishing

## Critical: Manual Configuration Required

Since the .replit and package.json files cannot be modified directly, you need to manually configure the deployment settings in Replit's Publishing UI.

## Step-by-Step Instructions

### 1. Open Replit Publishing Tool
1. Click on the "Deploy" or "Publishing" button in your Replit workspace
2. Select "Autoscale" as your deployment type (recommended)
3. Click "Set up your published app"

### 2. Set Environment Variables
In the deployment configuration screen, add these **Deployment Environment Variables**:
- `NODE_ENV` = `production`
- `CI` = `true`
- **DO NOT set PORT** - let the platform assign it automatically

### 3. Override Build and Run Commands
In the same deployment configuration screen, override the commands:

**Build Command:**
```bash
bash deploy-build.sh
```
Or if you prefer inline:
```bash
NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

**Run Command:**
```bash
bash deploy-run.sh
```
Or if you prefer inline:
```bash
node dist/index.js
```

### 4. Node.js Version Configuration
Ensure Node.js 20 is being used consistently:
- The modules section in .replit specifies `nodejs-20`
- Remove any PATH overrides that point to Node.js 18

## Why These Changes Are Necessary

### Problem 1: Hardcoded NODE_ENV
- **Issue**: The package.json scripts hardcode `NODE_ENV=production`
- **Solution**: Use deployment scripts that rely on environment variables from Publishing UI

### Problem 2: npm start Hardcodes Environment
- **Issue**: `npm start` command in package.json hardcodes `NODE_ENV=production`
- **Solution**: Use `node dist/index.js` directly to avoid the npm script

### Problem 3: Node.js Version Mismatch
- **Issue**: .replit declares nodejs-20 but PATH points to nodejs-18.20.8
- **Solution**: Let Replit use the declared nodejs-20 module

### Problem 4: Port Configuration
- **Issue**: Complex port forwarding rules may conflict with deployment
- **Solution**: Let the platform assign PORT automatically (don't set it in env vars)

## Verification Checklist

After configuring deployment:
1. ✅ Environment variables are set in Publishing UI (not in .replit)
2. ✅ Build command doesn't hardcode NODE_ENV
3. ✅ Run command uses `node dist/index.js` (not `npm start`)
4. ✅ PORT is not set (platform assigns it)
5. ✅ Node.js 20 is being used consistently

## Server Configuration (Already Correct)

Your server is already properly configured to:
- Use `process.env.PORT` with fallback to 5000
- Bind to `0.0.0.0` (required for deployment)
- Handle graceful shutdown signals
- Manage uncaught exceptions

## Expected Results

Once deployed with these settings:
- ✅ No hardcoded environment variables
- ✅ Platform-compatible port assignment
- ✅ Clean build without warnings (CI=true)
- ✅ Node.js version consistency
- ✅ Successful deployment to Replit

## Troubleshooting

If deployment fails:
1. Check deployment logs for specific errors
2. Verify all environment variables are set in Publishing UI
3. Ensure you're using `node dist/index.js` as run command
4. Confirm Node.js 20 is being used
5. Make sure PORT is not hardcoded anywhere