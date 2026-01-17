/**
 * User Type Definitions
 */

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
