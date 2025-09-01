-- Database initialization script for Therapy Practice Management System
-- Run this script to create all required tables with proper constraints

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone to Eastern Time
SET timezone = 'America/New_York';

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS assessment_audit_log CASCADE;
DROP TABLE IF EXISTS assessment_scores CASCADE;
DROP TABLE IF EXISTS assessment_responses CASCADE;
DROP TABLE IF EXISTS client_assessments CASCADE;
DROP TABLE IF EXISTS assessment_packages CASCADE;
DROP TABLE IF EXISTS assessment_catalog CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS compass_memory CASCADE;
DROP TABLE IF EXISTS compass_conversations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS communication_logs CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS billing_records CASCADE;
DROP TABLE IF EXISTS session_recommendations CASCADE;
DROP TABLE IF EXISTS session_summaries CASCADE;
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS treatment_plans CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS client_checkins CASCADE;
DROP TABLE IF EXISTS session_prep_notes CASCADE;
DROP TABLE IF EXISTS session_notes CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'therapist',
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    license_number TEXT,
    license_type TEXT,
    license_expiry TIMESTAMP,
    qualifications JSONB,
    specializations JSONB,
    profile_picture TEXT,
    address JSONB,
    preferences JSONB,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_username_idx ON users(username);

-- Create clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_number TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_name TEXT,
    pronouns TEXT,
    email TEXT,
    phone TEXT,
    alternate_phone TEXT,
    date_of_birth TIMESTAMP,
    gender TEXT,
    address JSONB,
    emergency_contact JSONB,
    insurance_info JSONB,
    medical_history JSONB,
    medications JSONB,
    allergies JSONB,
    referral_source TEXT,
    primary_concerns JSONB,
    therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    risk_level TEXT DEFAULT 'low',
    consent_status JSONB,
    hipaa_signed_date TIMESTAMP,
    last_contact TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX clients_therapist_idx ON clients(therapist_id);
CREATE INDEX clients_status_idx ON clients(status);
CREATE INDEX clients_name_idx ON clients(first_name, last_name);

-- Create appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_number TEXT UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    location TEXT,
    google_event_id TEXT,
    google_calendar_id TEXT,
    google_calendar_name TEXT,
    last_google_sync TIMESTAMP,
    is_virtual BOOLEAN DEFAULT false,
    meeting_link TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    no_show_reason TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    checked_in_at TIMESTAMP,
    completed_at TIMESTAMP,
    fee DECIMAL(10, 2),
    insurance_claim JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX appointments_client_idx ON appointments(client_id);
CREATE INDEX appointments_therapist_idx ON appointments(therapist_id);
CREATE INDEX appointments_date_idx ON appointments(start_time);
CREATE INDEX appointments_status_idx ON appointments(status);
CREATE INDEX appointments_google_event_idx ON appointments(google_event_id);

-- Create session_notes table (merged with progress notes)
CREATE TABLE session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id),
    event_id TEXT,
    client_id TEXT,
    therapist_id TEXT,
    content TEXT NOT NULL,
    transcript TEXT,
    ai_summary TEXT,
    tags JSONB,
    title TEXT,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    tonal_analysis TEXT,
    key_points JSONB,
    significant_quotes JSONB,
    narrative_summary TEXT,
    ai_tags JSONB,
    session_date TIMESTAMP,
    manual_entry BOOLEAN DEFAULT false,
    meeting_type TEXT,
    participants JSONB,
    location TEXT,
    duration INTEGER,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    confidentiality_level TEXT DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX session_notes_client_idx ON session_notes(client_id);
CREATE INDEX session_notes_appointment_idx ON session_notes(appointment_id);
CREATE INDEX session_notes_session_date_idx ON session_notes(session_date);
CREATE INDEX session_notes_event_id_idx ON session_notes(event_id);

-- Create session_prep_notes table
CREATE TABLE session_prep_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id),
    event_id TEXT,
    client_id TEXT,
    therapist_id TEXT,
    prep_content TEXT NOT NULL,
    key_focus_areas JSONB,
    previous_session_summary TEXT,
    suggested_interventions JSONB,
    client_goals JSONB,
    risk_factors JSONB,
    homework_review TEXT,
    session_objectives JSONB,
    ai_generated_insights TEXT,
    follow_up_questions JSONB,
    psychoeducational_materials JSONB,
    last_updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX session_prep_notes_event_id_idx ON session_prep_notes(event_id);
CREATE INDEX session_prep_notes_client_id_idx ON session_prep_notes(client_id);
CREATE INDEX session_prep_notes_therapist_id_idx ON session_prep_notes(therapist_id);

-- Create client_checkins table
CREATE TABLE client_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    therapist_id TEXT NOT NULL,
    event_id TEXT,
    session_note_id UUID REFERENCES session_notes(id),
    checkin_type TEXT NOT NULL DEFAULT 'midweek',
    priority TEXT NOT NULL DEFAULT 'medium',
    subject TEXT NOT NULL,
    message_content TEXT NOT NULL,
    ai_reasoning TEXT,
    trigger_context JSONB,
    delivery_method TEXT NOT NULL DEFAULT 'email',
    status TEXT NOT NULL DEFAULT 'generated',
    generated_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    sent_at TIMESTAMP,
    archived_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    client_response TEXT,
    response_received_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX client_checkins_client_id_idx ON client_checkins(client_id);
CREATE INDEX client_checkins_therapist_id_idx ON client_checkins(therapist_id);
CREATE INDEX client_checkins_status_idx ON client_checkins(status);
CREATE INDEX client_checkins_expires_at_idx ON client_checkins(expires_at);
CREATE INDEX client_checkins_generated_at_idx ON client_checkins(generated_at);

-- Create remaining tables...
-- (Continue with all other tables from the schema)

-- Create default admin user
INSERT INTO users (username, password, full_name, role, email)
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'System Administrator', 'therapist', 'admin@therapy.local')
ON CONFLICT (username) DO NOTHING;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;