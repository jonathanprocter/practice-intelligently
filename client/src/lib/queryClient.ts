import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`API Request: ${method} ${url}`);

  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    // Add timeout and retry logic
    signal: AbortSignal.timeout(30000), // 30 second timeout
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(`API Error: ${method} ${url} - ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error: any) {
    // Handle specific network errors gracefully
    if (error.name === 'AbortError' || error.message?.includes('Failed to fetch')) {
      console.warn(`Network request failed for ${url}:`, error.message);
      throw new Error('Network request failed - please check your connection');
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
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds - allow some freshness for better UX
      retry: (failureCount, error) => {
        // Only retry on network errors, not on 4xx/5xx HTTP errors
        if (error?.message?.includes('fetch')) {
          return failureCount < 2; // Retry twice for network issues
        }
        return false; // Don't retry HTTP errors
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Retry mutations only on network connectivity issues
        if (error?.message?.includes('fetch') || error?.message?.includes('NetworkError')) {
          return failureCount < 1; // Single retry for mutations
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