import * as dotenv from 'dotenv';
dotenv.config();

let db: any;
let pool: any;

// Check if we have a valid PostgreSQL URL
const isValidPostgresUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  // Check if it's a real PostgreSQL URL (not the placeholder)
  return url.startsWith('postgresql://') && 
         !url.includes('localhost:5432') && 
         !url.includes('user:password@');
};

async function initializeDatabase() {
  if (isValidPostgresUrl(process.env.DATABASE_URL)) {
    console.log('Using PostgreSQL database from DATABASE_URL');
    // Use the original PostgreSQL connection
    const pgModule = await import('./db');
    db = pgModule.db;
    pool = pgModule.pool;
  } else {
    console.log('DATABASE_URL not configured or invalid, using SQLite fallback');
    // Use SQLite as fallback
    const sqliteModule = await import('./db-sqlite');
    db = sqliteModule.db;
    pool = sqliteModule.pool;
  }
  return { db, pool };
}

// Initialize on first import
const dbPromise = initializeDatabase();

export async function getDb() {
  const { db } = await dbPromise;
  return db;
}

export async function getPool() {
  const { pool } = await dbPromise;
  return pool;
}

// For backward compatibility, export a proxy that waits for initialization
export const database = new Proxy({}, {
  get(target, prop) {
    return async (...args: any[]) => {
      const db = await getDb();
      return (db as any)[prop](...args);
    };
  }
});

export const poolProxy = new Proxy({}, {
  get(target, prop) {
    return async (...args: any[]) => {
      const pool = await getPool();
      return (pool as any)[prop](...args);
    };
  }
});