/**
 * Auth Service - Handles authentication operations for AFFiNE backend
 *
 * Simple token-based authentication:
 * User logs into AFFiNE web UI (http://localhost:10003)
 * Copies session token from browser cookies
 * Pastes token in Settings page
 */

import type { User } from '../shared/types/user.js';

const AUTH_TOKEN_KEY = 'affine_auth_token';
const AUTH_USER_KEY = 'affine_auth_user';

export interface AuthUser extends User {
  token: string;
  authenticatedAt: number;
}

export const authService = {
  tokenKey: AUTH_TOKEN_KEY,
  userKey: AUTH_USER_KEY,

  /**
   * Save auth token (after user pastes it from browser)
   */
  saveToken(token: string, email?: string): void {
    // Clean up the token - remove any extra whitespace or quotes
    const cleanToken = token.trim().replace(/^['"]|['"]$/g, '');

    localStorage.setItem(AUTH_TOKEN_KEY, cleanToken);

    const user: AuthUser = {
      id: 'authenticated-user',
      email: email || 'user@affine',
      name: 'Authenticated User',
      createdAt: Date.now(),
      token: cleanToken,
      authenticatedAt: Date.now(),
    };
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    console.log('✅ Auth token saved');
  },

  /**
   * Clear auth token (logout)
   */
  async signOut(): Promise<void> {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    console.log('✅ Logged out');
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return !!token && token.length > 0;
  },

  /**
   * Get the stored auth token
   */
  getToken(): string | null {
    let token = localStorage.getItem(AUTH_TOKEN_KEY);

    // If token is missing but user exists, try to recover from user object
    if (!token || token.trim() === '') {
      const userStr = localStorage.getItem(AUTH_USER_KEY);
      if (userStr) {
        try {
          const user = JSON.parse(userStr) as AuthUser;
          if (user.token) {
            // Restore token from user object
            localStorage.setItem(AUTH_TOKEN_KEY, user.token);
            token = user.token;
            console.log('✅ Token recovered from user object');
          }
        } catch {
          // Invalid user object
        }
      }
    }

    return token;
  },

  /**
   * Get user info from storage
   */
  getUser(): User | null {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Get authorization header for Apollo Client
   */
  getAuthHeader(): string | undefined {
    const token = this.getToken();
    if (!token) return undefined;
    return `Bearer ${token}`;
  },
};
