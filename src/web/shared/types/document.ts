/**
 * Document Type Definitions
 */

export interface DocumentData {
  id?: string;
  title?: string;
  content?: string;
  blocks?: any[];
  updatedAt?: number;
  createdAt?: number;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  workspaceId: string;
  ownerId: string;
  tags: string[];
}

export interface DocumentMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  isTrash: boolean;
}

export interface DocumentListResponse {
  documents: DocumentMeta[];
  total: number;
  page: number;
  pageSize: number;
}
