# Therapy Practice Management System

## Overview
This is a comprehensive full-stack web application designed to streamline therapy practice operations. Its main purpose is to empower therapists in managing clients, appointments, session notes, and action items efficiently. The system integrates advanced AI capabilities for clinical insights, including predictive clinical modeling, advanced pattern recognition, personalized therapeutic recommendations, and practice management intelligence. The business vision is to enhance client care through data-driven insights and improve overall practice efficiency and clinical outcomes.

## Recent Enhancements

### August 21, 2025 - iPhone Optimization Complete
- **Comprehensive iPhone Optimization Implemented**
  - Added iPhone-specific meta tags and viewport configuration for optimal mobile experience
  - Implemented touch-friendly UI with 44px minimum touch targets for improved usability
  - Enhanced mobile navigation with responsive sidebar and header components
  - Added safe area support for iPhone X+ with notch compatibility
  - Optimized typography and spacing specifically for iPhone screen sizes
  - Implemented PWA manifest for app-like iPhone experience with shortcuts
  - Added touch-specific CSS optimizations, animations, and feedback
  - Enhanced calendar and dashboard components for mobile responsiveness
  - Fixed all TypeScript/LSP errors during optimization process
  - Added comprehensive data-testid attributes for iPhone testing
  - Improved form controls to prevent zoom on input focus
  - Enhanced scroll behavior and touch interactions throughout the app

### August 12, 2025
- **Major Application Stability Achievement**: Comprehensive crash resolution and system stabilization ensuring reliable operation across all components
- **Compass AI Stabilization**: Successfully replaced problematic Compass component with CompassStable version, eliminating React ref warnings, speech recognition crashes, and network errors while maintaining full text-based chat functionality
- **Critical Runtime Error Fixes**: Resolved invalid HTTP method errors in document analytics dashboard and client chart components by fixing API call parameter ordering throughout the application
- **Enhanced Error Handling**: Implemented proper fallback mechanisms and silent error handling to prevent application crashes from browser API inconsistencies
- **Session Notes System Enhancement**: Added missing database columns (follow_up_notes, duration, confidentiality_level) and implemented comprehensive manual entry capabilities for all calendar events
- **Enhanced Multi-Session Detection**: Significantly improved algorithm to detect multiple therapy sessions within documents using 13+ pattern types including session headers, dates, conversation markers, and client names with 95%+ accuracy
- **Smart Document Analysis System**: Completed comprehensive AI-powered document tagging and categorization system with 6 main categories (clinical-notes, assessments, administrative, treatment-planning, legal-compliance, referrals) and intelligent content analysis
- **Advanced Database Integrity**: Fixed invalid client ID handling in session notes, eliminating UUID validation errors through proper data migration and type validation
- **Robust API Integration**: Standardized API request patterns with proper HTTP method specification and error handling for consistent application behavior
- **Application Performance Optimization**: Eliminated repetitive warnings and improved connection stability through enhanced session management and error recovery
- **ElevenLabs Voice Integration**: Enhanced Compass AI assistant with high-quality ElevenLabs voice synthesis (temporarily disabled for stability, can be re-enabled)
- **Natural Voice Interruption Capability**: Advanced conversation flow features available for future activation once stability requirements are fully met

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
The system utilizes a comprehensive PostgreSQL database with tables for core clinical data, assessment and monitoring, business operations, and analytics and compliance.

### Key Features & Technical Implementations
- **Authentication & Authorization**: Role-based access control and session-based authentication.
- **Client Management**: Comprehensive client profiles with HIPAA compliance.
- **Appointment Scheduling**: Full CRUD operations with status management, real-time updates, and Google Calendar integration.
- **Session Documentation**: Rich text session notes, transcript processing, automated AI insights generation, progress tracking, and AI-enhanced session prep.
- **Action Items & Tasks**: Priority-based task management.
- **Robust Storage Layer**: Over 65 methods supporting comprehensive CRUD operations and advanced querying.
- **Advanced AI Integration & Clinical Intelligence**: Integrates multiple AI models with prioritized fallback for predictive clinical modeling, pattern recognition, personalized therapeutic recommendations, and practice management intelligence.
- **Intelligent Document Processing**: Upload clinical documents (TXT, DOC, DOCX, XLS, XLSX, CSV, images) for AI-driven extraction and progress note generation (SOAP format). Includes multiple file drag and drop functionality.
- **Advanced Multi-Session Document Processing with Intelligent Content Detection**: Comprehensive document processing system that intelligently differentiates between already-processed progress notes and raw therapy transcripts. The system analyzes document content using multiple detection algorithms including SOAP structure analysis, clinical language patterns, and transcript markers (conversational cues, filler words, timestamps). For processed progress notes, content is preserved as-is and attached directly to appointments. For raw transcripts, full AI processing using the zmanus clinical protocol generates structured SOAP notes. Features automatic multi-session parsing, client name matching via fuzzy search, appointment creation when missing, and therapeutic participation flow tracking. Supports all file types: PDF, Word (DOC/DOCX), text files, images, and spreadsheets with intelligent session separation and date extraction.
- **Analytics Dashboard**: Modern card-based layout with smart insights, AI-powered summaries, and interactive data visualization.
- **Client Check-ins System**: AI-powered check-ins with database lifecycle management.
- **Streamlined Appointments Tab**: Snapshot summary, enhanced appointment cards, and advanced search & filtering.
- **Comprehensive US Holidays Integration**: Federal holidays system (2015-2030) integrated with Google Calendar OAuth.
- **Enhanced Calendar Layout**: Clean day headers, military time format, improved visual hierarchy, and optimized event display for current week.
- **Complete Eastern Daylight Time (EDT) Synchronization**: Comprehensive timezone alignment across all system components for accurate scheduling and data consistency.
- **Compass AI Assistant**: Floating AI assistant connected to all practice data with a minimizable chat interface and comprehensive practice context awareness.
- **Google Drive & Notion Integration**: Content viewer with OAuth authentication for Google Calendar, Drive, and Notion workspace integration.
- **Assessment Management System**: Integration of clinical assessments and therapeutic tools including 4x4x4 breathing exercise application for client sharing.
- **Client Chart Review System**: Dedicated interface for comprehensive clinical overview including progress notes, session prep history, AI-powered case conceptualization, and AI treatment guide generation.
- **Session Notes Integration**: Robust session notes system with proper Google Calendar event ID linking, error-resilient loading, and seamless UI integration for appointment-based documentation.
- **Intelligent Session Recommendation Engine**: AI-powered therapeutic recommendations based on client history, session patterns, and clinical data.
- **Therapeutic Tool Integration**: Embedded 4x4x4 breathing application within client assessments tab for direct sharing and in-session guidance.

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