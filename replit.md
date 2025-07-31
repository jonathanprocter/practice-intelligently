# Therapy Practice Management System

## Overview

This is a comprehensive therapy practice management system built as a full-stack web application. The system helps therapists manage clients, appointments, session notes, action items, and leverages AI for insights and analysis. It features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database using Drizzle ORM.

**Latest Update**: Successfully completed Google Calendar OAuth integration with proper error handling, fixed React import issues in calendar components, and implemented comprehensive calendar functionality with weekly/daily views, real-time event syncing, and PDF export optimized for reMarkable Paper Pro.

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

### Database Design
The system uses a PostgreSQL database with the following core entities:
- **Users**: Therapist accounts with authentication
- **Clients**: Patient records with personal and insurance information
- **Appointments**: Scheduled therapy sessions
- **Session Notes**: Documentation from therapy sessions
- **Action Items**: Tasks and follow-ups with priority levels
- **Treatment Plans**: Structured therapy plans and goals
- **AI Insights**: Generated analysis and recommendations

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

### AI Integration
- **Anthropic Claude**: Uses claude-sonnet-4-20250514 model for text analysis
- **OpenAI**: GPT-4o integration for additional AI capabilities
- **Notion API**: Ready for integration with external documentation
- Transcript analysis and insight generation
- Pattern recognition and progress tracking

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
- JavaScript Origins: https://remarkableplanner.replit.app, https://remarkableplanner.replit.dev
- Redirect URIs: https://remarkableplanner.replit.app/api/auth/google/callback, https://remarkableplanner.replit.dev/api/auth/google/callback

The system is designed for scalability with serverless-ready architecture and modern deployment practices. The separation of concerns allows for independent scaling of frontend and backend components while maintaining type safety throughout the application.