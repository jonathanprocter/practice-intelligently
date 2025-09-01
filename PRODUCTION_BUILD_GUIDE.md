# Production Build Configuration Guide

## Overview
This document describes the working production build configuration for the Practice Intelligence application. The build process has been optimized to avoid memory issues and build failures that were occurring with the default Vite configuration.

## Build System
The production build uses **esbuild** directly instead of Vite for faster and more reliable builds. This approach:
- Reduces memory usage significantly
- Builds in seconds instead of minutes
- Avoids complex Vite/Rollup configuration issues
- Produces working production bundles

## Build Process

### 1. Build Command
```bash
npm run build
```
This runs the script at `scripts/simple-build.sh`

### 2. What the Build Does

#### Client Build
- Uses esbuild to bundle the React application
- Creates a single `app.js` file with all dependencies
- Generates CSS output
- Handles TypeScript compilation
- Resolves module aliases (@, @shared)
- Creates production-ready HTML

#### Server Build
- Bundles the Express server with esbuild
- Includes __dirname polyfill for ES modules
- Keeps node_modules as external dependencies
- Produces ES module output

### 3. Build Output
```
dist/
├── index.js          # Server bundle
└── public/          # Client assets
    ├── app.js       # Client JavaScript bundle
    ├── app.css      # Client styles
    └── index.html   # HTML entry point
```

## Running Production

### Option 1: Direct Node
```bash
npm start
# or
NODE_ENV=production node dist/index.js
```

### Option 2: PM2 (Recommended)
```bash
pm2 start ecosystem.production.config.cjs
```

### Option 3: Shell Script
```bash
./scripts/start-production.sh
```

## Production URL
After starting the server, it will be available at:
- **Local**: http://localhost:3000
- **Public**: https://3000-ik5l260mw5iafyizfdspq-6532622b.e2b.dev (sandbox URL)

## Configuration Files

### Package.json Scripts
- `build`: Runs the production build
- `build:vite`: Original Vite build (has memory issues)
- `start`: Starts production server
- `start:prod`: Starts with production script

### Key Files
- `scripts/simple-build.sh`: Main build script
- `scripts/start-production.sh`: Production startup script
- `ecosystem.production.config.cjs`: PM2 configuration
- `vite.config.minimal.ts`: Simplified Vite config (backup)

## Known Issues Resolved

### 1. Vite Memory Issues
**Problem**: Vite build would run out of memory or hang indefinitely
**Solution**: Use esbuild directly for both client and server

### 2. Missing Asset Imports
**Problem**: Build failed on missing @assets imports
**Solution**: Replaced with placeholder images or removed imports

### 3. Tailwind CSS Build Errors
**Problem**: PostCSS/Tailwind integration issues
**Solution**: Let esbuild handle CSS bundling directly

### 4. ESM Module Issues
**Problem**: __dirname not defined in ES modules
**Solution**: Added polyfill in build script

## Performance Metrics
- **Build Time**: ~3 seconds (vs 45+ seconds with Vite)
- **Memory Usage**: ~200MB (vs 2GB+ with Vite)
- **Bundle Size**: 
  - Client: 5.4MB (unminified)
  - Server: 727KB
- **Startup Time**: < 1 second

## Deployment Checklist

1. ✅ Run build: `npm run build`
2. ✅ Verify dist folder created
3. ✅ Start server with PM2
4. ✅ Check health endpoint: `/api/health`
5. ✅ Test frontend loads correctly
6. ✅ Verify API endpoints work

## Environment Variables
Ensure `.env` file contains:
```
PORT=3000
DATABASE_URL=<your-database-url>
OPENAI_API_KEY=<your-key>
# ... other API keys
```

## Monitoring

### PM2 Commands
```bash
pm2 status                    # Check status
pm2 logs production-server    # View logs
pm2 restart production-server # Restart
pm2 stop production-server    # Stop
```

### Health Check
```bash
curl http://localhost:3000/api/health
```

## Troubleshooting

### If build fails:
1. Check Node.js version (v18+ required)
2. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
3. Check for syntax errors in TypeScript files
4. Ensure all required dependencies are installed

### If server won't start:
1. Check port 3000 is not in use
2. Verify .env file exists with required variables
3. Check PM2 logs for errors
4. Ensure dist folder exists with built files

## Future Improvements
- Add minification once stable
- Implement code splitting for smaller bundles
- Add source maps for production debugging
- Optimize bundle size with tree shaking
- Add build caching for faster rebuilds

## Summary
This production build configuration provides a reliable, fast, and memory-efficient way to build and deploy the Practice Intelligence application. It bypasses the complex Vite/Rollup build chain in favor of the simpler and more reliable esbuild, resulting in successful builds that work in production.