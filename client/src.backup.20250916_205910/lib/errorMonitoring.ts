// Error Monitoring and Alerting Service
import { AppError, ErrorType, ErrorSeverity } from './errorHandler';

interface ErrorLog {
  id: string;
  timestamp: Date;
  error: AppError | Error;
  context?: any;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  resolved: boolean;
}

interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Map<ErrorType, number>;
  errorsBySeverity: Map<ErrorSeverity, number>;
  errorRate: number; // errors per minute
  impactedUsers: Set<string>;
  criticalErrors: number;
  recoverySuccessRate: number;
}

export class ErrorMonitoringService {
  private static instance: ErrorMonitoringService;
  private errorLogs: ErrorLog[] = [];
  private metrics: ErrorMetrics;
  private alertThresholds = {
    criticalErrorCount: 5,
    errorRatePerMinute: 10,
    impactedUsersCount: 10
  };
  private alertCallbacks: Set<(alert: any) => void> = new Set();
  private sessionId: string;
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.metrics = this.initializeMetrics();
    this.startMetricsCollection();
  }

  static getInstance(): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService();
    }
    return ErrorMonitoringService.instance;
  }

  private initializeMetrics(): ErrorMetrics {
    return {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsBySeverity: new Map(),
      errorRate: 0,
      impactedUsers: new Set(),
      criticalErrors: 0,
      recoverySuccessRate: 0
    };
  }

  logError(error: Error | AppError, context?: any): string {
    const errorLog: ErrorLog = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.sessionId,
      resolved: false
    };

    this.errorLogs.push(errorLog);
    this.updateMetrics(errorLog);
    this.checkAlertThresholds();
    this.sendToBackend(errorLog);

    // Keep only last 1000 errors in memory
    if (this.errorLogs.length > 1000) {
      this.errorLogs = this.errorLogs.slice(-1000);
    }

    return errorLog.id;
  }

  markErrorResolved(errorId: string) {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.resolved = true;
      this.updateRecoveryRate();
    }
  }

  private updateMetrics(errorLog: ErrorLog) {
    this.metrics.totalErrors++;

    if (errorLog.error instanceof AppError) {
      // Update error type metrics
      const typeCount = this.metrics.errorsByType.get(errorLog.error.type) || 0;
      this.metrics.errorsByType.set(errorLog.error.type, typeCount + 1);

      // Update severity metrics
      const severityCount = this.metrics.errorsBySeverity.get(errorLog.error.severity) || 0;
      this.metrics.errorsBySeverity.set(errorLog.error.severity, severityCount + 1);

      // Track critical errors
      if (errorLog.error.severity === ErrorSeverity.CRITICAL) {
        this.metrics.criticalErrors++;
      }
    }

    // Track impacted users
    if (errorLog.userId) {
      this.metrics.impactedUsers.add(errorLog.userId);
    }

    // Calculate error rate
    this.calculateErrorRate();
  }

  private calculateErrorRate() {
    const oneMinuteAgo = Date.now() - 60000;
    const recentErrors = this.errorLogs.filter(
      log => log.timestamp.getTime() > oneMinuteAgo
    ).length;
    this.metrics.errorRate = recentErrors;
  }

  private updateRecoveryRate() {
    const resolvedCount = this.errorLogs.filter(log => log.resolved).length;
    this.metrics.recoverySuccessRate = 
      this.errorLogs.length > 0 ? (resolvedCount / this.errorLogs.length) * 100 : 0;
  }

  private checkAlertThresholds() {
    const alerts = [];

    // Check critical error threshold
    if (this.metrics.criticalErrors >= this.alertThresholds.criticalErrorCount) {
      alerts.push({
        type: 'CRITICAL_ERROR_THRESHOLD',
        message: `Critical error count (${this.metrics.criticalErrors}) exceeded threshold`,
        severity: 'high'
      });
    }

    // Check error rate threshold
    if (this.metrics.errorRate >= this.alertThresholds.errorRatePerMinute) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        message: `Error rate (${this.metrics.errorRate}/min) exceeded threshold`,
        severity: 'high'
      });
    }

    // Check impacted users threshold
    if (this.metrics.impactedUsers.size >= this.alertThresholds.impactedUsersCount) {
      alerts.push({
        type: 'MANY_USERS_IMPACTED',
        message: `${this.metrics.impactedUsers.size} users experiencing errors`,
        severity: 'high'
      });
    }

    // Send alerts
    alerts.forEach(alert => this.sendAlert(alert));
  }

  private sendAlert(alert: any) {
    // Notify all registered callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });

    // Send to backend
    this.sendAlertToBackend(alert);
  }

  onAlert(callback: (alert: any) => void): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  private async sendToBackend(errorLog: ErrorLog) {
    try {
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...errorLog,
          error: {
            message: errorLog.error.message,
            stack: errorLog.error.stack,
            type: (errorLog.error as AppError).type,
            severity: (errorLog.error as AppError).severity
          }
        }),
        credentials: 'include'
      });
    } catch {
      // Silently fail to avoid error loops
    }
  }

  private async sendAlertToBackend(alert: any) {
    try {
      await fetch('/api/errors/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
        credentials: 'include'
      });
    } catch {
      // Silently fail
    }
  }

  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  getRecentErrors(count: number = 10): ErrorLog[] {
    return this.errorLogs.slice(-count);
  }

  getErrorById(errorId: string): ErrorLog | undefined {
    return this.errorLogs.find(log => log.id === errorId);
  }

  getErrorsByType(type: ErrorType): ErrorLog[] {
    return this.errorLogs.filter(log => 
      log.error instanceof AppError && log.error.type === type
    );
  }

  getErrorsBySeverity(severity: ErrorSeverity): ErrorLog[] {
    return this.errorLogs.filter(log => 
      log.error instanceof AppError && log.error.severity === severity
    );
  }

  generateReport(): {
    summary: string;
    metrics: ErrorMetrics;
    topErrors: { error: string; count: number }[];
    recommendations: string[];
  } {
    const errorCounts = new Map<string, number>();
    
    // Count error messages
    this.errorLogs.forEach(log => {
      const message = log.error.message;
      errorCounts.set(message, (errorCounts.get(message) || 0) + 1);
    });

    // Get top errors
    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      summary: `Total errors: ${this.metrics.totalErrors}, ` +
               `Critical: ${this.metrics.criticalErrors}, ` +
               `Recovery rate: ${this.metrics.recoverySuccessRate.toFixed(1)}%`,
      metrics: this.getMetrics(),
      topErrors,
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations = [];

    // Check error patterns
    if (this.metrics.errorRate > 5) {
      recommendations.push('High error rate detected. Consider reviewing recent deployments.');
    }

    const networkErrors = this.metrics.errorsByType.get(ErrorType.NETWORK) || 0;
    if (networkErrors > 10) {
      recommendations.push('Many network errors. Check server health and API endpoints.');
    }

    const authErrors = this.metrics.errorsByType.get(ErrorType.AUTH) || 0;
    if (authErrors > 5) {
      recommendations.push('Authentication errors detected. Review session management.');
    }

    if (this.metrics.recoverySuccessRate < 50) {
      recommendations.push('Low recovery rate. Improve error recovery mechanisms.');
    }

    if (this.metrics.criticalErrors > 0) {
      recommendations.push('Critical errors require immediate attention.');
    }

    return recommendations;
  }

  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.calculateErrorRate();
      this.updateRecoveryRate();
      
      // Send metrics to backend periodically
      this.sendMetricsToBackend();
    }, 60000); // Every minute
  }

  private async sendMetricsToBackend() {
    try {
      await fetch('/api/errors/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date(),
          metrics: this.getMetrics(),
          sessionId: this.sessionId
        }),
        credentials: 'include'
      });
    } catch {
      // Silently fail
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    // Get from auth context or localStorage
    if (typeof localStorage !== 'undefined') {
      const auth = localStorage.getItem('auth');
      if (auth) {
        try {
          const data = JSON.parse(auth);
          return data.userId || data.therapistId;
        } catch {
          return undefined;
        }
      }
    }
    return undefined;
  }

  clearLogs() {
    this.errorLogs = [];
    this.metrics = this.initializeMetrics();
  }

  destroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.alertCallbacks.clear();
  }
}

// Export singleton instance
export const errorMonitoring = ErrorMonitoringService.getInstance();

// Global error handler
if (typeof window !== 'undefined') {
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    errorMonitoring.logError(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorMonitoring.logError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      { reason: event.reason }
    );
  });
}

export default errorMonitoring;