// Performance monitoring service with comprehensive metrics tracking
import { EventEmitter } from 'events';
import { cacheService } from './cache-service';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  status: 'success' | 'error' | 'slow';
  metadata?: any;
}

interface PerformanceReport {
  totalOperations: number;
  averageDuration: number;
  slowOperations: number;
  errorCount: number;
  operationBreakdown: Map<string, OperationStats>;
  cacheStats: any;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
}

interface OperationStats {
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  errorCount: number;
  slowCount: number;
}

class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetric[] = [];
  private operationStats: Map<string, OperationStats> = new Map();
  private startTime: number = Date.now();
  
  // Thresholds
  private readonly SLOW_THRESHOLD = 2000; // 2 seconds
  private readonly VERY_SLOW_THRESHOLD = 5000; // 5 seconds
  private readonly MAX_METRICS_STORED = 10000;
  private readonly ALERT_INTERVAL = 60000; // 1 minute
  
  // Alert tracking
  private lastAlertTime: number = 0;
  private alertCounts: Map<string, number> = new Map();

  constructor() {
    super();
    this.startMonitoring();
  }

  // Track operation performance
  async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    const startTime = Date.now();
    let status: 'success' | 'error' | 'slow' = 'success';
    let result: T;
    
    try {
      result = await operation();
      const duration = Date.now() - startTime;
      
      // Check if operation is slow
      if (duration > this.SLOW_THRESHOLD) {
        status = 'slow';
        this.handleSlowOperation(operationName, duration, metadata);
      }
      
      this.recordMetric({
        operation: operationName,
        duration,
        timestamp: Date.now(),
        status,
        metadata
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      status = 'error';
      
      this.recordMetric({
        operation: operationName,
        duration,
        timestamp: Date.now(),
        status,
        metadata: { ...metadata, error: error?.message }
      });
      
      throw error;
    }
  }

  // Record a metric
  private recordMetric(metric: PerformanceMetric) {
    // Add to metrics array
    this.metrics.push(metric);
    
    // Maintain max size
    if (this.metrics.length > this.MAX_METRICS_STORED) {
      this.metrics.shift();
    }
    
    // Update operation stats
    this.updateOperationStats(metric);
    
    // Emit metric event
    this.emit('metric:recorded', metric);
    
    // Log if in development
    if (process.env.NODE_ENV === 'development' && metric.status !== 'success') {
      console.log(`[Performance] ${metric.operation}: ${metric.duration}ms (${metric.status})`);
    }
  }

  private updateOperationStats(metric: PerformanceMetric) {
    const stats = this.operationStats.get(metric.operation) || {
      count: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errorCount: 0,
      slowCount: 0
    };
    
    stats.count++;
    stats.totalDuration += metric.duration;
    stats.averageDuration = stats.totalDuration / stats.count;
    stats.minDuration = Math.min(stats.minDuration, metric.duration);
    stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
    
    if (metric.status === 'error') {
      stats.errorCount++;
    }
    
    if (metric.status === 'slow') {
      stats.slowCount++;
    }
    
    this.operationStats.set(metric.operation, stats);
  }

  private handleSlowOperation(operation: string, duration: number, metadata?: any) {
    const alertKey = `slow:${operation}`;
    const now = Date.now();
    
    // Track alert frequency
    const alertCount = (this.alertCounts.get(alertKey) || 0) + 1;
    this.alertCounts.set(alertKey, alertCount);
    
    // Only alert if not too frequent
    if (now - this.lastAlertTime > this.ALERT_INTERVAL) {
      if (duration > this.VERY_SLOW_THRESHOLD) {
        console.error(`[CRITICAL] Very slow operation: ${operation} took ${duration}ms`, metadata);
        this.emit('alert:very-slow', { operation, duration, metadata });
      } else {
        console.warn(`[WARNING] Slow operation: ${operation} took ${duration}ms`, metadata);
        this.emit('alert:slow', { operation, duration, metadata });
      }
      
      this.lastAlertTime = now;
    }
  }

  // Get performance report
  getReport(): PerformanceReport {
    const recentMetrics = this.metrics.slice(-1000); // Last 1000 operations
    
    const totalOperations = recentMetrics.length;
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;
    const slowOperations = recentMetrics.filter(m => m.status === 'slow').length;
    const errorCount = recentMetrics.filter(m => m.status === 'error').length;
    
    return {
      totalOperations,
      averageDuration: Math.round(averageDuration),
      slowOperations,
      errorCount,
      operationBreakdown: new Map(this.operationStats),
      cacheStats: cacheService.getStats(),
      memoryUsage: process.memoryUsage(),
      uptime: Date.now() - this.startTime
    };
  }

  // Get metrics for specific operation
  getOperationMetrics(operationName: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.operation === operationName);
  }

  // Get slow operations
  getSlowOperations(limit: number = 10): PerformanceMetric[] {
    return this.metrics
      .filter(m => m.status === 'slow')
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Clear old metrics
  private clearOldMetrics() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
  }

  // Start monitoring
  private startMonitoring() {
    // Clear old metrics every hour
    setInterval(() => {
      this.clearOldMetrics();
      this.alertCounts.clear();
    }, 60 * 60 * 1000);
    
    // Log performance report every 5 minutes in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        const report = this.getReport();
        console.log('[Performance Report]', {
          avgDuration: `${report.averageDuration}ms`,
          slowOps: report.slowOperations,
          errors: report.errorCount,
          cacheHitRate: `${report.cacheStats.hitRate}%`,
          memory: `${Math.round(report.memoryUsage.heapUsed / 1024 / 1024)}MB`
        });
      }, 5 * 60 * 1000);
    }
  }

  // Express middleware for automatic tracking
  middleware() {
    return async (req: any, res: any, next: any) => {
      const operation = `${req.method} ${req.path}`;
      const startTime = Date.now();
      
      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const duration = Date.now() - startTime;
        const status = duration > this.SLOW_THRESHOLD ? 'slow' : 'success';
        
        this.recordMetric({
          operation,
          duration,
          timestamp: Date.now(),
          status,
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          }
        });
        
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  // Health check endpoint data
  getHealthData() {
    const report = this.getReport();
    const recentErrors = this.metrics
      .filter(m => m.status === 'error')
      .slice(-10);
    
    return {
      status: report.errorCount > 10 ? 'degraded' : 'healthy',
      metrics: {
        averageResponseTime: report.averageDuration,
        slowOperations: report.slowOperations,
        errorRate: report.totalOperations > 0 
          ? (report.errorCount / report.totalOperations * 100).toFixed(2) + '%'
          : '0%',
        cacheHitRate: report.cacheStats.hitRate + '%',
        memoryUsage: {
          used: Math.round(report.memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          total: Math.round(report.memoryUsage.heapTotal / 1024 / 1024) + 'MB'
        },
        uptime: Math.round(report.uptime / 1000) + 's'
      },
      recentErrors: recentErrors.map(e => ({
        operation: e.operation,
        timestamp: new Date(e.timestamp).toISOString(),
        error: e.metadata?.error
      }))
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience wrapper for tracking operations
export async function withPerformanceTracking<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: any
): Promise<T> {
  return performanceMonitor.trackOperation(operationName, operation, metadata);
}

export default performanceMonitor;