// Global error handler for unhandled promise rejections
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
    
    // Show a user-friendly notification for critical errors
    if (event.reason instanceof Error && event.reason.message) {
      console.warn('Application error caught:', event.reason.message);
    }
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
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return null;
  }
}

// Helper function to handle API errors consistently
export function handleApiError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}