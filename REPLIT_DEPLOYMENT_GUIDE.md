# 🚀 Replit Deployment Guide

## Last Updated: September 1, 2025

## 📋 Prerequisites

Before deploying to Replit, ensure you have:
- Replit account with the project forked or imported
- All required API keys (OpenAI, Anthropic, Google OAuth, etc.)
- Database URL (Neon or other PostgreSQL provider)

---

## 🔧 Step-by-Step Deployment

### 1. Pull Latest Changes from GitHub

```bash
# In Replit Shell
git pull origin main
```

### 2. Install Dependencies

```bash
# Install all required packages
npm install
```

### 3. Configure Environment Variables

In Replit, go to the "Secrets" tab and add:

```env
DATABASE_URL=postgresql://username:password@host/database
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
SESSION_SECRET=your-secret-key-here
PORT=5000
NODE_ENV=production
```

Optional:
```env
GEMINI_API_KEY=...
PERPLEXITY_API_KEY=pplx-...
```

### 4. Run Database Migrations

```bash
# Create/update database schema
npm run migrate

# If needed, fix OAuth setup
npm run fix:oauth
```

### 5. Build the Application

```bash
# Build frontend and backend
npm run build
```

### 6. Start the Application

#### Option A: Using PM2 (Recommended)

```bash
# Start with PM2 for better process management
npx pm2 start ecosystem.config.cjs

# Monitor logs
npx pm2 logs --lines 100

# Check status
npx pm2 status
```

#### Option B: Direct Start

```bash
# Start directly
npm start

# Or for development mode with hot reload
npm run dev
```

### 7. Configure Replit Run Button

In `.replit` file, ensure:

```toml
run = "npm run dev"

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "npm run build && npm start"]

[[ports]]
localPort = 5000
externalPort = 80
```

---

## 🔍 Verification Steps

### 1. Check Health Status

```bash
# Check main health endpoint
curl https://your-replit-url.repl.co/api/health

# Check AI health
curl https://your-replit-url.repl.co/api/ai/health
```

### 2. Verify Features

```bash
# Run feature verification script
npx tsx scripts/verify-features.ts
```

### 3. Test Key Endpoints

```bash
# Test timeline endpoint
curl https://your-replit-url.repl.co/api/timeline/comprehensive/therapist-id

# Test document processing
curl -X POST https://your-replit-url.repl.co/api/documents/upload \
  -F "file=@test-document.pdf" \
  -F "therapistId=your-therapist-id"
```

---

## 🐛 Common Issues & Solutions

### Issue: ES Module Errors

**Error**: `Error [ERR_REQUIRE_ESM]: require() of ES Module`

**Solution**:
```bash
# Ensure using .cjs extension for CommonJS configs
mv ecosystem.config.js ecosystem.config.cjs
```

### Issue: Database Connection Failed

**Error**: `DATABASE_URL not configured or invalid`

**Solution**:
1. Check DATABASE_URL in Secrets
2. Ensure it starts with `postgresql://`
3. Test connection:
```bash
npm run test:db
```

### Issue: Build Fails

**Error**: `Could not load /path/to/file`

**Solution**:
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Port Already in Use

**Error**: `Port 5000 is already in use`

**Solution**:
```bash
# Kill existing process
npx pm2 kill

# Or find and kill process
lsof -i :5000
kill -9 <PID>
```

### Issue: AI Features Not Working

**Error**: `AI service unavailable`

**Solution**:
1. Verify API keys in Secrets
2. Check quota/credits for AI services
3. Test individual providers:
```bash
curl -X POST https://your-replit-url.repl.co/api/ai/test
```

---

## 📊 Performance Optimization

### 1. Enable Caching

```javascript
// Already configured in ai-orchestrator.ts
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
```

### 2. Database Optimization

```bash
# Run optimization script
node scripts/optimize-database.js
```

### 3. File Cleanup

```bash
# Clean orphaned files
node scripts/cleanup-files.js
```

### 4. PM2 Clustering (if needed)

```javascript
// In ecosystem.config.cjs
instances: 2, // Run 2 instances
exec_mode: 'cluster', // Enable cluster mode
```

---

## 🔄 Updating the Application

### 1. Pull Latest Changes

```bash
git fetch origin
git pull origin main
```

### 2. Install New Dependencies

```bash
npm install
```

### 3. Run Migrations

```bash
npm run migrate
```

### 4. Rebuild

```bash
npm run build
```

### 5. Restart

```bash
# If using PM2
npx pm2 restart practice-intelligence

# If running directly
# Stop current process (Ctrl+C) then:
npm start
```

---

## 📈 Monitoring

### Using PM2 Dashboard

```bash
# View real-time logs
npx pm2 logs

# Monitor CPU/Memory
npx pm2 monit

# View process list
npx pm2 list

# Get detailed info
npx pm2 info practice-intelligence
```

### Application Metrics

- **Health Check**: `/api/health`
- **AI Metrics**: `/api/ai/health`
- **Database Status**: Check logs for connection pool info
- **Error Logs**: View in `/logs` directory or PM2 logs

---

## 🚨 Emergency Procedures

### Application Crash

```bash
# Restart immediately
npx pm2 restart practice-intelligence

# Check logs for errors
npx pm2 logs --lines 200

# If PM2 fails, start directly
npm run dev
```

### Database Issues

```bash
# Test connection
npm run test:db

# Reset database (CAUTION: Data loss)
npm run db:push
```

### Complete Reset

```bash
# Nuclear option - full reset
rm -rf node_modules dist logs uploads temp_uploads
npm install
npm run migrate
npm run build
npm start
```

---

## 🔐 Security Checklist

- [ ] All API keys stored in Replit Secrets (not in code)
- [ ] SESSION_SECRET is unique and secure
- [ ] Database URL uses SSL connection
- [ ] File upload limits configured (50MB default)
- [ ] CORS properly configured for your domain
- [ ] Rate limiting enabled for API endpoints
- [ ] Error messages don't expose sensitive info

---

## 📝 Maintenance Tasks

### Daily
- Monitor logs for errors
- Check health endpoints
- Verify AI quota usage

### Weekly
- Clean up orphaned files
- Review error patterns
- Update dependencies (if needed)

### Monthly
- Full backup of database
- Review and optimize slow queries
- Update documentation

---

## 🆘 Support Resources

### Documentation
- Main README: `/README.md`
- Enhanced Features: `/ENHANCED_FEATURES_DOCUMENTATION.md`
- API Documentation: `/AI_INTEGRATION_ENHANCEMENTS.md`

### Troubleshooting
- Check `/logs` directory
- Run `npm run diagnose`
- Review PM2 logs: `npx pm2 logs`

### GitHub Repository
https://github.com/jonathanprocter/practice-intelligence_clients

---

## ✅ Deployment Checklist

- [ ] Latest code pulled from GitHub
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured in Secrets
- [ ] Database migrated (`npm run migrate`)
- [ ] Application built (`npm run build`)
- [ ] PM2 started (`npx pm2 start ecosystem.config.cjs`)
- [ ] Health check passing (`/api/health`)
- [ ] AI services verified (`/api/ai/health`)
- [ ] Test user can log in
- [ ] Documents can be uploaded
- [ ] Timeline view working
- [ ] Client navigation functional

---

**Version**: 1.0.0
**Created**: September 1, 2025
**Status**: Production Ready