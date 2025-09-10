// Enhanced API Client with Comprehensive Error Handling
import { ApiClient } from './api';
import { AppError, ErrorType, ErrorRecovery, RetryManager, networkMonitor } from './errorHandler';
import { toast } from '@/hooks/use-toast';

// Request queue for offline mode
class RequestQueue {
  private queue: Array<{
    id: string;
    method: string;
    url: string;
    data?: any;
    timestamp: number;
    retries: number;
  }> = [];

  add(method: string, url: string, data?: any) {
    const request = {
      id: `${method}_${url}_${Date.now()}`,
      method,
      url,
      data,
      timestamp: Date.now(),
      retries: 0,
    };
    this.queue.push(request);
    this.saveToLocalStorage();
    return request.id;
  }

  remove(id: string) {
    this.queue = this.queue.filter(req => req.id !== id);
    this.saveToLocalStorage();
  }

  getAll() {
    return [...this.queue];
  }

  private saveToLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('api_request_queue', JSON.stringify(this.queue));
    }
  }

  loadFromLocalStorage() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('api_request_queue');
      if (saved) {
        try {
          this.queue = JSON.parse(saved);
        } catch {
          this.queue = [];
        }
      }
    }
  }
}

// Enhanced API request with error handling and retry logic
export async function enhancedApiRequest(
  method: string,
  url: string,
  data?: unknown,
  options?: {
    skipRetry?: boolean;
    skipOfflineQueue?: boolean;
    cache?: any;
    timeout?: number;
  }
): Promise<Response> {
  // Check network status first
  if (!networkMonitor.getStatus() && !options?.skipOfflineQueue) {
    // Queue request for later if offline
    requestQueue.add(method, url, data);
    throw new AppError(
      'Currently offline - request queued',
      ErrorType.NETWORK,
      'LOW' as any,
      {
        userMessage: 'Your changes will be saved when connection is restored',
      }
    );
  }

  const timeout = options?.timeout || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const makeRequest = async () => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        credentials: 'include',
      });

      clearTimeout(timeoutId);

      // Handle OAuth token expiry
      if (response.status === 401 && url.includes('/api/calendar')) {
        throw new AppError(
          'Calendar authentication expired',
          ErrorType.OAUTH,
          'MEDIUM' as any,
          {
            userMessage: 'Please reconnect your Google Calendar',
            retry: async () => {
              window.location.href = '/calendar/integration';
            }
          }
        );
      }

      // Handle other auth errors
      if (response.status === 401) {
        throw new AppError(
          'Authentication required',
          ErrorType.AUTH,
          'HIGH' as any,
          {
            userMessage: 'Please log in to continue',
          }
        );
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '60';
        throw new AppError(
          'Rate limit exceeded',
          ErrorType.RATE_LIMIT,
          'LOW' as any,
          {
            userMessage: `Too many requests. Please wait ${retryAfter} seconds.`,
            context: { retryAfter: parseInt(retryAfter) }
          }
        );
      }

      // Handle server errors
      if (response.status >= 500) {
        throw new AppError(
          'Server error',
          ErrorType.UNKNOWN,
          'HIGH' as any,
          {
            code: response.status.toString(),
            userMessage: 'The server is experiencing issues. Please try again later.',
          }
        );
      }

      // Handle client errors
      if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        throw new AppError(
          errorMessage,
          ErrorType.VALIDATION,
          'MEDIUM' as any,
          {
            code: response.status.toString(),
            userMessage: errorMessage,
          }
        );
      }

      return response;

    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle abort/timeout
      if (error.name === 'AbortError') {
        throw new AppError(
          'Request timeout',
          ErrorType.NETWORK,
          'MEDIUM' as any,
          {
            userMessage: 'The request took too long. Please try again.',
          }
        );
      }

      // Handle network errors
      if (error.message?.includes('fetch')) {
        throw new AppError(
          'Network error',
          ErrorType.NETWORK,
          'MEDIUM' as any,
          {
            userMessage: 'Connection failed. Please check your internet.',
          }
        );
      }

      // Re-throw AppErrors
      if (error instanceof AppError) {
        throw error;
      }

      // Wrap other errors
      throw new AppError(
        error.message || 'Unknown error',
        ErrorType.UNKNOWN,
        'MEDIUM' as any,
        {
          userMessage: 'An unexpected error occurred. Please try again.',
        }
      );
    }
  };

  // Use retry manager if not skipped
  if (!options?.skipRetry) {
    return await RetryManager.withRetry(makeRequest, {
      maxRetries: 3,
      shouldRetry: (error) => {
        if (error instanceof AppError) {
          return error.type === ErrorType.NETWORK || 
                 error.type === ErrorType.RATE_LIMIT ||
                 (error.code && parseInt(error.code) >= 500);
        }
        return false;
      },
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt} for ${url}:`, error.message);
      }
    });
  }

  return makeRequest();
}

// Request queue instance
const requestQueue = new RequestQueue();

// Process queued requests when coming back online
networkMonitor.subscribe(async (online) => {
  if (online) {
    const queued = requestQueue.getAll();
    if (queued.length > 0) {
      toast({
        title: 'Syncing offline changes',
        description: `Processing ${queued.length} queued requests...`,
      });

      for (const request of queued) {
        try {
          await enhancedApiRequest(
            request.method,
            request.url,
            request.data,
            { skipOfflineQueue: true }
          );
          requestQueue.remove(request.id);
        } catch (error) {
          console.error(`Failed to process queued request ${request.id}:`, error);
          if (request.retries >= 3) {
            requestQueue.remove(request.id);
          }
        }
      }

      const remaining = requestQueue.getAll().length;
      if (remaining === 0) {
        toast({
          title: 'Sync complete',
          description: 'All offline changes have been saved',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Sync incomplete',
          description: `${remaining} requests could not be processed`,
          variant: 'destructive',
        });
      }
    }
  }
});

// Enhanced API Client with all original methods but with error handling
export class EnhancedApiClient extends ApiClient {
  // Override the base methods to use enhanced error handling
  static async getDashboardStats(): Promise<any> {
    try {
      const therapistId = ApiClient.getTherapistId();
      const response = await enhancedApiRequest('GET', `/api/dashboard/stats/${therapistId}`);
      return response.json();
    } catch (error) {
      await ErrorRecovery.handleApiError(error, {
        cache: this.getCachedDashboardStats(),
        retry: () => this.getDashboardStats(),
      });
    }
  }

  static async getClients(): Promise<any> {
    try {
      const therapistId = ApiClient.getTherapistId();
      const response = await enhancedApiRequest('GET', `/api/clients/${therapistId}`);
      return response.json();
    } catch (error) {
      await ErrorRecovery.handleApiError(error, {
        cache: this.getCachedClients(),
        retry: () => this.getClients(),
      });
    }
  }

  // Cache methods for offline fallback
  private static getCachedDashboardStats() {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('cached_dashboard_stats');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  private static getCachedClients() {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('cached_clients');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  // Save to cache on successful requests
  static async saveToCacheOnSuccess<T>(key: string, data: T): Promise<T> {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`cached_${key}`, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to cache data:', error);
      }
    }
    return data;
  }
}

// OAuth Token Manager
export class OAuthTokenManager {
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static isRefreshing = false;

  static async initializeTokenRefresh() {
    // Check token status on initialization
    await this.checkAndRefreshToken();

    // Set up periodic token refresh
    this.refreshTimer = setInterval(async () => {
      await this.checkAndRefreshToken();
    }, 10 * 60 * 1000); // Check every 10 minutes
  }

  static async checkAndRefreshToken() {
    if (this.isRefreshing) return;

    try {
      this.isRefreshing = true;
      const response = await enhancedApiRequest('GET', '/api/oauth/status', undefined, {
        skipRetry: true,
        skipOfflineQueue: true,
      });

      const status = await response.json();

      if (status.needsRefresh) {
        await this.refreshToken();
      }
    } catch (error) {
      console.error('Failed to check OAuth token status:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  static async refreshToken() {
    try {
      const response = await enhancedApiRequest('POST', '/api/oauth/refresh', undefined, {
        skipRetry: false,
      });

      if (response.ok) {
        console.log('OAuth token refreshed successfully');
        toast({
          title: 'Calendar connection refreshed',
          description: 'Your Google Calendar is now synced',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Failed to refresh OAuth token:', error);
      
      // Show reconnect prompt
      toast({
        title: 'Calendar connection expired',
        description: 'Please reconnect your Google Calendar',
        action: {
          label: 'Reconnect',
          onClick: () => {
            window.location.href = '/calendar/integration';
          }
        },
        variant: 'destructive',
      });
    }
  }

  static destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

// Initialize on load
if (typeof window !== 'undefined') {
  requestQueue.loadFromLocalStorage();
  OAuthTokenManager.initializeTokenRefresh();
}

export default EnhancedApiClient;