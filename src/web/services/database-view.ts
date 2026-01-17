/**
 * Database View Service
 * Phase 1: Basic table view using AFFiNE document blocks
 * Uses AFFiNE's existing document and block APIs
 */

import { affineBackend } from './affine-backend.js';
import { apolloClient } from '../lib/apollo-client.js';
import { gql } from '@apollo/client';

// Types
export interface DatabaseColumn {
  id: string;
  name: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX';
  width?: number;
  visible?: boolean;
}

export interface DatabaseRow {
  id: string;
  cells: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface DatabaseView {
  id: string;
  name: string;
  docId: string;
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
}

// GraphQL queries for blocks
const GET_BLOCKS = gql`
  query GetBlocks($workspaceId: ID!, $docId: ID!) {
    blocks(workspaceId: $workspaceId, docId: $docId) {
      id
      flavour
      type
      text
      props
      children
    }
  }
`;

const UPDATE_BLOCK = gql`
  mutation UpdateBlock(
    $workspaceId: ID!
    $docId: ID!
    $blockId: ID!
    $props: JSON
  ) {
    updateBlock(
      workspaceId: $workspaceId
      docId: $docId
      blockId: $blockId
      props: $props
    ) {
      id
      props
    }
  }
`;

/**
 * Database View Service
 * Phase 1: Uses AFFiNE document blocks to implement table view
 */
// Cache for local database views (in-memory storage)
const localViews = new Map<string, DatabaseView>();
let blocksQueryFailed = false;

export const databaseViewService = {
  /**
   * Get a database view from a document
   * Phase 1: Extracts table data from document blocks
   */
  async getDatabaseView(
    workspaceId: string,
    docId: string
  ): Promise<DatabaseView | null> {
    const viewKey = `${workspaceId}-${docId}`;

    // Return local view if it exists
    if (localViews.has(viewKey)) {
      return localViews.get(viewKey)!;
    }

    // If blocks query already failed, create default view
    if (blocksQueryFailed) {
      const defaultView = this.createDefaultView(docId, 'Database View');
      localViews.set(viewKey, defaultView);
      return defaultView;
    }

    try {
      // Skip backend queries and use local storage directly
      // This avoids 400 errors from unsupported GraphQL queries
      console.log('Creating local database view for:', docId);
      const defaultView = this.createDefaultView(docId, 'Database View');
      localViews.set(viewKey, defaultView);
      return defaultView;
    } catch (error: any) {
      console.error('Failed to get database view:', error);
      const defaultView = this.createDefaultView(docId, 'Database View');
      localViews.set(viewKey, defaultView);
      return defaultView;
    }
  },

  /**
   * Create a default database view
   */
  createDefaultView(docId: string, name: string): DatabaseView {
    return {
      id: `view-${docId}`,
      name,
      docId,
      columns: [
        { id: 'col-title', name: '名称', type: 'TEXT', visible: true },
        { id: 'col-status', name: '状态', type: 'SELECT', visible: true },
        { id: 'col-date', name: '日期', type: 'DATE', visible: true },
      ],
      rows: [],
    };
  },

  /**
   * Parse a table block into database view format
   */
  parseTableBlock(tableBlock: any, docId: string): DatabaseView {
    // Phase 1: Simple parsing
    // In a full implementation, this would parse the table block's props
    const props = tableBlock.props || {};

    return {
      id: `view-${docId}`,
      name: props.title || 'Table',
      docId,
      columns: props.columns || [
        { id: 'col-title', name: '名称', type: 'TEXT', visible: true },
        { id: 'col-status', name: '状态', type: 'SELECT', visible: true },
        { id: 'col-date', name: '日期', type: 'DATE', visible: true },
      ],
      rows: props.rows || [],
    };
  },

  /**
   * Update a cell in the database view
   * Phase 1: Updates local storage (no backend API calls)
   */
  async updateCell(
    workspaceId: string,
    docId: string,
    rowId: string,
    columnId: string,
    value: any
  ): Promise<boolean> {
    try {
      const viewKey = `${workspaceId}-${docId}`;
      const view = localViews.get(viewKey);

      if (!view) {
        throw new Error('Database view not found');
      }

      // Find the row and update the cell
      const row = view.rows.find(r => r.id === rowId);
      if (row) {
        row.cells[columnId] = value;
        row.updatedAt = Date.now();
        localViews.set(viewKey, view);
        console.log('Updated cell:', { rowId, columnId, value });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to update cell:', error);
      return false;
    }
  },

  /**
   * Add a new row to the database view
   * Phase 1: Uses local storage (no backend API calls)
   */
  async addRow(
    workspaceId: string,
    docId: string,
    cells: Record<string, any>
  ): Promise<DatabaseRow | null> {
    try {
      const viewKey = `${workspaceId}-${docId}`;
      const view = localViews.get(viewKey);

      if (!view) {
        throw new Error('Database view not found');
      }

      const newRow: DatabaseRow = {
        id: `row-${Date.now()}`,
        cells,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Add row to local view
      view.rows.push(newRow);
      localViews.set(viewKey, view);

      console.log('Added row to local view:', newRow);
      return newRow;
    } catch (error) {
      console.error('Failed to add row:', error);
      return null;
    }
  },

  /**
   * Delete a row from the database view
   * Phase 1: Updates local storage (no backend API calls)
   */
  async deleteRow(
    workspaceId: string,
    docId: string,
    rowId: string
  ): Promise<boolean> {
    try {
      const viewKey = `${workspaceId}-${docId}`;
      const view = localViews.get(viewKey);

      if (!view) {
        throw new Error('Database view not found');
      }

      // Remove the row from the view
      const initialLength = view.rows.length;
      view.rows = view.rows.filter(r => r.id !== rowId);
      localViews.set(viewKey, view);

      const deleted = view.rows.length < initialLength;
      if (deleted) {
        console.log('Deleted row:', rowId);
      }
      return deleted;
    } catch (error) {
      console.error('Failed to delete row:', error);
      return false;
    }
  },

  /**
   * Create a new database view in a document
   */
  async createDatabaseView(
    workspaceId: string,
    docId: string,
    name: string
  ): Promise<DatabaseView | null> {
    try {
      // Create a new table block in the document
      // Phase 1: Simple implementation
      const view: DatabaseView = {
        id: `view-${Date.now()}`,
        name,
        docId,
        columns: [
          { id: 'col-title', name: '名称', type: 'TEXT', visible: true },
          { id: 'col-status', name: '状态', type: 'SELECT', visible: true },
          { id: 'col-date', name: '日期', type: 'DATE', visible: true },
        ],
        rows: [],
      };

      console.log('Creating database view:', view);

      // TODO: Implement actual block creation
      return view;
    } catch (error) {
      console.error('Failed to create database view:', error);
      return null;
    }
  },

  /**
   * List all documents that have table views
   */
  async listTableDocuments(
    workspaceId: string
  ): Promise<Array<{ docId: string; title: string }>> {
    try {
      const docs = await affineBackend.getDocs(workspaceId);

      // Phase 1: Return all documents
      // In a full implementation, this would filter for documents with table blocks
      return docs.map((doc: any) => ({
        docId: doc.id,
        title: doc.title || 'Untitled',
      }));
    } catch (error) {
      console.error('Failed to list table documents:', error);
      return [];
    }
  },
};
