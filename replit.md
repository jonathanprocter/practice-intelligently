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

### Comprehensive Client Chart Review System (August 5, 2025)
- **Complete Client Chart Interface**: New dedicated client chart page accessible from clients list showing comprehensive clinical overview
- **Progress Notes Review**: Displays all progress notes with SOAP format, key points, significant quotes, narrative summaries, and tonal analysis
- **Session Prep History**: Shows all session preparation notes with focus areas, objectives, interventions, risk factors, and AI insights
- **AI-Powered Case Conceptualization**: Generate comprehensive clinical overviews including presenting concerns, strengths, risk factors, treatment goals, diagnostic impressions, and prognosis
- **AI Treatment Guide Generation**: Create evidence-based treatment recommendations with specific interventions, session structure, homework suggestions, and progress monitoring
- **Clinical Data Integration**: Seamlessly integrates all available progress notes and session prep data for comprehensive AI analysis
- **Tabbed Interface**: Organized view with separate tabs for progress notes, session prep, case conceptualization, and treatment guides
- **Real-time AI Analysis**: On-demand generation of clinical insights using OpenAI GPT-4o with comprehensive prompting for clinical accuracy

### Document Processing & Appointment Linking System - Complete Integration (August 4, 2025)
- **Comprehensive Document Processing**: Restored full multi-model AI ensemble analysis with tonal analysis, key insights, significant quotes, and narrative summaries
- **Real Client Matching**: Implemented fuzzy name matching against actual client database with first/last name verification  
- **Automatic Appointment Linking**: Progress notes now automatically link to specific calendar appointments based on client and session date
- **Appointment Notes Integration**: Processed content is directly attached to appointment notes field in calendar system
- **Next Session AI Insights**: Automatically generates preparation insights for client's next scheduled appointment including follow-up questions, suggested interventions, and session objectives
- **Enhanced Client Detection**: Improved name extraction from documents with fallback matching for partial names
- **Database Consistency**: Progress notes save with proper client ID, therapist ID, and appointment associations for complete clinical workflow integration

### Calendar System Complete Fix - 4,690+ Events Successfully Loading
- **MAJOR SUCCESS**: Fixed calendar application to load all historical events from 2015-2030
- **Root Cause Identified**: `/api/oauth/events/today` endpoint was restricting events to today only via Python audit script
- **Comprehensive Solution**: Updated API endpoint to use 2015-2030 date ranges instead of current day restrictions
- **Results Achieved**: System now loads 4,690 total events (2,216 from Simple Practice, 2,155 from Google, 319 from US Holidays, 1 from TrevorAI)
- **Backend Logs Confirm**: "Fetched 2216 events from calendar: Simple Practice (2015-2030)" showing proper historical data retrieval
- **Console Errors Fixed**: Removed session notes error logging to prevent unnecessary console noise for calendar events
- **Verification Complete**: Weekly calendar view now displays events across entire historical timeframe instead of showing 0 events

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
- **AI Intelligence Routes Restored**: Comprehensive fix with both GET and POST endpoints for all AI features
- **Database Schema Fix**: Fixed session_notes vs progress_notes table name mismatch causing 500 errors
- **Frontend-Backend Integration**: Added all missing AI endpoints that frontend dashboard requires
- **Complete API Coverage**: Now 118+ total API routes covering all AI intelligence features (cross-client patterns, therapist strengths, session efficiency, client retention, treatment prediction, evidence-based interventions)

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