/**
 * Local Storage Adapter using IndexedDB
 * Stores documents in browser's IndexedDB for offline access
 */

import { BaseStorageAdapter } from './StorageAdapter.js';
import type { Document, DocUpdates, DocFilter } from '../../types/document.js';

interface DBDocument extends Document {
  id: string;
  workspaceId?: string;
  updatedAt: number;
  createdAt: number;
}

export class LocalStorageAdapter extends BaseStorageAdapter {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'ai-editor-local';
  private readonly DB_VERSION = 1;
  private initialized = false;

  constructor() {
    super();
  }

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log('✅ IndexedDB initialized:', this.DB_NAME);
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create documents store
        if (!db.objectStoreNames.contains('docs')) {
          const docStore = db.createObjectStore('docs', { keyPath: 'id' });
          docStore.createIndex('workspaceId', 'workspaceId', { unique: false });
          docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          docStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('✅ Created docs store');
        }

        // Create Yjs updates store (for incremental sync)
        if (!db.objectStoreNames.contains('yjs-updates')) {
          const updateStore = db.createObjectStore('yjs-updates', {
            keyPath: 'id',
            autoIncrement: true,
          });
          updateStore.createIndex('docId', 'docId', { unique: false });
          console.log('✅ Created yjs-updates store');
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get a document by ID
   */
  async getDoc(docId: string): Promise<Document | null> {
    await this.ensureInitialized();
    this.validateDocId(docId);

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      const tx = this.db.transaction('docs', 'readonly');
      const store = tx.objectStore('docs');
      const request = store.get(docId);

      request.onsuccess = () => {
        const doc = request.result as DBDocument | undefined;
        resolve(doc || null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Create a new document
   */
  async createDoc(doc: Document): Promise<void> {
    await this.ensureInitialized();
    this.validateDoc(doc);

    const dbDoc: DBDocument = {
      ...doc,
      createdAt: doc.createdAt || Date.now(),
      updatedAt: doc.updatedAt || Date.now(),
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      const tx = this.db.transaction('docs', 'readwrite');
      const store = tx.objectStore('docs');
      const request = store.add(dbDoc);

      request.onsuccess = () => {
        console.log('✅ Document created:', doc.id);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update a document (auto-creates if doesn't exist)
   */
  async updateDoc(docId: string, updates: DocUpdates): Promise<void> {
    await this.ensureInitialized();
    this.validateDocId(docId);

    // Get existing document
    const existing = await this.getDoc(docId);

    // If document doesn't exist, create it first
    if (!existing) {
      console.log(`📝 Document ${docId} not found, creating...`);
      await this.createDoc({
        id: docId,
        title: updates.title || 'Untitled Document',
        blocks: updates.blocks || [],
        workspaceId: updates.workspaceId,
        ownerId: updates.ownerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }

    // Merge updates
    const updated: DBDocument = {
      ...existing,
      ...updates,
      updatedAt: Date.now(), // Always update timestamp
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      const tx = this.db.transaction('docs', 'readwrite');
      const store = tx.objectStore('docs');
      const request = store.put(updated);

      request.onsuccess = () => {
        console.log('✅ Document updated:', docId);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a document
   */
  async deleteDoc(docId: string): Promise<void> {
    await this.ensureInitialized();
    this.validateDocId(docId);

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      const tx = this.db.transaction('docs', 'readwrite');
      const store = tx.objectStore('docs');
      const request = store.delete(docId);

      request.onsuccess = () => {
        console.log('✅ Document deleted:', docId);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * List documents with optional filtering
   */
  async listDocs(filter?: DocFilter): Promise<Document[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      const tx = this.db.transaction('docs', 'readonly');
      const store = tx.objectStore('docs');
      const request = store.getAll();

      request.onsuccess = () => {
        let docs = request.result as DBDocument[];

        // Apply filters
        if (filter?.workspaceId) {
          docs = docs.filter(doc => doc.workspaceId === filter.workspaceId);
        }

        if (filter?.ownerId) {
          docs = docs.filter(doc => doc.ownerId === filter.ownerId);
        }

        if (filter?.searchQuery) {
          const query = filter.searchQuery.toLowerCase();
          docs = docs.filter(
            doc =>
              doc.title.toLowerCase().includes(query) ||
              doc.blocks?.some(block =>
                block.text?.toLowerCase().includes(query)
              )
          );
        }

        if (filter?.updatedAfter) {
          docs = docs.filter(doc => doc.updatedAt > filter.updatedAfter!);
        }

        // Sort by updated time descending
        docs.sort((a, b) => b.updatedAt - a.updatedAt);

        resolve(docs);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Store Yjs update message
   */
  async storeYjsUpdate(docId: string, update: Uint8Array): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      const tx = this.db.transaction('yjs-updates', 'readwrite');
      const store = tx.objectStore('yjs-updates');
      const request = store.add({
        docId,
        update,
        timestamp: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get Yjs updates for a document
   */
  async getYjsUpdates(docId: string): Promise<Uint8Array[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      const tx = this.db.transaction('yjs-updates', 'readonly');
      const index = tx.objectStore('yjs-updates').index('docId');
      const request = index.getAll(docId);

      request.onsuccess = () => {
        const updates = request.result;
        resolve(updates.map((u: any) => new Uint8Array(u.update)));
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      const tx = this.db.transaction(['docs', 'yjs-updates'], 'readwrite');
      tx.objectStore('docs').clear();
      tx.objectStore('yjs-updates').clear();

      tx.oncomplete = () => {
        console.log('✅ All data cleared');
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  getName(): string {
    return 'Local IndexedDB Storage';
  }

  isOnline(): boolean {
    return false;
  }

  /**
   * Health check for IndexedDB
   */
  protected async performHealthCheck(): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }
  }
}
