// JWT Authentication Utilities
import { config } from './config';

interface TokenData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

interface DecodedToken {
  exp: number;
  sub: string;
  [key: string]: any;
}

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/**
 * Decode JWT token without verification (client-side only)
 */
export function decodeToken(token: string): DecodedToken | null {
  try {
    // Validate token format
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    if (!base64Url) {
      return null;
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return true;
  }

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  // Add 5 second buffer
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime + 5;
}

/**
 * Get access token from storage
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get refresh token from storage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Save tokens to storage
 */
export function saveTokens(tokenData: TokenData): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(TOKEN_KEY, tokenData.access_token);
  
  if (tokenData.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token);
  }
  
  // Calculate and save expiry time
  if (tokenData.expires_in) {
    const expiryTime = Date.now() + tokenData.expires_in * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } else {
    // Try to get expiry from token
    const decoded = decodeToken(tokenData.access_token);
    if (decoded?.exp) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, (decoded.exp * 1000).toString());
    }
  }
}

/**
 * Clear all tokens from storage
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    console.log('No refresh token available');
    return null;
  }

  try {
    const response = await fetch(
      `${config.apiBaseUrl}/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data: TokenData = await response.json();
    saveTokens(data);
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearTokens();
    return null;
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  
  if (!token) {
    return null;
  }

  // If token is not expired, return it
  if (!isTokenExpired(token)) {
    return token;
  }

  // Try to refresh token
  console.log('Token expired, attempting to refresh...');
  return await refreshAccessToken();
}

/**
 * Fetch with automatic token refresh
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken();

  if (!token) {
    throw new Error('No valid access token available');
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let response = await fetch(url, { ...options, headers });

  // If unauthorized, try to refresh token once
  if (response.status === 401) {
    console.log('Received 401, attempting token refresh...');
    const newToken = await refreshAccessToken();

    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(url, { ...options, headers });
    }
  }

  return response;
}

/**
 * Setup token refresh timer
 */
export function setupTokenRefreshTimer(callback?: () => void): () => void {
  const checkInterval = 60000; // Check every minute
  
  const intervalId = setInterval(async () => {
    const token = getAccessToken();
    if (!token) {
      clearInterval(intervalId);
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded?.exp) return;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;

    // Refresh token 5 minutes before expiry
    if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
      console.log('Token expiring soon, refreshing...');
      const newToken = await refreshAccessToken();
      
      if (!newToken) {
        console.log('Failed to refresh token, logging out...');
        clearTokens();
        if (callback) callback();
      }
    } else if (timeUntilExpiry <= 0) {
      console.log('Token expired, logging out...');
      clearTokens();
      if (callback) callback();
    }
  }, checkInterval);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Login with credentials
 */
export async function login(username: string, password: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${config.apiBaseUrl}/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      }
    );

    if (!response.ok) {
      return false;
    }

    const data: TokenData = await response.json();
    saveTokens(data);
    return true;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

/**
 * Logout
 */
export function logout(): void {
  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
