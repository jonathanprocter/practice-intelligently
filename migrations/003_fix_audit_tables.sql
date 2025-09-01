-- Fix migration: Ensure all required columns exist
-- Date: September 1, 2025

-- First, check and add missing columns to audit_logs
DO $$ 
BEGIN
  -- Add created_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='created_at') THEN
    ALTER TABLE audit_logs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Add user_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='audit_logs' AND column_name='user_type') THEN
    ALTER TABLE audit_logs ADD COLUMN user_type VARCHAR(50);
  END IF;
END $$;

-- Now create the missing index on created_at
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Recreate the views with proper column checks
DROP VIEW IF EXISTS active_user_sessions;
CREATE OR REPLACE VIEW active_user_sessions AS
SELECT 
  user_id,
  COALESCE(user_type, 'unknown') as user_type,
  COUNT(*) as action_count,
  MAX(created_at) as last_activity,
  array_agg(DISTINCT action) as recent_actions
FROM audit_logs
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 minutes'
GROUP BY user_id, user_type;

-- Check if performance_metrics has required columns
DO $$ 
BEGIN
  -- Add timestamp if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='performance_metrics' AND column_name='timestamp') THEN
    ALTER TABLE performance_metrics ADD COLUMN timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Add response_time_ms if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='performance_metrics' AND column_name='response_time_ms') THEN
    ALTER TABLE performance_metrics ADD COLUMN response_time_ms INTEGER;
  END IF;
  
  -- Add error column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='performance_metrics' AND column_name='error') THEN
    ALTER TABLE performance_metrics ADD COLUMN error BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Recreate system health metrics view
DROP VIEW IF EXISTS system_health_metrics;
CREATE OR REPLACE VIEW system_health_metrics AS
SELECT 
  endpoint,
  method,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time,
  MAX(response_time_ms) as max_response_time,
  MIN(response_time_ms) as min_response_time,
  SUM(CASE WHEN error THEN 1 ELSE 0 END) as error_count,
  SUM(CASE WHEN error THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*), 0) * 100 as error_rate
FROM performance_metrics
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY endpoint, method
ORDER BY request_count DESC;

-- Verify all tables have their required columns
SELECT 
  'audit_logs' as table_name,
  COUNT(*) as column_count,
  array_agg(column_name ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'audit_logs'
UNION ALL
SELECT 
  'api_tokens' as table_name,
  COUNT(*) as column_count,
  array_agg(column_name ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'api_tokens'
UNION ALL
SELECT 
  'performance_metrics' as table_name,
  COUNT(*) as column_count,
  array_agg(column_name ORDER BY column_name) as columns
FROM information_schema.columns
WHERE table_name = 'performance_metrics';

-- Add a simple health check function
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE(
  check_name VARCHAR,
  status VARCHAR,
  details TEXT
) AS $$
BEGIN
  -- Check if critical tables exist
  RETURN QUERY
  SELECT 
    'Critical Tables'::VARCHAR,
    CASE 
      WHEN COUNT(*) >= 10 THEN 'OK'::VARCHAR
      ELSE 'WARNING'::VARCHAR
    END,
    'Found ' || COUNT(*) || ' tables'::TEXT
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
  
  -- Check for orphaned session notes
  RETURN QUERY
  SELECT 
    'Orphaned Session Notes'::VARCHAR,
    CASE 
      WHEN COUNT(*) = 0 THEN 'OK'::VARCHAR
      ELSE 'WARNING'::VARCHAR
    END,
    'Found ' || COUNT(*) || ' orphaned notes'::TEXT
  FROM session_notes
  WHERE appointment_id IS NULL
  AND therapist_id IS NOT NULL;
  
  -- Check for old upload files (if documents table exists)
  RETURN QUERY
  SELECT 
    'Old Documents'::VARCHAR,
    CASE 
      WHEN COUNT(*) < 100 THEN 'OK'::VARCHAR
      ELSE 'WARNING'::VARCHAR
    END,
    'Found ' || COUNT(*) || ' documents older than 90 days'::TEXT
  FROM documents
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the health check function
GRANT EXECUTE ON FUNCTION check_database_health() TO PUBLIC;

-- Final verification message
DO $$
BEGIN
  RAISE NOTICE 'Migration 003 completed successfully. Run SELECT * FROM check_database_health() to verify.';
END $$;