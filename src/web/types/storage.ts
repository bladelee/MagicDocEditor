/**
 * Storage Type Definitions
 * AI Editor - Hybrid Storage Mode
 */

import type { Document, DocUpdates, DocFilter } from './document.js';

/**
 * Storage mode enum
 */
export type StorageMode = 'local' | 'affine';

/**
 * Storage adapter interface
 * All storage implementations must implement this
 */
export interface IStorageAdapter {
  // Basic CRUD
  getDoc(docId: string): Promise<Document | null>;
  createDoc(doc: Document): Promise<void>;
  updateDoc(docId: string, updates: DocUpdates): Promise<void>;
  deleteDoc(docId: string): Promise<void>;

  // Batch operations
  listDocs(filter?: DocFilter): Promise<Document[]>;

  // Metadata
  getName(): string;
  isOnline(): boolean;
  getMode(): StorageMode;

  // Health check
  healthCheck(): Promise<StorageHealth>;

  // Initialization (optional)
  initialize?(): Promise<void>;
}

/**
 * AFFiNE configuration
 */
export interface AFFineConfig {
  workspaceId: string;
  token: string;
  serverUrl?: string; // Default: http://localhost:10003
  graphqlUrl?: string; // Default: http://localhost:10003/graphql (deprecated)
}

/**
 * Storage health check result
 */
export interface StorageHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  latency?: number;
  error?: string;
}
