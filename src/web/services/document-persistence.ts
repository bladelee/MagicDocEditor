/**
 * Document Persistence Service
 * Phase 1: Integrates with AFFiNE Backend Service
 * Handles document persistence to localStorage and backend
 */

import { affineBackend } from './affine-backend.js';
import type { DocumentData } from '../shared/types/document.js';

class DocumentPersistenceService {
  private storageKey = (docId: string) => `doc-${docId}`;

  /**
   * Save document to both localStorage and backend
   * Phase 1: Uses AFFiNE updateDoc mutation
   */
  async saveDocument(
    workspaceId: string,
    docId: string,
    data: DocumentData
  ): Promise<void> {
    // 1. Always save to localStorage first (instant feedback)
    this.saveToLocalStorage(docId, data);

    // 2. Try to save to backend if workspaceId is provided
    if (workspaceId) {
      try {
        await this.saveToBackend(workspaceId, docId, data);
        console.log('Document saved to backend:', docId);
      } catch (error) {
        console.error(
          'Failed to save to backend, using localStorage only:',
          error
        );
        // Data is already in localStorage, so user won't lose work
      }
    }
  }

  /**
   * Load document from localStorage or backend
   * Phase 1: Prioritizes localStorage, falls back to backend
   */
  async loadDocument(
    workspaceId: string,
    docId: string
  ): Promise<DocumentData | null> {
    // 1. Try localStorage first (faster)
    const localData = this.loadFromLocalStorage(docId);
    if (localData) {
      console.log('Document loaded from localStorage:', docId);
      // Optionally sync from backend in background
      this.syncFromBackend(workspaceId, docId).catch(() => {
        // Sync failure is not critical
      });
      return localData;
    }

    // 2. Try backend
    if (workspaceId) {
      try {
        const backendData = await this.loadFromBackend(workspaceId, docId);
        if (backendData) {
          // Sync to localStorage
          this.saveToLocalStorage(docId, backendData);
          console.log('Document loaded from backend:', docId);
          return backendData;
        }
      } catch (error) {
        console.error('Failed to load from backend:', error);
      }
    }

    return null;
  }

  /**
   * Sync document from backend (background operation)
   */
  private async syncFromBackend(
    workspaceId: string,
    docId: string
  ): Promise<DocumentData | null> {
    if (!workspaceId) return null;

    try {
      const backendData = await this.loadFromBackend(workspaceId, docId);
      if (backendData) {
        // Check if backend version is newer
        const localData = this.loadFromLocalStorage(docId);
        if (!localData || backendData.updatedAt > localData.updatedAt) {
          this.saveToLocalStorage(docId, backendData);
          console.log('Document synced from backend:', docId);
          return backendData;
        }
      }
    } catch (error) {
      // Silently fail for background sync
      console.debug('Background sync failed (non-critical):', error);
    }
    return null;
  }

  /**
   * List all documents from localStorage
   */
  listDocuments(): Array<{ id: string; title: string; updatedAt: number }> {
    const docs: Array<{ id: string; title: string; updatedAt: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('doc-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          docs.push({
            id: data.id,
            title: data.title,
            updatedAt: data.updatedAt,
          });
        } catch {
          console.error('Failed to parse document:', key);
        }
      }
    }

    return docs.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Delete document from localStorage and backend
   */
  async deleteDocument(
    workspaceId: string | null,
    docId: string
  ): Promise<void> {
    // Remove from localStorage
    localStorage.removeItem(this.storageKey(docId));

    // Remove from backend
    if (workspaceId) {
      try {
        await affineBackend.deleteDoc(workspaceId, docId);
        console.log('Document deleted from backend:', docId);
      } catch (error) {
        console.error('Failed to delete from backend:', error);
      }
    }
  }

  // Private methods

  private saveToLocalStorage(docId: string, data: DocumentData): void {
    localStorage.setItem(this.storageKey(docId), JSON.stringify(data));
  }

  private loadFromLocalStorage(docId: string): DocumentData | null {
    const data = localStorage.getItem(this.storageKey(docId));
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse document from localStorage:', e);
      return null;
    }
  }

  private async saveToBackend(
    workspaceId: string,
    docId: string,
    data: DocumentData
  ): Promise<void> {
    // Use AFFiNE updateDoc mutation
    await affineBackend.updateDoc(workspaceId, docId, {
      title: data.title,
      blocks: data.blocks,
    });
  }

  private async loadFromBackend(
    workspaceId: string,
    docId: string
  ): Promise<DocumentData | null> {
    // Use AFFiNE getDoc query
    const doc = await affineBackend.getDoc(workspaceId, docId);
    if (!doc) return null;

    return {
      id: doc.id,
      title: doc.title || 'Untitled',
      blocks: doc.blocks || [],
      createdAt: new Date(doc.createdAt || Date.now()).getTime(),
      updatedAt: new Date(doc.updatedAt || Date.now()).getTime(),
    };
  }
}

// Export singleton instance
export const documentPersistence = new DocumentPersistenceService();
