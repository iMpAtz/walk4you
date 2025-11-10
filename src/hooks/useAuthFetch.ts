import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export function useAuthFetch() {
  const { authenticatedFetch, logout } = useAuth();

  const fetch = useCallback(
    async (url: string, options: FetchOptions = {}) => {
      const { skipAuth, ...fetchOptions } = options;

      try {
        if (skipAuth) {
          return await window.fetch(url, fetchOptions);
        }

        const response = await authenticatedFetch(url, fetchOptions);

        // If still unauthorized after token refresh attempt, logout
        if (response.status === 401) {
          console.log('Authentication failed, logging out...');
          logout();
          throw new Error('Authentication failed');
        }

        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    },
    [authenticatedFetch, logout]
  );

  return fetch;
}
