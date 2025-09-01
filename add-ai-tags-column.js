#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'therapy.db');
const db = new Database(dbPath);

try {
  // Check if ai_tags column exists
  const tableInfo = db.prepare("PRAGMA table_info(documents)").all();
  const hasAiTags = tableInfo.some(col => col.name === 'ai_tags');
  
  if (!hasAiTags) {
    db.prepare('ALTER TABLE documents ADD COLUMN ai_tags TEXT').run();
    console.log('✓ Added ai_tags column');
    
    // Copy existing tags to ai_tags if needed
    db.prepare('UPDATE documents SET ai_tags = tags WHERE ai_tags IS NULL AND tags IS NOT NULL').run();
    console.log('✓ Migrated existing tags to ai_tags');
  } else {
    console.log('• ai_tags column already exists');
  }
} catch (error) {
  console.error('Error:', error);
} finally {
  db.close();
}