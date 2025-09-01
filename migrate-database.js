#!/usr/bin/env node
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool } from '@neondatabase/serverless';
import * as schema from './shared/schema.js';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(chalk.blue.bold('\n=== Database Migration Tool ===\n'));

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log(chalk.red('✗ DATABASE_URL not set in environment'));
    console.log(chalk.yellow('\nPlease set DATABASE_URL in your .env file:'));
    console.log(chalk.gray('DATABASE_URL=postgresql://user:password@host/database'));
    process.exit(1);
  }

  console.log(chalk.yellow('1. Connecting to database...'));
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    options: '-c timezone=America/New_York'
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log(chalk.green('  ✓ Connected to database'));
    
    const dbNameResult = await client.query('SELECT current_database()');
    console.log(chalk.gray(`  • Database: ${dbNameResult.rows[0].current_database}`));
    
    client.release();
  } catch (error) {
    console.log(chalk.red(`  ✗ Connection failed: ${error.message}`));
    process.exit(1);
  }

  const db = drizzle({ client: pool, schema });

  console.log(chalk.yellow('\n2. Running migrations...'));
  
  try {
    // Check if migrations folder exists
    const migrationsFolder = path.join(__dirname, 'drizzle');
    
    await migrate(db, { 
      migrationsFolder,
      migrationsTable: '__drizzle_migrations'
    });
    
    console.log(chalk.green('  ✓ Migrations completed successfully'));
  } catch (error) {
    console.log(chalk.red(`  ✗ Migration failed: ${error.message}`));
    
    // If migrations folder doesn't exist, provide instructions
    if (error.message.includes('ENOENT')) {
      console.log(chalk.yellow('\n⚠ No migrations folder found'));
      console.log(chalk.cyan('To generate migrations:'));
      console.log(chalk.gray('  1. Install drizzle-kit: npm install -D drizzle-kit'));
      console.log(chalk.gray('  2. Generate migrations: npx drizzle-kit generate:pg'));
      console.log(chalk.gray('  3. Run this script again'));
    }
    
    await pool.end();
    process.exit(1);
  }

  console.log(chalk.yellow('\n3. Verifying tables...'));
  
  try {
    const tables = [
      'users', 'clients', 'appointments', 'session_notes', 
      'session_prep_notes', 'client_checkins', 'action_items'
    ];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(chalk.green(`  ✓ ${table}`));
      } else {
        console.log(chalk.red(`  ✗ ${table} - not found`));
      }
    }
  } catch (error) {
    console.log(chalk.red(`  ✗ Verification failed: ${error.message}`));
  }

  console.log(chalk.yellow('\n4. Creating default data...'));
  
  try {
    // Check if we have any users
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    
    if (parseInt(userCount.rows[0].count) === 0) {
      // Create default admin user
      await pool.query(`
        INSERT INTO users (username, password, full_name, role, email)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (username) DO NOTHING
      `, [
        'admin',
        '$2b$10$K4LqW2QvC8V5yH8zH5p5OuQjJscT.fJXQxSsFEEoNLF4Pp/5SNqOy', // password: admin123
        'System Administrator',
        'therapist',
        'admin@therapy.local'
      ]);
      
      console.log(chalk.green('  ✓ Created default admin user'));
      console.log(chalk.cyan('    Username: admin'));
      console.log(chalk.cyan('    Password: admin123'));
      console.log(chalk.yellow('    ⚠ Change this password after first login!'));
    } else {
      console.log(chalk.gray('  • Users already exist'));
    }
  } catch (error) {
    console.log(chalk.yellow(`  ⚠ Could not create default data: ${error.message}`));
  }

  await pool.end();
  
  console.log(chalk.green.bold('\n✅ Database migration complete!\n'));
}

runMigrations().catch(error => {
  console.log(chalk.red.bold('\n❌ Migration failed:'));
  console.log(chalk.red(error.message));
  process.exit(1);
});