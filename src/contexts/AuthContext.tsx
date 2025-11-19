'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  isAuthenticated,
  clearTokens,
  setupTokenRefreshTimer,
  saveTokens,
  authenticatedFetch,
} from '@/lib/auth';
import { config } from '@/lib/config';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  status?: string;
  statusReason?: string;
  avatar?: {
    url: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  authenticatedFetch: typeof authenticatedFetch;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Track if component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch current user data
  const fetchUser = useCallback(async (retryCount = 0) => {
    try {
      const token = getAccessToken();
      if (!token) {
        setUser(null);
        setAuthenticated(false);
        return;
      }
      
      const response = await authenticatedFetch(
        `${config.apiBaseUrl}/users/me`
      );

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setAuthenticated(true);
      } else if (response.status === 401 || response.status === 403) {
        setUser(null);
        setAuthenticated(false);
        clearTokens();
      } else {
        // Retry once for transient errors
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchUser(1);
        }
      }
    } catch (error) {
      // Retry once for network errors
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchUser(1);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!isMounted) return;

    const initAuth = async () => {
      const token = getAccessToken();
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      if (isAuthenticated()) {
        await fetchUser();
      } else {
        // Try to refresh the token
        const { getValidAccessToken } = await import('@/lib/auth');
        const validToken = await getValidAccessToken();
        
        if (validToken) {
          await fetchUser();
        } else {
          clearTokens();
          setUser(null);
          setAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    initAuth();
  }, [fetchUser, isMounted]);

  // Check token validity on window focus/visibility change
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const token = getAccessToken();
        if (token && isAuthenticated()) {
          // Token exists and is valid, refresh user data
          await fetchUser();
        } else if (token && !isAuthenticated()) {
          // Token exists but expired, try to refresh
          const { getValidAccessToken } = await import('@/lib/auth');
          const validToken = await getValidAccessToken();
          
          if (!validToken) {
            // Can't refresh - force logout
            clearTokens();
            setUser(null);
            setAuthenticated(false);
            alert('เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่');
            router.push('/');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [isMounted, fetchUser, router]);

  // Setup token refresh timer
  useEffect(() => {
    if (!authenticated || !isMounted) return;

    const cleanup = setupTokenRefreshTimer(() => {
      // Token expired and couldn't refresh - force logout
      clearTokens();
      setUser(null);
      setAuthenticated(false);
      if (typeof window !== 'undefined') {
        alert('เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่');
        router.push('/');
      }
    });

    return cleanup;
  }, [authenticated, router, isMounted]);

  // Login function
  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    try {
      // Check if input is email (contains @) or username
      const isEmail = emailOrUsername.includes('@');
      const loginData = isEmail 
        ? { email: emailOrUsername, password }
        : { username: emailOrUsername, password };
      
      const response = await fetch(
        `${config.apiBaseUrl}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(loginData),
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      saveTokens(data);
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // Logout function
  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setAuthenticated(false);
    if (typeof window !== 'undefined') {
      router.push('/');
    }
  }, [router]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: authenticated,
    login,
    logout,
    refreshUser,
    authenticatedFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: string
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    useEffect(() => {
      if (!isLoading && isMounted && typeof window !== 'undefined') {
        if (!isAuthenticated) {
          router.push('/');
        } else if (requiredRole && user?.role !== requiredRole) {
          router.push('/');
        }
      }
    }, [isLoading, isAuthenticated, user, router, isMounted]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
      return null;
    }

    return <Component {...props} />;
  };
}
