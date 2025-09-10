// Database Error Recovery and Connection Pool Management
import { Pool } from '@neondatabase/serverless';
import { db, pool } from './db';
import { AppError, ErrorType, ErrorSeverity } from '@shared/types';

interface ConnectionPoolStatus {
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  isHealthy: boolean;
  lastError?: string;
  lastHealthCheck?: Date;
}

export class DatabaseRecoveryService {
  private static instance: DatabaseRecoveryService;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000;
  private isRecovering = false;
  private connectionPool: Pool;
  private lastHealthStatus: ConnectionPoolStatus | null = null;
  private failedQueries: Map<string, { query: string; params: any[]; retries: number }> = new Map();

  private constructor(connectionPool: Pool) {
    this.connectionPool = connectionPool;
    this.initialize();
  }

  static getInstance(connectionPool?: Pool): DatabaseRecoveryService {
    if (!DatabaseRecoveryService.instance) {
      if (!connectionPool) {
        throw new Error('Connection pool required for first initialization');
      }
      DatabaseRecoveryService.instance = new DatabaseRecoveryService(connectionPool);
    }
    return DatabaseRecoveryService.instance;
  }

  private initialize() {
    console.log('Initializing Database Recovery Service...');
    this.startHealthCheck();
    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    // Handle pool errors
    this.connectionPool.on('error', (err: Error) => {
      console.error('Database pool error:', err);
      this.handlePoolError(err);
    });

    // Handle connection errors
    this.connectionPool.on('connect', (client: any) => {
      client.on('error', (err: Error) => {
        console.error('Database connection error:', err);
        this.handleConnectionError(err);
      });
    });
  }

  private async handlePoolError(error: Error) {
    if (this.isRecovering) return;

    this.isRecovering = true;
    console.log('Attempting to recover database pool...');

    try {
      // Try to recover the connection pool
      await this.recoverConnectionPool();
      console.log('Database pool recovered successfully');
    } catch (recoveryError) {
      console.error('Failed to recover database pool:', recoveryError);
      // Implement fallback to read-only mode or cached data
      this.enableReadOnlyMode();
    } finally {
      this.isRecovering = false;
    }
  }

  private async handleConnectionError(error: Error) {
    // Log the error
    console.error('Database connection error:', error.message);

    // Check if it's a transient error
    if (this.isTransientError(error)) {
      console.log('Transient database error detected, will retry');
    } else {
      console.error('Non-transient database error, may require manual intervention');
    }
  }

  private isTransientError(error: Error): boolean {
    const transientErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'connection timeout',
      'deadlock detected',
      'could not serialize access',
      'connection terminated'
    ];

    return transientErrors.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  async executeWithRetry<T>(
    queryFn: () => Promise<T>,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? this.MAX_RETRY_ATTEMPTS;
    const retryDelay = options?.retryDelay ?? this.RETRY_DELAY;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await queryFn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          throw this.wrapDatabaseError(error);
        }

        // Log retry attempt
        console.log(`Database query retry attempt ${attempt}/${maxRetries}`);
        if (options?.onRetry) {
          options.onRetry(attempt, error);
        }

        // Wait before retrying with exponential backoff
        await this.delay(retryDelay * Math.pow(2, attempt - 1));
      }
    }

    throw this.wrapDatabaseError(lastError!);
  }

  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'deadlock',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'connection terminated',
      'serialization failure'
    ];

    return retryableErrors.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  private wrapDatabaseError(error: Error): AppError {
    let errorType = ErrorType.DATABASE;
    let severity = ErrorSeverity.MEDIUM;
    let userMessage = 'A database error occurred. Please try again.';

    if (error.message.includes('deadlock')) {
      userMessage = 'The operation conflicted with another process. Please retry.';
      severity = ErrorSeverity.LOW;
    } else if (error.message.includes('timeout')) {
      userMessage = 'The database operation took too long. Please try again.';
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message.includes('connection')) {
      userMessage = 'Database connection issue. Your data is safe, please wait a moment.';
      severity = ErrorSeverity.HIGH;
    }

    return new AppError(
      error.message,
      errorType,
      severity,
      {
        originalError: error,
        userMessage
      }
    );
  }

  async transaction<T>(
    transactionFn: (client: any) => Promise<T>,
    options?: {
      isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
      readOnly?: boolean;
      deferrable?: boolean;
    }
  ): Promise<T> {
    const client = await this.connectionPool.connect();

    try {
      // Start transaction with options
      let beginQuery = 'BEGIN';
      if (options?.isolationLevel) {
        beginQuery += ` ISOLATION LEVEL ${options.isolationLevel}`;
      }
      if (options?.readOnly) {
        beginQuery += ' READ ONLY';
      }
      if (options?.deferrable) {
        beginQuery += ' DEFERRABLE';
      }

      await client.query(beginQuery);

      try {
        // Execute transaction function
        const result = await transactionFn(client);

        // Commit transaction
        await client.query('COMMIT');
        return result;

      } catch (error: any) {
        // Rollback on error
        await client.query('ROLLBACK');
        
        // Check if it's a serialization failure (should retry)
        if (error.code === '40001' || error.message.includes('serialization')) {
          console.log('Serialization failure detected, transaction should be retried');
        }
        
        throw error;
      }

    } finally {
      // Release the client back to the pool
      client.release();
    }
  }

  private async recoverConnectionPool(): Promise<void> {
    console.log('Attempting to recover database connection pool...');

    try {
      // Test the connection
      await this.connectionPool.query('SELECT 1');
      
      // If successful, pool is working
      console.log('Connection pool is healthy');
      
    } catch (error) {
      console.error('Connection pool test failed:', error);
      
      // Try to recreate the pool
      if (process.env.DATABASE_URL) {
        const { Pool } = require('@neondatabase/serverless');
        const newPool = new Pool({ 
          connectionString: process.env.DATABASE_URL,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });

        // Test the new pool
        await newPool.query('SELECT 1');
        
        // Replace the old pool
        this.connectionPool = newPool;
        console.log('Created new connection pool successfully');
      } else {
        throw new Error('DATABASE_URL not configured');
      }
    }
  }

  private enableReadOnlyMode() {
    console.warn('Enabling database read-only mode due to connection issues');
    // Set a flag that can be checked by the application
    global.DATABASE_READ_ONLY = true;
    
    // Notify the application about read-only mode
    process.emit('database:readonly' as any, true);
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);

    // Perform initial health check
    this.performHealthCheck();
  }

  private async performHealthCheck(): Promise<ConnectionPoolStatus> {
    const status: ConnectionPoolStatus = {
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      isHealthy: false,
      lastHealthCheck: new Date()
    };

    try {
      // Test query
      const start = Date.now();
      await this.connectionPool.query('SELECT 1');
      const queryTime = Date.now() - start;

      // Get pool stats if available
      const poolStats = (this.connectionPool as any);
      if (poolStats) {
        status.activeConnections = poolStats.totalCount || 0;
        status.idleConnections = poolStats.idleCount || 0;
        status.waitingClients = poolStats.waitingCount || 0;
      }

      status.isHealthy = queryTime < 1000; // Consider healthy if query takes less than 1 second

      if (!status.isHealthy) {
        status.lastError = `Slow query response: ${queryTime}ms`;
      }

    } catch (error: any) {
      status.isHealthy = false;
      status.lastError = error.message;
      console.error('Database health check failed:', error.message);
    }

    this.lastHealthStatus = status;
    return status;
  }

  getHealthStatus(): ConnectionPoolStatus | null {
    return this.lastHealthStatus;
  }

  async queueFailedQuery(id: string, query: string, params: any[]): Promise<void> {
    this.failedQueries.set(id, {
      query,
      params,
      retries: 0
    });

    // Limit queue size
    if (this.failedQueries.size > 100) {
      const firstKey = this.failedQueries.keys().next().value;
      this.failedQueries.delete(firstKey);
    }
  }

  async retryFailedQueries(): Promise<void> {
    console.log(`Retrying ${this.failedQueries.size} failed queries...`);

    for (const [id, queryInfo] of this.failedQueries.entries()) {
      try {
        await this.connectionPool.query(queryInfo.query, queryInfo.params);
        this.failedQueries.delete(id);
        console.log(`Successfully retried query ${id}`);
      } catch (error) {
        queryInfo.retries++;
        if (queryInfo.retries >= this.MAX_RETRY_ATTEMPTS) {
          console.error(`Query ${id} failed after max retries, removing from queue`);
          this.failedQueries.delete(id);
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.failedQueries.clear();
  }
}

// Export singleton instance (will be initialized with pool from db.ts)
export let databaseRecovery: DatabaseRecoveryService;

export function initializeDatabaseRecovery(connectionPool: Pool) {
  databaseRecovery = DatabaseRecoveryService.getInstance(connectionPool);
  return databaseRecovery;
}

// Graceful shutdown
process.on('SIGTERM', () => {
  if (databaseRecovery) {
    databaseRecovery.destroy();
  }
});

process.on('SIGINT', () => {
  if (databaseRecovery) {
    databaseRecovery.destroy();
  }
});

// Declare global variable for read-only mode
declare global {
  var DATABASE_READ_ONLY: boolean;
}

global.DATABASE_READ_ONLY = false;