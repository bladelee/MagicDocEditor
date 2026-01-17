/**
 * Storage Adapter Abstract Interface
 * Defines the contract for all storage implementations
 */

import type {
  IStorageAdapter,
  AFFineConfig,
  StorageMode,
  StorageHealth,
} from '../../types/storage.js';
import type { Document, DocUpdates, DocFilter } from '../../types/document.js';

/**
 * Abstract base class for storage adapters
 * Implements common functionality and defines the interface
 */
export abstract class BaseStorageAdapter implements IStorageAdapter {
  protected config?: AFFineConfig;

  constructor(config?: AFFineConfig) {
    this.config = config;
  }

  // Abstract methods - must be implemented by subclasses
  abstract getDoc(docId: string): Promise<Document | null>;
  abstract createDoc(doc: Document): Promise<void>;
  abstract updateDoc(docId: string, updates: DocUpdates): Promise<void>;
  abstract deleteDoc(docId: string): Promise<void>;
  abstract listDocs(filter?: DocFilter): Promise<Document[]>;

  // Optional initialization
  async initialize(): Promise<void> {
    // Default: no initialization needed
  }

  // Concrete methods
  getName(): string {
    return this.constructor.name;
  }

  isOnline(): boolean {
    return false; // Default: offline/local storage
  }

  getMode(): StorageMode {
    return 'local'; // Default: local mode
  }

  /**
   * Health check implementation
   */
  async healthCheck(): Promise<StorageHealth> {
    try {
      const start = Date.now();
      await this.performHealthCheck();
      const latency = Date.now() - start;
      return {
        status: 'healthy',
        latency,
      };
    } catch (error: any) {
      return {
        status: 'unavailable',
        error: error?.message || 'Unknown error',
      };
    }
  }

  /**
   * Perform actual health check - to be overridden by subclasses
   */
  protected async performHealthCheck(): Promise<void> {
    // Default: just check if we can list docs
    await this.listDocs();
  }

  /**
   * Utility: Validate document ID
   */
  protected validateDocId(docId: string): void {
    if (!docId || typeof docId !== 'string') {
      throw new Error('Invalid document ID');
    }
  }

  /**
   * Utility: Validate document
   */
  protected validateDoc(doc: Document): void {
    if (!doc.id || !doc.title) {
      throw new Error('Document must have id and title');
    }
  }
}
