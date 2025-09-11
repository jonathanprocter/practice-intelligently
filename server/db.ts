import * as dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Dynamic database selection based on environment
let db: any;
let pool: any;

// Check if we have a valid PostgreSQL URL
const isValidPostgresUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  // Check if it's a real PostgreSQL URL (Neon URLs contain specific patterns)
  // Valid Neon URLs contain ep- (endpoint) or neondb_owner as user
  const isNeonUrl = url.includes('neon.tech') || 
                     url.includes('ep-') || 
                     url.includes('neondb_owner');
  const isValidPostgres = url.startsWith('postgresql://') || url.startsWith('postgres://');
  
  // If it's a Neon URL, it's valid
  if (isNeonUrl && isValidPostgres) return true;
  
  // Otherwise, check it's not a placeholder URL
  const isPlaceholder = url.includes('localhost:5432') || 
                        url === 'postgresql://localhost:5432/dbname';
  
  return isValidPostgres && !isPlaceholder;
};

// Initialize database based on what's available
if (isValidPostgresUrl(process.env.DATABASE_URL)) {
  console.log('Using PostgreSQL database from DATABASE_URL');
  
  // PostgreSQL setup (Neon)
  neonConfig.webSocketConstructor = ws;
  
  // Configure timezone globally for the process
  process.env.TZ = 'America/New_York';
  
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    options: '-c timezone=America/New_York'
  });
  
  // Initialize the database connection with timezone setting
  pool.on('connect', async (client: any) => {
    try {
      await client.query("SET timezone = 'America/New_York'");
      await client.query("SET TIME ZONE 'America/New_York'");
    } catch (error) {
      console.warn('Failed to set timezone on database connection:', error);
    }
  });
  
  db = drizzleNeon({ client: pool, schema });
  
} else {
  console.log('DATABASE_URL not configured or invalid, using SQLite fallback');
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Use SQLite as fallback database
  const dbPath = path.join(dataDir, 'therapy.db');
  console.log(`Using SQLite database at: ${dbPath}`);
  
  const sqlite = new Database(dbPath);
  
  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');
  
  // Create tables if they don't exist
  const createTablesSQL = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'therapist',
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    license_number TEXT,
    license_type TEXT,
    license_expiry TEXT,
    qualifications TEXT,
    specializations TEXT,
    profile_picture TEXT,
    address TEXT,
    preferences TEXT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Clients table
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_number TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_name TEXT,
    pronouns TEXT,
    email TEXT,
    phone TEXT,
    alternate_phone TEXT,
    date_of_birth TEXT,
    gender TEXT,
    address TEXT,
    emergency_contact TEXT,
    insurance_info TEXT,
    medical_history TEXT,
    medications TEXT,
    allergies TEXT,
    referral_source TEXT,
    primary_concerns TEXT,
    therapist_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    risk_level TEXT DEFAULT 'low',
    consent_status TEXT,
    hipaa_signed_date TEXT,
    last_contact TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Documents table
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    therapist_id TEXT NOT NULL REFERENCES users(id),
    client_id TEXT REFERENCES clients(id),
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
    last_accessed TEXT,
    content TEXT,
    extracted_text TEXT,
    ai_analysis TEXT,
    tags TEXT,
    category TEXT,
    is_processed INTEGER DEFAULT 0,
    is_sensitive INTEGER DEFAULT 0,
    metadata TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Appointments table
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    appointment_number TEXT UNIQUE,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    location TEXT,
    google_event_id TEXT,
    google_calendar_id TEXT,
    google_calendar_name TEXT,
    last_google_sync TEXT,
    is_virtual INTEGER DEFAULT 0,
    meeting_link TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    no_show_reason TEXT,
    reminder_sent INTEGER DEFAULT 0,
    reminder_sent_at TEXT,
    checked_in_at TEXT,
    completed_at TEXT,
    fee REAL,
    insurance_claim TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Session Notes table
  CREATE TABLE IF NOT EXISTS session_notes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    appointment_id TEXT REFERENCES appointments(id),
    event_id TEXT,
    client_id TEXT,
    therapist_id TEXT,
    content TEXT NOT NULL,
    transcript TEXT,
    ai_summary TEXT,
    tags TEXT,
    title TEXT,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    tonal_analysis TEXT,
    key_points TEXT,
    significant_quotes TEXT,
    narrative_summary TEXT,
    ai_tags TEXT,
    session_date TEXT,
    manual_entry INTEGER DEFAULT 0,
    meeting_type TEXT,
    participants TEXT,
    location TEXT,
    duration INTEGER,
    follow_up_required INTEGER DEFAULT 0,
    follow_up_notes TEXT,
    confidentiality_level TEXT DEFAULT 'standard',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Action Items table
  CREATE TABLE IF NOT EXISTS action_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_id TEXT REFERENCES clients(id),
    therapist_id TEXT NOT NULL REFERENCES users(id),
    event_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    due_date TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Treatment Plans table
  CREATE TABLE IF NOT EXISTS treatment_plans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_id TEXT NOT NULL REFERENCES clients(id),
    therapist_id TEXT NOT NULL REFERENCES users(id),
    goals TEXT NOT NULL,
    interventions TEXT,
    progress TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    start_date TEXT DEFAULT CURRENT_TIMESTAMP,
    review_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- AI Insights table
  CREATE TABLE IF NOT EXISTS ai_insights (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL,
    metadata TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- OAuth tokens table
  CREATE TABLE IF NOT EXISTS oauth_tokens (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
  );
  
  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_clients_therapist ON clients(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_documents_therapist ON documents(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  CREATE INDEX IF NOT EXISTS idx_session_notes_client ON session_notes(client_id);
  CREATE INDEX IF NOT EXISTS idx_session_notes_appointment ON session_notes(appointment_id);
  `;
  
  // Initialize tables
  try {
    sqlite.exec(createTablesSQL);
    console.log('Database tables initialized successfully');
    
    // No default user creation needed - authentication removed
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
  
  // Export the drizzle instance
  db = drizzleSqlite(sqlite, { schema });
  
  // Create a pool-like interface for SQLite (for compatibility)
  pool = {
    query: async (text: string, params?: any[]) => {
      try {
        const stmt = sqlite.prepare(text);
        if (text.toLowerCase().startsWith('select')) {
          return { rows: params ? stmt.all(...params) : stmt.all() };
        } else {
          const result = params ? stmt.run(...params) : stmt.run();
          return { rowCount: result.changes };
        }
      } catch (error) {
        throw error;
      }
    },
    on: () => {}, // SQLite doesn't need connection events
  };
}

export { db, pool };