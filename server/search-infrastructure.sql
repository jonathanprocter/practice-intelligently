-- Full-text search infrastructure for therapy practice management

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable unaccent extension for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Create search configuration for English with unaccent
CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS english_unaccent (COPY = english);
ALTER TEXT SEARCH CONFIGURATION english_unaccent
    ALTER MAPPING FOR hword, hword_part, word WITH unaccent, english_stem;

-- Add full-text search columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search vector for clients
UPDATE clients SET search_vector = 
    setweight(to_tsvector('english_unaccent', COALESCE(first_name, '')), 'A') ||
    setweight(to_tsvector('english_unaccent', COALESCE(last_name, '')), 'A') ||
    setweight(to_tsvector('english_unaccent', COALESCE(preferred_name, '')), 'B') ||
    setweight(to_tsvector('english_unaccent', COALESCE(email, '')), 'B') ||
    setweight(to_tsvector('english_unaccent', COALESCE(phone, '')), 'C') ||
    setweight(to_tsvector('english_unaccent', COALESCE(referral_source, '')), 'D');

-- Create GIN index for clients search
CREATE INDEX IF NOT EXISTS idx_clients_search_vector ON clients USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_clients_trigram ON clients USING gin(
    (first_name || ' ' || last_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')) gin_trgm_ops
);

-- Add full-text search columns to session_notes table
ALTER TABLE session_notes ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search vector for session_notes
UPDATE session_notes SET search_vector = 
    setweight(to_tsvector('english_unaccent', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english_unaccent', COALESCE(content, '')), 'B') ||
    setweight(to_tsvector('english_unaccent', COALESCE(subjective, '')), 'B') ||
    setweight(to_tsvector('english_unaccent', COALESCE(objective, '')), 'C') ||
    setweight(to_tsvector('english_unaccent', COALESCE(assessment, '')), 'B') ||
    setweight(to_tsvector('english_unaccent', COALESCE(plan, '')), 'B') ||
    setweight(to_tsvector('english_unaccent', COALESCE(narrative_summary, '')), 'C') ||
    setweight(to_tsvector('english_unaccent', COALESCE(ai_summary, '')), 'D');

-- Create GIN index for session_notes search
CREATE INDEX IF NOT EXISTS idx_session_notes_search_vector ON session_notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_session_notes_trigram ON session_notes USING gin(
    (COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(narrative_summary, '')) gin_trgm_ops
);

-- Add full-text search columns to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search vector for appointments
UPDATE appointments SET search_vector = 
    setweight(to_tsvector('english_unaccent', COALESCE(type, '')), 'A') ||
    setweight(to_tsvector('english_unaccent', COALESCE(status, '')), 'B') ||
    setweight(to_tsvector('english_unaccent', COALESCE(location, '')), 'C') ||
    setweight(to_tsvector('english_unaccent', COALESCE(notes, '')), 'D');

-- Create GIN index for appointments search
CREATE INDEX IF NOT EXISTS idx_appointments_search_vector ON appointments USING GIN(search_vector);

-- Add full-text search columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search vector for documents
UPDATE documents SET search_vector = 
    setweight(to_tsvector('english_unaccent', COALESCE(filename, '')), 'A') ||
    setweight(to_tsvector('english_unaccent', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english_unaccent', COALESCE(category, '')), 'C') ||
    setweight(to_tsvector('english_unaccent', COALESCE(extracted_text, '')), 'D');

-- Create GIN index for documents search
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN(search_vector);

-- Add full-text search columns to ai_insights table
ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search vector for ai_insights
UPDATE ai_insights SET search_vector = 
    setweight(to_tsvector('english_unaccent', COALESCE(type, '')), 'A') ||
    setweight(to_tsvector('english_unaccent', COALESCE(content, '')), 'B');

-- Create GIN index for ai_insights search
CREATE INDEX IF NOT EXISTS idx_ai_insights_search_vector ON ai_insights USING GIN(search_vector);

-- Create triggers to automatically update search vectors
CREATE OR REPLACE FUNCTION update_clients_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.first_name, '')), 'A') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.last_name, '')), 'A') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.preferred_name, '')), 'B') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.email, '')), 'B') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.phone, '')), 'C') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.referral_source, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clients_search_vector_trigger ON clients;
CREATE TRIGGER update_clients_search_vector_trigger
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_clients_search_vector();

-- Trigger for session_notes
CREATE OR REPLACE FUNCTION update_session_notes_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.subjective, '')), 'B') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.objective, '')), 'C') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.assessment, '')), 'B') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.plan, '')), 'B') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.narrative_summary, '')), 'C') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.ai_summary, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_session_notes_search_vector_trigger ON session_notes;
CREATE TRIGGER update_session_notes_search_vector_trigger
    BEFORE INSERT OR UPDATE ON session_notes
    FOR EACH ROW EXECUTE FUNCTION update_session_notes_search_vector();

-- Trigger for appointments
CREATE OR REPLACE FUNCTION update_appointments_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.type, '')), 'A') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.status, '')), 'B') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.location, '')), 'C') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.notes, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_appointments_search_vector_trigger ON appointments;
CREATE TRIGGER update_appointments_search_vector_trigger
    BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_appointments_search_vector();

-- Trigger for documents
CREATE OR REPLACE FUNCTION update_documents_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.filename, '')), 'A') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.category, '')), 'C') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.extracted_text, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_documents_search_vector_trigger ON documents;
CREATE TRIGGER update_documents_search_vector_trigger
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_documents_search_vector();

-- Trigger for ai_insights
CREATE OR REPLACE FUNCTION update_ai_insights_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.type, '')), 'A') ||
        setweight(to_tsvector('english_unaccent', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_insights_search_vector_trigger ON ai_insights;
CREATE TRIGGER update_ai_insights_search_vector_trigger
    BEFORE INSERT OR UPDATE ON ai_insights
    FOR EACH ROW EXECUTE FUNCTION update_ai_insights_search_vector();

-- Create a search history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    entity_type TEXT,
    filters JSONB,
    result_count INTEGER,
    clicked_results JSONB,
    search_timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_therapist ON search_history(therapist_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history(search_timestamp DESC);

-- Create saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    entity_type TEXT,
    filters JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_therapist ON saved_searches(therapist_id);