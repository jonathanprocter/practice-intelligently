-- PostgreSQL Schema for Practice Intelligence
-- Includes all tables, indexes, and foreign key relationships

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS assessment_audit_log CASCADE;
DROP TABLE IF EXISTS assessment_scores CASCADE;
DROP TABLE IF EXISTS assessment_responses CASCADE;
DROP TABLE IF EXISTS client_assessments CASCADE;
DROP TABLE IF EXISTS assessment_packages CASCADE;
DROP TABLE IF EXISTS assessment_catalog CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS session_summaries CASCADE;
DROP TABLE IF EXISTS session_recommendations CASCADE;
DROP TABLE IF EXISTS compass_memory CASCADE;
DROP TABLE IF EXISTS compass_conversations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS communication_logs CASCADE;
DROP TABLE IF EXISTS medications CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS billing_records CASCADE;
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS treatment_plans CASCADE;
DROP TABLE IF EXISTS action_items CASCADE;
DROP TABLE IF EXISTS client_checkins CASCADE;
DROP TABLE IF EXISTS session_prep_notes CASCADE;
DROP TABLE IF EXISTS session_notes CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS oauth_tokens CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE IF NOT EXISTS users (
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

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
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

-- OAuth tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
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

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    upload_date TIMESTAMP DEFAULT NOW(),
    last_accessed TIMESTAMP,
    content TEXT,
    extracted_text TEXT,
    ai_analysis JSONB,
    tags JSONB,
    category TEXT,
    is_processed BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false,
    metadata JSONB,
    document_type TEXT,
    subcategory TEXT,
    content_summary TEXT,
    clinical_keywords JSONB,
    confidence_score DECIMAL(3, 2),
    sensitivity_level TEXT,
    is_confidential BOOLEAN DEFAULT false,
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP,
    ai_tags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Session Notes table (for progress notes)
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    event_id TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    transcript TEXT,
    ai_summary TEXT,
    tags JSONB,
    title TEXT,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    tonal_analysis JSONB,
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

-- Session Prep Notes table
CREATE TABLE IF NOT EXISTS session_prep_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    ai_insights TEXT,
    follow_up_questions JSONB,
    psychoeducational_materials JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Client Check-ins table
CREATE TABLE IF NOT EXISTS client_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    response_received_at TIMESTAMP,
    response TEXT,
    priority TEXT DEFAULT 'normal',
    method TEXT,
    ai_generated BOOLEAN DEFAULT false,
    follow_up_required BOOLEAN DEFAULT false,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Action Items table
CREATE TABLE IF NOT EXISTS action_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Treatment Plans table
CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goals JSONB NOT NULL,
    interventions JSONB,
    progress JSONB,
    status TEXT NOT NULL DEFAULT 'active',
    start_date TIMESTAMP DEFAULT NOW(),
    review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Insights table
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(3, 2),
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Billing Records table
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    invoice_number TEXT UNIQUE,
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    insurance_claim_id TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Assessments table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    responses JSONB,
    scores JSONB,
    interpretation TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    administered_date TIMESTAMP,
    completed_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Medications table
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    prescriber TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Communication Logs table
CREATE TABLE IF NOT EXISTS communication_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    direction TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    status TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    changes JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Other tables for additional features
CREATE TABLE IF NOT EXISTS compass_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_thread JSONB NOT NULL,
    context JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compass_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL,
    content JSONB NOT NULL,
    importance DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    recommendation_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    materials JSONB,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    implemented_at TIMESTAMP,
    feedback TEXT,
    effectiveness TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary_type TEXT NOT NULL,
    content TEXT NOT NULL,
    key_insights JSONB,
    action_points JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_event_id TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location TEXT,
    attendees JSONB,
    reminder_minutes INTEGER,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Assessment management tables
CREATE TABLE IF NOT EXISTS assessment_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    category TEXT,
    questions JSONB NOT NULL,
    scoring_method TEXT,
    interpretation_guide JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    assessment_ids JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessment_catalog(id),
    therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'assigned',
    assigned_date TIMESTAMP DEFAULT NOW(),
    started_date TIMESTAMP,
    completed_date TIMESTAMP,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_assessment_id UUID NOT NULL REFERENCES client_assessments(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    response JSONB,
    response_time INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_assessment_id UUID NOT NULL REFERENCES client_assessments(id) ON DELETE CASCADE,
    scale_name TEXT,
    raw_score DECIMAL(10, 2),
    t_score DECIMAL(10, 2),
    percentile INTEGER,
    interpretation TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL,
    action TEXT NOT NULL,
    performed_by UUID REFERENCES users(id),
    changes JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Client indexes
CREATE INDEX idx_clients_therapist ON clients(therapist_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_name ON clients(first_name, last_name);
CREATE INDEX idx_clients_email ON clients(email);

-- Appointment indexes
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_therapist ON appointments(therapist_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(start_time);
CREATE INDEX idx_appointments_google_event ON appointments(google_event_id);
-- Composite index for common queries
CREATE INDEX idx_appointments_therapist_date ON appointments(therapist_id, start_time);
CREATE INDEX idx_appointments_client_date ON appointments(client_id, start_time);

-- Document indexes
CREATE INDEX idx_documents_therapist ON documents(therapist_id);
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_upload_date ON documents(upload_date);

-- Session Notes indexes
CREATE INDEX idx_session_notes_client ON session_notes(client_id);
CREATE INDEX idx_session_notes_therapist ON session_notes(therapist_id);
CREATE INDEX idx_session_notes_appointment ON session_notes(appointment_id);
CREATE INDEX idx_session_notes_event ON session_notes(event_id);
CREATE INDEX idx_session_notes_date ON session_notes(session_date);
-- Composite indexes for common queries
CREATE INDEX idx_session_notes_client_date ON session_notes(client_id, session_date);
CREATE INDEX idx_session_notes_therapist_date ON session_notes(therapist_id, session_date);

-- AI Insights indexes
CREATE INDEX idx_ai_insights_client ON ai_insights(client_id);
CREATE INDEX idx_ai_insights_therapist ON ai_insights(therapist_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(type);
CREATE INDEX idx_ai_insights_read ON ai_insights(is_read);

-- Action Items indexes
CREATE INDEX idx_action_items_client ON action_items(client_id);
CREATE INDEX idx_action_items_therapist ON action_items(therapist_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_priority ON action_items(priority);
CREATE INDEX idx_action_items_due_date ON action_items(due_date);

-- Treatment Plans indexes
CREATE INDEX idx_treatment_plans_client ON treatment_plans(client_id);
CREATE INDEX idx_treatment_plans_therapist ON treatment_plans(therapist_id);
CREATE INDEX idx_treatment_plans_status ON treatment_plans(status);

-- Client Checkins indexes
CREATE INDEX idx_client_checkins_client ON client_checkins(client_id);
CREATE INDEX idx_client_checkins_therapist ON client_checkins(therapist_id);
CREATE INDEX idx_client_checkins_status ON client_checkins(status);
CREATE INDEX idx_client_checkins_scheduled ON client_checkins(scheduled_for);

-- Session Prep Notes indexes
CREATE INDEX idx_session_prep_notes_event ON session_prep_notes(event_id);
CREATE INDEX idx_session_prep_notes_client ON session_prep_notes(client_id);
CREATE INDEX idx_session_prep_notes_therapist ON session_prep_notes(therapist_id);

-- Billing Records indexes
CREATE INDEX idx_billing_records_client ON billing_records(client_id);
CREATE INDEX idx_billing_records_therapist ON billing_records(therapist_id);
CREATE INDEX idx_billing_records_status ON billing_records(status);
CREATE INDEX idx_billing_records_due_date ON billing_records(due_date);

-- Assessments indexes
CREATE INDEX idx_assessments_client ON assessments(client_id);
CREATE INDEX idx_assessments_therapist ON assessments(therapist_id);
CREATE INDEX idx_assessments_type ON assessments(type);
CREATE INDEX idx_assessments_status ON assessments(status);

-- Communication Logs indexes
CREATE INDEX idx_communication_logs_client ON communication_logs(client_id);
CREATE INDEX idx_communication_logs_therapist ON communication_logs(therapist_id);
CREATE INDEX idx_communication_logs_type ON communication_logs(type);

-- Audit Logs indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_date ON audit_logs(created_at);

-- Calendar Events indexes
CREATE INDEX idx_calendar_events_therapist ON calendar_events(therapist_id);
CREATE INDEX idx_calendar_events_google ON calendar_events(google_event_id);
CREATE INDEX idx_calendar_events_date ON calendar_events(start_time);

-- Session Recommendations indexes
CREATE INDEX idx_session_recommendations_client ON session_recommendations(client_id);
CREATE INDEX idx_session_recommendations_therapist ON session_recommendations(therapist_id);
CREATE INDEX idx_session_recommendations_status ON session_recommendations(status);

-- Client Assessments indexes
CREATE INDEX idx_client_assessments_client ON client_assessments(client_id);
CREATE INDEX idx_client_assessments_therapist ON client_assessments(therapist_id);
CREATE INDEX idx_client_assessments_status ON client_assessments(status);

-- Create default admin user if not exists
INSERT INTO users (username, password, full_name, role, email)
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'System Administrator', 'therapist', 'admin@therapy.local')
ON CONFLICT (username) DO NOTHING;

-- Add table comments for documentation
COMMENT ON TABLE users IS 'Stores therapist and system user information';
COMMENT ON TABLE clients IS 'Stores client/patient information';
COMMENT ON TABLE appointments IS 'Stores appointment scheduling data';
COMMENT ON TABLE session_notes IS 'Stores therapy session notes and progress documentation';
COMMENT ON TABLE documents IS 'Stores uploaded documents and their metadata';
COMMENT ON TABLE ai_insights IS 'Stores AI-generated insights and recommendations';
COMMENT ON TABLE action_items IS 'Stores actionable tasks for therapists';
COMMENT ON TABLE treatment_plans IS 'Stores client treatment plans and goals';

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_app_user;