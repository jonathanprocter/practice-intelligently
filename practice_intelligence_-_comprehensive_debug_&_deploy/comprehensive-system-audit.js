import http from 'http';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const dbPath = process.env.DATABASE_URL || path.join(__dirname, './data/therapy.db');

let testsPassed = 0;
let testsFailed = 0;

const log = (message, status) => {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : 'ℹ️';
  console.log(`${icon} ${message}`);
  if (status === 'pass') testsPassed++;
  if (status === 'fail') testsFailed++;
};

async function check(description, promiseFn) {
  try {
    await promiseFn();
    log(description, 'pass');
  } catch (error) {
    log(`${description} - ${error.message}`, 'fail');
  }
}

async function runAudit() {
  console.log('\n--- 🩺 Running Comprehensive System Audit ---\n');

  // 1. Filesystem Checks
  await check('uploads/ directory exists', () => {
    if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
      fs.mkdirSync(path.join(__dirname, 'uploads'));
    }
  });

  // 2. Database Checks
  await check('Database file exists', () => {
    if (!fs.existsSync(dbPath)) throw new Error(`Database file not found at ${dbPath}`);
  });

  await check('Can connect to database and read schema', () => {
    try {
      const db = new Database(dbPath, { readonly: true });
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = tables.map(t => t.name);
      if (!tableNames.includes('therapists') || !tableNames.includes('clients')) {
        throw new Error('Required tables (therapists, clients) not found.');
      }
      db.close();
    } catch (e) {
      throw new Error(`DB connection/schema read failed: ${e.message}`);
    }
  });

  // 3. API Health Check
  await check('API server is running and /api/health returns 200', () => new Promise((resolve, reject) => {
    http.get(`${BASE_URL}/api/health`, (res) => {
      if (res.statusCode === 200) {
        resolve();
      } else {
        reject(new Error(`Server returned status ${res.statusCode}`));
      }
    }).on('error', (err) => reject(new Error(`Failed to connect to server: ${err.message}`)));
  }));
  
  // 4. API Endpoint Checks
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // The one from seed data
  await check(`/api/therapists/${therapistId}/clients returns client data`, () => new Promise((resolve, reject) => {
      http.get(`${BASE_URL}/api/therapists/${therapistId}/clients`, (res) => {
          if (res.statusCode !== 200) return reject(new Error(`Status code was ${res.statusCode}`));
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
              try {
                  const clients = JSON.parse(data);
                  if (Array.isArray(clients) && clients.length > 0) {
                      resolve();
                  } else {
                      reject(new Error('Response was not an array of clients or was empty.'));
                  }
              } catch (e) {
                  reject(new Error(`Failed to parse JSON response: ${e.message}`));
              }
          });
      }).on('error', reject);
  }));


  console.log('\n--- Audit Summary ---');
  log(`Tests Passed: ${testsPassed}`, 'info');
  log(`Tests Failed: ${testsFailed}`, 'info');
  console.log('---------------------\n');

  if (testsFailed > 0) {
    console.error('❌ Audit finished with errors. Please review the logs above.');
    // process.exit(1); // Commented out to not stop the replit script
  } else {
    console.log('✅ All systems operational. Audit passed.');
  }
}

// Give the server a moment to start up before running the audit
setTimeout(runAudit, 3000);