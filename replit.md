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
- **Appointment Scheduling**: Full CRUD operations with comprehensive status management (scheduled, confirmed, checked_in, completed, cancelled, no_show), real-time updates, and Google Calendar integration.
- **Session Documentation**: Rich text session notes, transcript processing, automated AI insights generation, progress tracking.
- **Action Items & Tasks**: Priority-based task management with due dates and client-specific tasks.
- **Robust Storage Layer**: Over 65 methods supporting comprehensive CRUD operations, advanced querying, status management, bulk operations, and integration with business logic for analytics and reporting.
- **Advanced AI Integration & Clinical Intelligence**: Integrates multiple AI models (Claude, OpenAI GPT-4o, Google Gemini, Perplexity Sonar) for:
    - **Predictive Clinical Modeling**: Treatment outcome prediction, risk escalation alerts, optimal intervention timing.
    - **Advanced Pattern Recognition**: Cross-client learning, seasonal/cyclical pattern detection, therapeutic relationship optimization.
    - **Personalized Therapeutic Recommendations**: Evidence-based intervention matching, dynamic homework assignment, curated resources.
    - **Practice Management Intelligence**: Session efficiency analysis, client retention prediction.
    - **Personal Practice Insights**: Therapist strength analysis, continuing education recommendations, practice niche identification.
- **Intelligent Document Processing**: Upload clinical documents (TXT, DOC, DOCX, XLS, XLSX, CSV, images) for AI-driven extraction and progress note generation (SOAP format) with robust error handling and database storage.

### Data Flow
Client requests from the React frontend are processed by the Express backend, which interacts with PostgreSQL via Drizzle ORM. External AI services process therapeutic content, and TanStack Query manages real-time UI updates.

## External Dependencies

### AI Services
- **Anthropic API**: For advanced text analysis and therapy insights.
- **OpenAI API**: For complementary AI capabilities.
- **Notion API**: For external documentation integration.

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **ws library**: For WebSocket support in real-time features.

### Development Tools
- **Drizzle Kit**: Database schema management and migrations.
- **ESBuild**: Server-side code bundling for production.