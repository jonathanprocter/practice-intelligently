// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private resetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.resetKeys = props.resetKeys || [];
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;

    if (onError) {
      onError(error, errorInfo);
    }

    // Log to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId !== null) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({ hasError: false, error: null });
  };

  componentWillUnmount() {
    if (this.resetTimeoutId !== null) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    const { hasError, error } = this.state;
    const { fallback, children } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.resetErrorBoundary);
      }

      return <DefaultErrorFallback error={error} resetErrorBoundary={this.resetErrorBoundary} />;
    }

    return children;
  }
}

// Default Error Fallback Component
export function DefaultErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="therapy-card p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-900">Something went wrong</h2>
              <p className="text-sm text-red-700">An unexpected error occurred</p>
            </div>
          </div>

          <div className="mb-4 p-3 bg-white/50 rounded-md">
            <p className="text-sm text-red-800 font-mono break-all">
              {error.message || 'Unknown error'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={resetErrorBoundary}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using error boundary imperatively
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return (error: Error) => {
    setError(error);
  };
}

// Async Error Boundary Wrapper
export function AsyncBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode; 
  fallback?: (error: Error, reset: () => void) => ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error, errorInfo) => {
        // Could send to error tracking service here
        console.error('Async boundary error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Simple Error Boundary for quick use
export default ErrorBoundary;