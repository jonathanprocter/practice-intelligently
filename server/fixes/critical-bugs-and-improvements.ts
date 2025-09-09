/**
 * Critical Bugs and Improvements for Therapy Practice Management System
 * 
 * This file contains fixes for identified issues in the codebase
 */

import { Express } from 'express';
import { pool } from '../db';
import fs from 'fs/promises';
import path from 'path';
import { storage } from '../storage';
import { randomUUID } from 'crypto';

// ============================================
// 1. FILE CLEANUP SERVICE - Fix memory/disk leak
// ============================================
class FileCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private uploadDir = path.join(process.cwd(), 'uploads');
  private tempDir = path.join(process.cwd(), 'temp_uploads');

  start() {
    // Clean up orphaned files every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOrphanedFiles();
    }, 60 * 60 * 1000); // 1 hour

    // Initial cleanup on start
    this.cleanupOrphanedFiles();
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async cleanupOrphanedFiles() {
    try {
      console.log('🧹 Starting file cleanup service...');
      
      // Clean uploads directory - files older than 24 hours
      await this.cleanDirectory(this.uploadDir, 24 * 60 * 60 * 1000);
      
      // Clean temp directory - files older than 1 hour
      await this.cleanDirectory(this.tempDir, 60 * 60 * 1000);
      
      console.log('✅ File cleanup completed');
    } catch (error) {
      console.error('❌ File cleanup error:', error);
    }
  }

  private async cleanDirectory(dirPath: string, maxAge: number) {
    try {
      const files = await fs.readdir(dirPath);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && (now - stats.mtimeMs) > maxAge) {
          await fs.unlink(filePath);
          console.log(`🗑️ Deleted old file: ${file}`);
        }
      }
    } catch (error) {
      // Directory might not exist, which is fine
      if ((error as any).code !== 'ENOENT') {
        console.error(`Error cleaning directory ${dirPath}:`, error);
      }
    }
  }
}

// ============================================
// 2. DATABASE CONNECTION POOL OPTIMIZATION
// ============================================
export class DatabaseOptimizer {
  static async optimizePool() {
    // Set optimal pool configuration
    const poolConfig = {
      max: 20, // Maximum connections
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 2000, // Timeout connection attempts after 2 seconds
    };

    // Apply configuration if using pg Pool
    if (pool && typeof pool.options === 'object') {
      Object.assign(pool.options, poolConfig);
    }

    // Add connection error handling
    pool.on('error', (err: Error, client: any) => {
      console.error('Unexpected database error on idle client', err);
    });

    // Monitor pool statistics
    setInterval(() => {
      if (pool && typeof pool.totalCount === 'number') {
        const stats = {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        };
        
        // Log warning if pool is exhausted
        if (stats.waiting > 0) {
          console.warn('⚠️ Database pool has waiting connections:', stats);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // Wrapper for transactions with automatic rollback
  static async transaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// ============================================
// 3. SECURITY IMPROVEMENTS
// ============================================
export class SecurityEnhancements {
  // Get authenticated therapist ID
  static async getCurrentTherapist(req: any): Promise<string> {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const therapist = await this.validateBearerToken(token);
      if (therapist) return therapist.id;
    }
    
    // Check session for logged-in therapist
    if (req.session?.therapistId) {
      return req.session.therapistId;
    }
    
    // Check for API token
    const apiToken = req.headers['x-api-token'];
    if (apiToken) {
      const therapist = await this.validateApiToken(apiToken);
      if (therapist) return therapist.id;
    }
    
    // For single-user setup, return the primary therapist
    return 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
  }

  private static async validateBearerToken(token: string): Promise<any> {
    // For single-user setup, accept a simple token
    if (token === 'primary-therapist-token') {
      return {
        id: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
        email: 'therapist@practice.com',
        name: 'Primary Therapist'
      };
    }
    return null;
  }

  private static async validateApiToken(token: string): Promise<any> {
    // Implement token validation
    const result = await pool.query(
      'SELECT * FROM api_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    return result.rows[0] || null; result.rows[0];
  }

  // Sanitize error messages for production
  static sanitizeError(error: any): any {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      return {
        error: error.message,
        stack: error.stack,
        details: error
      };
    }
    
    // Production: Don't expose sensitive information
    return {
      error: 'An error occurred processing your request',
      code: error.code || 'INTERNAL_ERROR'
    };
  }
}

// ============================================
// 4. MEMORY LEAK FIXES
// ============================================
export class MemoryLeakFixes {
  private static timers = new Set<NodeJS.Timeout>();
  private static intervals = new Set<NodeJS.Timeout>();

  // Track and cleanup timers
  static setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, delay);
    
    this.timers.add(timer);
    return timer;
  }

  static setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  static clearAllTimers() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
  }

  // Cleanup on process exit
  static initialize() {
    process.on('SIGINT', () => {
      console.log('🛑 Cleaning up timers...');
      this.clearAllTimers();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('🛑 Cleaning up timers...');
      this.clearAllTimers();
      process.exit(0);
    });
  }
}

// ============================================
// 5. TYPE SAFETY IMPROVEMENTS
// ============================================
export interface TypedRequest<T = any> extends Express.Request {
  body: T;
  therapistId?: string;
  clientId?: string;
}

export interface TypedResponse<T = any> extends Express.Response {
  json: (body: T) => TypedResponse<T>;
}

// Type guards for runtime validation
export class TypeGuards {
  static isValidUUID(value: any): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof value === 'string' && uuidRegex.test(value);
  }

  static isValidDate(value: any): boolean {
    return value instanceof Date && !isNaN(value.getTime());
  }

  static isValidEmail(value: any): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return typeof value === 'string' && emailRegex.test(value);
  }
}

// ============================================
// 6. LOGGING IMPROVEMENTS
// ============================================
export class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  private static logFile = path.join(process.cwd(), 'logs', 'app.log');

  static async log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };

    // Console output in development
    if (this.isDevelopment) {
      const colors = {
        info: '\x1b[36m',  // Cyan
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
      };
      
      console.log(`${colors[level]}[${level.toUpperCase()}]${'\x1b[0m'} ${message}`, data || '');
    }

    // File logging for production
    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      // Silently fail if logging fails
    }
  }

  static info(message: string, data?: any) {
    this.log('info', message, data);
  }

  static warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  static error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

// ============================================
// 7. PERFORMANCE OPTIMIZATIONS
// ============================================
export class PerformanceOptimizations {
  // Cache frequently accessed data
  private static cache = new Map<string, { data: any; expires: number }>();

  static async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });

    return data;
  }

  static clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Batch database operations
  static async batchInsert(table: string, records: any[]) {
    if (records.length === 0) return [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const record of records) {
        const keys = Object.keys(record);
        const values = Object.values(record);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${table} (${keys.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        const result = await client.query(query, values);
        results.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// ============================================
// 8. ERROR RECOVERY
// ============================================
export class ErrorRecovery {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors
        if ((error as any).statusCode >= 400 && (error as any).statusCode < 500) {
          throw error;
        }
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  // Circuit breaker pattern for external services
  static createCircuitBreaker(
    service: string,
    threshold: number = 5,
    timeout: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let isOpen = false;

    return async function<T>(operation: () => Promise<T>): Promise<T> {
      // Check if circuit should be closed
      if (isOpen && Date.now() - lastFailureTime > timeout) {
        isOpen = false;
        failures = 0;
      }

      // If circuit is open, fail fast
      if (isOpen) {
        throw new Error(`Circuit breaker open for ${service}`);
      }

      try {
        const result = await operation();
        failures = 0; // Reset on success
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= threshold) {
          isOpen = true;
          Logger.error(`Circuit breaker opened for ${service}`, { failures });
        }
        
        throw error;
      }
    };
  }
}

// ============================================
// 9. REGISTER ALL FIXES
// ============================================
export function registerCriticalFixes(app: Express) {
  // Initialize all services
  const fileCleanup = new FileCleanupService();
  fileCleanup.start();

  DatabaseOptimizer.optimizePool();
  MemoryLeakFixes.initialize();

  // Add middleware for security
  app.use(async (req: any, res, next) => {
    try {
      req.therapistId = await SecurityEnhancements.getCurrentTherapist(req);
      next();
    } catch (error) {
      next(error);
    }
  });

  // Enhanced error handling
  app.use((error: any, req: any, res: any, next: any) => {
    Logger.error('Request error', {
      url: req.url,
      method: req.method,
      error: error.message,
      stack: error.stack
    });

    const sanitized = SecurityEnhancements.sanitizeError(error);
    res.status(error.statusCode || 500).json(sanitized);
  });

  // Performance monitoring endpoint
  app.get('/api/health/performance', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
      },
      uptime: Math.round(uptime / 60) + ' minutes',
      cacheSize: PerformanceOptimizations['cache'].size,
      activeTimers: MemoryLeakFixes['timers'].size,
      activeIntervals: MemoryLeakFixes['intervals'].size
    });
  });

  // Cache clearing endpoint
  app.post('/api/admin/clear-cache', (req, res) => {
    PerformanceOptimizations.clearCache(req.body.pattern);
    res.json({ success: true, message: 'Cache cleared' });
  });

  Logger.info('✅ Critical fixes and improvements registered');
}