#!/usr/bin/env node
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import chalk from 'chalk';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

console.log(chalk.blue.bold('\n=== LOCAL DATABASE SETUP ===\n'));

// Create or connect to SQLite database
const sqlite = new Database('therapy_local.db');
const db = drizzle(sqlite);

// SQL statements to create all tables
const createTables = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'therapist',
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  license_number TEXT,
  license_type TEXT,
  license_expiry DATETIME,
  qualifications TEXT,
  specializations TEXT,
  profile_picture TEXT,
  address TEXT,
  preferences TEXT,
  is_active INTEGER DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  date_of_birth DATETIME,
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
  hipaa_signed_date DATETIME,
  last_contact DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  appointment_number TEXT UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  location TEXT,
  google_event_id TEXT,
  google_calendar_id TEXT,
  google_calendar_name TEXT,
  last_google_sync DATETIME,
  is_virtual INTEGER DEFAULT 0,
  meeting_link TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  no_show_reason TEXT,
  reminder_sent INTEGER DEFAULT 0,
  reminder_sent_at DATETIME,
  checked_in_at DATETIME,
  completed_at DATETIME,
  fee DECIMAL(10,2),
  insurance_claim TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  session_date DATETIME,
  manual_entry INTEGER DEFAULT 0,
  meeting_type TEXT,
  participants TEXT,
  location TEXT,
  duration INTEGER,
  follow_up_required INTEGER DEFAULT 0,
  follow_up_notes TEXT,
  confidentiality_level TEXT DEFAULT 'standard',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  due_date DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  review_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  therapist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence DECIMAL(3,2),
  metadata TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_therapist ON clients(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_session_notes_client ON session_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_appointment ON session_notes(appointment_id);
`;

async function setupDatabase() {
  try {
    console.log(chalk.yellow('Creating database tables...'));
    
    // Execute all CREATE TABLE statements
    sqlite.exec(createTables);
    
    console.log(chalk.green('✓ All tables created successfully'));
    
    // Check if admin user exists
    const adminUser = sqlite.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    
    if (!adminUser) {
      console.log(chalk.yellow('\nCreating default admin user...'));
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create admin user
      const insertUser = sqlite.prepare(`
        INSERT INTO users (username, password, full_name, role, email)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = insertUser.run('admin', hashedPassword, 'System Administrator', 'therapist', 'admin@therapy.local');
      
      console.log(chalk.green('✓ Admin user created'));
      console.log(chalk.cyan('  Username: admin'));
      console.log(chalk.cyan('  Password: admin123'));
      
      // Create sample client
      const insertClient = sqlite.prepare(`
        INSERT INTO clients (first_name, last_name, email, therapist_id, status)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      insertClient.run('John', 'Doe', 'john.doe@example.com', result.lastInsertRowid, 'active');
      console.log(chalk.green('✓ Sample client created'));
      
      // Create sample appointment
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const insertAppointment = sqlite.prepare(`
        INSERT INTO appointments (client_id, therapist_id, start_time, end_time, type, status)
        VALUES (
          (SELECT id FROM clients WHERE email = 'john.doe@example.com'),
          (SELECT id FROM users WHERE username = 'admin'),
          ?, ?, ?, ?
        )
      `);
      
      const endTime = new Date(tomorrow);
      endTime.setHours(11, 0, 0, 0);
      
      insertAppointment.run(
        tomorrow.toISOString(),
        endTime.toISOString(),
        'therapy_session',
        'scheduled'
      );
      console.log(chalk.green('✓ Sample appointment created'));
    } else {
      console.log(chalk.gray('• Admin user already exists'));
    }
    
    // Display table statistics
    console.log(chalk.blue.bold('\n=== DATABASE STATISTICS ===\n'));
    
    const tables = [
      'users', 'clients', 'appointments', 'session_notes',
      'action_items', 'treatment_plans', 'ai_insights'
    ];
    
    for (const table of tables) {
      const count = sqlite.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(chalk.cyan(`${table}: ${count.count} records`));
    }
    
    console.log(chalk.green.bold('\n✅ Local database setup complete!\n'));
    console.log(chalk.yellow('Database file: therapy_local.db'));
    console.log(chalk.yellow('\nTo use this database, update your .env file:'));
    console.log(chalk.gray('DATABASE_URL=sqlite://therapy_local.db'));
    
  } catch (error) {
    console.error(chalk.red('✗ Database setup failed:'), error.message);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

// Run setup
setupDatabase();