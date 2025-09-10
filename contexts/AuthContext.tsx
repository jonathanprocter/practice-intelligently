// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiClient } from '@/lib/api';

interface AuthContextType {
  therapistId: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const checkAuth = async () => {
      try {
        const storedAuth = localStorage.getItem('auth');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          setTherapistId(authData.therapistId);
          setUser(authData.user);

          // Verify token is still valid
          await ApiClient.verifyAuth();
        } else {
          // For now, use the demo therapist ID as fallback
          // Remove this in production
          setTherapistId('e66b8b8e-e7a2-40b9-ae74-00c93ffe503c');
          setUser({
            id: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
            email: 'demo@therapy.app',
            name: 'Demo Therapist',
            role: 'therapist'
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await ApiClient.login(email, password);
      setTherapistId(response.therapistId);
      setUser(response.user);

      localStorage.setItem('auth', JSON.stringify({
        therapistId: response.therapistId,
        user: response.user,
        token: response.token
      }));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setTherapistId(null);
    setUser(null);
    localStorage.removeItem('auth');
  };

  const refreshAuth = async () => {
    // Implement token refresh logic
    try {
      const response = await ApiClient.refreshToken();
      // Update stored auth
    } catch (error) {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{
      therapistId,
      user,
      isLoading,
      login,
      logout,
      refreshAuth
    }}>
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