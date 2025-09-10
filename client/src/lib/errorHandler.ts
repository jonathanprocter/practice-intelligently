// Comprehensive Error Handling System
import { toast } from '@/hooks/use-toast';

// Error types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  OAUTH = 'OAUTH',
  DATABASE = 'DATABASE',
  FILE_UPLOAD = 'FILE_UPLOAD',
  AI_SERVICE = 'AI_SERVICE',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Enhanced error class with recovery options
export class AppError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  code?: string;
  retry?: () => Promise<any>;
  fallback?: () => any;
  context?: Record<string, any>;
  timestamp: Date;
  userMessage?: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options?: {
      code?: string;
      retry?: () => Promise<any>;
      fallback?: () => any;
      context?: Record<string, any>;
      userMessage?: string;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = options?.code;
    this.retry = options?.retry;
    this.fallback = options?.fallback;
    this.context = options?.context;
    this.timestamp = new Date();
    this.userMessage = options?.userMessage || this.getDefaultUserMessage();
  }

  private getDefaultUserMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return 'Connection issue detected. Please check your internet connection.';
      case ErrorType.AUTH:
        return 'Authentication required. Please log in again.';
      case ErrorType.OAUTH:
        return 'Calendar connection expired. Please reconnect your Google account.';
      case ErrorType.DATABASE:
        return 'Database temporarily unavailable. Your data is safe.';
      case ErrorType.FILE_UPLOAD:
        return 'File upload failed. Please try again.';
      case ErrorType.AI_SERVICE:
        return 'AI service temporarily unavailable. Using backup service.';
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorType.PERMISSION:
        return 'You don\'t have permission to perform this action.';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// Network status monitor
class NetworkMonitor {
  private isOnline: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.startHealthCheck();
    }
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.notifyListeners();
    toast({
      title: 'Connection Restored',
      description: 'You\'re back online',
      variant: 'default',
    });
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners();
    toast({
      title: 'Connection Lost',
      description: 'Working offline - changes will sync when connection is restored',
      variant: 'destructive',
    });
  };

  private startHealthCheck() {
    this.checkInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        const wasOffline = !this.isOnline;
        this.isOnline = response.ok;
        if (wasOffline && this.isOnline) {
          this.handleOnline();
        }
      } catch {
        if (this.isOnline) {
          this.handleOffline();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  subscribe(listener: (online: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getStatus() {
    return this.isOnline;
  }

  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

// Retry mechanism with exponential backoff
export class RetryManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000;
  private static readonly MAX_DELAY = 30000;

  static async withRetry<T>(
    fn: () => Promise<T>,
    options?: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      shouldRetry?: (error: any) => boolean;
      onRetry?: (attempt: number, error: any) => void;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? this.MAX_RETRIES;
    const baseDelay = options?.baseDelay ?? this.BASE_DELAY;
    const maxDelay = options?.maxDelay ?? this.MAX_DELAY;
    const shouldRetry = options?.shouldRetry ?? this.defaultShouldRetry;
    
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
          maxDelay
        );

        if (options?.onRetry) {
          options.onRetry(attempt + 1, error);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private static defaultShouldRetry(error: any): boolean {
    // Retry on network errors
    if (error.type === ErrorType.NETWORK) return true;
    
    // Retry on specific HTTP status codes
    if (error.status === 429 || error.status === 503 || error.status === 504) {
      return true;
    }

    // Retry on rate limit errors
    if (error.code === 'RATE_LIMIT_EXCEEDED') return true;

    // Don't retry on client errors (4xx except 429)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }

    return false;
  }
}

// Error recovery strategies
export class ErrorRecovery {
  static async handleApiError(error: any, context?: any): Promise<any> {
    // Log error for monitoring
    console.error('API Error:', error, context);

    // Determine error type
    const errorType = this.determineErrorType(error);
    const severity = this.determineErrorSeverity(error);

    // Create app error with recovery options
    const appError = new AppError(
      error.message || 'API request failed',
      errorType,
      severity,
      {
        code: error.code || error.status?.toString(),
        context,
        retry: async () => {
          // Retry the original request
          if (context?.retry) {
            return await context.retry();
          }
        },
        fallback: () => {
          // Use cached data if available
          if (context?.cache) {
            return context.cache;
          }
        }
      }
    );

    // Handle based on error type
    switch (errorType) {
      case ErrorType.AUTH:
        // Redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        break;

      case ErrorType.OAUTH:
        // Show reconnect prompt
        toast({
          title: 'Calendar Connection Expired',
          description: 'Please reconnect your Google account',
          action: {
            label: 'Reconnect',
            onClick: () => {
              window.location.href = '/calendar/integration';
            }
          },
          variant: 'destructive',
        });
        break;

      case ErrorType.NETWORK:
        // Queue for retry when online
        if (context?.queue) {
          this.queueForRetry(context);
        }
        break;

      case ErrorType.RATE_LIMIT:
        // Wait and retry
        const retryAfter = error.headers?.['retry-after'] || 60;
        toast({
          title: 'Rate Limited',
          description: `Please wait ${retryAfter} seconds before trying again`,
          variant: 'destructive',
        });
        break;

      default:
        // Show generic error message
        toast({
          title: 'Error',
          description: appError.userMessage,
          variant: 'destructive',
        });
    }

    throw appError;
  }

  private static determineErrorType(error: any): ErrorType {
    if (error.status === 401 || error.code === 'UNAUTHORIZED') {
      return ErrorType.AUTH;
    }
    if (error.message?.includes('OAuth') || error.message?.includes('token')) {
      return ErrorType.OAUTH;
    }
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (error.status === 429) {
      return ErrorType.RATE_LIMIT;
    }
    if (error.message?.includes('database') || error.message?.includes('DB')) {
      return ErrorType.DATABASE;
    }
    if (error.message?.includes('AI') || error.message?.includes('OpenAI')) {
      return ErrorType.AI_SERVICE;
    }
    if (error.status === 403) {
      return ErrorType.PERMISSION;
    }
    if (error.status === 400) {
      return ErrorType.VALIDATION;
    }
    return ErrorType.UNKNOWN;
  }

  private static determineErrorSeverity(error: any): ErrorSeverity {
    if (error.status >= 500) return ErrorSeverity.HIGH;
    if (error.status === 401 || error.status === 403) return ErrorSeverity.MEDIUM;
    if (error.status === 429) return ErrorSeverity.LOW;
    if (error.type === ErrorType.NETWORK) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  private static retryQueue: Map<string, any> = new Map();

  private static queueForRetry(context: any) {
    const id = `${context.method}_${context.url}_${Date.now()}`;
    this.retryQueue.set(id, context);
    
    // Process queue when back online
    networkMonitor.subscribe((online) => {
      if (online) {
        this.processRetryQueue();
      }
    });
  }

  private static async processRetryQueue() {
    for (const [id, context] of this.retryQueue) {
      try {
        if (context.retry) {
          await context.retry();
          this.retryQueue.delete(id);
        }
      } catch (error) {
        console.error(`Failed to retry ${id}:`, error);
      }
    }
  }
}

// Global network monitor instance
export const networkMonitor = new NetworkMonitor();

// Error reporting service
export class ErrorReporter {
  private static errors: AppError[] = [];
  private static readonly MAX_ERRORS = 100;

  static report(error: AppError) {
    this.errors.push(error);
    
    // Keep only recent errors
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }

    // Send critical errors to backend
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.sendToBackend(error);
    }
  }

  private static async sendToBackend(error: AppError) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message,
          type: error.type,
          severity: error.severity,
          code: error.code,
          context: error.context,
          timestamp: error.timestamp,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch {
      // Silently fail - don't create error loop
      console.error('Failed to report error to backend');
    }
  }

  static getRecentErrors(): AppError[] {
    return [...this.errors];
  }

  static clearErrors() {
    this.errors = [];
  }
}

// Export utilities
export default {
  AppError,
  ErrorType,
  ErrorSeverity,
  RetryManager,
  ErrorRecovery,
  ErrorReporter,
  networkMonitor,
};