import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure timezone globally for the process
process.env.TZ = 'America/New_York';

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  options: '-c timezone=America/New_York'
});

// Initialize the database connection with timezone setting
pool.on('connect', async (client) => {
  try {
    await client.query("SET timezone = 'America/New_York'");
    await client.query("SET TIME ZONE 'America/New_York'");
  } catch (error) {
    console.warn('Failed to set timezone on database connection:', error);
  }
});

export const db = drizzle({ client: pool, schema });