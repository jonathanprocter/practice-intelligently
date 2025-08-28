import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "./index.css";
import App from "./App.tsx";

import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/ErrorBoundary";

// Global error handler for network issues
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Failed to fetch') || 
      event.reason?.message?.includes('fetch') ||
      event.reason?.message?.includes('NetworkError')) {
    console.warn('Network request failed, but continuing...', event.reason);
    event.preventDefault(); // Prevent the error from showing in console
  }
});

// Handle runtime errors gracefully
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('fetch') || 
      event.error?.message?.includes('Network')) {
    console.warn('Network error caught, continuing...', event.error);
    event.preventDefault();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry network errors more than once
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('fetch') ||
            error?.message?.includes('NetworkError')) {
          return failureCount < 1;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);