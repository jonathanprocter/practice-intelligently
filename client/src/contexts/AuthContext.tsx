import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { handleApiError, ErrorType, showWarningToast } from '@/lib/errorUtils';

interface AuthContextType {
  isAuthenticated: boolean;
  therapistId: string | null;
  user: any | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  handleAuthError: () => void;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Track if we've already shown session expired message (to avoid duplicates)
let sessionExpiredShown = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Function to handle authentication errors globally
  const handleAuthError = () => {
    // Clear auth state
    setIsAuthenticated(false);
    setTherapistId(null);
    setUser(null);
    ApiClient.setTherapistId(null);
    
    // Clear local storage
    localStorage.removeItem('auth');
    localStorage.removeItem('authToken');
    localStorage.removeItem('therapistId');
    
    // Show session expired message only once
    if (!sessionExpiredShown) {
      sessionExpiredShown = true;
      showWarningToast(
        'Session Expired',
        'Your session has expired. Please log in again.'
      );
      
      // Reset the flag after a delay
      setTimeout(() => {
        sessionExpiredShown = false;
      }, 5000);
    }
    
    // Redirect to login page
    setLocation('/login');
  };

  // Refresh authentication token
  const refreshAuth = async (): Promise<boolean> => {
    try {
      const response = await ApiClient.refreshToken();
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        return true;
      }
    } catch (error) {
      handleAuthError();
    }
    return false;
  };

  // Set up global 401 handler
  useEffect(() => {
    // Intercept all fetch requests to handle 401 errors
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Check for 401 Unauthorized
      if (response.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        
        // Don't redirect for login endpoint itself
        if (!url.includes('/api/auth/login') && !url.includes('/api/auth/verify')) {
          // Try to refresh the token first
          const refreshed = await refreshAuth();
          
          if (!refreshed) {
            // Refresh failed, handle auth error
            handleAuthError();
          } else {
            // Retry the original request with new token
            const token = localStorage.getItem('authToken');
            if (token && args[1]) {
              (args[1] as RequestInit).headers = {
                ...(args[1] as RequestInit).headers,
                'Authorization': `Bearer ${token}`
              };
            }
            return originalFetch(...args);
          }
        }
      }
      
      return response;
    };
    
    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedAuth = localStorage.getItem('auth');
        const storedToken = localStorage.getItem('authToken');
        
        if (storedAuth && storedToken) {
          const authData = JSON.parse(storedAuth);
          
          // Verify the token is still valid
          const isValid = await ApiClient.verifyAuth();
          
          if (isValid) {
            setTherapistId(authData.therapistId);
            setUser(authData.user);
            setIsAuthenticated(true);
            ApiClient.setTherapistId(authData.therapistId);
          } else {
            // Token is invalid, clear auth
            localStorage.removeItem('auth');
            localStorage.removeItem('authToken');
            localStorage.removeItem('therapistId');
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // Clear invalid auth data
        localStorage.removeItem('auth');
        localStorage.removeItem('authToken');
        localStorage.removeItem('therapistId');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await ApiClient.login(username, password);
      
      if (response.therapistId && response.token) {
        // Store auth data
        const authData = {
          therapistId: response.therapistId,
          user: response.user
        };
        
        localStorage.setItem('auth', JSON.stringify(authData));
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('therapistId', response.therapistId);
        
        // Update state
        setTherapistId(response.therapistId);
        setUser(response.user);
        setIsAuthenticated(true);
        ApiClient.setTherapistId(response.therapistId);
        
        // Reset session expired flag on successful login
        sessionExpiredShown = false;
        
        toast({
          title: "Login successful",
          description: "Welcome back to Practice Intelligence",
        });
        
        return true;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      // Handle the error but don't show toast here - it's handled in the login form
      console.error('Login error:', error);
      
      // Parse the error for better handling
      const apiError = await handleApiError(error, { 
        showToast: false // Don't show toast here, let the form handle it
      });
      
      // Throw the parsed error for the form to handle
      throw apiError;
    }
  };

  const logout = () => {
    // Clear local storage
    localStorage.removeItem('auth');
    localStorage.removeItem('authToken');
    localStorage.removeItem('therapistId');
    
    // Clear state
    setIsAuthenticated(false);
    setTherapistId(null);
    setUser(null);
    ApiClient.setTherapistId(null);
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    
    // Redirect to login
    setLocation('/login');
  };

  // Set up periodic auth check (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const checkInterval = setInterval(async () => {
      try {
        const isValid = await ApiClient.verifyAuth();
        if (!isValid) {
          handleAuthError();
        }
      } catch (error) {
        // Silent fail for periodic checks
        console.debug('Periodic auth check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(checkInterval);
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        therapistId,
        user,
        login,
        logout,
        loading,
        handleAuthError,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to handle authentication requirements in components
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, loading, setLocation]);
  
  return { isAuthenticated, loading };
}