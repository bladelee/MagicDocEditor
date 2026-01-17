/**
 * Sync Type Definitions
 * AI Editor - Hybrid Storage Mode
 */

import type { Document, DocUpdates } from './document.js';

/**
 * Sync status enum
 */
export enum SyncStatus {
  IDLE = 'idle', // Local mode, no sync needed
  SYNCING = 'syncing', // Currently syncing
  SYNCED = 'synced', // Synced to cloud
  PENDING = 'pending', // Has pending changes
  CONFLICT = 'conflict', // Has conflicts
  OFFLINE = 'offline', // Offline mode
  ERROR = 'error', // Sync error
}

/**
 * Sync operation type
 */
export type SyncOperation =
  | { type: 'create'; doc: Document }
  | { type: 'update'; docId: string; updates: DocUpdates }
  | { type: 'delete'; docId: string };

/**
 * Sync queue item
 */
export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
