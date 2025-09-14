# Manual Deployment Configuration Steps

## ⚠️ Important: Manual Configuration Required

Since system configuration files cannot be automatically modified, you need to manually configure the following settings in Replit's Publishing UI.

## Step 1: Fix Node.js Version Mismatch

### Current Issue
- `.replit` file declares `nodejs-20` in modules
- PATH environment variable points to `/nix/store/...nodejs-18.20.8/bin`
- This causes "Failed to get Nix directories" errors during deployment

### Manual Fix Required
1. Open the `.replit` file
2. Find the `[env]` section
3. Remove or comment out the line:
   ```
   PATH = "/nix/store/ys5qb8fr8gq3ifk2knndn5lgm5lvhabb-nodejs-18.20.8/bin:$PATH"
   ```
4. Save the file

## Step 2: Configure Deployment in Publishing UI

1. **Open Replit Publishing Tool**
   - Click the "Deploy" or "Publishing" button in your workspace
   - Select "Autoscale" deployment type

2. **Set Environment Variables**
   Add these in the **Deployment Environment Variables** section:
   ```
   NODE_ENV=production
   CI=true
   ```
   ⚠️ **DO NOT SET PORT** - Let the platform assign it automatically

3. **Override Build Command**
   Use one of these options:
   
   Option A (Using script):
   ```bash
   bash deploy-build.sh
   ```
   
   Option B (Direct command):
   ```bash
   NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 npm run build
   ```

4. **Override Run Command**
   Use one of these options:
   
   Option A (Using script):
   ```bash
   bash deploy-run.sh
   ```
   
   Option B (Direct command):
   ```bash
   node dist/index.js
   ```
   
   ⚠️ **Critical**: Use `node dist/index.js` NOT `npm start` (which hardcodes NODE_ENV)

## Step 3: Remove Hardcoded Environment Variables from .replit

### Current Issue
The `.replit` deployment section hardcodes NODE_ENV=production

### Manual Fix Required
1. Open the `.replit` file
2. Find the `[deployment]` section
3. Update the commands to remove NODE_ENV:
   
   Change FROM:
   ```toml
   build = ["sh", "-c", "NODE_ENV=production NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 npm run build"]
   run = ["sh", "-c", "NODE_ENV=production npm start"]
   ```
   
   Change TO:
   ```toml
   build = ["sh", "-c", "NPM_CONFIG_CACHE=/tmp/.npm-cache NODE_OPTIONS=--max-old-space-size=4096 npm run build"]
   run = ["sh", "-c", "node dist/index.js"]
   ```

## Step 4: Verify Configuration

Before deploying, ensure:
- [ ] Node.js 20 path is not overridden in .replit
- [ ] Deployment commands don't hardcode NODE_ENV
- [ ] Run command uses `node dist/index.js` (not `npm start`)
- [ ] Environment variables are set in Publishing UI only
- [ ] PORT is not set (platform assigns it)

## Step 5: Deploy

1. Click "Deploy" in the Publishing UI
2. Monitor deployment logs for any errors
3. Verify the application starts successfully

## Expected Results

After these manual configurations:
- ✅ No "Failed to get Nix directories" errors
- ✅ Proper Node.js 20 usage throughout
- ✅ Environment variables managed by platform
- ✅ Automatic port assignment works correctly
- ✅ Successful deployment to Replit

## Troubleshooting

If deployment still fails:
1. Check deployment logs for specific errors
2. Verify all manual edits were saved
3. Ensure Node.js 20 is being used (`node -v` should show v20.x.x)
4. Confirm environment variables are set in Publishing UI
5. Make sure you're using `node dist/index.js` as run command

## Scripts Available

We've created helper scripts if you prefer:
- `deploy-build.sh` - Build script without hardcoded NODE_ENV
- `deploy-run.sh` - Run script without hardcoded NODE_ENV
- `fix-nodejs-version.sh` - Temporarily fixes Node.js version for current session

These scripts are ready to use but the manual configuration steps above are still required for permanent fixes.