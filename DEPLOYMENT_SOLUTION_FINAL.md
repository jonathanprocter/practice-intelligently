# 🚀 Cloud Run Deployment Fixes - Complete Solution

## Overview
This guide provides the step-by-step solution to fix the deployment errors you encountered:
- `Failed to get Nix directories` error
- Complex port forwarding conflicts  
- Build process warnings and vulnerabilities

## ✅ Fixes Applied

### 1. Server Configuration ✅ 
- **Port Configuration**: Already optimal - uses `process.env.PORT || 5000` and binds to `0.0.0.0`
- **Single Port Compliance**: Server properly configured for Cloud Run's single-port requirement

### 2. Deployment Scripts Updated ✅
- **start-production.sh**: Removed hardcoded `NODE_ENV=production` 
- **deploy.sh**: Already optimized with environment variable setup
- **deploy-workaround.sh**: Already has proper environment variable handling

## 🔧 Required Manual Configuration

Since `package.json` and `replit.nix` are protected files, you need to override them in Replit's deployment settings:

### Step 1: Update Build Command
In Replit **Publishing/Deploy Settings**, override the build command to remove hardcoded NODE_ENV:

**Current build command (problematic):**
```bash
npm install --legacy-peer-deps && npm run build:client
```

**New build command (fixed):**
```bash
npm install && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

### Step 2: Update Run Command
Override the run command to use direct node execution:

**Current run command (problematic):**
```bash
npm start
```

**New run command (fixed):**
```bash
node dist/index.js
```

### Step 3: Set Environment Variables
In Replit deployment environment variables, add:

**Required:**
```
NODE_ENV=production
CI=true
```

**Build Optimization:**
```
NPM_CONFIG_CACHE=/tmp/.npm-cache
NODE_OPTIONS=--max-old-space-size=4096
DISABLE_CARTOGRAPHER=true
NIX_REMOTE=
NODE_NO_WARNINGS=1
```

**Application Secrets (use the secrets manager):**
```
DATABASE_URL=your_postgresql_url
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret
OPENAI_API_KEY=your_openai_api_key
```

**DO NOT SET:**
- `PORT` (Cloud Run provides this automatically)

## 🎯 Why These Fixes Work

1. **Removes Legacy Dependencies**: Eliminates `--legacy-peer-deps` flag that causes compatibility issues
2. **Fixes Environment Variables**: Removes hardcoded `NODE_ENV` that conflicts with Cloud Run's containerization
3. **Simplifies Port Configuration**: Server already uses dynamic port assignment (no changes needed)
4. **Direct Node Execution**: Uses `node dist/index.js` instead of npm scripts to avoid environment conflicts
5. **Build Optimization**: Adds environment variables to prevent build warnings and Nix directory errors

## 🚀 Deployment Steps

1. **Go to Replit Publishing/Deploy Settings**
2. **Override Build Command** (copy from Step 1 above)
3. **Override Run Command** (copy from Step 2 above)  
4. **Set Environment Variables** (copy from Step 3 above)
5. **Add Application Secrets** using Replit's secrets manager
6. **Deploy**

## ✅ Expected Results

After applying these fixes:
- ✅ No more "Failed to get Nix directories" error
- ✅ No more complex port forwarding conflicts
- ✅ Build warnings eliminated
- ✅ Legacy peer dependency issues resolved
- ✅ Clean Cloud Run deployment

## 📋 Verification Checklist

After deployment, verify:
- [ ] Application starts without Nix directory errors
- [ ] App responds on the Cloud Run URL
- [ ] Database connection works
- [ ] Google OAuth functionality works
- [ ] AI services respond correctly
- [ ] No port conflict errors in logs

## 🆘 Troubleshooting

If deployment still fails:
1. Check that all environment variables are set correctly
2. Verify the build and run commands are exactly as specified above
3. Ensure no hardcoded NODE_ENV remains in any scripts
4. Contact Replit support if protected files need direct modification

## 📝 Technical Summary

The core issue was hardcoded environment variables in build scripts that conflict with Cloud Run's containerization process. By moving these to deployment environment variables and using direct node execution, we eliminate the Nix directory access issues and ensure Cloud Run compatibility.