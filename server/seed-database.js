import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../data/therapy.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('Database connection established.');

function executeSchema() {
  console.log('Executing database schema...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS therapists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS therapist_client_relations (
      therapist_id TEXT,
      client_id TEXT,
      PRIMARY KEY (therapist_id, client_id),
      FOREIGN KEY (therapist_id) REFERENCES therapists(id),
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT,
      therapist_id TEXT,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT,
      mime_type TEXT,
      size INTEGER,
      ai_insights TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (therapist_id) REFERENCES therapists(id)
    );
  `);
  console.log('Schema executed successfully.');
}

async function seedData() {
  console.log('Seeding data...');

  // Check if data exists
  const therapistCount = db.prepare('SELECT COUNT(*) as count FROM therapists').get().count;
  if (therapistCount > 0) {
    console.log('Data already seeded. Skipping.');
    return;
  }

  // Seed Therapist
  const password = 'admin123';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // Hardcoded for consistency

  db.prepare('INSERT OR IGNORE INTO therapists (id, name, email, password_hash) VALUES (?, ?, ?, ?)')
    .run(therapistId, 'Dr. Admin', 'admin@example.com', passwordHash);

  // Seed Clients
  const clients = [
    { id: 'c1f8e5b6-3b5a-4f1a-8c9a-1b2c3d4e5f6a', name: 'John Doe', email: 'john.doe@example.com' },
    { id: 'd2e7f4a5-4c6b-5e2b-9d8a-2c3d4e5f6a7b', name: 'Jane Smith', email: 'jane.smith@example.com' },
    { id: 'e3d6g3b4-5d7c-6f3c-8e7b-3d4e5f6a7b8c', name: 'Peter Jones', email: 'peter.jones@example.com' },
  ];

  const insertClient = db.prepare('INSERT OR IGNORE INTO clients (id, name, email) VALUES (?, ?, ?)');
  const insertRelation = db.prepare('INSERT OR IGNORE INTO therapist_client_relations (therapist_id, client_id) VALUES (?, ?)');

  const insertManyClients = db.transaction((clients) => {
    for (const client of clients) {
      insertClient.run(client.id, client.name, client.email);
      insertRelation.run(therapistId, client.id);
    }
  });

  insertManyClients(clients);

  console.log('Data seeding complete.');
}

try {
  executeSchema();
  await seedData();
} catch (err) {
  console.error('Error during database setup:', err.message);
} finally {
  db.close();
  console.log('Database connection closed.');
}