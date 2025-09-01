-- Create missing tables for Therapy Practice Management System
-- This script creates any missing tables with proper constraints

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create session_prep_notes table if it doesn't exist
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

-- Create indexes for session_prep_notes
CREATE INDEX IF NOT EXISTS session_prep_notes_event_id_idx ON session_prep_notes(event_id);
CREATE INDEX IF NOT EXISTS session_prep_notes_client_id_idx ON session_prep_notes(client_id);
CREATE INDEX IF NOT EXISTS session_prep_notes_therapist_id_idx ON session_prep_notes(therapist_id);

-- Create client_checkins table if it doesn't exist
CREATE TABLE IF NOT EXISTS client_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  therapist_id TEXT NOT NULL,
  event_id TEXT,
  session_note_id UUID REFERENCES session_notes(id),
  checkin_type TEXT NOT NULL DEFAULT 'midweek' CHECK (checkin_type IN ('midweek', 'followup', 'crisis_support', 'goal_reminder', 'homework_reminder')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject TEXT NOT NULL,
  message_content TEXT NOT NULL,
  ai_reasoning TEXT,
  trigger_context JSONB,
  delivery_method TEXT NOT NULL DEFAULT 'email' CHECK (delivery_method IN ('email', 'sms', 'both')),
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'approved', 'sent', 'archived', 'deleted')),
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

-- Create indexes for client_checkins
CREATE INDEX IF NOT EXISTS client_checkins_client_id_idx ON client_checkins(client_id);
CREATE INDEX IF NOT EXISTS client_checkins_therapist_id_idx ON client_checkins(therapist_id);
CREATE INDEX IF NOT EXISTS client_checkins_status_idx ON client_checkins(status);
CREATE INDEX IF NOT EXISTS client_checkins_expires_at_idx ON client_checkins(expires_at);
CREATE INDEX IF NOT EXISTS client_checkins_generated_at_idx ON client_checkins(generated_at);

-- Create session_summaries table if it doesn't exist
CREATE TABLE IF NOT EXISTS session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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
  confidence DECIMAL(3,2) DEFAULT 0.85,
  date_range JSONB NOT NULL,
  session_count INTEGER NOT NULL DEFAULT 1,
  avg_session_rating DECIMAL(3,2),
  ai_model TEXT NOT NULL DEFAULT 'gpt-4o',
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for session_summaries
CREATE INDEX IF NOT EXISTS session_summaries_client_idx ON session_summaries(client_id);
CREATE INDEX IF NOT EXISTS session_summaries_therapist_idx ON session_summaries(therapist_id);
CREATE INDEX IF NOT EXISTS session_summaries_timeframe_idx ON session_summaries(timeframe);
CREATE INDEX IF NOT EXISTS session_summaries_created_at_idx ON session_summaries(created_at);

-- Create session_recommendations table if it doesn't exist
CREATE TABLE IF NOT EXISTS session_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  confidence DECIMAL(3,2) NOT NULL,
  evidence_base JSONB,
  suggested_approaches JSONB,
  expected_outcomes JSONB,
  implementation_notes TEXT,
  is_implemented BOOLEAN DEFAULT FALSE,
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

-- Create indexes for session_recommendations
CREATE INDEX IF NOT EXISTS session_recommendations_client_idx ON session_recommendations(client_id);
CREATE INDEX IF NOT EXISTS session_recommendations_therapist_idx ON session_recommendations(therapist_id);
CREATE INDEX IF NOT EXISTS session_recommendations_type_idx ON session_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS session_recommendations_priority_idx ON session_recommendations(priority);
CREATE INDEX IF NOT EXISTS session_recommendations_status_idx ON session_recommendations(status);

-- Create compass_conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS compass_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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

-- Create indexes for compass_conversations
CREATE INDEX IF NOT EXISTS compass_conversations_therapist_idx ON compass_conversations(therapist_id);
CREATE INDEX IF NOT EXISTS compass_conversations_session_idx ON compass_conversations(session_id);
CREATE INDEX IF NOT EXISTS compass_conversations_date_idx ON compass_conversations(created_at);
CREATE INDEX IF NOT EXISTS compass_conversations_role_idx ON compass_conversations(role);

-- Create compass_memory table if it doesn't exist
CREATE TABLE IF NOT EXISTS compass_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  context_type TEXT NOT NULL,
  context_key TEXT NOT NULL,
  context_value JSONB NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 1.0,
  last_accessed TIMESTAMP DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for compass_memory
CREATE INDEX IF NOT EXISTS compass_memory_therapist_idx ON compass_memory(therapist_id);
CREATE INDEX IF NOT EXISTS compass_memory_context_idx ON compass_memory(context_type, context_key);
CREATE INDEX IF NOT EXISTS compass_memory_active_idx ON compass_memory(is_active);
CREATE INDEX IF NOT EXISTS compass_memory_accessed_idx ON compass_memory(last_accessed);

-- Create calendar_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL,
  calendar_name TEXT,
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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
  is_all_day BOOLEAN DEFAULT FALSE,
  recurring_event_id TEXT,
  last_sync_time TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for calendar_events
CREATE INDEX IF NOT EXISTS calendar_events_google_event_idx ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS calendar_events_therapist_idx ON calendar_events(therapist_id);
CREATE INDEX IF NOT EXISTS calendar_events_client_idx ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS calendar_events_date_idx ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS calendar_events_status_idx ON calendar_events(status);
CREATE INDEX IF NOT EXISTS calendar_events_calendar_idx ON calendar_events(google_calendar_id);

-- Create assessment management tables
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
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_catalog_name_idx ON assessment_catalog(name);
CREATE INDEX IF NOT EXISTS assessment_catalog_type_idx ON assessment_catalog(type);
CREATE INDEX IF NOT EXISTS assessment_catalog_category_idx ON assessment_catalog(category);
CREATE INDEX IF NOT EXISTS assessment_catalog_active_idx ON assessment_catalog(is_active);

CREATE TABLE IF NOT EXISTS client_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  assessment_catalog_id UUID REFERENCES assessment_catalog(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
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

CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_assessment_id UUID REFERENCES client_assessments(id) ON DELETE CASCADE NOT NULL,
  responses_json JSONB NOT NULL,
  raw_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  submission_source TEXT,
  is_partial_submission BOOLEAN DEFAULT FALSE,
  submission_duration INTEGER,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  review_notes TEXT,
  encryption_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_responses_client_assessment_idx ON assessment_responses(client_assessment_id);
CREATE INDEX IF NOT EXISTS assessment_responses_created_at_idx ON assessment_responses(created_at);
CREATE INDEX IF NOT EXISTS assessment_responses_review_idx ON assessment_responses(flagged_for_review);

CREATE TABLE IF NOT EXISTS assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_assessment_id UUID REFERENCES client_assessments(id) ON DELETE CASCADE NOT NULL,
  score_type TEXT NOT NULL,
  score_name TEXT NOT NULL,
  score_value DECIMAL(10,3) NOT NULL,
  max_possible_score DECIMAL(10,3),
  percentile DECIMAL(5,2),
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

CREATE TABLE IF NOT EXISTS assessment_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  assessment_ids JSONB NOT NULL,
  default_order JSONB,
  estimated_total_time INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assessment_packages_name_idx ON assessment_packages(name);
CREATE INDEX IF NOT EXISTS assessment_packages_category_idx ON assessment_packages(category);
CREATE INDEX IF NOT EXISTS assessment_packages_active_idx ON assessment_packages(is_active);

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

-- Add missing columns to session_notes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='duration') THEN
    ALTER TABLE session_notes ADD COLUMN duration INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='follow_up_notes') THEN
    ALTER TABLE session_notes ADD COLUMN follow_up_notes TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='confidentiality_level') THEN
    ALTER TABLE session_notes ADD COLUMN confidentiality_level TEXT DEFAULT 'standard';
  END IF;
END $$;

-- Fix data type issues in session_notes table
-- Convert client_id and therapist_id to TEXT if they're not already
DO $$
BEGIN
  -- Check if client_id needs to be converted
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_notes' 
    AND column_name = 'client_id' 
    AND data_type != 'text'
  ) THEN
    ALTER TABLE session_notes ALTER COLUMN client_id TYPE TEXT USING client_id::TEXT;
  END IF;
  
  -- Check if therapist_id needs to be converted
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_notes' 
    AND column_name = 'therapist_id' 
    AND data_type != 'text'
  ) THEN
    ALTER TABLE session_notes ALTER COLUMN therapist_id TYPE TEXT USING therapist_id::TEXT;
  END IF;
END $$;

-- Clean up invalid data
-- Remove invalid UUIDs from text fields
UPDATE session_notes 
SET client_id = NULL 
WHERE client_id IS NOT NULL 
AND client_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE session_notes 
SET therapist_id = NULL 
WHERE therapist_id IS NOT NULL 
AND therapist_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Clean up orphaned records
DELETE FROM session_notes 
WHERE appointment_id IS NOT NULL 
AND appointment_id NOT IN (SELECT id FROM appointments);

-- Remove duplicate Google event IDs (keep the most recent)
DELETE FROM appointments a1
WHERE google_event_id IS NOT NULL
AND EXISTS (
  SELECT 1 FROM appointments a2
  WHERE a2.google_event_id = a1.google_event_id
  AND a2.created_at > a1.created_at
);

-- Add a success message
DO $$
BEGIN
  RAISE NOTICE 'Database schema update completed successfully!';
END $$;