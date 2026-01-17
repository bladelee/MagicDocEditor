/**
 * AuthGuard - Protected route wrapper
 */

import type { FC } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: Implement actual auth check
    const isAuthenticated = true; // Placeholder
    if (!isAuthenticated) {
      navigate('/auth/login');
    }
  }, [navigate]);

  return children;
};
