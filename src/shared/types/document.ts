/**
 * Document-related type definitions
 */
export interface Document {
  id: string;
  workspaceId: string;
  title: string;
  content: any; // Blocksuite store content
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

export interface DocumentBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: DocumentBlock[];
}

export interface PageMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  isTrash: boolean;
}
