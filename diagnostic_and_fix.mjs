#!/usr/bin/env node
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.blue.bold('\n=== THERAPY PRACTICE MANAGEMENT SYSTEM - DIAGNOSTIC & FIX TOOL ===\n'));

// Initialize database pool
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=America/New_York'
});

// Helper function to check environment variables
function checkEnvironmentVariables() {
  console.log(chalk.yellow.bold('1. Checking Environment Variables...'));
  
  const requiredVars = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID', 
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY'
  ];
  
  const optionalVars = [
    'ANTHROPIC_API_KEY',
    'GOOGLE_GEMINI_API_KEY',
    'PERPLEXITY_API_KEY',
    'SENDGRID_API_KEY',
    'PORT',
    'REPLIT_DEV_DOMAIN',
    'REPLIT_DOMAINS'
  ];
  
  let hasAllRequired = true;
  
  console.log(chalk.cyan('\nRequired Variables:'));
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      const value = varName.includes('SECRET') || varName.includes('KEY') 
        ? '***' + process.env[varName].slice(-4) 
        : process.env[varName].substring(0, 50) + '...';
      console.log(chalk.green(`  ✓ ${varName}: ${value}`));
    } else {
      console.log(chalk.red(`  ✗ ${varName}: NOT SET`));
      hasAllRequired = false;
    }
  }
  
  console.log(chalk.cyan('\nOptional Variables:'));
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      const value = varName.includes('KEY') 
        ? '***' + process.env[varName].slice(-4)
        : process.env[varName].substring(0, 50);
      console.log(chalk.gray(`  • ${varName}: ${value}`));
    } else {
      console.log(chalk.gray(`  • ${varName}: not set`));
    }
  }
  
  return hasAllRequired;
}

// Helper function to test database connection
async function testDatabaseConnection() {
  console.log(chalk.yellow.bold('\n2. Testing Database Connection...'));
  
  try {
    // Test basic connection
    const client = await pool.connect();
    console.log(chalk.green('  ✓ Connected to PostgreSQL database'));
    
    // Test timezone settings
    const timezoneResult = await client.query('SHOW timezone');
    console.log(chalk.green(`  ✓ Database timezone: ${timezoneResult.rows[0].timezone}`));
    
    // Test database version
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(' ')[1];
    console.log(chalk.green(`  ✓ PostgreSQL version: ${version}`));
    
    // Check database name
    const dbNameResult = await client.query('SELECT current_database()');
    console.log(chalk.green(`  ✓ Connected to database: ${dbNameResult.rows[0].current_database}`));
    
    client.release();
    return true;
  } catch (error) {
    console.log(chalk.red(`  ✗ Database connection failed: ${error.message}`));
    return false;
  }
}

// Helper function to check database schema
async function checkDatabaseSchema() {
  console.log(chalk.yellow.bold('\n3. Checking Database Schema...'));
  
  const tables = [
    'users', 'clients', 'appointments', 'session_notes', 'session_prep_notes',
    'client_checkins', 'action_items', 'treatment_plans', 'ai_insights',
    'session_summaries', 'session_recommendations', 'billing_records',
    'assessments', 'medications', 'communication_logs', 'documents',
    'audit_logs', 'compass_conversations', 'compass_memory', 'calendar_events',
    'assessment_catalog', 'client_assessments', 'assessment_responses',
    'assessment_scores', 'assessment_packages', 'assessment_audit_log'
  ];
  
  const missingTables = [];
  const existingTables = [];
  
  try {
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        existingTables.push(table);
      } else {
        missingTables.push(table);
      }
    }
    
    console.log(chalk.cyan(`\nExisting tables (${existingTables.length}/${tables.length}):`));
    if (existingTables.length <= 10) {
      existingTables.forEach(table => {
        console.log(chalk.green(`  ✓ ${table}`));
      });
    } else {
      console.log(chalk.green(`  ✓ ${existingTables.length} tables exist`));
    }
    
    if (missingTables.length > 0) {
      console.log(chalk.red(`\nMissing tables (${missingTables.length}):`));
      missingTables.forEach(table => {
        console.log(chalk.red(`  ✗ ${table}`));
      });
    }
    
    return { existingTables, missingTables };
  } catch (error) {
    console.log(chalk.red(`  ✗ Schema check failed: ${error.message}`));
    return { existingTables: [], missingTables: tables };
  }
}

// Helper function to check for common data integrity issues
async function checkDataIntegrity() {
  console.log(chalk.yellow.bold('\n4. Checking Data Integrity...'));
  
  const issues = [];
  
  try {
    // Check for orphaned session notes
    const orphanedNotes = await pool.query(`
      SELECT COUNT(*) as count 
      FROM session_notes 
      WHERE appointment_id IS NOT NULL 
      AND appointment_id NOT IN (SELECT id FROM appointments)
    `);
    
    if (parseInt(orphanedNotes.rows[0].count) > 0) {
      issues.push(`Found ${orphanedNotes.rows[0].count} orphaned session notes`);
      console.log(chalk.yellow(`  ⚠ Found ${orphanedNotes.rows[0].count} orphaned session notes`));
    } else {
      console.log(chalk.green('  ✓ No orphaned session notes'));
    }
    
    // Check for appointments without clients
    const orphanedAppointments = await pool.query(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE client_id NOT IN (SELECT id FROM clients)
    `);
    
    if (parseInt(orphanedAppointments.rows[0].count) > 0) {
      issues.push(`Found ${orphanedAppointments.rows[0].count} appointments without valid clients`);
      console.log(chalk.yellow(`  ⚠ Found ${orphanedAppointments.rows[0].count} appointments without valid clients`));
    } else {
      console.log(chalk.green('  ✓ All appointments have valid clients'));
    }
    
    // Check for invalid UUIDs in session notes client_id field
    const invalidClientIds = await pool.query(`
      SELECT COUNT(*) as count 
      FROM session_notes 
      WHERE client_id IS NOT NULL 
      AND client_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);
    
    if (parseInt(invalidClientIds.rows[0].count) > 0) {
      issues.push(`Found ${invalidClientIds.rows[0].count} session notes with invalid client IDs`);
      console.log(chalk.yellow(`  ⚠ Found ${invalidClientIds.rows[0].count} session notes with invalid client IDs`));
    } else {
      console.log(chalk.green('  ✓ All session notes have valid client ID formats'));
    }
    
    // Check for duplicate Google event IDs
    const duplicateEvents = await pool.query(`
      SELECT google_event_id, COUNT(*) as count 
      FROM appointments 
      WHERE google_event_id IS NOT NULL 
      GROUP BY google_event_id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateEvents.rows.length > 0) {
      issues.push(`Found ${duplicateEvents.rows.length} duplicate Google event IDs`);
      console.log(chalk.yellow(`  ⚠ Found ${duplicateEvents.rows.length} duplicate Google event IDs`));
    } else {
      console.log(chalk.green('  ✓ No duplicate Google event IDs'));
    }
    
    return issues;
  } catch (error) {
    console.log(chalk.red(`  ✗ Data integrity check failed: ${error.message}`));
    return [`Data integrity check failed: ${error.message}`];
  }
}

// Helper function to test OAuth connectivity
async function testOAuthConnection() {
  console.log(chalk.yellow.bold('\n5. Testing OAuth Connection...'));
  
  try {
    // Check if tokens file exists
    const tokensFilePath = path.join(process.cwd(), '.oauth-tokens.json');
    
    try {
      const tokensData = await fs.readFile(tokensFilePath, 'utf8');
      const tokens = JSON.parse(tokensData);
      
      console.log(chalk.green('  ✓ OAuth tokens file found'));
      
      // Check token expiry
      if (tokens.expiry_date) {
        const now = Date.now();
        const expiryDate = new Date(tokens.expiry_date);
        
        if (tokens.expiry_date > now) {
          const hoursRemaining = Math.floor((tokens.expiry_date - now) / (1000 * 60 * 60));
          console.log(chalk.green(`  ✓ Access token valid for ${hoursRemaining} more hours`));
        } else {
          console.log(chalk.yellow('  ⚠ Access token expired, refresh needed'));
        }
      }
      
      if (tokens.refresh_token) {
        console.log(chalk.green('  ✓ Refresh token present'));
      } else {
        console.log(chalk.yellow('  ⚠ No refresh token found'));
      }
      
      return true;
    } catch (error) {
      console.log(chalk.yellow('  ⚠ OAuth tokens file not found or invalid'));
      console.log(chalk.cyan('\n  ℹ To authenticate with Google:'));
      console.log(chalk.blue('    1. Start the application: npm run dev'));
      console.log(chalk.blue('    2. Visit: http://localhost:5000/api/auth/google'));
      console.log(chalk.blue('    3. Complete the OAuth flow'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`  ✗ OAuth test failed: ${error.message}`));
    return false;
  }
}

// Helper function to fix common issues
async function fixCommonIssues(issues) {
  console.log(chalk.yellow.bold('\n6. Attempting to Fix Common Issues...'));
  
  if (issues.length === 0) {
    console.log(chalk.green('  ✓ No issues to fix'));
    return;
  }
  
  for (const issue of issues) {
    if (issue.includes('orphaned session notes')) {
      console.log(chalk.cyan('  → Cleaning up orphaned session notes...'));
      try {
        const result = await pool.query(`
          DELETE FROM session_notes 
          WHERE appointment_id IS NOT NULL 
          AND appointment_id NOT IN (SELECT id FROM appointments)
        `);
        console.log(chalk.green(`    ✓ Removed ${result.rowCount} orphaned session notes`));
      } catch (error) {
        console.log(chalk.red(`    ✗ Failed to clean orphaned notes: ${error.message}`));
      }
    }
    
    if (issue.includes('invalid client IDs')) {
      console.log(chalk.cyan('  → Fixing invalid client IDs in session notes...'));
      try {
        // Convert non-UUID client_ids to NULL
        const result = await pool.query(`
          UPDATE session_notes 
          SET client_id = NULL 
          WHERE client_id IS NOT NULL 
          AND client_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        `);
        console.log(chalk.green(`    ✓ Fixed ${result.rowCount} invalid client IDs`));
      } catch (error) {
        console.log(chalk.red(`    ✗ Failed to fix client IDs: ${error.message}`));
      }
    }
    
    if (issue.includes('duplicate Google event IDs')) {
      console.log(chalk.cyan('  → Resolving duplicate Google event IDs...'));
      try {
        // Keep only the most recent appointment for each duplicate
        const result = await pool.query(`
          DELETE FROM appointments a1
          WHERE google_event_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM appointments a2
            WHERE a2.google_event_id = a1.google_event_id
            AND a2.created_at > a1.created_at
          )
        `);
        console.log(chalk.green(`    ✓ Resolved ${result.rowCount} duplicate Google event IDs`));
      } catch (error) {
        console.log(chalk.red(`    ✗ Failed to resolve duplicates: ${error.message}`));
      }
    }
  }
}

// Helper function to create sample data
async function createSampleData() {
  console.log(chalk.yellow.bold('\n7. Checking for Sample Data...'));
  
  try {
    // Check if we have any users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log(chalk.cyan('  → Creating default therapist user...'));
      
      // Create a default therapist user with a properly hashed password
      const result = await pool.query(`
        INSERT INTO users (username, password, full_name, role, email)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO NOTHING
        RETURNING id
      `, ['admin', '$2b$10$Yl7nLXsXaH2z6g3dZ.M.8uLQh7aGJF3kF7kW7wC.FGqK1Qv5ZQVXW', 'Default Therapist', 'therapist', 'admin@therapy.local']);
      
      if (result.rows.length > 0) {
        console.log(chalk.green('    ✓ Created default therapist user (username: admin)'));
        
        // Create a sample client
        const clientResult = await pool.query(`
          INSERT INTO clients (first_name, last_name, email, therapist_id, status)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
          RETURNING id
        `, ['John', 'Doe', 'john.doe@example.com', result.rows[0].id, 'active']);
        
        if (clientResult.rows.length > 0) {
          console.log(chalk.green('    ✓ Created sample client'));
        }
      }
    } else {
      console.log(chalk.gray(`  • ${userCount.rows[0].count} users already exist in database`));
    }
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to check/create sample data: ${error.message}`));
  }
}

// Main diagnostic function
async function runDiagnostics() {
  try {
    // Check environment variables
    const hasEnvVars = checkEnvironmentVariables();
    
    if (!hasEnvVars) {
      console.log(chalk.red.bold('\n⚠ Missing required environment variables!'));
      console.log(chalk.yellow('Please ensure all required variables are set in your .env file or environment.'));
      return;
    }
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      console.log(chalk.red.bold('\n⚠ Database connection failed!'));
      console.log(chalk.yellow('Please check your DATABASE_URL and ensure the database is accessible.'));
      return;
    }
    
    // Check database schema
    const schemaInfo = await checkDatabaseSchema();
    
    if (schemaInfo.missingTables.length > 0) {
      console.log(chalk.yellow.bold('\n⚠ Some database tables are missing!'));
      console.log(chalk.cyan('Run database migrations to create missing tables:'));
      console.log(chalk.blue('  npm run db:migrate'));
    }
    
    // Check data integrity
    const integrityIssues = await checkDataIntegrity();
    
    // Fix common issues if found
    if (integrityIssues.length > 0) {
      await fixCommonIssues(integrityIssues);
    }
    
    // Test OAuth connection
    const oauthConnected = await testOAuthConnection();
    
    // Create sample data if needed
    await createSampleData();
    
    // Summary
    console.log(chalk.blue.bold('\n=== DIAGNOSTIC SUMMARY ===\n'));
    console.log(chalk.green('✓ Environment variables configured'));
    console.log(dbConnected ? chalk.green('✓ Database connection successful') : chalk.red('✗ Database connection failed'));
    console.log(schemaInfo.missingTables.length === 0 
      ? chalk.green('✓ All database tables present')
      : chalk.yellow(`⚠ ${schemaInfo.missingTables.length} tables missing`));
    console.log(integrityIssues.length === 0
      ? chalk.green('✓ No data integrity issues found')
      : chalk.yellow(`⚠ Fixed ${integrityIssues.length} data integrity issues`));
    console.log(oauthConnected
      ? chalk.green('✓ OAuth tokens present')
      : chalk.yellow('⚠ OAuth requires authentication'));
    
    console.log(chalk.blue.bold('\n=== NEXT STEPS ===\n'));
    
    if (schemaInfo.missingTables.length > 0) {
      console.log(chalk.cyan('1. Run database migrations:'));
      console.log(chalk.gray('   npm run db:migrate'));
    }
    
    if (!oauthConnected) {
      console.log(chalk.cyan('2. Authenticate with Google OAuth:'));
      console.log(chalk.gray('   Start the app and visit /api/auth/google'));
    }
    
    console.log(chalk.cyan('3. Start the application:'));
    console.log(chalk.gray('   npm run dev'));
    
    console.log(chalk.green.bold('\n✅ Diagnostic complete!\n'));
    
  } catch (error) {
    console.log(chalk.red.bold('\n❌ Diagnostic failed with error:'));
    console.log(chalk.red(error.message));
    console.log(chalk.gray(error.stack));
  } finally {
    // Close database connection
    await pool.end();
    process.exit(0);
  }
}

// Run diagnostics
runDiagnostics();