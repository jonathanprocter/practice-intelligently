import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { handleFormSubmit, useFormAutoSave } from '@/lib/formUtils';
import { handleApiError, ErrorType } from '@/lib/errorUtils';
import { useNetworkStatus } from '@/components/NetworkStatusIndicator';

const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { isOnline, isSlowConnection } = useNetworkStatus();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Auto-save form data (excluding password for security)
  const { loadSavedData, clearSavedData } = useFormAutoSave(
    'login-form',
    form.watch(),
    { excludeFields: ['password'] }
  );

  // Load saved username on mount
  useEffect(() => {
    const savedData = loadSavedData();
    if (savedData?.username) {
      form.setValue('username', savedData.username);
    }
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    // Check network status first
    if (!isOnline) {
      setError('No internet connection. Please check your network and try again.');
      return;
    }

    if (isSlowConnection) {
      setError('Your connection is slow. This might take longer than usual.');
    }

    setIsLoading(true);
    setError(null);
    setShowSuccess(false);

    const result = await handleFormSubmit(
      data,
      async (formData) => {
        const success = await login(formData.username, formData.password);
        if (!success) {
          throw new Error('Invalid username or password');
        }
        return success;
      },
      {
        successMessage: 'Login successful!',
        showSuccessToast: false, // We'll handle this ourselves
        showErrorToast: false,
        onSuccess: () => {
          setShowSuccess(true);
          clearSavedData(); // Clear saved form data on successful login
          
          // Brief delay to show success state before redirect
          setTimeout(() => {
            setLocation('/');
          }, 500);
        },
        onError: async (err) => {
          const apiError = await handleApiError(err, { showToast: false });
          
          // Provide specific error messages based on error type
          switch (apiError.type) {
            case ErrorType.AUTHENTICATION:
              setError('Invalid username or password. Please try again.');
              break;
            case ErrorType.NETWORK:
              setError('Connection error. Please check your internet and try again.');
              break;
            case ErrorType.SERVER:
              setError('Server error. Please try again later or contact support.');
              break;
            default:
              setError(apiError.message || 'An error occurred during login');
          }
        }
      }
    );

    setIsLoading(false);
  };

  // Show field-specific validation errors with better UX
  const renderFieldError = (fieldName: keyof LoginFormData) => {
    const error = form.formState.errors[fieldName];
    if (!error) return null;
    
    return (
      <div className="flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3 text-red-500" />
        <span className="text-xs text-red-500">{error.message}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-therapy-primary/10 to-therapy-secondary/10 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-therapy-primary/10">
              <svg
                viewBox="0 0 200 260"
                className="w-16 h-16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="100" cy="60" r="50" fill="#6B7280" />
                <path
                  d="M 50 90 Q 100 140 150 90 L 150 180 Q 100 220 50 180 Z"
                  fill="#6B7280"
                />
                <rect x="40" y="180" width="120" height="10" rx="5" fill="#6B7280" />
                <polygon
                  points="100,200 90,240 100,235 110,240"
                  fill="#6B7280"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Practice Intelligence
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access your therapy practice management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Network status warning */}
          {!isOnline && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Connection</AlertTitle>
              <AlertDescription>
                You are currently offline. Please check your internet connection.
              </AlertDescription>
            </Alert>
          )}

          {isSlowConnection && isOnline && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Slow Connection</AlertTitle>
              <AlertDescription>
                Your connection is slow. Login might take longer than usual.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="text"
                          placeholder="Enter your username"
                          className={`pl-10 ${form.formState.errors.username ? 'border-red-500' : ''}`}
                          disabled={isLoading || !isOnline}
                          autoComplete="username"
                          data-testid="input-username"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter your password"
                          className={`pl-10 ${form.formState.errors.password ? 'border-red-500' : ''}`}
                          disabled={isLoading || !isOnline}
                          autoComplete="current-password"
                          data-testid="input-password"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Success message */}
              {showSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Login successful! Redirecting to dashboard...
                  </AlertDescription>
                </Alert>
              )}

              {/* Error message */}
              {error && !showSuccess && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isOnline || showSuccess}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : showSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Success!
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              {/* Helper text with better styling */}
              <div className="text-center text-sm text-gray-500 mt-4 p-3 bg-gray-50 rounded-md">
                <p className="font-medium mb-1">Demo Credentials:</p>
                <div className="font-mono text-xs space-y-1">
                  <p>Username: <span className="text-gray-700 font-semibold">admin</span></p>
                  <p>Password: <span className="text-gray-700 font-semibold">admin123</span></p>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}