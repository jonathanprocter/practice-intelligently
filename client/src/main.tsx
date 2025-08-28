import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "./index.css";
import App from "./App.tsx";

import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/ErrorBoundary";

// Enhanced global error handler for network issues and HMR
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || '';
  const isNetworkError = errorMessage.includes('Failed to fetch') || 
                        errorMessage.includes('fetch') ||
                        errorMessage.includes('NetworkError') ||
                        errorMessage.includes('HMR') ||
                        errorMessage.includes('WebSocket');
  
  if (isNetworkError) {
    console.warn('Network/HMR request failed, but continuing...', event.reason);
    event.preventDefault(); // Prevent the error from showing in console
  }
});

// Handle runtime errors gracefully including HMR errors
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || '';
  const isNetworkError = errorMessage.includes('fetch') || 
                        errorMessage.includes('Network') ||
                        errorMessage.includes('HMR') ||
                        errorMessage.includes('WebSocket');
  
  if (isNetworkError) {
    console.warn('Network/HMR error caught, continuing...', event.error);
    event.preventDefault();
  }
});

// Disable HMR overlay for development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__vite_plugin_react_preamble_installed__ = true;
}

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