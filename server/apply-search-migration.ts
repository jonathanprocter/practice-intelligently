import { pool } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applySearchInfrastructure() {
  try {
    const sqlPath = path.join(__dirname, 'search-infrastructure.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by statements and execute them
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log('✓ Applied:', statement.substring(0, 50).replace(/\n/g, ' ') + '...');
        } catch (error: any) {
          // Some errors are expected (like "already exists"), just log them
          if (error.message.includes('already exists')) {
            console.log('⚠ Skipped (already exists):', statement.substring(0, 50).replace(/\n/g, ' ') + '...');
          } else {
            console.error('Error applying statement:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Search infrastructure setup complete');
    process.exit(0);
  } catch (error) {
    console.error('Failed to apply search infrastructure:', error);
    process.exit(1);
  }
}

applySearchInfrastructure();