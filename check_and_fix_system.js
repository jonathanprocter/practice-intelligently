#!/usr/bin/env node
import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n=== THERAPY PRACTICE MANAGEMENT SYSTEM - COMPLETE CHECK & FIX ===\n');

// Helper function to check environment variables
function checkEnvironmentVariables() {
  console.log('1. Checking Environment Variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID', 
    'GOOGLE_CLIENT_SECRET',
    'OPENAI_API_KEY'
  ];
  
  const results = {
    missing: [],
    placeholders: [],
    valid: []
  };
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      results.missing.push(varName);
      console.log(`  ✗ ${varName}: NOT SET`);
    } else if (value.includes('your-') || value.includes('test-')) {
      results.placeholders.push(varName);
      console.log(`  ⚠ ${varName}: Using placeholder value`);
    } else {
      results.valid.push(varName);
      const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
        ? '***' + value.slice(-4) 
        : value.substring(0, 30) + '...';
      console.log(`  ✓ ${varName}: ${displayValue}`);
    }
  }
  
  return results;
}

// Helper function to test database connection
async function testDatabaseConnection() {
  console.log('\n2. Testing Database Connection...');
  
  if (!process.env.DATABASE_URL) {
    console.log('  ✗ DATABASE_URL not set');
    return false;
  }
  
  try {
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      options: '-c timezone=America/New_York'
    });
    
    const client = await pool.connect();
    console.log('  ✓ Connected to PostgreSQL database');
    
    // Test a simple query
    const result = await client.query('SELECT 1 as test');
    console.log('  ✓ Database query successful');
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log(`  ✗ Database connection failed: ${error.message}`);
    
    // Provide specific fixes based on error
    if (error.message.includes('WebSocket')) {
      console.log('\n  Possible fixes:');
      console.log('  1. Ensure DATABASE_URL points to a valid PostgreSQL database');
      console.log('  2. If using Neon, ensure the connection string is correct');
      console.log('  3. Consider using a local PostgreSQL or switching to SQLite for development');
    }
    
    return false;
  }
}

// Helper function to check OAuth status
async function checkOAuthStatus() {
  console.log('\n3. Checking OAuth Status...');
  
  const tokensFilePath = path.join(__dirname, '.oauth-tokens.json');
  
  try {
    const tokensData = await fs.readFile(tokensFilePath, 'utf8');
    const tokens = JSON.parse(tokensData);
    
    console.log('  ✓ OAuth tokens file found');
    
    if (tokens.expiry_date) {
      const now = Date.now();
      if (tokens.expiry_date > now) {
        const hoursRemaining = Math.floor((tokens.expiry_date - now) / (1000 * 60 * 60));
        console.log(`  ✓ Access token valid for ${hoursRemaining} more hours`);
      } else {
        console.log('  ⚠ Access token expired');
        if (tokens.refresh_token) {
          console.log('  ✓ Refresh token available');
        }
      }
    }
    
    return true;
  } catch (error) {
    console.log('  ⚠ OAuth tokens not found - authentication required');
    return false;
  }
}

// Helper function to create missing directories
async function createRequiredDirectories() {
  console.log('\n4. Creating Required Directories...');
  
  const directories = [
    'uploads',
    'temp_uploads',
    'data',
    'audit',
    'attached_assets'
  ];
  
  for (const dir of directories) {
    const dirPath = path.join(__dirname, dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`  ✓ Directory exists: ${dir}/`);
    } catch (error) {
      console.log(`  ✗ Failed to create ${dir}/: ${error.message}`);
    }
  }
}

// Main function
async function main() {
  try {
    // Check environment variables
    const envResults = checkEnvironmentVariables();
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    
    // Check OAuth status
    const oauthConfigured = await checkOAuthStatus();
    
    // Create required directories
    await createRequiredDirectories();
    
    // Provide recommendations
    console.log('\n=== SUMMARY & RECOMMENDATIONS ===\n');
    
    // Environment variables
    if (envResults.missing.length > 0) {
      console.log('❌ Missing Environment Variables:');
      envResults.missing.forEach(v => console.log(`  - ${v}`));
      console.log('\n  Fix: Add these to your .env file');
    }
    
    if (envResults.placeholders.length > 0) {
      console.log('⚠️  Placeholder Values Detected:');
      envResults.placeholders.forEach(v => console.log(`  - ${v}`));
      console.log('\n  Fix: Replace with actual values from your providers');
    }
    
    // Database
    if (!dbConnected) {
      console.log('\n❌ Database Connection Failed');
      console.log('  Options to fix:');
      console.log('  1. Use Neon (recommended):');
      console.log('     - Sign up at https://neon.tech');
      console.log('     - Create a database');
      console.log('     - Copy the connection string to DATABASE_URL');
      console.log('  2. Use local PostgreSQL:');
      console.log('     - Install PostgreSQL locally');
      console.log('     - Create a database: createdb therapy_db');
      console.log('     - Update DATABASE_URL to: postgresql://user:password@localhost:5432/therapy_db');
      console.log('  3. Use Supabase:');
      console.log('     - Sign up at https://supabase.com');
      console.log('     - Create a project');
      console.log('     - Copy the connection string to DATABASE_URL');
    } else {
      console.log('\n✅ Database Connected Successfully');
    }
    
    // OAuth
    if (!oauthConfigured) {
      console.log('\n⚠️  OAuth Not Configured');
      console.log('  To set up Google OAuth:');
      console.log('  1. Go to https://console.cloud.google.com');
      console.log('  2. Create a project and enable Google Calendar API');
      console.log('  3. Create OAuth 2.0 credentials');
      console.log('  4. Add redirect URI: http://localhost:5000/api/auth/google/callback');
      console.log('  5. Copy Client ID and Secret to .env file');
      console.log('  6. Start the app and visit /api/auth/google to authenticate');
    } else {
      console.log('\n✅ OAuth Tokens Present');
    }
    
    // Next steps
    console.log('\n=== NEXT STEPS ===\n');
    
    if (!dbConnected) {
      console.log('1. Fix database connection (see recommendations above)');
      console.log('2. Run migrations: npm run db:migrate');
    }
    
    if (!oauthConfigured && envResults.placeholders.includes('GOOGLE_CLIENT_ID')) {
      console.log('3. Configure Google OAuth credentials');
    }
    
    console.log('4. Start the application: npm run dev');
    console.log('5. Visit: http://localhost:5000');
    
    console.log('\n✅ System check complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error during system check:', error.message);
    process.exit(1);
  }
}

// Run the check
main();