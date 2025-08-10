# Therapy Practice Management System

## Overview
This is a comprehensive full-stack web application designed to streamline therapy practice operations. Its main purpose is to empower therapists in managing clients, appointments, session notes, and action items efficiently. The system integrates advanced AI capabilities for clinical insights, including predictive clinical modeling, advanced pattern recognition, personalized therapeutic recommendations, and practice management intelligence. The business vision is to enhance client care through data-driven insights and improve overall practice efficiency and clinical outcomes.

## User Preferences
Preferred communication style: Simple, everyday language.
AI Service Priority Order: OpenAI API (primary) → Claude/Anthropic (secondary) → Gemini (tertiary) → Perplexity (fallback)

## System Architecture
The application follows a monorepo structure, clearly separating client and server code, and emphasizes a clean, production-ready state.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom therapy-themed design tokens
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

### Database Architecture
The system utilizes a comprehensive PostgreSQL database with tables for core clinical data (`users`, `clients`, `appointments`, `sessionNotes`, `treatmentPlans`, `progressNotes`), assessment and monitoring (`assessments`, `medications`, `actionItems`), business operations (`billingRecords`, `communicationLogs`, `documents`), and analytics and compliance (`aiInsights`, `auditLogs`).

### Key Features & Technical Implementations
- **Authentication & Authorization**: Role-based access control, session-based authentication with PostgreSQL storage, and secure user management.
- **Client Management**: Comprehensive client profiles with HIPAA compliance.
- **Appointment Scheduling**: Full CRUD operations with status management, real-time updates, Google Calendar integration, and dynamic office location display.
- **Session Documentation**: Rich text session notes, transcript processing, automated AI insights generation, progress tracking, and AI-enhanced session prep.
- **Action Items & Tasks**: Priority-based task management.
- **Robust Storage Layer**: Over 65 methods supporting comprehensive CRUD operations, advanced querying, and integration with business logic.
- **Advanced AI Integration & Clinical Intelligence**: Integrates multiple AI models with prioritized fallback system (OpenAI GPT-4o primary, Claude Sonnet-4 secondary, Google Gemini tertiary, Perplexity Sonar fallback) for predictive clinical modeling, advanced pattern recognition, personalized therapeutic recommendations, and practice management intelligence.
- **Intelligent Document Processing**: Upload clinical documents (TXT, DOC, DOCX, XLS, XLSX, CSV, images) for AI-driven extraction and progress note generation (SOAP format).
- **Analytics Dashboard**: Modern card-based layout with smart insights, AI-powered summaries, and interactive data visualization.
- **Client Check-ins System**: AI-powered check-ins with database lifecycle management and OpenAI analysis.
- **Streamlined Appointments Tab**: Snapshot summary, enhanced appointment cards, and advanced search & filtering.
- **Comprehensive US Holidays Integration**: Federal holidays system (2015-2030) integrated with Google Calendar OAuth.
- **Enhanced Calendar Layout**: Clean day headers, military time format, and improved visual hierarchy.
- **Complete Eastern Daylight Time (EDT) Synchronization**: Comprehensive timezone alignment across all system components including server configuration, database connections, Google Calendar API integration, frontend dateUtils, and all time-related operations to ensure accurate EDT-based scheduling and data consistency.
- **Compass AI Assistant**: Floating AI assistant connected to all practice data with a minimizable chat interface and comprehensive practice context awareness.
- **Google Drive & Notion Integration**: Content viewer with OAuth authentication for Google Calendar, Drive, and Notion workspace integration.
- **Assessment Management System**: Integration of clinical assessments (e.g., Beck Depression Inventory) and therapeutic tools (e.g., breathing exercises, Life in Weeks visualization).
- **Client Chart Review System**: Dedicated interface for comprehensive clinical overview including progress notes, session prep history, AI-powered case conceptualization, and AI treatment guide generation.
- **Session Notes Integration**: Robust session notes system with proper Google Calendar event ID linking, error-resilient loading, and seamless UI integration for appointment-based documentation.
- **Intelligent Session Recommendation Engine**: AI-powered therapeutic recommendations based on client history, session patterns, and clinical data. Features include automated generation using OpenAI GPT-4o, confidence scoring, clinical rationale, implementation tracking, and comprehensive feedback collection.

### Data Flow
Client requests from the React frontend are processed by the Express backend, interacting with PostgreSQL via Drizzle ORM. External AI services process therapeutic content, and TanStack Query manages real-time UI updates.

## External Dependencies

### AI Services
- **OpenAI API**: Primary AI service for clinical analysis and therapy insights.
- **Anthropic API**: Secondary AI service for advanced text analysis.
- **Google Gemini API**: For multimodal content analysis.
- **Perplexity API**: For evidence-based research and recommendations.

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **SendGrid**: Email service for client communications.
- **ws library**: For WebSocket support in real-time features.

### Development Tools
- **Drizzle Kit**: Database schema management and migrations.
- **ESBuild**: Server-side code bundling for production.

## Recent Changes

### Calendar Display Issue Resolved (August 10, 2025)
- **Issue**: Calendar was loading 4,722+ events but not displaying appointments in the UI
- **Root Cause**: Frontend was fetching comprehensive historical data (2015-2030) causing transformation bottlenecks
- **Solution Implemented**:
  - Changed calendar to fetch current week's events only (instead of full historical range)
  - Simplified event transformation logic to prevent processing overload
  - Fixed appointment display to show all client sessions correctly
- **Status**: Resolved - Calendar now displays 44 events for current week including all therapy appointments

### Google Calendar Integration Fixed (August 9, 2025)
- **Issue**: Google Calendar tokens expired causing "invalid_grant" error and 0 events syncing
- **Root Cause**: OAuth refresh tokens expired, preventing calendar access and subcalendar synchronization
- **Solution Implemented**: 
  - Added automatic token refresh functionality with `refreshTokensIfNeeded()` method
  - Enhanced subcalendar detection (shows PRIMARY, SUBCALENDAR, PERSONAL types in logs)
  - Added `/api/auth/google/refresh` endpoint for manual token refresh
  - Added missing OAuth callback endpoint `/api/auth/google/callback` with proper error handling
  - Improved error handling across all calendar endpoints with authentication retry logic
  - Updated Calendar Integration UI with token refresh button and clearer status messages
- **Status**: Fixed - User needs to visit OAuth URL to reconnect Google Calendar authentication