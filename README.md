# Practice Intelligence - Client Management System

## 🏥 Overview

A comprehensive therapy practice management system with AI-powered document processing, client chart management, and case conceptualization capabilities.

## ✨ Features

### 📄 Document Management (Recently Fixed)
- **Upload & Processing**: PDF, Word, text, and image files
- **AI Analysis**: Automatic categorization and tagging
- **Client Linking**: Smart detection and association
- **Search & Filter**: Full-text search across documents
- **Bulk Processing**: Process existing documents in batch

### 👥 Client Management
- Comprehensive client profiles
- Session notes and progress tracking
- Treatment planning
- Assessment management
- Medication tracking

### 📊 AI-Powered Analytics
- Case conceptualization
- Progress analysis
- Treatment recommendations
- Pattern recognition
- Clinical insights

### 📅 Calendar Integration
- Google Calendar sync
- Appointment management
- Session scheduling
- Automated reminders

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (Neon recommended)
- API keys for OpenAI, Anthropic, Gemini, Perplexity

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/jonathanprocter/practice-intelligence_clients.git
cd practice-intelligence_clients
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create a `.env` file with:
```env
DATABASE_URL=your_database_url
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
PERPLEXITY_API_KEY=your_perplexity_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret
```

4. **Setup database:**
```bash
npm run db:push
npm run migrate
```

5. **Build and start:**
```bash
npm run build
npm start
```

## 📁 Project Structure

```
├── server/
│   ├── document-fix.ts        # Document system fixes
│   ├── document-processor.ts  # File processing
│   ├── documentTagger.ts      # AI tagging
│   ├── storage.ts             # Database operations
│   ├── routes.ts              # API endpoints
│   └── index.ts               # Server entry
├── client/
│   └── src/
│       ├── hooks/
│       │   └── useDocuments.ts    # Document management hook
│       ├── components/
│       │   └── DocumentsView.tsx  # Document UI
│       └── pages/
│           └── client-chart.tsx   # Client chart view
├── shared/
│   └── schema.ts              # Database schema
└── uploads/                   # Document storage
```

## 🔧 Recent Fixes (September 2025)

### Document Storage & Retrieval System - Complete Overhaul

#### Problems Solved:
- ❌ Documents were processed but not retrievable
- ❌ No API endpoints for document access
- ❌ Documents not linked to clients
- ❌ Missing UI components for document viewing
- ❌ AI analysis not functioning
- ❌ Case conceptualization broken

#### Solutions Implemented:
- ✅ Created comprehensive REST API for documents
- ✅ Added proper client-document linking
- ✅ Built React components for document management
- ✅ Implemented AI tagging and categorization
- ✅ Added search and filtering capabilities
- ✅ Created data repair utilities
- ✅ Enabled case conceptualization

## 📚 API Documentation

### Document Endpoints

#### Retrieval
- `GET /api/documents/client/:clientId` - Get client documents
- `GET /api/documents/therapist/:therapistId` - Get therapist documents
- `GET /api/documents/:documentId` - Get specific document
- `GET /api/documents/search?query=term` - Search documents

#### Management
- `POST /api/documents/upload` - Upload document
- `PATCH /api/documents/:documentId` - Update metadata
- `DELETE /api/documents/:documentId` - Delete document
- `POST /api/documents/bulk-process` - Process existing files

### Client Chart
- `GET /api/client-chart/:clientId/comprehensive` - Full chart
- `GET /api/client-chart/:clientId/section/:section` - Specific section
- `GET /api/client-chart/:clientId/search?q=term` - Search within client

## 🧪 Testing

Run the document system test:
```bash
node test-document-system.cjs
```

This verifies:
- Directory structure
- Module availability
- Database schema
- Component readiness

## 🐛 Troubleshooting

### Documents Not Appearing
1. Run integrity check: `npx tsx fix-document-issues.ts`
2. Verify uploads directory exists
3. Check database connection
4. Review API key configuration

### Upload Failures
- Maximum file size: 50MB
- Supported formats: PDF, DOCX, DOC, TXT, PNG, JPG, JPEG
- Ensure therapist ID is provided

### AI Analysis Issues
- Verify OpenAI API key
- Check rate limits
- Review extracted text quality

## 🔒 Security

- Session-based authentication
- Therapist-scoped data access
- Sensitive document marking
- File type validation
- Size limit enforcement

## 📈 Performance

- Pagination (50 items default)
- Client-side caching with React Query
- Database indexes on key columns
- Async document processing
- Progress tracking for uploads

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
- Open an issue on GitHub
- Check REPLIT_SETUP.md for Replit-specific setup
- Review test-document-system.cjs output

## 🎉 Acknowledgments

Built with:
- React & TypeScript
- Express.js
- PostgreSQL & Drizzle ORM
- OpenAI, Anthropic, Gemini APIs
- Google Calendar API
- Tailwind CSS

---

**Last Updated:** September 2025
**Latest Commit:** cf8c385 - Document storage system complete fix