// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Only prevent default for known API-related errors
    const error = event.reason;
    
    // Check if this is a known API error we want to suppress
    if (error?.message?.includes('fetch') || 
        error?.message?.includes('network') ||
        error?.name === 'AbortError') {
      console.warn('Handled promise rejection:', error.message);
      event.preventDefault();
      return;
    }
    
    // Log other unhandled rejections for debugging
    console.error('Unhandled promise rejection:', error);
  });

  // Handle general errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
}

// Helper function to safely parse JSON responses
export async function safeJsonParse(response: Response) {
  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {return null;
  }
}

// Helper function to handle API errors consistently
interface ApiError {
  message?: string;
  status?: number;
  response?: {
    data?: {
      message?: string;
    };
  };
}

export function handleApiError(error: ApiError | Error | unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}