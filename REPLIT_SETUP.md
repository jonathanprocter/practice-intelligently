# Replit Environment Setup Guide

## 🚀 Quick Start for Replit

This document ensures the practice intelligence client management system works properly in Replit.

## Environment Variables Required

Create a `.env` file in Replit with these variables:

```env
# Database
DATABASE_URL=your_neon_database_url

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google Gemini
GEMINI_API_KEY=your_gemini_api_key

# Perplexity
PERPLEXITY_API_KEY=your_perplexity_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-replit-url.repl.co/api/auth/google/callback

# Session Secret
SESSION_SECRET=your_random_session_secret

# Server Configuration
PORT=3000
NODE_ENV=production
```

## Replit Configuration Files

### `.replit` file is already configured with:
- Node.js 20 runtime
- Proper build and start commands
- Port 3000 exposure
- Required environment setup

### `replit.nix` configuration includes:
- Node.js 20
- PostgreSQL client tools
- Git
- Build essentials

## Installation Steps in Replit

1. **Fork/Import the Repository**
   - Use: `https://github.com/jonathanprocter/practice-intelligence_clients.git`

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Database**
   ```bash
   npm run db:push
   npm run migrate
   ```

4. **Build the Application**
   ```bash
   npm run build
   ```

5. **Start the Server**
   ```bash
   npm start
   ```

## Document Storage System Features

### ✅ Fixed Issues:
- Document upload and processing
- Client linking for documents
- AI tagging and categorization
- Document retrieval endpoints
- Search and filtering
- Case conceptualization

### 📁 Directory Structure Required:
```
/home/user/webapp/
├── uploads/           # Document uploads
├── temp_uploads/      # Temporary files
├── attached_assets/   # Media assets
├── server/
│   ├── document-fix.ts        # Document management fixes
│   ├── document-processor.ts  # Document processing
│   ├── documentProcessor.ts   # Enhanced processor
│   ├── documentTagger.ts      # AI tagging
│   └── storage.ts             # Database operations
├── client/
│   └── src/
│       ├── hooks/
│       │   └── useDocuments.ts    # React hook
│       └── components/
│           └── DocumentsView.tsx   # UI component
└── create_all_tables.sql     # Database schema
```

### 🔌 API Endpoints Available:

#### Document Retrieval
- `GET /api/documents/client/:clientId` - Get client documents
- `GET /api/documents/therapist/:therapistId` - Get therapist documents
- `GET /api/documents/:documentId` - Get specific document
- `GET /api/documents/search` - Search documents

#### Document Management
- `POST /api/documents/upload` - Upload new document
- `POST /api/documents/bulk-process` - Process existing documents
- `PATCH /api/documents/:documentId` - Update document
- `DELETE /api/documents/:documentId` - Delete document
- `GET /api/documents/stats/:therapistId` - Get statistics

#### Client Chart
- `GET /api/client-chart/:clientId/comprehensive` - Full client chart
- `GET /api/client-chart/:clientId/section/:section` - Chart sections
- `GET /api/client-chart/:clientId/longitudinal` - Journey view
- `GET /api/client-chart/:clientId/search` - Search client data

## Troubleshooting in Replit

### If documents aren't showing:
1. Check database connection:
   ```bash
   node test-document-system.cjs
   ```

2. Fix orphaned documents:
   ```bash
   npx tsx fix-document-issues.ts
   ```

3. Verify uploads directory:
   ```bash
   mkdir -p uploads temp_uploads attached_assets
   ```

### If upload fails:
1. Check file size (max 50MB)
2. Verify allowed formats: PDF, DOCX, TXT, Images
3. Ensure therapist ID is provided
4. Check API key configuration

### If AI analysis fails:
1. Verify OpenAI API key
2. Check rate limits
3. Review document content extraction

## Performance Optimization for Replit

1. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

2. **Enable caching:**
   - Documents are cached for 30 seconds
   - Use React Query for client-side caching

3. **Optimize database queries:**
   - Pagination is implemented (50 items default)
   - Indexes are created on key columns

## Security Considerations

1. **Access Control:**
   - Documents filtered by therapist ID
   - Client privacy maintained
   - Sensitive documents marked

2. **File Upload Security:**
   - File type validation
   - Size limits enforced
   - Malware scanning recommended

3. **API Authentication:**
   - Session-based auth implemented
   - OAuth integration available

## Monitoring & Maintenance

1. **Check system health:**
   ```bash
   curl https://your-replit-url.repl.co/api/health
   ```

2. **View document statistics:**
   ```bash
   curl https://your-replit-url.repl.co/api/documents/stats/[therapist-id]
   ```

3. **Monitor logs:**
   ```bash
   pm2 logs
   ```

## Support & Resources

- **GitHub Repository:** https://github.com/jonathanprocter/practice-intelligence_clients
- **Recent Updates:** Document storage system completely rebuilt
- **Test Script:** Run `node test-document-system.cjs` to verify setup

## Latest Changes (as of commit cf8c385)

✅ **Document System Improvements:**
- Added comprehensive document management API
- Created document retrieval endpoints
- Implemented proper client linking
- Added search and filtering
- Created React hooks and components
- Added bulk processing
- Implemented integrity verification
- Fixed orphaned documents
- Added AI tagging support
- Created test scripts
- Ensured text extraction
- Added case conceptualization support

The system is now fully functional and ready for production use in Replit!