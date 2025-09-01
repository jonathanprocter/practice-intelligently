#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import chalk from 'chalk';

const dbPath = path.join(process.cwd(), 'data', 'therapy.db');
console.log(chalk.blue.bold('\n=== FIXING DATABASE SCHEMA ===\n'));

const db = new Database(dbPath);

try {
  // Check if document_type column exists
  const tableInfo = db.prepare("PRAGMA table_info(documents)").all();
  const hasDocumentType = tableInfo.some(col => col.name === 'document_type');
  
  if (!hasDocumentType) {
    console.log(chalk.yellow('Adding missing document_type column...'));
    db.prepare(`
      ALTER TABLE documents 
      ADD COLUMN document_type TEXT DEFAULT 'general'
    `).run();
    console.log(chalk.green('✓ Added document_type column'));
  } else {
    console.log(chalk.gray('• document_type column already exists'));
  }
  
  // Add other missing columns that might be referenced
  const columnsToAdd = [
    { name: 'subcategory', type: 'TEXT', default: null },
    { name: 'content_summary', type: 'TEXT', default: null },
    { name: 'clinical_keywords', type: 'TEXT', default: null },
    { name: 'confidence_score', type: 'REAL', default: null },
    { name: 'sensitivity_level', type: 'TEXT', default: "'standard'" },
    { name: 'is_confidential', type: 'INTEGER', default: '1' },
    { name: 'description', type: 'TEXT', default: null },
    { name: 'uploaded_at', type: 'TEXT', default: null },
    { name: 'last_accessed_at', type: 'TEXT', default: null }
  ];
  
  for (const column of columnsToAdd) {
    const exists = tableInfo.some(col => col.name === column.name);
    if (!exists) {
      console.log(chalk.yellow(`Adding missing ${column.name} column...`));
      const defaultClause = column.default ? ` DEFAULT ${column.default}` : '';
      db.prepare(`
        ALTER TABLE documents 
        ADD COLUMN ${column.name} ${column.type}${defaultClause}
      `).run();
      console.log(chalk.green(`✓ Added ${column.name} column`));
    }
  }
  
  // Update existing documents to have a document_type if null
  const updateResult = db.prepare(`
    UPDATE documents 
    SET document_type = CASE 
      WHEN category = 'session_notes' THEN 'session_note'
      WHEN category = 'assessment' THEN 'assessment'
      WHEN category = 'intake' THEN 'intake_form'
      ELSE 'general'
    END
    WHERE document_type IS NULL OR document_type = ''
  `).run();
  
  if (updateResult.changes > 0) {
    console.log(chalk.green(`✓ Updated ${updateResult.changes} documents with document_type`));
  }
  
  // Create missing indexes
  console.log(chalk.yellow('\nCreating missing indexes...'));
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type)',
    'CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category)',
    'CREATE INDEX IF NOT EXISTS idx_documents_sensitivity ON documents(sensitivity_level)'
  ];
  
  for (const indexSql of indexes) {
    db.prepare(indexSql).run();
  }
  console.log(chalk.green('✓ Indexes created/verified'));
  
  // Verify the schema
  console.log(chalk.blue.bold('\n=== VERIFYING SCHEMA ===\n'));
  const finalTableInfo = db.prepare("PRAGMA table_info(documents)").all();
  console.log('Documents table columns:');
  finalTableInfo.forEach(col => {
    console.log(chalk.gray(`  - ${col.name} (${col.type})`));
  });
  
  // Test query
  console.log(chalk.blue.bold('\n=== TESTING QUERIES ===\n'));
  
  try {
    const testQuery = db.prepare(`
      SELECT id, file_name, document_type, category 
      FROM documents 
      LIMIT 1
    `).get();
    console.log(chalk.green('✓ Test query successful'));
    if (testQuery) {
      console.log(chalk.gray('  Sample document:'), testQuery);
    }
  } catch (error) {
    console.log(chalk.red('✗ Test query failed:'), error.message);
  }
  
  console.log(chalk.green.bold('\n✅ Database schema fixed successfully!\n'));
  
} catch (error) {
  console.error(chalk.red('✗ Error fixing schema:'), error);
  process.exit(1);
} finally {
  db.close();
}