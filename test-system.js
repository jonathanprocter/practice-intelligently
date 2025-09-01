#!/usr/bin/env node
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(chalk.blue.bold('\n=== COMPREHENSIVE SYSTEM TEST ===\n'));

class SystemTester {
  constructor() {
    this.results = {
      environment: { passed: 0, failed: 0, warnings: 0 },
      database: { passed: 0, failed: 0, warnings: 0 },
      oauth: { passed: 0, failed: 0, warnings: 0 },
      api: { passed: 0, failed: 0, warnings: 0 },
      overall: { passed: 0, failed: 0, warnings: 0 }
    };
  }

  async testEnvironment() {
    console.log(chalk.yellow.bold('1. Testing Environment Configuration...'));
    
    const required = {
      'DATABASE_URL': 'Database connection string',
      'GOOGLE_CLIENT_ID': 'Google OAuth client ID',
      'GOOGLE_CLIENT_SECRET': 'Google OAuth client secret',
      'OPENAI_API_KEY': 'OpenAI API key for AI features'
    };
    
    const optional = {
      'ANTHROPIC_API_KEY': 'Anthropic Claude API',
      'GOOGLE_GEMINI_API_KEY': 'Google Gemini API',
      'PERPLEXITY_API_KEY': 'Perplexity API',
      'SENDGRID_API_KEY': 'Email service',
      'SESSION_SECRET': 'Session encryption'
    };
    
    // Test required variables
    for (const [key, description] of Object.entries(required)) {
      if (process.env[key]) {
        console.log(chalk.green(`  ✓ ${key} is set (${description})`));
        this.results.environment.passed++;
      } else {
        console.log(chalk.red(`  ✗ ${key} is missing (${description})`));
        this.results.environment.failed++;
      }
    }
    
    // Test optional variables
    for (const [key, description] of Object.entries(optional)) {
      if (process.env[key]) {
        console.log(chalk.gray(`  • ${key} is set (${description})`));
      } else {
        console.log(chalk.gray(`  • ${key} not set - ${description} won't work`));
        this.results.environment.warnings++;
      }
    }
  }

  async testDatabase() {
    console.log(chalk.yellow.bold('\n2. Testing Database Connection...'));
    
    if (!process.env.DATABASE_URL) {
      console.log(chalk.red('  ✗ Cannot test - DATABASE_URL not set'));
      this.results.database.failed++;
      return;
    }
    
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      options: '-c timezone=America/New_York'
    });
    
    try {
      // Test connection
      const client = await pool.connect();
      console.log(chalk.green('  ✓ Connected to PostgreSQL'));
      this.results.database.passed++;
      
      // Test timezone
      const tzResult = await client.query('SHOW timezone');
      const timezone = tzResult.rows[0].timezone;
      if (timezone.includes('America') || timezone.includes('New_York') || timezone.includes('Eastern')) {
        console.log(chalk.green(`  ✓ Timezone configured: ${timezone}`));
        this.results.database.passed++;
      } else {
        console.log(chalk.yellow(`  ⚠ Timezone is ${timezone}, expected America/New_York`));
        this.results.database.warnings++;
      }
      
      // Test critical tables
      const criticalTables = ['users', 'clients', 'appointments', 'session_notes'];
      let allTablesExist = true;
      
      for (const table of criticalTables) {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table]);
        
        if (result.rows[0].exists) {
          console.log(chalk.green(`  ✓ Table '${table}' exists`));
          this.results.database.passed++;
        } else {
          console.log(chalk.red(`  ✗ Table '${table}' missing`));
          this.results.database.failed++;
          allTablesExist = false;
        }
      }
      
      // Test data integrity
      if (allTablesExist) {
        // Check for users
        const userResult = await pool.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(userResult.rows[0].count);
        
        if (userCount > 0) {
          console.log(chalk.green(`  ✓ Found ${userCount} user(s) in database`));
          this.results.database.passed++;
        } else {
          console.log(chalk.yellow('  ⚠ No users in database - need to create admin user'));
          this.results.database.warnings++;
        }
        
        // Check for orphaned records
        const orphanedNotes = await pool.query(`
          SELECT COUNT(*) FROM session_notes 
          WHERE appointment_id IS NOT NULL 
          AND appointment_id NOT IN (SELECT id FROM appointments)
        `);
        
        const orphanCount = parseInt(orphanedNotes.rows[0].count);
        if (orphanCount === 0) {
          console.log(chalk.green('  ✓ No orphaned session notes'));
          this.results.database.passed++;
        } else {
          console.log(chalk.yellow(`  ⚠ Found ${orphanCount} orphaned session notes`));
          this.results.database.warnings++;
        }
      }
      
      client.release();
    } catch (error) {
      console.log(chalk.red(`  ✗ Database error: ${error.message}`));
      this.results.database.failed++;
    } finally {
      await pool.end();
    }
  }

  async testOAuth() {
    console.log(chalk.yellow.bold('\n3. Testing OAuth Configuration...'));
    
    // Check credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.log(chalk.red('  ✗ Google OAuth credentials not configured'));
      this.results.oauth.failed++;
      return;
    } else {
      console.log(chalk.green('  ✓ OAuth credentials configured'));
      this.results.oauth.passed++;
    }
    
    // Check tokens file
    const tokensPath = path.join(__dirname, '.oauth-tokens.json');
    try {
      const tokensData = await fs.readFile(tokensPath, 'utf8');
      const tokens = JSON.parse(tokensData);
      
      console.log(chalk.green('  ✓ OAuth tokens file exists'));
      this.results.oauth.passed++;
      
      if (tokens.access_token) {
        console.log(chalk.green('  ✓ Access token present'));
        this.results.oauth.passed++;
      } else {
        console.log(chalk.yellow('  ⚠ No access token'));
        this.results.oauth.warnings++;
      }
      
      if (tokens.refresh_token) {
        console.log(chalk.green('  ✓ Refresh token present'));
        this.results.oauth.passed++;
      } else {
        console.log(chalk.yellow('  ⚠ No refresh token - re-authentication may be needed'));
        this.results.oauth.warnings++;
      }
      
      if (tokens.expiry_date) {
        const now = Date.now();
        if (tokens.expiry_date > now) {
          const hoursLeft = Math.floor((tokens.expiry_date - now) / (1000 * 60 * 60));
          console.log(chalk.green(`  ✓ Token valid for ${hoursLeft} hours`));
          this.results.oauth.passed++;
        } else {
          console.log(chalk.yellow('  ⚠ Token expired - refresh needed'));
          this.results.oauth.warnings++;
        }
      }
    } catch (error) {
      console.log(chalk.yellow('  ⚠ No OAuth tokens file - authentication needed'));
      this.results.oauth.warnings++;
    }
  }

  async testAPI() {
    console.log(chalk.yellow.bold('\n4. Testing API Endpoints...'));
    
    const port = process.env.PORT || 5000;
    const baseUrl = `http://localhost:${port}`;
    
    console.log(chalk.gray(`  Testing against ${baseUrl}`));
    console.log(chalk.yellow('  ⚠ Note: Server must be running for API tests'));
    
    // Test health endpoint
    try {
      const response = await fetch(`${baseUrl}/api/health`, { 
        timeout: 5000 
      }).catch(() => null);
      
      if (response && response.ok) {
        console.log(chalk.green('  ✓ Health endpoint responding'));
        this.results.api.passed++;
      } else {
        console.log(chalk.yellow('  ⚠ Health endpoint not responding - server may not be running'));
        this.results.api.warnings++;
      }
    } catch (error) {
      console.log(chalk.yellow('  ⚠ Cannot reach API - server may not be running'));
      this.results.api.warnings++;
    }
  }

  generateReport() {
    console.log(chalk.blue.bold('\n=== TEST RESULTS SUMMARY ===\n'));
    
    // Calculate totals
    for (const category of ['environment', 'database', 'oauth', 'api']) {
      this.results.overall.passed += this.results[category].passed;
      this.results.overall.failed += this.results[category].failed;
      this.results.overall.warnings += this.results[category].warnings;
    }
    
    // Display category results
    const categories = {
      'Environment': this.results.environment,
      'Database': this.results.database,
      'OAuth': this.results.oauth,
      'API': this.results.api
    };
    
    for (const [name, stats] of Object.entries(categories)) {
      const status = stats.failed > 0 ? chalk.red('FAILED') :
                    stats.warnings > 0 ? chalk.yellow('WARNING') :
                    chalk.green('PASSED');
      
      console.log(`${name}: ${status}`);
      console.log(chalk.gray(`  Passed: ${stats.passed}, Failed: ${stats.failed}, Warnings: ${stats.warnings}`));
    }
    
    // Overall status
    console.log(chalk.blue.bold('\nOverall Status:'));
    const overallStatus = this.results.overall.failed > 0 ? chalk.red('SYSTEM NOT READY') :
                         this.results.overall.warnings > 5 ? chalk.yellow('SYSTEM NEEDS ATTENTION') :
                         chalk.green('SYSTEM READY');
    
    console.log(overallStatus);
    console.log(chalk.gray(`Total: ${this.results.overall.passed} passed, ${this.results.overall.failed} failed, ${this.results.overall.warnings} warnings`));
    
    // Recommendations
    if (this.results.overall.failed > 0 || this.results.overall.warnings > 0) {
      console.log(chalk.cyan.bold('\n=== RECOMMENDED ACTIONS ===\n'));
      
      if (this.results.environment.failed > 0) {
        console.log(chalk.yellow('1. Configure missing environment variables in .env file'));
      }
      
      if (this.results.database.failed > 0) {
        console.log(chalk.yellow('2. Run database migrations: npm run db:migrate'));
      }
      
      if (this.results.oauth.warnings > 0) {
        console.log(chalk.yellow('3. Authenticate with Google: npm run fix:oauth'));
      }
      
      if (this.results.api.warnings > 0) {
        console.log(chalk.yellow('4. Start the server: npm run dev'));
      }
    }
  }
}

async function runTests() {
  const tester = new SystemTester();
  
  try {
    await tester.testEnvironment();
    await tester.testDatabase();
    await tester.testOAuth();
    await tester.testAPI();
    
    tester.generateReport();
    
    // Exit with appropriate code
    process.exit(tester.results.overall.failed > 0 ? 1 : 0);
  } catch (error) {
    console.log(chalk.red.bold('\n❌ Test suite failed:'));
    console.log(chalk.red(error.message));
    process.exit(1);
  }
}

// Run tests
runTests();