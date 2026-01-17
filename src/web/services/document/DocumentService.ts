/**
 * Unified Document Service (Facade)
 * Provides a single API for document operations
 * Switches between storage adapters based on mode
 */

import { v4 as uuidv4 } from 'uuid';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter.js';
import { SyncManager } from '../sync/SyncManager.js';
import type { IStorageAdapter } from '../../types/storage.js';
import type { StorageMode, AFFineConfig } from '../../types/storage.js';
import type {
  Document,
  DocUpdates,
  CreateDocOptions,
  DocFilter,
} from '../../types/document.js';
import type { SyncStatus } from '../../types/sync.js';

/**
 * Document service class
 * Singleton pattern for global document management
 */
export class DocumentService {
  private static instance: DocumentService;
  private storageAdapter: IStorageAdapter;
  private storageMode: StorageMode = 'local';
  private syncManager: SyncManager | null = null;

  private constructor() {
    // Start with local storage
    this.storageAdapter = new LocalStorageAdapter();
    this.storageAdapter.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  /**
   * Get current storage mode
   */
  getStorageMode(): StorageMode {
    return this.storageMode;
  }

  /**
   * Switch storage mode
   * This is the key for hybrid mode (Stage 3)
   */
  async switchStorageMode(
    mode: StorageMode,
    config?: AFFineConfig
  ): Promise<void> {
    if (mode === this.storageMode) {
      console.log('Already in', mode, 'mode');
      return;
    }

    console.log('🔄 Switching storage mode:', this.storageMode, '→', mode);

    // Save current mode for potential data migration
    const previousMode = this.storageMode;
    const previousAdapter = this.storageAdapter;

    // Switch to new adapter
    if (mode === 'local') {
      this.storageAdapter = new LocalStorageAdapter();
      await this.storageAdapter.initialize();
      this.syncManager = null; // Disable sync in local mode
    } else if (mode === 'affine') {
      if (!config) {
        throw new Error('AFFiNE config is required for AFFiNE mode');
      }

      // Dynamically import to avoid circular dependency
      const { AFFineStorageAdapter } =
        await import('../storage/AFFineStorageAdapter.js');
      this.storageAdapter = new AFFineStorageAdapter(config);
      await this.storageAdapter.initialize();

      // Initialize sync manager
      this.syncManager = new SyncManager();
      this.syncManager.setConfig(config);

      console.log('✅ Sync manager initialized');
    }

    this.storageMode = mode;

    // Trigger data migration if switching to AFFiNE mode
    if (mode === 'affine' && previousMode === 'local') {
      await this.migrateLocalToAFFiNE();
    }

    console.log('✅ Storage mode switched to:', mode);
  }

  /**
   * Migrate local documents to AFFiNE
   * Called when switching from local to AFFiNE mode
   */
  private async migrateLocalToAFFiNE(): Promise<void> {
    console.log('📦 Migrating local documents to AFFiNE...');

    try {
      const localAdapter = new LocalStorageAdapter();
      await localAdapter.initialize();

      const localDocs = await localAdapter.listDocs();
      console.log(`Found ${localDocs.length} local documents to migrate`);

      for (const doc of localDocs) {
        if (this.syncManager) {
          // Queue for sync instead of direct migration
          this.syncManager.enqueue({ type: 'create', doc });
        }
      }

      console.log('✅ Migration queued for sync');
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  /**
   * Get a document
   * Tries local first, then AFFiNE if in AFFiNE mode
   */
  async getDoc(docId: string): Promise<Document | null> {
    // Try local storage first (fast)
    const localAdapter = new LocalStorageAdapter();
    await localAdapter.initialize();
    let doc = await localAdapter.getDoc(docId);

    // If not found locally and in AFFiNE mode, try AFFiNE
    if (!doc && this.storageMode === 'affine') {
      doc = await this.storageAdapter.getDoc(docId);

      // Cache to local for faster access next time
      if (doc) {
        await localAdapter.createDoc(doc);
      }
    }

    return doc;
  }

  /**
   * Create a new document
   */
  async createDoc(title: string, options?: CreateDocOptions): Promise<string> {
    const docId = uuidv4();
    const now = Date.now();

    const doc: Document = {
      id: docId,
      title: title || 'Untitled',
      createdAt: now,
      updatedAt: now,
      workspaceId: options?.workspaceId,
      ownerId: options?.ownerId,
      blocks: options?.initialBlocks || [],
    };

    // Always save to local first (fast)
    const localAdapter = new LocalStorageAdapter();
    await localAdapter.initialize();
    await localAdapter.createDoc(doc);

    console.log('✅ Document created locally:', docId);

    // If in AFFiNE mode, queue for sync
    if (this.storageMode === 'affine' && this.syncManager) {
      this.syncManager.enqueue({ type: 'create', doc });
    }

    return docId;
  }

  /**
   * Update a document
   */
  async updateDoc(docId: string, updates: DocUpdates): Promise<void> {
    // Update local first (fast)
    const localAdapter = new LocalStorageAdapter();
    await localAdapter.initialize();
    await localAdapter.updateDoc(docId, updates);

    // If in AFFiNE mode, queue for sync
    if (this.storageMode === 'affine' && this.syncManager) {
      this.syncManager.enqueue({ type: 'update', docId, updates });
    }
  }

  /**
   * Delete a document
   */
  async deleteDoc(docId: string): Promise<void> {
    // Delete from local first
    const localAdapter = new LocalStorageAdapter();
    await localAdapter.initialize();
    await localAdapter.deleteDoc(docId);

    // If in AFFiNE mode, queue for sync
    if (this.storageMode === 'affine' && this.syncManager) {
      this.syncManager.enqueue({ type: 'delete', docId });
    }
  }

  /**
   * List documents
   * Merges local and AFFiNE documents if in AFFiNE mode
   */
  async listDocs(filter?: DocFilter): Promise<Document[]> {
    // Get local documents
    const localAdapter = new LocalStorageAdapter();
    await localAdapter.initialize();

    let docs = await localAdapter.listDocs(filter);

    // If in AFFiNE mode, merge with AFFiNE documents
    if (this.storageMode === 'affine') {
      try {
        const cloudDocs = await this.storageAdapter.listDocs(filter);

        // Merge strategy: cloud takes precedence for updated documents
        const cloudMap = new Map(cloudDocs.map(d => [d.id, d]));

        docs = docs.map(doc => {
          const cloudDoc = cloudMap.get(doc.id);
          // Use cloud version if it's newer
          if (cloudDoc && cloudDoc.updatedAt > doc.updatedAt) {
            return cloudDoc;
          }
          return doc;
        });

        // Add documents that only exist in cloud
        const localIds = new Set(docs.map(d => d.id));
        for (const cloudDoc of cloudDocs) {
          if (!localIds.has(cloudDoc.id)) {
            docs.push(cloudDoc);
            // Cache to local
            await localAdapter.createDoc(cloudDoc);
          }
        }

        // Sort by update time
        docs.sort((a, b) => b.updatedAt - a.updatedAt);
      } catch (error) {
        console.error('Failed to fetch from AFFiNE, using local only:', error);
      }
    }

    return docs;
  }

  /**
   * Search documents
   */
  async searchDocs(query: string): Promise<Document[]> {
    return this.listDocs({ searchQuery: query });
  }

  /**
   * Get sync status for a document
   */
  getSyncStatus(docId: string): SyncStatus {
    if (this.storageMode === 'local') {
      return 'idle' as SyncStatus;
    }

    return this.syncManager?.getStatus(docId) || ('synced' as SyncStatus);
  }

  /**
   * Manually trigger sync to AFFiNE
   */
  async syncToAFFine(docId?: string): Promise<void> {
    if (this.storageMode !== 'affine') {
      throw new Error('Not in AFFiNE sync mode');
    }

    if (this.syncManager) {
      await this.syncManager.process(docId);
    }

    console.log('🔄 Sync triggered for:', docId || 'all documents');
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    if (!this.syncManager) {
      return null;
    }

    return this.syncManager.getStats();
  }

  /**
   * Get storage health
   */
  async getStorageHealth(): Promise<any> {
    return this.storageAdapter.healthCheck();
  }
}

// Export singleton instance
export const documentService = DocumentService.getInstance();
