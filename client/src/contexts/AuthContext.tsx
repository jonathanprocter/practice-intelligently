import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  therapistId: string | null;
  user: any | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
        
        toast({
          title: "Login successful",
          description: "Welcome back to Practice Intelligence",
        });
        
        return true;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
      return false;
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
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        therapistId,
        user,
        login,
        logout,
        loading,
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