/**
 * Document Type Definitions
 * AI Editor - Hybrid Storage Mode
 */

/**
 * Basic block structure for document content
 * Compatible with AFFiNE BlockSuite
 */
export interface Block {
  id: string;
  flavour: string; // Block type (e.g., 'affine:paragraph', 'affine:image')
  type: string;
  text?: string;
  props?: Record<string, any>;
  children?: Block[];
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Document model
 */
export interface Document {
  id: string;
  title: string;
  blocks?: Block[]; // Optional, using Yjs when not provided
  yjsState?: Uint8Array; // Yjs binary state for CRDT
  createdAt: number;
  updatedAt: number;
  workspaceId?: string;
  ownerId?: string;
}

/**
 * Document update options
 */
export interface DocUpdates {
  title?: string;
  blocks?: Block[];
  yjsState?: Uint8Array;
  workspaceId?: string;
  ownerId?: string;
}

/**
 * Document creation options
 */
export interface CreateDocOptions {
  workspaceId?: string;
  ownerId?: string;
  initialBlocks?: Block[];
}

/**
 * Document filter for listing
 */
export interface DocFilter {
  workspaceId?: string;
  ownerId?: string;
  searchQuery?: string;
  updatedAfter?: number;
}
