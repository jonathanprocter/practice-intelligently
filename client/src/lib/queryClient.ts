import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { handleApiError, parseApiError, ErrorType } from "./errorUtils";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    throw res; // Throw the response object for better error parsing
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    skipErrorHandling?: boolean;
    customErrorMessage?: string;
  }
): Promise<Response> {
  const { skipErrorHandling = false, customErrorMessage } = options || {};
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`API Request: ${method} ${url}`);
  }

  const headers: any = {
    "Content-Type": "application/json",
  };

  const requestOptions: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(30000), // 30 second timeout
  };

  if (data) {
    requestOptions.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      // Handle the error but let it propagate for proper handling
      if (!skipErrorHandling) {
        await handleApiError(response, {
          showToast: true,
          customMessage: customErrorMessage
        });
      }
      throw response;
    }

    return response;
  } catch (error: any) {
    // If error is already a Response, re-throw it
    if (error instanceof Response) {
      throw error;
    }
    
    // Handle other errors
    if (!skipErrorHandling) {
      await handleApiError(error, {
        showToast: true,
        customMessage: customErrorMessage
      });
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        signal: AbortSignal.timeout(30000), // Add timeout
      });

      if (!res.ok) {
        // Parse and handle error
        const apiError = await parseApiError(res);
        // For errors, throw the response
        throw res;
      }
      
      return await res.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof Response) {
        throw error;
      }
      // For actual network errors, let the error boundary handle it
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds - allow some freshness for better UX
      retry: async (failureCount, error) => {
        // Parse the error to determine if we should retry
        if (error instanceof Response) {
          const apiError = await parseApiError(error);
          // Retry network errors and server errors (5xx)
          if (apiError.type === ErrorType.NETWORK || (apiError.status && apiError.status >= 500)) {
            return failureCount < 2;
          }
          // Don't retry client errors (4xx) or auth errors
          return false;
        }
        // Retry other network-related errors
        if (error?.name === 'AbortError' || error?.message?.includes('fetch')) {
          return failureCount < 2;
        }
        return false;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: async (failureCount, error) => {
        // Similar retry logic for mutations but with fewer retries
        if (error instanceof Response) {
          const apiError = await parseApiError(error);
          if (apiError.type === ErrorType.NETWORK) {
            return failureCount < 1;
          }
          return false;
        }
        if (error?.name === 'AbortError' || error?.message?.includes('fetch')) {
          return failureCount < 1;
        }
        return false;
      },
      retryDelay: 1000, // 1 second delay for mutation retries
    },
  },
});

// Helper function to ensure query keys are always arrays
export const createQueryKey = (key: string | string[]): string[] => {
  if (typeof key === 'string') {
    return [key];
  }
  return key;
};