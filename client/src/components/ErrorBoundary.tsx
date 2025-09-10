// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug, WifiOff } from 'lucide-react';
import { ErrorType, parseApiError } from '@/lib/errorUtils';

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
  errorInfo: ErrorInfo | null;
  errorType?: ErrorType;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private resetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.resetKeys = props.resetKeys || [];
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
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

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;

    if (onError) {
      onError(error, errorInfo);
    }

    // Determine error type
    let errorType = ErrorType.UNKNOWN;
    if (error.message?.includes('fetch') || error.message?.includes('NetworkError')) {
      errorType = ErrorType.NETWORK;
    } else if (error.message?.includes('401') || error.message?.includes('403')) {
      errorType = ErrorType.AUTHENTICATION;
    }

    this.setState({ errorInfo, errorType });

    // Log to error reporting service (in production, send to monitoring service)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId !== null) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({ hasError: false, error: null, errorInfo: null, errorType: undefined });
  };

  componentWillUnmount() {
    if (this.resetTimeoutId !== null) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    const { hasError, error, errorInfo, errorType } = this.state;
    const { fallback, children } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.resetErrorBoundary);
      }

      return (
        <DefaultErrorFallback 
          error={error} 
          errorInfo={errorInfo}
          errorType={errorType}
          resetErrorBoundary={this.resetErrorBoundary} 
        />
      );
    }

    return children;
  }
}

// Default Error Fallback Component
export function DefaultErrorFallback({ 
  error, 
  errorInfo,
  errorType,
  resetErrorBoundary 
}: { 
  error: Error; 
  errorInfo?: ErrorInfo | null;
  errorType?: ErrorType;
  resetErrorBoundary: () => void;
}) {
  // Get appropriate icon and styling based on error type
  const getErrorIcon = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return <WifiOff className="w-6 h-6 text-yellow-600" />;
      case ErrorType.AUTHENTICATION:
        return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      default:
        return <Bug className="w-6 h-6 text-red-600" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return "Connection Problem";
      case ErrorType.AUTHENTICATION:
        return "Authentication Error";
      default:
        return "Something went wrong";
    }
  };

  const getErrorMessage = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return "We're having trouble connecting to our servers. Please check your internet connection and try again.";
      case ErrorType.AUTHENTICATION:
        return "Your session may have expired. Please try logging in again.";
      default:
        return "An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.";
    }
  };

  const getIconBgColor = () => {
    switch (errorType) {
      case ErrorType.NETWORK:
        return "bg-yellow-100";
      case ErrorType.AUTHENTICATION:
        return "bg-orange-100";
      default:
        return "bg-red-100";
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className={`flex items-center justify-center w-12 h-12 mx-auto ${getIconBgColor()} rounded-full mb-4`}>
            {getErrorIcon()}
          </div>
          <CardTitle className="text-xl">{getErrorTitle()}</CardTitle>
          <CardDescription className="mt-2">
            {getErrorMessage()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="p-3 bg-gray-100 rounded text-xs text-gray-700">
              <summary className="cursor-pointer font-medium">
                Error details (Development only)
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <strong>Message:</strong>
                  <pre className="whitespace-pre-wrap break-words mt-1">
                    {error.message}
                  </pre>
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack trace:</strong>
                    <pre className="whitespace-pre-wrap break-words mt-1 max-h-48 overflow-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <strong>Component stack:</strong>
                    <pre className="whitespace-pre-wrap break-words mt-1 max-h-48 overflow-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={resetErrorBoundary}
              className="flex-1"
              variant="default"
              data-testid="button-try-again"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              className="flex-1"
              variant="outline"
              data-testid="button-go-home"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Additional help text */}
          <div className="text-center text-sm text-gray-500 pt-2 border-t">
            {errorType === ErrorType.NETWORK ? (
              <p>Check your internet connection and try again.</p>
            ) : errorType === ErrorType.AUTHENTICATION ? (
              <p>
                <a href="/login" className="text-therapy-primary hover:underline">
                  Click here to log in again
                </a>
              </p>
            ) : (
              <p>
                If this problem persists, please{' '}
                <a href="mailto:support@therapy.app" className="text-therapy-primary hover:underline">
                  contact support
                </a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
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