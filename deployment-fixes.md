# Deployment Fixes for RemarkablePlanner

This document provides solutions for the deployment errors and how to apply them.

## Issues and Solutions

### 1. Replit Cartographer Plugin Error
**Issue**: `TypeError: traverse is not a function during build process`

**Solution**: The cartographer plugin is conditionally loaded only when `NODE_ENV !== "production"` AND `REPL_ID !== undefined`. To disable it during production builds:

**Ensure this environment variable is set during build/deploy:**
```
NODE_ENV=production
```

The vite.config.ts checks these conditions - setting `NODE_ENV=production` will prevent the plugin from loading. This is the reliable fix as the configuration already supports it.

### 2. Duplicate clearTokens() Method
**Issue**: `Duplicate class member clearTokens() in server/oauth-simple.ts`

**Solution**: **No duplicate methods found**. Investigation revealed three separate OAuth service classes:
- `SimpleOAuth` class in `oauth-simple.ts` 
- `OAuthTokenManager` class in `oauth-token-manager.ts`
- `OAuthRefreshService` class in `oauth-refresh-service.ts`

Each has its own properly encapsulated `clearTokens()` method. The `OAuthTokenManager.clearTokens()` calls `simpleOAuth.clearTokens()` as a wrapper. This is proper OOP design, not duplication.

### 3. Nix Directories Error
**Issue**: `Build failing due to Nix directories error at deployment push step`

**Solution**: Add these environment variables to disable package caching:
```
NPM_CONFIG_CACHE=/tmp/.npm-cache
NODE_OPTIONS=--max-old-space-size=4096
```

### 4. Build Command Warnings
**Issue**: Build fails due to warnings being treated as errors

**Solution**: Vite typically doesn't fail builds on warnings by default. If sourcemaps are causing issues during build, use:

```bash
# Disable sourcemaps in build
vite build --sourcemap false
```

Or set `CI=false` if running in a CI environment that treats warnings as errors:
```
CI=false
```

### 5. Node.js Version Consistency
**Issue**: Inconsistent Node.js version paths

**Solution**: ✅ **Already resolved** - Node.js 20 is already installed and available.

**For CI/CD deployment**: Ensure Node.js 20 is used in the deployment environment by verifying:
```bash
node --version  # Should show v20.x.x
```

## Environment Variables for Production Deployment

Create or update your production environment with these variables:

```bash
# CRITICAL: Disable cartographer plugin in production
NODE_ENV=production

# Package caching fixes for Nix directories
NPM_CONFIG_CACHE=/tmp/.npm-cache

# Build optimization
NODE_OPTIONS=--max-old-space-size=4096

# Only if CI treats warnings as errors
CI=false
```

## Manual Application Steps

Since core configuration files (vite.config.ts, package.json, replit.nix) cannot be edited programmatically:

1. **For Replit deployment**: Add the environment variables above to your Repl's secrets/environment
2. **For manual builds**: Export these environment variables before running build commands
3. **For CI/CD**: Add these to your pipeline's environment configuration

## Verification Checklist

After applying these fixes, verify the following in your deployment environment:

1. **Environment check**: `echo $NODE_ENV` should output "production"
2. **Node version**: `node --version` should show v20.x.x
3. **Build logs**: Cartographer plugin should NOT appear in build output
4. **Build success**: Both `vite build` and `npm run build` should complete without errors
5. **Cache location**: `echo $NPM_CONFIG_CACHE` should show `/tmp/.npm-cache`

Expected results:
- ✅ Cartographer plugin disabled during production builds
- ✅ Package caching uses ephemeral directory (/tmp/.npm-cache)
- ✅ Build completes without Nix directory errors
- ✅ Node.js 20 consistency maintained

## Files Modified

- None (core config files are protected)
- Created: `deployment-fixes.md` (this documentation)

## Next Steps

Test the deployment with the above environment variables applied to verify all issues are resolved.