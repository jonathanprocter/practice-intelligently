-- Migration: Security and Audit Tables
-- Date: September 1, 2025
-- Purpose: Add API tokens and audit logging capabilities

-- Create API tokens table for programmatic access
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  therapist_id UUID NOT NULL,
  name VARCHAR(255), -- Friendly name for the token
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '[]'::jsonb, -- Array of permission strings
  metadata JSONB DEFAULT '{}'::jsonb -- Additional metadata
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON api_tokens(token);
CREATE INDEX IF NOT EXISTS idx_api_tokens_therapist_id ON api_tokens(therapist_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_expires_at ON api_tokens(expires_at);

-- Create audit log table for tracking all system actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Can be therapist_id or system user
  user_type VARCHAR(50), -- 'therapist', 'admin', 'system', 'api'
  action VARCHAR(255) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export', etc.
  entity_type VARCHAR(100), -- 'client', 'appointment', 'session_note', etc.
  entity_id UUID,
  changes JSONB, -- Before/after values for updates
  metadata JSONB, -- Additional context
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id VARCHAR(255), -- For request tracing
  duration_ms INTEGER, -- Time taken for the action
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failure', 'partial'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER,
  user_id UUID,
  error BOOLEAN DEFAULT false,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance analysis
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint, method);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);

-- Create cache invalidation tracking table
CREATE TABLE IF NOT EXISTS cache_invalidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(500) NOT NULL,
  invalidated_by UUID,
  reason VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create file cleanup tracking table
CREATE TABLE IF NOT EXISTS file_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  file_size BIGINT,
  cleanup_reason VARCHAR(255),
  cleaned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing tables if they don't exist
DO $$ 
BEGIN
  -- Add created_by and updated_by to session_notes if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='session_notes' AND column_name='created_by') THEN
    ALTER TABLE session_notes ADD COLUMN created_by UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='session_notes' AND column_name='updated_by') THEN
    ALTER TABLE session_notes ADD COLUMN updated_by UUID;
  END IF;

  -- Add last_accessed to documents for cleanup tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='documents' AND column_name='last_accessed') THEN
    ALTER TABLE documents ADD COLUMN last_accessed TIMESTAMP;
  END IF;

  -- Add is_archived flag to various tables for soft delete
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='clients' AND column_name='is_archived') THEN
    ALTER TABLE clients ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='appointments' AND column_name='is_archived') THEN
    ALTER TABLE appointments ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='session_notes' AND column_name='is_archived') THEN
    ALTER TABLE session_notes ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at where applicable
DROP TRIGGER IF EXISTS update_api_tokens_updated_at ON api_tokens;
CREATE TRIGGER update_api_tokens_updated_at 
  BEFORE UPDATE ON api_tokens 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for active sessions monitoring
CREATE OR REPLACE VIEW active_user_sessions AS
SELECT 
  user_id,
  user_type,
  COUNT(*) as action_count,
  MAX(created_at) as last_activity,
  array_agg(DISTINCT action) as recent_actions
FROM audit_logs
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
GROUP BY user_id, user_type;

-- Create view for system health metrics
CREATE OR REPLACE VIEW system_health_metrics AS
SELECT 
  endpoint,
  method,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time,
  MIN(response_time_ms) as min_response_time,
  SUM(CASE WHEN error THEN 1 ELSE 0 END) as error_count,
  SUM(CASE WHEN error THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as error_rate
FROM performance_metrics
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY endpoint, method
ORDER BY request_count DESC;

-- Grant appropriate permissions (adjust based on your user setup)
-- GRANT SELECT ON audit_logs TO readonly_user;
-- GRANT ALL ON api_tokens TO app_user;

-- Add comments for documentation
COMMENT ON TABLE api_tokens IS 'Stores API tokens for programmatic access to the system';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all system actions';
COMMENT ON TABLE performance_metrics IS 'Tracks API endpoint performance for monitoring';
COMMENT ON TABLE cache_invalidations IS 'Tracks cache invalidation events for debugging';
COMMENT ON TABLE file_cleanup_log IS 'Logs file cleanup operations for storage management';