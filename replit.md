# Therapy Practice Management System

## Overview

This is a comprehensive therapy practice management system built as a full-stack web application. The system helps therapists manage clients, appointments, session notes, action items, and leverages AI for insights and analysis. It features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database using Drizzle ORM.

**Latest Update**: Successfully implemented comprehensive database enhancement with 13 robust tables for complete therapy practice management. Added 65+ storage methods supporting billing, assessments, medications, communications, documents, and audit trails. Completely removed all demo data as requested and built authentic data architecture for real-world therapy practice operations.

**Recent Calendar Enhancement (2025-01-31)**: Fixed Google Calendar integration with full OAuth authentication working for 4,129 events across 4 calendars. Redesigned weekly calendar view with proper event spanning (no more split blocks), all-day events section, location defaults (Monday=Woodbury, Tuesday=Telehealth, Wed/Thu/Fri=Rockville Centre), and professional appointment formatting with dynamic font sizing, text wrapping, and clean visual design matching SimplePractice standards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a monorepo structure with clear separation between client and server code:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom therapy-themed design tokens
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

### Enhanced Database Architecture (2025-01-31)
The system now features a comprehensive PostgreSQL database with **13 robust tables** for complete therapy practice management:

**Core Clinical Tables:**
- **users**: Therapist authentication, profiles, and preferences with role management
- **clients**: Complete patient records with demographics, emergency contacts, clinical data, and risk assessment
- **appointments**: Comprehensive scheduling with status tracking, cancellation management, and Google Calendar integration
- **sessionNotes**: Detailed therapy session documentation with SOAP format support and AI analysis
- **treatmentPlans**: Structured treatment planning with goals, interventions, and progress tracking
- **progressNotes**: Detailed progress documentation linked to treatment plans and appointments

**Assessment & Monitoring:**
- **assessments**: Clinical assessments with responses, scoring, and completion tracking
- **medications**: Complete medication management with dosages, status, monitoring, and interaction tracking
- **actionItems**: Task and follow-up management with priorities, completion tracking, and client linking

**Business Operations:**
- **billingRecords**: Comprehensive billing with service codes, amounts, payment tracking, and overdue management
- **communicationLogs**: Client communication history with urgency levels and read status
- **documents**: Secure document storage with access tracking, metadata, and HIPAA-compliant handling

**Analytics & Compliance:**
- **aiInsights**: AI-generated clinical insights, recommendations, and pattern recognition
- **auditLogs**: Complete audit trail for compliance, security tracking, and regulatory requirements

## Key Components

### Authentication & Authorization
- Role-based access control (therapist role by default)
- Session-based authentication with PostgreSQL storage
- User management with secure password handling

### Client Management
- Comprehensive client profiles with demographics
- Emergency contact and insurance information storage
- Client status tracking (active, inactive, archived)
- HIPAA-compliant data handling considerations

### Appointment Scheduling
- Calendar-based appointment management
- Multiple appointment types and statuses
- Integration-ready for external calendar systems
- Real-time appointment updates

### Session Documentation
- Rich text session notes with AI analysis capabilities
- Transcript upload and processing support
- Automated insights generation from session content
- Progress tracking and goal monitoring

### Action Items & Tasks
- Priority-based task management (low, medium, high)
- Due date tracking with overdue notifications
- Client-specific action items
- Progress status monitoring

### Robust Storage Layer Implementation
Enhanced storage architecture with **65+ methods** supporting complete business operations:

**Core Operations:**
- Complete CRUD operations for all 13 database tables
- Advanced querying with filtering, sorting, and pagination
- Status management (active/inactive clients, completed/pending items)
- Bulk operations and batch processing capabilities

**Business Logic Integration:**
- Dashboard statistics with comprehensive financial metrics
- Client engagement analytics and behavioral patterns
- Risk assessment algorithms and automated alert systems
- Overdue payment tracking and financial management
- Appointment conflict detection and resolution

**Analytics & Reporting:**
- Monthly/quarterly revenue calculations and forecasting
- Client engagement metrics (no-show rates, cancellation patterns)
- Treatment plan effectiveness tracking and outcomes
- Financial summaries with pending/overdue payment analysis
- Comprehensive audit trail management for regulatory compliance

### AI Integration
- **Anthropic Claude**: Uses claude-sonnet-4-20250514 model for text analysis
- **OpenAI**: GPT-4o integration for additional AI capabilities
- **Notion API**: Ready for integration with external documentation
- Advanced transcript analysis and clinical insight generation
- Pattern recognition and automated progress tracking
- Risk assessment and early intervention recommendations

## Data Flow

1. **Client Requests**: React frontend makes API calls to Express backend
2. **API Processing**: Express routes handle business logic and validation
3. **Database Operations**: Drizzle ORM manages PostgreSQL interactions
4. **AI Processing**: External AI services process therapy-related content
5. **Real-time Updates**: TanStack Query manages cache invalidation and updates
6. **UI Updates**: React components re-render with fresh data

## External Dependencies

### AI Services
- **Anthropic API**: For advanced text analysis and therapy insights
- **OpenAI API**: For complementary AI capabilities
- **Notion API**: For external documentation integration

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **WebSocket Support**: For real-time features via ws library

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **ESBuild**: Server-side code bundling for production
- **Replit Integration**: Development environment optimizations

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with HMR
- tsx for TypeScript execution in development
- Integrated error handling with runtime error overlay
- Replit-specific tooling for cloud development

### Production Build
- Vite builds frontend to `dist/public`
- ESBuild bundles server code to `dist/index.js`
- Environment-based configuration management
- Database migrations via Drizzle Kit

### Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `ANTHROPIC_API_KEY`: For Claude API access
- `OPENAI_API_KEY`: For GPT API access
- `GOOGLE_CLIENT_ID`: Google Calendar OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google Calendar OAuth client secret
- `NODE_ENV`: Environment specification

**Google Cloud Console Setup Required:**
- App name: RemarkablePlanner
- JavaScript Origins: https://remarkableplanner.replit.app, https://remarkableplanner.replit.dev, https://be19ccdd-fe98-4120-a41d-5c815c7c7a5e-00-24nxj2b2smggx.picard.replit.dev
- Redirect URIs: https://remarkableplanner.replit.app/api/auth/google/callback, https://remarkableplanner.replit.dev/api/auth/google/callback, https://be19ccdd-fe98-4120-a41d-5c815c7c7a5e-00-24nxj2b2smggx.picard.replit.dev/api/auth/google/callback

**Current Issue (2025-01-31):** Google Calendar OAuth failing because current Replit domain `https://be19ccdd-fe98-4120-a41d-5c815c7c7a5e-00-24nxj2b2smggx.picard.replit.dev` needs to be added to Google Cloud Console authorized redirect URIs.

The system is designed for scalability with serverless-ready architecture and modern deployment practices. The separation of concerns allows for independent scaling of frontend and backend components while maintaining type safety throughout the application.