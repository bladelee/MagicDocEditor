/**
 * useAuth Hook - Manages authentication state
 */

import { useState, useEffect, useCallback } from 'react';
import type { User } from '../shared/types/user.js';
import { authService, type AuthUser } from '../services/auth.js';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        if (authService.isAuthenticated()) {
          const storedUser = authService.getUser();
          if (storedUser) {
            setUser(storedUser);
          }
        }
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.signOut();
      setUser(null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const user = await authService.getCurrentUser();
      setUser(user || null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    signOut,
    refreshUser,
  };
}
