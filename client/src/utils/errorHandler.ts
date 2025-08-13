// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Prevent ALL default browser behavior
    event.preventDefault();
    event.stopPropagation();
    
    // Completely suppress ALL promise rejections as they should be handled by components
    // This prevents any console pollution from async operations
    return false;
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
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}