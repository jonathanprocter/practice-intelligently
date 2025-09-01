#!/usr/bin/env node
// Standalone diagnostic tool that doesn't require database connection to start

import { promises as fs } from 'fs';
import path from 'path';
import { Pool } from '@neondatabase/serverless';

// ANSI color codes for console output (no external dependencies)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(color: string, text: string) {
  console.log(`${color}${text}${colors.reset}`);
}

function logBold(color: string, text: string) {
  console.log(`${colors.bright}${color}${text}${colors.reset}`);
}

// Load environment variables from .env file if it exists
async function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.trim() && !line.trim().startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Only set if not already set
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

// Helper function to check environment variables
function checkEnvironmentVariables() {
  logBold(colors.yellow, '\n1. Checking Environment Variables...');
  
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
    'SESSION_SECRET',
    'REPLIT_DEV_DOMAIN',
    'REPLIT_DOMAINS',
    'ELEVENLABS_API_KEY',
    'NODE_ENV'
  ];
  
  let hasAllRequired = true;
  const missing = [];
  
  log(colors.cyan, '\nRequired Variables:');
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      const value = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')
        ? '***' + (process.env[varName]!.slice(-4) || '****')
        : process.env[varName]!.substring(0, 50) + (process.env[varName]!.length > 50 ? '...' : '');
      log(colors.green, `  ✓ ${varName}: ${value}`);
    } else {
      log(colors.red, `  ✗ ${varName}: NOT SET`);
      hasAllRequired = false;
      missing.push(varName);
    }
  }
  
  log(colors.cyan, '\nOptional Variables:');
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      const value = varName.includes('KEY') || varName.includes('SECRET')
        ? '***' + (process.env[varName]!.slice(-4) || '****')
        : process.env[varName]!.substring(0, 50);
      log(colors.gray, `  • ${varName}: ${value}`);
    } else {
      log(colors.gray, `  • ${varName}: not set`);
    }
  }
  
  return { hasAllRequired, missing };
}

// Helper function to test database connection
async function testDatabaseConnection() {
  logBold(colors.yellow, '\n2. Testing Database Connection...');
  
  if (!process.env.DATABASE_URL) {
    log(colors.red, '  ✗ DATABASE_URL not set - skipping database tests');
    return false;
  }
  
  try {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      options: '-c timezone=America/New_York'
    });
    
    // Test basic connection
    const client = await pool.connect();
    log(colors.green, '  ✓ Connected to PostgreSQL database');
    
    // Test timezone settings
    const timezoneResult = await client.query('SHOW timezone');
    log(colors.green, `  ✓ Database timezone: ${timezoneResult.rows[0].timezone}`);
    
    // Test database version
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version.split(' ')[1];
    log(colors.green, `  ✓ PostgreSQL version: ${version}`);
    
    // Check database name
    const dbNameResult = await client.query('SELECT current_database()');
    log(colors.green, `  ✓ Connected to database: ${dbNameResult.rows[0].current_database}`);
    
    client.release();
    await pool.end();
    return true;
  } catch (error: any) {
    log(colors.red, `  ✗ Database connection failed: ${error.message}`);
    return false;
  }
}

// Helper function to check database schema
async function checkDatabaseSchema() {
  logBold(colors.yellow, '\n3. Checking Database Schema...');
  
  if (!process.env.DATABASE_URL) {
    log(colors.red, '  ✗ DATABASE_URL not set - skipping schema checks');
    return { existingTables: [], missingTables: [] };
  }
  
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
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
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
    
    await pool.end();
    
    log(colors.cyan, `\nExisting tables (${existingTables.length}/${tables.length}):`);
    if (existingTables.length > 0) {
      existingTables.slice(0, 10).forEach(table => {
        log(colors.green, `  ✓ ${table}`);
      });
      if (existingTables.length > 10) {
        log(colors.gray, `  ... and ${existingTables.length - 10} more`);
      }
    }
    
    if (missingTables.length > 0) {
      log(colors.red, `\nMissing tables (${missingTables.length}):`);
      missingTables.forEach(table => {
        log(colors.red, `  ✗ ${table}`);
      });
    }
    
    return { existingTables, missingTables };
  } catch (error: any) {
    log(colors.red, `  ✗ Schema check failed: ${error.message}`);
    return { existingTables: [], missingTables: tables };
  }
}

// Helper function to check OAuth token file
async function checkOAuthTokens() {
  logBold(colors.yellow, '\n4. Checking OAuth Configuration...');
  
  const tokenPath = path.join(process.cwd(), '.oauth-tokens.json');
  
  try {
    const tokenData = await fs.readFile(tokenPath, 'utf8');
    const tokens = JSON.parse(tokenData);
    
    if (tokens.access_token) {
      log(colors.green, '  ✓ OAuth tokens file exists');
      
      // Check if tokens are expired
      if (tokens.expiry_date) {
        const now = Date.now();
        if (tokens.expiry_date > now) {
          const expiresIn = Math.round((tokens.expiry_date - now) / 1000 / 60);
          log(colors.green, `  ✓ Tokens valid for ${expiresIn} more minutes`);
        } else {
          log(colors.yellow, '  ⚠ Tokens have expired - refresh needed');
        }
      }
      
      return true;
    } else {
      log(colors.yellow, '  ⚠ OAuth tokens file exists but is incomplete');
      return false;
    }
  } catch (error) {
    log(colors.yellow, '  ⚠ No OAuth tokens found - authentication required');
    return false;
  }
}

// Helper function to provide setup instructions
function provideSetupInstructions(envCheck: any, dbConnected: boolean, schemaInfo: any, hasOAuth: boolean) {
  logBold(colors.blue, '\n=== SETUP INSTRUCTIONS ===\n');
  
  let step = 1;
  
  // Environment setup
  if (!envCheck.hasAllRequired) {
    logBold(colors.cyan, `${step}. Set up environment variables:`);
    log(colors.gray, '   Copy .env.example to .env and fill in your values:');
    log(colors.gray, '   cp .env.example .env');
    log(colors.gray, '   nano .env  # or use your preferred editor\n');
    
    log(colors.yellow, '   Missing required variables:');
    envCheck.missing.forEach((varName: string) => {
      log(colors.red, `   - ${varName}`);
    });
    step++;
  }
  
  // Database setup
  if (!dbConnected && envCheck.hasAllRequired) {
    logBold(colors.cyan, `${step}. Fix database connection:`);
    log(colors.gray, '   Ensure your DATABASE_URL is correct and the database is accessible');
    log(colors.gray, '   For Neon: Check your connection string at https://console.neon.tech');
    log(colors.gray, '   For local: Ensure PostgreSQL is running\n');
    step++;
  }
  
  // Schema setup
  if (dbConnected && schemaInfo.missingTables.length > 0) {
    logBold(colors.cyan, `${step}. Create missing database tables:`);
    log(colors.gray, '   Run the migration script:');
    log(colors.gray, '   npm run db:fix');
    log(colors.gray, '   OR');
    log(colors.gray, '   psql $DATABASE_URL -f create_missing_tables.sql\n');
    step++;
  }
  
  // OAuth setup
  if (!hasOAuth && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    logBold(colors.cyan, `${step}. Set up Google OAuth:`);
    log(colors.gray, '   1. Start the application: npm run dev');
    log(colors.gray, '   2. Visit: http://localhost:5000/api/auth/google');
    log(colors.gray, '   3. Complete the authentication flow\n');
    step++;
  }
  
  // Final step
  logBold(colors.cyan, `${step}. Start the application:`);
  log(colors.gray, '   npm run dev');
  log(colors.gray, '   Visit: http://localhost:5000\n');
}

// Main diagnostic function
async function runDiagnostics() {
  try {
    logBold(colors.blue, '\n=== THERAPY PRACTICE MANAGEMENT SYSTEM - DIAGNOSTIC TOOL ===\n');
    
    // Try to load .env file
    const envLoaded = await loadEnvFile();
    if (envLoaded) {
      log(colors.green, '✓ Loaded .env file');
    } else {
      log(colors.yellow, '⚠ No .env file found - using system environment variables');
    }
    
    // Check environment variables
    const envCheck = checkEnvironmentVariables();
    
    // Test database connection
    let dbConnected = false;
    if (envCheck.hasAllRequired || process.env.DATABASE_URL) {
      dbConnected = await testDatabaseConnection();
    }
    
    // Check database schema
    let schemaInfo = { existingTables: [], missingTables: [] };
    if (dbConnected) {
      schemaInfo = await checkDatabaseSchema();
    }
    
    // Check OAuth tokens
    const hasOAuth = await checkOAuthTokens();
    
    // Summary
    logBold(colors.blue, '\n=== DIAGNOSTIC SUMMARY ===\n');
    
    log(envCheck.hasAllRequired ? colors.green : colors.red, 
        envCheck.hasAllRequired ? '✓ All required environment variables set' : '✗ Missing required environment variables');
    
    log(dbConnected ? colors.green : colors.red,
        dbConnected ? '✓ Database connection successful' : '✗ Database connection failed');
    
    if (dbConnected) {
      log(schemaInfo.missingTables.length === 0 ? colors.green : colors.yellow,
          schemaInfo.missingTables.length === 0 
            ? '✓ All database tables present'
            : `⚠ ${schemaInfo.missingTables.length} database tables missing`);
    }
    
    log(hasOAuth ? colors.green : colors.yellow,
        hasOAuth ? '✓ OAuth tokens configured' : '⚠ OAuth authentication required');
    
    // Provide setup instructions if needed
    if (!envCheck.hasAllRequired || !dbConnected || schemaInfo.missingTables.length > 0 || !hasOAuth) {
      provideSetupInstructions(envCheck, dbConnected, schemaInfo, hasOAuth);
    } else {
      logBold(colors.green, '\n✅ System is properly configured and ready to use!\n');
      log(colors.cyan, 'Start the application with:');
      log(colors.gray, '  npm run dev\n');
    }
    
  } catch (error: any) {
    logBold(colors.red, '\n❌ Diagnostic failed with error:');
    log(colors.red, error.message);
    if (error.stack) {
      log(colors.gray, error.stack);
    }
  }
  
  process.exit(0);
}

// Run diagnostics
runDiagnostics();