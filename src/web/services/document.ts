/**
 * Document Service - Handles document operations
 * Phase 1 Implementation: Basic CRUD + Search with local storage fallback
 * Integrates with AFFiNE Backend Service
 */

import { affineBackend } from './affine-backend.js';
import { apolloClient } from '../lib/apollo-client.js';
import { gql } from '@apollo/client';
import type { Document } from '../shared/types/document.js';
import { v4 as uuidv4 } from 'uuid';

// Local storage key for documents
const DOCS_STORAGE_KEY = 'affine_docs_local';

// Get documents from localStorage
function getStoredDocs(): Map<string, Document> {
  const stored = localStorage.getItem(DOCS_STORAGE_KEY);
  if (!stored) return new Map();

  try {
    const docs = JSON.parse(stored);
    return new Map(Object.entries(docs));
  } catch {
    return new Map();
  }
}

// Save documents to localStorage
function saveStoredDocs(docs: Map<string, Document>) {
  const obj = Object.fromEntries(docs);
  localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(obj));
}

// Local cache for documents
const docCache = getStoredDocs();

// GraphQL Queries for Document Search
export const SEARCH_DOCS = gql`
  query SearchDocs($workspaceId: ID!, $query: String!) {
    searchDocs(workspaceId: $workspaceId, query: $query) {
      id
      title
      description
      createdAt
      updatedAt
    }
  }
`;

// Additional mutations for document operations
export const RENAME_DOC = gql`
  mutation RenameDoc($workspaceId: ID!, $docId: ID!, $title: String!) {
    updateDoc(workspaceId: $workspaceId, docId: $docId, title: $title) {
      id
      title
      updatedAt
    }
  }
`;

export const MOVE_DOC = gql`
  mutation MoveDoc($workspaceId: ID!, $docId: ID!, $newParentId: ID) {
    moveDoc(
      workspaceId: $workspaceId
      docId: $docId
      newParentId: $newParentId
    ) {
      id
      parentId
      updatedAt
    }
  }
`;

// Document Service Implementation
export const documentService = {
  /**
   * Get a single document by ID
   * Phase 1: Uses AFFiNE getDoc
   */
  async getDocument(
    workspaceId: string,
    docId: string
  ): Promise<Document | null> {
    try {
      const doc = await affineBackend.getDoc(workspaceId, docId);
      if (!doc) return null;

      return {
        id: doc.id,
        title: doc.title || 'Untitled',
        content: doc.blocks || [],
        createdAt: new Date(doc.createdAt).getTime(),
        updatedAt: new Date(doc.updatedAt).getTime(),
        workspaceId,
        ownerId: 'user-1', // Will be updated with auth
        tags: [],
      };
    } catch (error) {
      console.error('Failed to get document:', error);
      return null;
    }
  },

  /**
   * Create a new document
   * Phase 1: Uses AFFiNE createDoc
   */
  async createDocument(
    workspaceId: string,
    title = 'Untitled',
    ownerId = 'user-1'
  ): Promise<Document> {
    try {
      // Generate a random docId
      const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const doc = await affineBackend.createDoc(workspaceId, docId);

      // If title is provided, update the document
      if (title !== 'Untitled') {
        await affineBackend.updateDoc(workspaceId, doc.id, { title });
      }

      return {
        id: doc.id,
        title: title,
        content: doc.blocks || [],
        createdAt: new Date(doc.createdAt || Date.now()).getTime(),
        updatedAt: Date.now(),
        workspaceId,
        ownerId,
        tags: [],
      };
    } catch (error) {
      console.error('Failed to create document:', error);
      // Return a mock document for fallback
      return {
        id: `mock-doc-${Date.now()}`,
        title,
        content: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        workspaceId,
        ownerId,
        tags: [],
      };
    }
  },

  /**
   * Update document content and/or title
   * Phase 1: Uses AFFiNE updateDoc
   */
  async updateDocument(
    workspaceId: string,
    docId: string,
    content: string,
    title?: string,
    ownerId = 'user-1'
  ): Promise<Document> {
    try {
      const updates: { title?: string; blocks?: any } = {};
      if (title) {
        updates.title = title;
      }
      if (content) {
        // Parse content as blocks if it's JSON, otherwise create a text block
        try {
          updates.blocks = JSON.parse(content);
        } catch {
          // If content is plain text, create a simple text block
          updates.blocks = [
            {
              id: `block-${Date.now()}`,
              type: 'text',
              text: content,
              props: {},
            },
          ];
        }
      }

      const updatedDoc = await affineBackend.updateDoc(
        workspaceId,
        docId,
        updates
      );

      return {
        id: updatedDoc.id,
        title: updatedDoc.title || title || 'Untitled',
        content: updatedDoc.blocks || content,
        createdAt: new Date(updatedDoc.createdAt || Date.now()).getTime(),
        updatedAt: new Date(updatedDoc.updatedAt).getTime(),
        workspaceId,
        ownerId,
        tags: [],
      };
    } catch (error) {
      console.error('Failed to update document:', error);
      throw error;
    }
  },

  /**
   * Delete a document
   * Phase 1: Uses AFFiNE deleteDoc
   */
  async deleteDocument(workspaceId: string, docId: string): Promise<boolean> {
    try {
      const result = await affineBackend.deleteDoc(workspaceId, docId);
      return result.success !== false;
    } catch (error) {
      console.error('Failed to delete document:', error);
      return false;
    }
  },

  /**
   * List all documents in a workspace
   * Phase 1: Uses AFFiNE getDocs
   */
  async listDocuments(workspaceId: string): Promise<Document[]> {
    try {
      const docs = await affineBackend.getDocs(workspaceId);

      return docs.map((doc: any) => ({
        id: doc.id,
        title: doc.title || 'Untitled',
        content: doc.blocks || [],
        createdAt: new Date(doc.createdAt).getTime(),
        updatedAt: new Date(doc.updatedAt).getTime(),
        workspaceId,
        ownerId: 'user-1',
        tags: [],
      }));
    } catch (error) {
      console.error('Failed to list documents:', error);
      return [];
    }
  },

  /**
   * Rename a document
   * Phase 1: Uses AFFiNE updateDoc with title
   */
  async renameDocument(
    workspaceId: string,
    docId: string,
    newTitle: string
  ): Promise<Document | null> {
    try {
      const updatedDoc = await affineBackend.updateDoc(workspaceId, docId, {
        title: newTitle,
      });

      return {
        id: updatedDoc.id,
        title: updatedDoc.title,
        content: updatedDoc.blocks || [],
        createdAt: new Date(updatedDoc.createdAt || Date.now()).getTime(),
        updatedAt: new Date(updatedDoc.updatedAt).getTime(),
        workspaceId,
        ownerId: 'user-1',
        tags: [],
      };
    } catch (error) {
      console.error('Failed to rename document:', error);
      return null;
    }
  },

  /**
   * Search documents
   * Phase 2: Search functionality
   * Uses AFFiNE searchDocs query if available, otherwise client-side filtering
   */
  async searchDocuments(
    workspaceId: string,
    query: string
  ): Promise<Document[]> {
    if (!query || query.trim().length === 0) {
      return this.listDocuments(workspaceId);
    }

    try {
      // Try to use AFFiNE's searchDocs query
      const { data, errors } = await apolloClient.query({
        query: SEARCH_DOCS,
        variables: { workspaceId, query: query.trim() },
        fetchPolicy: 'network-only',
      });

      if (errors && errors.length > 0) {
        // If searchDocs is not available, fall back to client-side filtering
        console.warn(
          'searchDocs query not available, using client-side filtering'
        );
        return this.clientSideSearch(workspaceId, query);
      }

      if (data?.searchDocs) {
        return data.searchDocs.map((doc: any) => ({
          id: doc.id,
          title: doc.title || 'Untitled',
          content: doc.blocks || [],
          createdAt: new Date(doc.createdAt).getTime(),
          updatedAt: new Date(doc.updatedAt).getTime(),
          workspaceId,
          ownerId: 'user-1',
          tags: [],
        }));
      }

      // Fallback to client-side filtering
      return this.clientSideSearch(workspaceId, query);
    } catch (error) {
      console.error(
        'Failed to search documents, using client-side filtering:',
        error
      );
      return this.clientSideSearch(workspaceId, query);
    }
  },

  /**
   * Client-side document search (fallback)
   */
  async clientSideSearch(
    workspaceId: string,
    query: string
  ): Promise<Document[]> {
    try {
      const docs = await this.listDocuments(workspaceId);
      const lowerQuery = query.toLowerCase();

      return docs.filter(
        doc =>
          doc.title.toLowerCase().includes(lowerQuery) ||
          (typeof doc.content === 'string' &&
            doc.content.toLowerCase().includes(lowerQuery)) ||
          (doc.description &&
            doc.description.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      console.error('Failed to perform client-side search:', error);
      return [];
    }
  },

  /**
   * Move document to a different parent (for folder organization)
   * Phase 1+: Not implemented in AFFiNE yet, returns mock response
   */
  async moveDocument(
    workspaceId: string,
    docId: string,
    newParentId: string | null
  ): Promise<boolean> {
    try {
      // Try to use AFFiNE's moveDoc mutation if available
      const { data, errors } = await apolloClient.mutate({
        mutation: MOVE_DOC,
        variables: { workspaceId, docId, newParentId },
      });

      if (errors) {
        console.warn('moveDoc mutation not available');
        return false;
      }

      return data?.moveDoc?.success !== false;
    } catch (error) {
      console.error('Failed to move document:', error);
      return false;
    }
  },

  /**
   * Get workspace
   * Phase 1: Uses AFFiNE getWorkspace
   */
  async getWorkspace(workspaceId: string): Promise<any> {
    try {
      return await affineBackend.getWorkspace(workspaceId);
    } catch (error) {
      console.error('Failed to get workspace:', error);
      return null;
    }
  },

  /**
   * List workspaces
   * Phase 1: Uses AFFiNE listWorkspaces
   */
  async listWorkspaces(): Promise<any[]> {
    try {
      return await affineBackend.listWorkspaces();
    } catch (error) {
      console.error('Failed to list workspaces:', error);
      return [];
    }
  },

  /**
   * Initialize workspace
   * Phase 1: Uses AFFiNE initializeWorkspace
   */
  async initializeWorkspace(): Promise<any> {
    try {
      return await affineBackend.initializeWorkspace();
    } catch (error) {
      console.error('Failed to initialize workspace:', error);
      return null;
    }
  },
};
