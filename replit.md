# Therapy Practice Management System

## Overview

This is a comprehensive therapy practice management system designed as a full-stack web application. Its main purpose is to empower therapists in managing clients, appointments, session notes, and action items efficiently. The system leverages advanced AI capabilities for clinical insights and intelligent document processing, aiming to provide predictive clinical modeling, advanced pattern recognition, personalized therapeutic recommendations, and practice management intelligence. It features a modern React frontend with shadcn/ui components and an Express.js backend with a PostgreSQL database using Drizzle ORM. The business vision is to streamline therapy practice operations, enhance client care through data-driven insights, and improve overall practice efficiency and clinical outcomes.

## User Preferences

Preferred communication style: Simple, everyday language.

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
The system utilizes a comprehensive PostgreSQL database with 13 robust tables:
- **Core Clinical**: `users`, `clients`, `appointments`, `sessionNotes`, `treatmentPlans`, `progressNotes`
- **Assessment & Monitoring**: `assessments`, `medications`, `actionItems`
- **Business Operations**: `billingRecords`, `communicationLogs`, `documents`
- **Analytics & Compliance**: `aiInsights`, `auditLogs`

### Key Features & Technical Implementations
- **Authentication & Authorization**: Role-based access control, session-based authentication with PostgreSQL storage, secure user management.
- **Client Management**: Comprehensive client profiles, emergency contacts, insurance information, HIPAA compliance.
- **Appointment Scheduling**: Full CRUD operations with comprehensive status management, real-time updates, and Google Calendar integration. Dynamic office location display based on day.
- **Session Documentation**: Rich text session notes, transcript processing, automated AI insights generation, progress tracking. Enhanced session prep with AI-generated and manual follow-up questions.
- **Action Items & Tasks**: Priority-based task management with due dates and client-specific tasks.
- **Robust Storage Layer**: Over 65 methods supporting comprehensive CRUD operations, advanced querying, status management, bulk operations, and integration with business logic for analytics and reporting.
- **Advanced AI Integration & Clinical Intelligence**: Integrates multiple AI models with OpenAI GPT-4o as primary (OpenAI GPT-4o, Claude Sonnet-4, Google Gemini, Perplexity Sonar) for:
    - **Predictive Clinical Modeling**: Treatment outcome prediction, risk escalation alerts, optimal intervention timing.
    - **Advanced Pattern Recognition**: Cross-client learning, seasonal/cyclical pattern detection, therapeutic relationship optimization.
    - **Personalized Therapeutic Recommendations**: Evidence-based intervention matching, dynamic homework assignment, curated resources.
    - **Practice Management Intelligence**: Session efficiency analysis, client retention prediction.
    - **Personal Practice Insights**: Therapist strength analysis, continuing education recommendations, practice niche identification.
- **Intelligent Document Processing**: Upload clinical documents (TXT, DOC, DOCX, XLS, XLSX, CSV, images) for AI-driven extraction and progress note generation (SOAP format) with robust error handling and database storage.
- **Analytics Dashboard**: Modern card-based layout with smart insights, AI-powered summaries, interactive data visualization, comparative benchmarks, and drill-down capabilities.
- **Client Check-ins System**: AI-powered check-ins with database lifecycle management, OpenAI analysis for determining check-in needs, modern dashboard, advanced filtering, bulk operations, and email integration.
- **Streamlined Appointments Tab**: Snapshot summary, enhanced appointment cards with quick actions, advanced search & filtering, bulk operations, and integration with session prep.
- **Comprehensive US Holidays Integration**: Complete federal holidays system (2015-2030) with accurate calculations, integrated with Google Calendar OAuth as all-day events, includes holiday API endpoints and dashboard integration.
- **Enhanced Calendar Layout**: Clean day headers with full day names positioned above All Day events section, military time format throughout, improved visual hierarchy.
- **Compass AI Assistant**: Floating AI assistant with dapper gentleman avatar positioned on right middle of screen. Connected to all practice data with OpenAI primary, Anthropic fallback. Features minimizable chat interface, AI provider badges, and comprehensive practice context awareness.
- **Google Drive & Notion Integration**: Complete content viewer with OAuth authentication supporting both Google Calendar and Drive access, plus Notion workspace integration with database and page content viewing.

## Recent Changes (August 2025)

### Major Infrastructure Overhaul - API Route Crisis Resolution
- **Critical Issue Discovered**: Systematic audit revealed 319 total issues with 53+ critical missing API routes causing widespread silent failures
- **Comprehensive Fix Implementation**: Added 61+ new API route definitions with proper error handling, input validation, and service integration
- **Routes Added**: AI intelligence (7), session prep (5), calendar integration (14), authentication (8), document processing (2), Google Drive (4), Notion (4), client check-ins (5), OAuth utilities (2), and enhanced search capabilities
- **Server Capacity**: Increased from 71 to 99+ total API routes with full functionality restored
- **Quality Assurance**: Created comprehensive audit tools (`enhanced_audit_script.py`, `fix_implementation.py`, `final_fix_implementation.py`) for ongoing maintenance
- **Verification Complete**: All previously broken features now functional - AI intelligence, session preparation, calendar integration, document processing, OAuth authentication

### Assessment Management System Enhancements
- **Beck Depression Inventory (BDI-II)**: Successfully integrated from external URL with comprehensive clinical scoring, suicide risk protocols, and proper CPT coding
- **Breathing Exercise Tool**: Added interactive tool with Box Breathing, 4-7-8 technique, and custom patterns for stress reduction
- **Life in Weeks Visualization**: Created therapeutic tool for existential therapy and life perspective work
- **Tools Category**: Established new category to distinguish therapeutic tools from clinical assessments with cyan styling and wrench icons
- **Assessment Catalog Updates**: Corrected CCI-55 to "Comprehensive Coping Inventory" (not Cognitive Complexity Instrument)
- **Personal Psychotherapy Form**: Reclassified as therapeutic tool rather than traditional assessment for better categorization

### Authentication & Integration Fixes
- **Google OAuth Restored**: Successfully re-authenticated with expanded scopes for both Calendar and Drive access
- **Error Handling Improved**: Added defensive programming for therapistId access throughout API client
- **Content Viewer Enhanced**: Updated with proper error states and re-authentication flows
- **Calendar Integration Working**: Confirmed 4 calendars connected including Simple Practice, holidays, and personal calendars
- **Deployment Infrastructure Crisis**: Resolved critical missing API routes issue affecting all AI and integration features after redeployment
- **OAuth Connection Routes**: Added missing `/api/oauth/is-connected` route returning proper JSON status
- **Client Check-ins Routes**: Implemented comprehensive client-checkins API endpoints (6 new routes)
- **Authentication Flow Routes**: Added Google OAuth URL generation and callback handling routes
- **AI Intelligence Routes Restored**: Added missing pattern analysis, practice intelligence, and therapist insights endpoints
- **Complete API Coverage**: Now 112+ total API routes with full AI functionality restored

### Data Flow
Client requests from the React frontend are processed by the Express backend, which interacts with PostgreSQL via Drizzle ORM. External AI services process therapeutic content, and TanStack Query manages real-time UI updates.

## External Dependencies

### AI Services
- **OpenAI API**: Primary AI service for clinical analysis and therapy insights.
- **Anthropic API**: Secondary AI service for advanced text analysis and detailed insights.
- **Google Gemini API**: For multimodal content analysis.
- **Perplexity API**: For evidence-based research and recommendations.

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **SendGrid**: Email service for client communications.
- **ws library**: For WebSocket support in real-time features.

### Development Tools
- **Drizzle Kit**: Database schema management and migrations.
- **ESBuild**: Server-side code bundling for production.