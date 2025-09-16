
import { Pool } from 'pg';

let pool: Pool;

export function getPostgresPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('PostgreSQL connection string not found in environment variables');
    }

    try {
      pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      
      console.log('PostgreSQL pool created successfully');
    } catch (error) {
      console.error("Failed to create PostgreSQL pool:", error);
      throw error;
    }
  }
  
  return pool;
}
