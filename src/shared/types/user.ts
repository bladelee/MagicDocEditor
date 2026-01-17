/**
 * User-related type definitions
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  owner: User;
  members: WorkspaceMember[];
  createdAt: number;
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  accepted: boolean;
  createdAt: number;
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: number;
}
