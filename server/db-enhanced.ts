import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import * as schema from "@shared/schema";
import ws from "ws";

// Configure timezone globally for the process
process.env.TZ = 'America/New_York';

/**
 * Enhanced database connection handler that supports both Neon serverless
 * and standard PostgreSQL connections
 */
class DatabaseConnection {
  private db: any;
  private pool: any;
  private connectionType: 'neon' | 'postgres' | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL must be set. Did you forget to provision a database?');
      return;
    }

    const dbUrl = process.env.DATABASE_URL;
    
    // Determine connection type based on URL
    if (dbUrl.includes('neon.tech') || dbUrl.includes('neon')) {
      this.initializeNeon(dbUrl);
    } else {
      this.initializePostgres(dbUrl);
    }
  }

  private initializeNeon(connectionString: string) {
    try {
      console.log('Initializing Neon serverless database connection...');
      
      // Configure Neon with WebSocket
      neonConfig.webSocketConstructor = ws;
      
      // Additional Neon configuration for better reliability
      neonConfig.fetchConnectionCache = true;
      neonConfig.wsProxy = (host) => `${host}/v2`;
      
      // Create Neon pool
      this.pool = new NeonPool({ 
        connectionString,
        options: '-c timezone=America/New_York'
      });

      // Initialize Drizzle with Neon
      this.db = drizzle({ client: this.pool, schema });
      
      this.connectionType = 'neon';
      this.isConnected = true;
      
      console.log('Neon database connection initialized');
      
      // Set up connection event handlers
      this.pool.on('connect', async (client: any) => {
        try {
          await client.query("SET timezone = 'America/New_York'");
          console.log('Neon connection established with timezone set');
        } catch (error) {
          console.warn('Failed to set timezone on Neon connection:', error);
        }
      });

      this.pool.on('error', (err: any) => {
        console.error('Neon pool error:', err);
        // Attempt to reconnect
        this.handleConnectionError();
      });
      
    } catch (error: any) {
      console.error('Failed to initialize Neon connection:', error.message);
      // Fall back to standard PostgreSQL
      this.initializePostgres(connectionString);
    }
  }

  private initializePostgres(connectionString: string) {
    try {
      console.log('Initializing standard PostgreSQL connection...');
      
      // Parse connection string to add SSL if needed
      const config: any = {
        connectionString,
        options: '-c timezone=America/New_York'
      };
      
      // Add SSL configuration if not localhost
      if (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')) {
        config.ssl = {
          rejectUnauthorized: false
        };
      }
      
      // Create standard PostgreSQL pool
      this.pool = new PgPool(config);
      
      // Initialize Drizzle with PostgreSQL
      this.db = drizzlePg(this.pool, { schema });
      
      this.connectionType = 'postgres';
      this.isConnected = true;
      
      console.log('PostgreSQL database connection initialized');
      
      // Set up connection event handlers
      this.pool.on('connect', async (client: any) => {
        try {
          await client.query("SET timezone = 'America/New_York'");
          console.log('PostgreSQL connection established with timezone set');
        } catch (error) {
          console.warn('Failed to set timezone on PostgreSQL connection:', error);
        }
      });

      this.pool.on('error', (err: any) => {
        console.error('PostgreSQL pool error:', err);
        // Attempt to reconnect
        this.handleConnectionError();
      });
      
    } catch (error: any) {
      console.error('Failed to initialize PostgreSQL connection:', error.message);
      this.isConnected = false;
    }
  }

  private async handleConnectionError() {
    console.log('Attempting to reconnect to database...');
    
    // Close existing pool
    if (this.pool) {
      try {
        await this.pool.end();
      } catch (error) {
        console.error('Error closing pool:', error);
      }
    }
    
    // Wait before reconnecting
    setTimeout(() => {
      this.initialize();
    }, 5000);
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConnected || !this.pool) {
      console.error('Database not connected');
      return false;
    }

    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      
      console.log(`Database connection test successful (${this.connectionType}):`, result.rows[0].now);
      return true;
    } catch (error: any) {
      console.error('Database connection test failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async executeQuery(query: string, params?: any[]): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const result = await this.pool.query(query, params);
      return result;
    } catch (error: any) {
      console.error('Query execution failed:', error.message);
      
      // Check if it's a connection error
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        this.isConnected = false;
        this.handleConnectionError();
      }
      
      throw error;
    }
  }

  getDb() {
    if (!this.isConnected) {
      console.warn('Database not connected - attempting to initialize...');
      this.initialize();
    }
    return this.db;
  }

  getPool() {
    if (!this.isConnected) {
      console.warn('Database not connected - attempting to initialize...');
      this.initialize();
    }
    return this.pool;
  }

  async close() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isConnected = false;
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  getConnectionType(): string {
    return this.connectionType || 'not connected';
  }
}

// Create singleton instance
const dbConnection = new DatabaseConnection();

// Export for compatibility with existing code
export const pool = dbConnection.getPool();
export const db = dbConnection.getDb();

// Export the connection manager for advanced usage
export { dbConnection };

// Test connection on startup
if (process.env.NODE_ENV !== 'test') {
  dbConnection.testConnection().then(success => {
    if (success) {
      console.log('Database connection verified on startup');
    } else {
      console.error('Database connection failed on startup - will retry');
    }
  });
}