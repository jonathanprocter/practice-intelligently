#!/usr/bin/env node
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:3000';
const dbPath = path.join(process.cwd(), 'data', 'therapy.db');

console.log(chalk.blue.bold('\n=== COMPREHENSIVE SYSTEM AUDIT ===\n'));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test 1: Database Connection
console.log(chalk.yellow('1. Testing Database Connection...'));
try {
  const db = new Database(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  db.close();
  results.passed.push('Database connection successful');
  console.log(chalk.green('   ✓ Database connected successfully'));
  console.log(chalk.gray(`   Found ${tables.length} tables`));
} catch (error) {
  results.failed.push(`Database connection failed: ${error.message}`);
  console.log(chalk.red(`   ✗ Database error: ${error.message}`));
}

// Test 2: API Health Check
console.log(chalk.yellow('\n2. Testing API Health...'));
try {
  const health = await fetch(`${BASE_URL}/api/health`).then(r => r.json());
  
  if (health.status === 'ok') {
    results.passed.push('API health check passed');
    console.log(chalk.green('   ✓ API is healthy'));
    
    // Check integrations
    Object.entries(health.integrations).forEach(([service, status]) => {
      if (status) {
        console.log(chalk.green(`   ✓ ${service} integration active`));
      } else {
        results.warnings.push(`${service} integration not configured`);
        console.log(chalk.yellow(`   ⚠ ${service} integration not configured`));
      }
    });
  } else {
    results.failed.push('API health check failed');
    console.log(chalk.red('   ✗ API unhealthy'));
  }
} catch (error) {
  results.failed.push(`API health check failed: ${error.message}`);
  console.log(chalk.red(`   ✗ API error: ${error.message}`));
}

// Test 3: Document System
console.log(chalk.yellow('\n3. Testing Document System...'));
const uploadDir = path.join(process.cwd(), 'uploads');
const tempUploadsDir = path.join(process.cwd(), 'temp_uploads');

if (fs.existsSync(uploadDir)) {
  results.passed.push('Upload directory exists');
  console.log(chalk.green('   ✓ Upload directory exists'));
} else {
  results.failed.push('Upload directory missing');
  console.log(chalk.red('   ✗ Upload directory missing'));
}

if (fs.existsSync(tempUploadsDir)) {
  results.passed.push('Temp uploads directory exists');
  console.log(chalk.green('   ✓ Temp uploads directory exists'));
} else {
  results.warnings.push('Temp uploads directory missing');
  console.log(chalk.yellow('   ⚠ Temp uploads directory missing'));
}

// Test 4: Critical API Endpoints
console.log(chalk.yellow('\n4. Testing Critical API Endpoints...'));

const endpoints = [
  { method: 'GET', path: '/api/health', name: 'Health Check' },
  { method: 'GET', path: '/api/clients', name: 'List Clients' },
  { method: 'GET', path: '/api/appointments', name: 'List Appointments' },
  { method: 'GET', path: '/api/documents/search?query=test', name: 'Document Search' }
];

for (const endpoint of endpoints) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok || response.status === 401) { // 401 is expected for authenticated endpoints
      results.passed.push(`${endpoint.name} endpoint works`);
      console.log(chalk.green(`   ✓ ${endpoint.name}: ${response.status} ${response.statusText}`));
    } else {
      results.warnings.push(`${endpoint.name} returned ${response.status}`);
      console.log(chalk.yellow(`   ⚠ ${endpoint.name}: ${response.status} ${response.statusText}`));
    }
  } catch (error) {
    results.failed.push(`${endpoint.name} failed: ${error.message}`);
    console.log(chalk.red(`   ✗ ${endpoint.name}: ${error.message}`));
  }
}

// Test 5: File System Permissions
console.log(chalk.yellow('\n5. Testing File System Permissions...'));
const testFile = path.join(uploadDir, '.test-write');
try {
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  results.passed.push('File system write permissions OK');
  console.log(chalk.green('   ✓ File system write permissions OK'));
} catch (error) {
  results.failed.push(`File system permissions error: ${error.message}`);
  console.log(chalk.red(`   ✗ File system permissions error: ${error.message}`));
}

// Test 6: Database Data Integrity
console.log(chalk.yellow('\n6. Testing Database Data Integrity...'));
try {
  const db = new Database(dbPath);
  
  // Check for orphaned records
  const orphanedDocs = db.prepare(`
    SELECT COUNT(*) as count FROM documents 
    WHERE client_id IS NOT NULL 
    AND client_id NOT IN (SELECT id FROM clients)
  `).get();
  
  if (orphanedDocs.count > 0) {
    results.warnings.push(`Found ${orphanedDocs.count} orphaned documents`);
    console.log(chalk.yellow(`   ⚠ Found ${orphanedDocs.count} orphaned documents`));
  } else {
    results.passed.push('No orphaned documents');
    console.log(chalk.green('   ✓ No orphaned documents'));
  }
  
  const orphanedAppts = db.prepare(`
    SELECT COUNT(*) as count FROM appointments 
    WHERE client_id NOT IN (SELECT id FROM clients)
  `).get();
  
  if (orphanedAppts.count > 0) {
    results.warnings.push(`Found ${orphanedAppts.count} orphaned appointments`);
    console.log(chalk.yellow(`   ⚠ Found ${orphanedAppts.count} orphaned appointments`));
  } else {
    results.passed.push('No orphaned appointments');
    console.log(chalk.green('   ✓ No orphaned appointments'));
  }
  
  db.close();
} catch (error) {
  results.failed.push(`Data integrity check failed: ${error.message}`);
  console.log(chalk.red(`   ✗ Data integrity check failed: ${error.message}`));
}

// Test 7: Environment Variables
console.log(chalk.yellow('\n7. Testing Environment Variables...'));
const requiredEnvVars = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SESSION_SECRET'
];

const optionalEnvVars = [
  'GOOGLE_GEMINI_API_KEY',
  'PERPLEXITY_API_KEY',
  'SENDGRID_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (process.env[varName] && !process.env[varName].includes('your-')) {
    results.passed.push(`${varName} configured`);
    console.log(chalk.green(`   ✓ ${varName} configured`));
  } else {
    results.failed.push(`${varName} not configured`);
    console.log(chalk.red(`   ✗ ${varName} not configured`));
  }
});

optionalEnvVars.forEach(varName => {
  if (process.env[varName] && !process.env[varName].includes('your-')) {
    console.log(chalk.green(`   ✓ ${varName} configured`));
  } else {
    results.warnings.push(`${varName} not configured (optional)`);
    console.log(chalk.yellow(`   ⚠ ${varName} not configured (optional)`));
  }
});

// Test 8: Process Memory and Performance
console.log(chalk.yellow('\n8. Testing System Resources...'));
const memUsage = process.memoryUsage();
const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
console.log(chalk.gray(`   Memory usage: ${memMB}MB`));

if (memMB < 500) {
  results.passed.push('Memory usage normal');
  console.log(chalk.green('   ✓ Memory usage normal'));
} else {
  results.warnings.push(`High memory usage: ${memMB}MB`);
  console.log(chalk.yellow(`   ⚠ High memory usage: ${memMB}MB`));
}

// Final Summary
console.log(chalk.blue.bold('\n=== AUDIT SUMMARY ===\n'));

console.log(chalk.green(`✓ Passed: ${results.passed.length} tests`));
if (results.passed.length > 0) {
  results.passed.slice(0, 5).forEach(msg => {
    console.log(chalk.gray(`   • ${msg}`));
  });
  if (results.passed.length > 5) {
    console.log(chalk.gray(`   ... and ${results.passed.length - 5} more`));
  }
}

console.log(chalk.yellow(`\n⚠ Warnings: ${results.warnings.length} issues`));
if (results.warnings.length > 0) {
  results.warnings.slice(0, 5).forEach(msg => {
    console.log(chalk.gray(`   • ${msg}`));
  });
  if (results.warnings.length > 5) {
    console.log(chalk.gray(`   ... and ${results.warnings.length - 5} more`));
  }
}

console.log(chalk.red(`\n✗ Failed: ${results.failed.length} tests`));
if (results.failed.length > 0) {
  results.failed.forEach(msg => {
    console.log(chalk.gray(`   • ${msg}`));
  });
}

// Overall Status
console.log(chalk.blue.bold('\n=== OVERALL STATUS ===\n'));
if (results.failed.length === 0) {
  if (results.warnings.length === 0) {
    console.log(chalk.green.bold('✅ SYSTEM FULLY OPERATIONAL'));
  } else {
    console.log(chalk.yellow.bold('⚠️  SYSTEM OPERATIONAL WITH WARNINGS'));
  }
} else {
  console.log(chalk.red.bold('❌ SYSTEM HAS CRITICAL ISSUES'));
}

// Recommendations
if (results.failed.length > 0 || results.warnings.length > 0) {
  console.log(chalk.blue.bold('\n=== RECOMMENDATIONS ===\n'));
  
  if (results.failed.some(f => f.includes('OPENAI_API_KEY'))) {
    console.log(chalk.yellow('1. Configure OpenAI API key in .env file'));
  }
  if (results.failed.some(f => f.includes('ANTHROPIC_API_KEY'))) {
    console.log(chalk.yellow('2. Configure Anthropic API key in .env file'));
  }
  if (results.warnings.some(w => w.includes('gemini'))) {
    console.log(chalk.gray('3. Optional: Configure Google Gemini API for enhanced AI features'));
  }
  if (results.warnings.some(w => w.includes('orphaned'))) {
    console.log(chalk.yellow('4. Run database cleanup to remove orphaned records'));
  }
}

console.log(chalk.blue.bold('\n=== AUDIT COMPLETE ===\n'));

// Export results for CI/CD
const reportPath = path.join(process.cwd(), 'audit-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  passed: results.passed.length,
  warnings: results.warnings.length,
  failed: results.failed.length,
  details: results
}, null, 2));

console.log(chalk.gray(`Full report saved to: ${reportPath}`));

// Exit with appropriate code
process.exit(results.failed.length > 0 ? 1 : 0);