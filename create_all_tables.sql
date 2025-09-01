-- Therapy Practice Management System - Complete Database Schema
-- Run this script to create all necessary tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

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

CREATE INDEX IF NOT EXISTS clients_therapist_idx ON clients(therapist_id);
CREATE INDEX IF NOT EXISTS clients_status_idx ON clients(status);
CREATE INDEX IF NOT EXISTS clients_name_idx ON clients(first_name, last_name);

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

CREATE INDEX IF NOT EXISTS appointments_client_idx ON appointments(client_id);
CREATE INDEX IF NOT EXISTS appointments_therapist_idx ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments(start_time);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(status);
CREATE INDEX IF NOT EXISTS appointments_google_event_idx ON appointments(google_event_id);

-- Session Notes table
CREATE TABLE IF NOT EXISTS session_notes (
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

CREATE INDEX IF NOT EXISTS session_notes_client_idx ON session_notes(client_id);
CREATE INDEX IF NOT EXISTS session_notes_appointment_idx ON session_notes(appointment_id);
CREATE INDEX IF NOT EXISTS session_notes_session_date_idx ON session_notes(session_date);
CREATE INDEX IF NOT EXISTS session_notes_event_id_idx ON session_notes(event_id);

-- Session Prep Notes table
CREATE TABLE IF NOT EXISTS session_prep_notes (
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

CREATE INDEX IF NOT EXISTS session_prep_notes_event_id_idx ON session_prep_notes(event_id);
CREATE INDEX IF NOT EXISTS session_prep_notes_client_id_idx ON session_prep_notes(client_id);
CREATE INDEX IF NOT EXISTS session_prep_notes_therapist_id_idx ON session_prep_notes(therapist_id);

-- Client Check-ins table
CREATE TABLE IF NOT EXISTS client_checkins (
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

CREATE INDEX IF NOT EXISTS client_checkins_client_id_idx ON client_checkins(client_id);
CREATE INDEX IF NOT EXISTS client_checkins_therapist_id_idx ON client_checkins(therapist_id);
CREATE INDEX IF NOT EXISTS client_checkins_status_idx ON client_checkins(status);
CREATE INDEX IF NOT EXISTS client_checkins_expires_at_idx ON client_checkins(expires_at);
CREATE INDEX IF NOT EXISTS client_checkins_generated_at_idx ON client_checkins(generated_at);

-- Action Items table
CREATE TABLE IF NOT EXISTS action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  therapist_id UUID NOT NULL REFERENCES users(id),
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
  client_id UUID NOT NULL REFERENCES clients(id),
  therapist_id UUID NOT NULL REFERENCES users(id),
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

CREATE INDEX IF NOT EXISTS ai_insights_therapist_idx ON ai_insights(therapist_id);
CREATE INDEX IF NOT EXISTS ai_insights_client_idx ON ai_insights(client_id);

-- Session Summaries table
CREATE TABLE IF NOT EXISTS session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_note_ids JSONB NOT NULL,
  title TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  summary_type TEXT NOT NULL DEFAULT 'comprehensive',
  key_insights JSONB NOT NULL,
  progress_metrics JSONB NOT NULL,
  mood_trends JSONB,
  goal_progress JSONB,
  intervention_effectiveness JSONB,
  risk_assessment JSONB,
  recommended_actions JSONB,
  visual_data JSONB NOT NULL,
  ai_generated_content TEXT NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 0.85,
  date_range JSONB NOT NULL,
  session_count INTEGER NOT NULL DEFAULT 1,
  avg_session_rating DECIMAL(3, 2),
  ai_model TEXT NOT NULL DEFAULT 'gpt-4o',
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_summaries_client_idx ON session_summaries(client_id);
CREATE INDEX IF NOT EXISTS session_summaries_therapist_idx ON session_summaries(therapist_id);
CREATE INDEX IF NOT EXISTS session_summaries_timeframe_idx ON session_summaries(timeframe);
CREATE INDEX IF NOT EXISTS session_summaries_created_at_idx ON session_summaries(created_at);

-- Session Recommendations table
CREATE TABLE IF NOT EXISTS session_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  confidence DECIMAL(3, 2) NOT NULL,
  evidence_base JSONB,
  suggested_approaches JSONB,
  expected_outcomes JSONB,
  implementation_notes TEXT,
  is_implemented BOOLEAN DEFAULT false,
  implemented_at TIMESTAMP,
  feedback TEXT,
  effectiveness TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  valid_until TIMESTAMP,
  ai_model TEXT,
  generation_context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_recommendations_client_idx ON session_recommendations(client_id);
CREATE INDEX IF NOT EXISTS session_recommendations_therapist_idx ON session_recommendations(therapist_id);
CREATE INDEX IF NOT EXISTS session_recommendations_type_idx ON session_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS session_recommendations_priority_idx ON session_recommendations(priority);
CREATE INDEX IF NOT EXISTS session_recommendations_status_idx ON session_recommendations(status);

-- Additional tables for comprehensive system

-- Billing Records table
CREATE TABLE IF NOT EXISTS billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) NOT NULL,
  service_date TIMESTAMP NOT NULL,
  billing_date TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMP,
  insurance_claim_id TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_records_client_idx ON billing_records(client_id);
CREATE INDEX IF NOT EXISTS billing_records_status_idx ON billing_records(status);
CREATE INDEX IF NOT EXISTS billing_records_due_date_idx ON billing_records(due_date);

-- Assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  assessment_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  responses JSONB,
  scores JSONB,
  interpretation TEXT,
  recommendations JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  completed_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessments_client_idx ON assessments(client_id);
CREATE INDEX IF NOT EXISTS assessments_type_idx ON assessments(assessment_type);

-- Medications table
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  prescribed_by TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  purpose TEXT,
  side_effects JSONB,
  effectiveness TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS medications_client_idx ON medications(client_id);
CREATE INDEX IF NOT EXISTS medications_status_idx ON medications(status);

-- Communication Logs table
CREATE TABLE IF NOT EXISTS communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  direction TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  is_urgent BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS communication_logs_client_idx ON communication_logs(client_id);
CREATE INDEX IF NOT EXISTS communication_logs_type_idx ON communication_logs(type);
CREATE INDEX IF NOT EXISTS communication_logs_urgent_idx ON communication_logs(is_urgent);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  document_type TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  is_confidential BOOLEAN DEFAULT true,
  tags JSONB,
  ai_tags JSONB,
  category TEXT,
  subcategory TEXT,
  content_summary TEXT,
  clinical_keywords JSONB,
  confidence_score DECIMAL(3, 2),
  sensitivity_level TEXT DEFAULT 'standard',
  extracted_text TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_client_idx ON documents(client_id);
CREATE INDEX IF NOT EXISTS documents_type_idx ON documents(document_type);
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);
CREATE INDEX IF NOT EXISTS documents_ai_tags_idx ON documents USING gin(ai_tags);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs(timestamp);

-- Compass Conversations table
CREATE TABLE IF NOT EXISTS compass_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context JSONB,
  ai_provider TEXT,
  token_count INTEGER,
  processing_time INTEGER,
  feedback TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS compass_conversations_therapist_idx ON compass_conversations(therapist_id);
CREATE INDEX IF NOT EXISTS compass_conversations_session_idx ON compass_conversations(session_id);
CREATE INDEX IF NOT EXISTS compass_conversations_date_idx ON compass_conversations(created_at);
CREATE INDEX IF NOT EXISTS compass_conversations_role_idx ON compass_conversations(role);

-- Compass Memory table
CREATE TABLE IF NOT EXISTS compass_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL,
  context_key TEXT NOT NULL,
  context_value JSONB NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 1.0,
  last_accessed TIMESTAMP DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS compass_memory_therapist_idx ON compass_memory(therapist_id);
CREATE INDEX IF NOT EXISTS compass_memory_context_idx ON compass_memory(context_type, context_key);
CREATE INDEX IF NOT EXISTS compass_memory_active_idx ON compass_memory(is_active);
CREATE INDEX IF NOT EXISTS compass_memory_accessed_idx ON compass_memory(last_accessed);

-- Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  time_zone TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  attendees JSONB,
  is_all_day BOOLEAN DEFAULT false,
  recurring_event_id TEXT,
  last_sync_time TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendar_events_google_event_idx ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS calendar_events_therapist_idx ON calendar_events(therapist_id);
CREATE INDEX IF NOT EXISTS calendar_events_client_idx ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS calendar_events_date_idx ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS calendar_events_status_idx ON calendar_events(status);
CREATE INDEX IF NOT EXISTS calendar_events_calendar_idx ON calendar_events(google_calendar_id);

-- Assessment Management System Tables

-- Assessment Catalog table
CREATE TABLE IF NOT EXISTS assessment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT,
  estimated_time_minutes INTEGER,
  cpt_code TEXT,
  instructions TEXT,
  scoring_method TEXT,
  interpretation_guide JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_catalog_name_idx ON assessment_catalog(name);
CREATE INDEX IF NOT EXISTS assessment_catalog_type_idx ON assessment_catalog(type);
CREATE INDEX IF NOT EXISTS assessment_catalog_category_idx ON assessment_catalog(category);
CREATE INDEX IF NOT EXISTS assessment_catalog_active_idx ON assessment_catalog(is_active);

-- Client Assessments table
CREATE TABLE IF NOT EXISTS client_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assessment_catalog_id UUID NOT NULL REFERENCES assessment_catalog(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_date TIMESTAMP DEFAULT NOW(),
  started_date TIMESTAMP,
  completed_date TIMESTAMP,
  due_date TIMESTAMP,
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP,
  access_token TEXT,
  progress_percentage INTEGER DEFAULT 0,
  notes TEXT,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS client_assessments_client_idx ON client_assessments(client_id);
CREATE INDEX IF NOT EXISTS client_assessments_status_idx ON client_assessments(status);
CREATE INDEX IF NOT EXISTS client_assessments_therapist_idx ON client_assessments(therapist_id);
CREATE INDEX IF NOT EXISTS client_assessments_due_date_idx ON client_assessments(due_date);
CREATE INDEX IF NOT EXISTS client_assessments_appointment_idx ON client_assessments(appointment_id);

-- Assessment Responses table
CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_assessment_id UUID NOT NULL REFERENCES client_assessments(id) ON DELETE CASCADE,
  responses_json JSONB NOT NULL,
  raw_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  submission_source TEXT,
  is_partial_submission BOOLEAN DEFAULT false,
  submission_duration INTEGER,
  flagged_for_review BOOLEAN DEFAULT false,
  review_notes TEXT,
  encryption_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_responses_client_assessment_idx ON assessment_responses(client_assessment_id);
CREATE INDEX IF NOT EXISTS assessment_responses_created_at_idx ON assessment_responses(created_at);
CREATE INDEX IF NOT EXISTS assessment_responses_review_idx ON assessment_responses(flagged_for_review);

-- Assessment Scores table
CREATE TABLE IF NOT EXISTS assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_assessment_id UUID NOT NULL REFERENCES client_assessments(id) ON DELETE CASCADE,
  score_type TEXT NOT NULL,
  score_name TEXT NOT NULL,
  score_value DECIMAL(10, 3) NOT NULL,
  max_possible_score DECIMAL(10, 3),
  percentile DECIMAL(5, 2),
  interpretation TEXT,
  risk_level TEXT,
  recommended_actions JSONB,
  comparison_data JSONB,
  confidence_interval JSONB,
  calculated_at TIMESTAMP DEFAULT NOW(),
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_scores_client_assessment_idx ON assessment_scores(client_assessment_id);
CREATE INDEX IF NOT EXISTS assessment_scores_score_type_idx ON assessment_scores(score_type);
CREATE INDEX IF NOT EXISTS assessment_scores_risk_level_idx ON assessment_scores(risk_level);

-- Assessment Packages table
CREATE TABLE IF NOT EXISTS assessment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  assessment_ids JSONB NOT NULL,
  default_order JSONB,
  estimated_total_time INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_packages_name_idx ON assessment_packages(name);
CREATE INDEX IF NOT EXISTS assessment_packages_category_idx ON assessment_packages(category);
CREATE INDEX IF NOT EXISTS assessment_packages_active_idx ON assessment_packages(is_active);

-- Assessment Audit Log table
CREATE TABLE IF NOT EXISTS assessment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  client_id UUID REFERENCES clients(id),
  client_assessment_id UUID REFERENCES client_assessments(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_audit_log_user_idx ON assessment_audit_log(user_id);
CREATE INDEX IF NOT EXISTS assessment_audit_log_client_idx ON assessment_audit_log(client_id);
CREATE INDEX IF NOT EXISTS assessment_audit_log_action_idx ON assessment_audit_log(action);
CREATE INDEX IF NOT EXISTS assessment_audit_log_timestamp_idx ON assessment_audit_log(timestamp);

-- Grant permissions (adjust as needed for your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All tables created successfully!';
END $$;