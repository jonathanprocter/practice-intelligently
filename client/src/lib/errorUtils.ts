import { toast } from "@/hooks/use-toast";

// Error types for categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

// Standard error response interface
export interface ApiError {
  type: ErrorType;
  status?: number;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
}

// Map of HTTP status codes to user-friendly messages
const ERROR_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input and try again.",
  401: "Authentication required. Please log in to continue.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "This action conflicts with existing data.",
  422: "The data provided is invalid. Please check and try again.",
  429: "Too many requests. Please wait a moment before trying again.",
  500: "Something went wrong on our end. Please try again later.",
  502: "Service temporarily unavailable. Please try again.",
  503: "Service is under maintenance. Please try again later.",
};

// Parse error response and return standardized error
export async function parseApiError(error: any): Promise<ApiError> {
  const timestamp = new Date();
  
  // Network errors
  if (error.name === 'AbortError') {
    return {
      type: ErrorType.NETWORK,
      message: "Request timed out. Please check your connection and try again.",
      timestamp
    };
  }
  
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return {
      type: ErrorType.NETWORK,
      message: "Network connection error. Please check your internet connection.",
      timestamp
    };
  }
  
  // Parse response errors
  if (error instanceof Response) {
    const status = error.status;
    let message = ERROR_MESSAGES[status] || `An error occurred (${status})`;
    let details: any = {};
    
    try {
      const contentType = error.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await error.json();
        message = data.message || data.error || message;
        details = data.details || data;
      } else {
        const text = await error.text();
        if (text) message = text;
      }
    } catch {
      // Failed to parse response body
    }
    
    // Determine error type based on status
    let type = ErrorType.SERVER;
    if (status === 401) type = ErrorType.AUTHENTICATION;
    else if (status === 403) type = ErrorType.AUTHENTICATION;
    else if (status >= 400 && status < 500) type = ErrorType.CLIENT;
    else if (status >= 500) type = ErrorType.SERVER;
    
    return {
      type,
      status,
      message,
      details,
      timestamp
    };
  }
  
  // Parse Error objects
  if (error instanceof Error) {
    // Check for validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        timestamp
      };
    }
    
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || "An unexpected error occurred",
      timestamp
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error,
      timestamp
    };
  }
  
  // Fallback for unknown error types
  return {
    type: ErrorType.UNKNOWN,
    message: "An unexpected error occurred. Please try again.",
    timestamp
  };
}

// Show error toast with appropriate styling based on error type
export function showErrorToast(error: ApiError) {
  const variant = error.type === ErrorType.NETWORK ? "default" : "destructive";
  
  toast({
    title: getErrorTitle(error.type),
    description: error.message,
    variant,
    duration: error.type === ErrorType.NETWORK ? 8000 : 5000, // Longer duration for network errors
  });
}

// Get appropriate error title based on error type
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return "Connection Issue";
    case ErrorType.AUTHENTICATION:
      return "Authentication Required";
    case ErrorType.VALIDATION:
      return "Validation Error";
    case ErrorType.SERVER:
      return "Server Error";
    case ErrorType.CLIENT:
      return "Request Error";
    default:
      return "Error";
  }
}

// Handle authentication errors by redirecting to login
export function handleAuthenticationError() {
  // Clear any stored auth data
  localStorage.removeItem('authToken');
  localStorage.removeItem('auth');
  
  // Redirect to login
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Enhanced API error handler with automatic toast and auth handling
export async function handleApiError(error: any, options?: {
  showToast?: boolean;
  customMessage?: string;
  onAuthError?: () => void;
}): Promise<ApiError> {
  const { showToast = true, customMessage, onAuthError } = options || {};
  
  const apiError = await parseApiError(error);
  
  // Override message if custom message provided
  if (customMessage) {
    apiError.message = customMessage;
  }
  
  // Handle authentication errors
  if (apiError.type === ErrorType.AUTHENTICATION) {
    if (onAuthError) {
      onAuthError();
    } else {
      handleAuthenticationError();
    }
    return apiError;
  }
  
  // Show toast notification
  if (showToast) {
    showErrorToast(apiError);
  }
  
  // Log error for debugging (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', apiError);
  }
  
  return apiError;
}

// Retry logic for transient errors
export async function retryableRequest<T>(
  request: () => Promise<T>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    shouldRetry?: (error: ApiError) => boolean;
  }
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, shouldRetry } = options || {};
  
  let lastError: ApiError | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      lastError = await parseApiError(error);
      
      // Check if we should retry
      const shouldRetryError = shouldRetry 
        ? shouldRetry(lastError)
        : lastError.type === ErrorType.NETWORK || lastError.status === 503;
      
      if (!shouldRetryError || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError;
}

// Form validation error formatter
export function formatValidationErrors(errors: Record<string, string[]>): string {
  const messages = Object.entries(errors)
    .map(([field, fieldErrors]) => {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
      return `${fieldName}: ${fieldErrors.join(', ')}`;
    })
    .join('\n');
  
  return messages || "Please check your input and try again.";
}

// Success toast helper
export function showSuccessToast(message: string, description?: string) {
  toast({
    title: message,
    description,
    duration: 3000,
  });
}

// Warning toast helper
export function showWarningToast(message: string, description?: string) {
  toast({
    title: message,
    description,
    variant: "default",
    duration: 4000,
  });
}

// Info toast helper
export function showInfoToast(message: string, description?: string) {
  toast({
    title: message,
    description,
    variant: "default",
    duration: 3000,
  });
}