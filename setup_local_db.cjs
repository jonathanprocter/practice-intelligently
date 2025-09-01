#!/usr/bin/env node
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue.bold('\n=== Setting Up Local SQLite Database for Testing ===\n'));

async function setupLocalDatabase() {
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    // Create SQLite database
    const dbPath = path.join(dataDir, 'therapy_local.db');
    console.log(chalk.cyan(`Creating SQLite database at: ${dbPath}`));
    
    const db = new sqlite3.Database(dbPath);
    
    // Read and execute SQL schema (converted for SQLite)
    const sqlContent = await fs.readFile('create_all_tables.sql', 'utf8');
    
    // Convert PostgreSQL syntax to SQLite
    const sqliteSql = sqlContent
      .replace(/UUID/gi, 'TEXT')
      .replace(/gen_random_uuid\(\)/gi, "lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6)))")
      .replace(/JSONB/gi, 'TEXT')
      .replace(/SERIAL/gi, 'INTEGER')
      .replace(/NOW\(\)/gi, "datetime('now')")
      .replace(/INTERVAL '7 days'/gi, "datetime('now', '+7 days')")
      .replace(/CREATE EXTENSION.*?;/gi, '')
      .replace(/CREATE INDEX.*?;/gi, '') // Skip indexes for initial setup
      .replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'REAL')
      .replace(/ON DELETE CASCADE/gi, '')
      .replace(/ON DELETE SET NULL/gi, '')
      .replace(/CHECK \(role IN \('user', 'assistant'\)\)/gi, '')
      .replace(/DEFAULT gen_random_uuid\(\)/gi, '')
      .replace(/DO \$\$.*?\$\$/gs, ''); // Remove DO blocks
    
    // Split into individual statements
    const statements = sqliteSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(chalk.yellow(`Executing ${statements.length} SQL statements...`));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.includes('CREATE TABLE')) {
        const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
        
        await new Promise((resolve, reject) => {
          db.run(statement + ';', (err) => {
            if (err) {
              console.log(chalk.red(`  ✗ Failed to create table ${tableName}: ${err.message}`));
              errorCount++;
              resolve(); // Continue even on error
            } else {
              console.log(chalk.green(`  ✓ Created table: ${tableName}`));
              successCount++;
              resolve();
            }
          });
        });
      }
    }
    
    console.log(chalk.blue(`\n=== Setup Complete ===`));
    console.log(chalk.green(`✓ ${successCount} tables created successfully`));
    if (errorCount > 0) {
      console.log(chalk.yellow(`⚠ ${errorCount} tables had errors (may already exist)`));
    }
    
    // Create sample data
    console.log(chalk.cyan('\nCreating sample data...'));
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO users (id, username, password, full_name, role, email)
        VALUES ('550e8400-e29b-41d4-a716-446655440001', 'admin', '$2b$10$YourHashedPasswordHere', 'Admin User', 'therapist', 'admin@therapy.local')
      `, (err) => {
        if (err && !err.message.includes('UNIQUE')) {
          console.log(chalk.yellow(`  ⚠ Could not create admin user: ${err.message}`));
        } else {
          console.log(chalk.green(`  ✓ Created admin user`));
        }
        resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO clients (id, first_name, last_name, email, therapist_id, status)
        VALUES ('550e8400-e29b-41d4-a716-446655440002', 'John', 'Doe', 'john.doe@example.com', '550e8400-e29b-41d4-a716-446655440001', 'active')
      `, (err) => {
        if (err && !err.message.includes('UNIQUE')) {
          console.log(chalk.yellow(`  ⚠ Could not create sample client: ${err.message}`));
        } else {
          console.log(chalk.green(`  ✓ Created sample client`));
        }
        resolve();
      });
    });
    
    db.close();
    
    // Update .env file to use SQLite
    console.log(chalk.cyan('\nUpdating .env file for local SQLite...'));
    
    const envPath = path.join(__dirname, '.env.local');
    const envContent = `# Local SQLite Database Configuration
DATABASE_URL=sqlite://${dbPath}
DATABASE_TYPE=sqlite

# Google OAuth Configuration (for testing)
GOOGLE_CLIENT_ID=test-client-id
GOOGLE_CLIENT_SECRET=test-client-secret

# AI Service API Keys (for testing)
OPENAI_API_KEY=test-openai-key
ANTHROPIC_API_KEY=test-anthropic-key
GOOGLE_GEMINI_API_KEY=test-gemini-key
PERPLEXITY_API_KEY=test-perplexity-key

# Email Service (for testing)
SENDGRID_API_KEY=test-sendgrid-key

# Server Configuration
PORT=5000
NODE_ENV=development

# Session Secret
SESSION_SECRET=local-development-secret-not-for-production

# Timezone
TZ=America/New_York
`;
    
    await fs.writeFile(envPath, envContent);
    console.log(chalk.green(`  ✓ Created .env.local file`));
    
    console.log(chalk.blue.bold('\n=== Next Steps ===\n'));
    console.log(chalk.cyan('1. To use the local SQLite database:'));
    console.log(chalk.gray('   cp .env.local .env'));
    console.log(chalk.cyan('2. To connect to a real PostgreSQL database:'));
    console.log(chalk.gray('   Update DATABASE_URL in .env with your Neon or other PostgreSQL connection string'));
    console.log(chalk.cyan('3. Start the application:'));
    console.log(chalk.gray('   npm run dev'));
    
    console.log(chalk.green.bold('\n✅ Local database setup complete!\n'));
    
  } catch (error) {
    console.error(chalk.red('Setup failed:'), error);
    process.exit(1);
  }
}

// Check if sqlite3 is installed
try {
  require('sqlite3');
  setupLocalDatabase();
} catch (error) {
  console.log(chalk.yellow('SQLite3 not installed. Installing...'));
  const { execSync } = require('child_process');
  try {
    execSync('npm install sqlite3', { stdio: 'inherit' });
    console.log(chalk.green('SQLite3 installed successfully!'));
    setupLocalDatabase();
  } catch (installError) {
    console.error(chalk.red('Failed to install sqlite3:'), installError);
    console.log(chalk.yellow('\nAlternatively, you can:'));
    console.log(chalk.cyan('1. Set up a PostgreSQL database (recommended for production)'));
    console.log(chalk.cyan('2. Use Neon serverless PostgreSQL (free tier available)'));
    console.log(chalk.cyan('3. Install PostgreSQL locally'));
    process.exit(1);
  }
}