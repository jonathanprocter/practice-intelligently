import { Database as SqliteDatabase } from 'better-sqlite3';
import { Pool } from 'pg';
import { getSqliteDb } from './db-sqlite.js';
import { getPostgresPool } from './db-postgres.js';

type DatabaseClient = SqliteDatabase | Pool;

let db: DatabaseClient;
const isProduction = process.env.NODE_ENV === 'production';

function getDb() {
  if (!db) {
    if (isProduction) {
      console.log('Connecting to PostgreSQL...');
      db = getPostgresPool();
    } else {
      console.log('Connecting to SQLite...');
      db = getSqliteDb();
    }
  }
  return db;
}

async function query(text: string, params: any[] = []) {
  const client = getDb();
  if ('prepare' in client) { // It's SQLite
    try {
      const stmt = client.prepare(text);
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        return stmt.all(params);
      } else {
        const info = stmt.run(params);
        return { rowCount: info.changes, rows: [] };
      }
    } catch (err) {
      console.error('SQLite query error:', err.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw err;
    }
  } else { // It's PostgreSQL
    try {
      const result = await client.query(text, params);
      return result.rows;
    } catch (err) {
        console.error('PostgreSQL query error:', err.message);
        console.error('Query:', text);
        console.error('Params:', params);
        throw err;
    }
  }
}

export const dbWrapper = {
  query,
};