/**
 * Sync Manager - WebSocket Implementation
 * Manages synchronization between local storage and AFFiNE backend using WebSocket
 */

import { v4 as uuidv4 } from 'uuid';
import type { AFFineConfig } from '../../types/storage.js';
import type {
  SyncOperation,
  SyncQueueItem,
  SyncStats,
} from '../../types/sync.js';
import { SyncStatus } from '../../types/sync.js';
import type { Document, DocUpdates } from '../../types/document.js';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter.js';
import { affineWebSocketClient } from './AFFiNEWebSocketClient.js';
import { YjsConverter } from './YjsConverter.js';

export class SyncManager {
  private config: AFFineConfig | null = null;
  private queue: SyncQueueItem[] = [];
  private processing = false;
  private localAdapter: LocalStorageAdapter;
  private readonly QUEUE_STORAGE_KEY = 'sync-queue';
  private readonly MAX_RETRIES = 3;
  private connected = false;

  constructor() {
    this.localAdapter = new LocalStorageAdapter();
    this.localAdapter.initialize();
    this.loadQueue();

    // Listen for updates from AFFiNE
    affineWebSocketClient.onDocUpdate((docId, update, timestamp) => {
      this.handleServerUpdate(docId, update, timestamp);
    });
  }

  /**
   * Configure AFFiNE connection
   */
  async setConfig(config: AFFineConfig): Promise<void> {
    this.config = config;
    console.log('✅ SyncManager configured for workspace:', config.workspaceId);

    // Connect to AFFiNE WebSocket
    try {
      await affineWebSocketClient.connect(config);
      this.connected = true;
      console.log('✅ Connected to AFFiNE WebSocket');

      // Start processing queue
      this.process();
    } catch (error) {
      console.error('❌ Failed to connect to AFFiNE:', error);
      this.connected = false;
    }
  }

  /**
   * Add operation to sync queue
   */
  enqueue(operation: SyncOperation): void {
    const item: SyncQueueItem = {
      id: uuidv4(),
      operation,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    this.queue.push(item);
    this.saveQueue();

    console.log('📤 Added to sync queue:', item.operation.type, item.id);

    // Trigger processing
    this.process();
  }

  /**
   * Process sync queue
   */
  async process(docId?: string): Promise<void> {
    if (this.processing || !this.config || !this.connected) {
      console.log('⏸️ Sync already processing or not configured/connected');
      return;
    }

    this.processing = true;

    try {
      // Filter items to process
      const itemsToProcess = docId
        ? this.queue.filter(
            item =>
              item.status === 'pending' &&
              this.isOperationForDoc(item.operation, docId)
          )
        : this.queue.filter(item => item.status === 'pending');

      console.log(`🔄 Processing ${itemsToProcess.length} sync items...`);

      for (const item of itemsToProcess) {
        item.status = 'processing';
        this.saveQueue();

        try {
          await this.executeOperation(item.operation);
          item.status = 'completed';
          console.log('✅ Sync completed:', item.id);
        } catch (error: any) {
          console.error('❌ Sync failed:', item.id, error);

          if (item.retries < this.MAX_RETRIES) {
            item.retries++;
            item.status = 'pending';
            item.error = error?.message || 'Unknown error';
            console.log(
              `🔄 Retrying (${item.retries}/${this.MAX_RETRIES}):`,
              item.id
            );
          } else {
            item.status = 'failed';
            item.error = error?.message || 'Max retries exceeded';
            console.error('💀 Sync failed permanently:', item.id);
          }
        }

        this.saveQueue();
      }

      // Clean up completed items
      this.queue = this.queue.filter(item => item.status !== 'completed');
      this.saveQueue();
    } finally {
      this.processing = false;
    }
  }

  /**
   * Execute a single sync operation
   */
  private async executeOperation(operation: SyncOperation): Promise<void> {
    if (!this.config) {
      throw new Error('AFFiNE not configured');
    }

    switch (operation.type) {
      case 'create': {
        await this.executeCreate(operation.doc);
        break;
      }

      case 'update': {
        await this.executeUpdate(operation.docId, operation.updates);
        break;
      }

      case 'delete': {
        await this.executeDelete(operation.docId);
        break;
      }
    }
  }

  /**
   * Execute create operation
   */
  private async executeCreate(doc: Document): Promise<void> {
    // Convert document to Yjs format
    const { update } = YjsConverter.createYjsDoc(
      doc.id,
      doc.title,
      doc.blocks || []
    );

    // Push to AFFiNE via WebSocket
    const timestamp = await affineWebSocketClient.pushDocUpdate(doc.id, update);

    console.log(
      '✅ Document created in AFFiNE:',
      doc.id,
      'timestamp:',
      timestamp
    );
  }

  /**
   * Execute update operation
   */
  private async executeUpdate(
    docId: string,
    updates: DocUpdates
  ): Promise<void> {
    // Get current document from local storage
    const doc = await this.localAdapter.getDoc(docId);
    if (!doc) {
      throw new Error(`Document ${docId} not found in local storage`);
    }

    // Merge updates
    const updatedDoc = {
      ...doc,
      ...updates,
      updatedAt: Date.now(),
    };

    // Convert to Yjs format
    const { ydoc } = YjsConverter.createYjsDoc(
      updatedDoc.id,
      updatedDoc.title,
      updatedDoc.blocks || []
    );

    const update = YjsConverter.applyBlocksToYjs(
      ydoc,
      updatedDoc.id,
      updatedDoc.title,
      updatedDoc.blocks || []
    );

    // Push to AFFiNE via WebSocket
    const timestamp = await affineWebSocketClient.pushDocUpdate(docId, update);

    console.log(
      '✅ Document updated in AFFiNE:',
      docId,
      'timestamp:',
      timestamp
    );
  }

  /**
   * Execute delete operation
   */
  private async executeDelete(docId: string): Promise<void> {
    await affineWebSocketClient.deleteDoc(docId);
    console.log('✅ Document deleted in AFFiNE:', docId);
  }

  /**
   * Handle update from AFFiNE server
   */
  private async handleServerUpdate(
    docId: string,
    update: Uint8Array,
    timestamp: number
  ): Promise<void> {
    console.log('📥 Received update from AFFiNE:', docId);

    try {
      // Convert Yjs update to JSON
      const jsonDoc = YjsConverter.yjsUpdateToJson(update);
      if (!jsonDoc) {
        console.error('Failed to convert Yjs update to JSON');
        return;
      }

      // Update local storage
      await this.localAdapter.updateDoc(docId, {
        title: jsonDoc.title,
        blocks: jsonDoc.blocks,
      });

      console.log('✅ Local document updated from AFFiNE:', docId);
    } catch (error) {
      console.error('❌ Failed to update local document:', error);
    }
  }

  /**
   * Get sync status for a document
   */
  getStatus(docId: string): SyncStatus {
    const pendingItems = this.queue.filter(
      item =>
        (item.status === 'pending' || item.status === 'processing') &&
        this.isOperationForDoc(item.operation, docId)
    );

    if (pendingItems.length > 0) {
      return SyncStatus.PENDING;
    }

    const failedItem = this.queue.find(
      item =>
        item.status === 'failed' &&
        this.isOperationForDoc(item.operation, docId)
    );

    if (failedItem) {
      return SyncStatus.ERROR;
    }

    return SyncStatus.SYNCED;
  }

  /**
   * Get sync statistics
   */
  getStats(): SyncStats {
    return {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
      processing: this.queue.filter(i => i.status === 'processing').length,
      completed: this.queue.filter(i => i.status === 'completed').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
    };
  }

  /**
   * Clear sync queue
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    console.log('🗑️ Sync queue cleared');
  }

  /**
   * Disconnect from AFFiNE
   */
  async disconnect(): Promise<void> {
    await affineWebSocketClient.disconnect();
    this.connected = false;
    console.log('🔌 Disconnected from AFFiNE');
  }

  /**
   * Check if operation is for a specific document
   */
  private isOperationForDoc(operation: SyncOperation, docId: string): boolean {
    if (operation.type === 'create') {
      return operation.doc.id === docId;
    } else {
      return operation.docId === docId;
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log('📦 Loaded sync queue:', this.queue.length, 'items');
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.queue = [];
    }
  }
}
