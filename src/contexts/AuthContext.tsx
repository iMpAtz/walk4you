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

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: {
    url: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
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
  const fetchUser = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setUser(null);
        setAuthenticated(false);
        return;
      }

      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me`
      );

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setAuthenticated(true);
      } else {
        setUser(null);
        setAuthenticated(false);
        clearTokens();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
      setAuthenticated(false);
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!isMounted) return;

    const initAuth = async () => {
      if (isAuthenticated()) {
        await fetchUser();
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [fetchUser, isMounted]);

  // Setup token refresh timer
  useEffect(() => {
    if (!authenticated || !isMounted) return;

    const cleanup = setupTokenRefreshTimer(() => {
      // Token expired and couldn't refresh
      setUser(null);
      setAuthenticated(false);
      if (typeof window !== 'undefined') {
        router.push('/login');
      }
    });

    return cleanup;
  }, [authenticated, router, isMounted]);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
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
      router.push('/login');
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
          router.push('/login');
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
