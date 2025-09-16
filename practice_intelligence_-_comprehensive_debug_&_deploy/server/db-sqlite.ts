import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database;

export function getSqliteDb() {
  if (!db) {
    const dbPath = process.env.DATABASE_URL || './data/therapy.db';
    const dbDir = path.dirname(dbPath);

    // Ensure the directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      db = new Database(dbPath, { verbose: console.log });
      console.log(`SQLite database connected at ${dbPath}`);
      
      // Enable WAL mode for better concurrency
      db.pragma('journal_mode = WAL');

    } catch (error) {
      console.error("Failed to connect to SQLite database:", error);
      process.exit(1);
    }
  }
  return db;
}