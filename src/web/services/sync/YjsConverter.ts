/**
 * Yjs Converter
 * Converts between JSON block format and Yjs binary format
 * for synchronization with AFFiNE backend
 */

import * as Y from 'yjs';
import type { Block } from '../../types/document.js';

/**
 * Document structure for JSON format
 */
export interface JSONDocument {
  id: string;
  title: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Yjs Converter
 * Handles conversion between JSON blocks and Yjs binary format
 */
export class YjsConverter {
  /**
   * Convert JSON document to Yjs binary update
   */
  static jsonToYjsUpdate(doc: JSONDocument): Uint8Array {
    const ydoc = new Y.Doc();
    const ymap = ydoc.getMap('meta');
    const yarray = ydoc.getArray('blocks');

    // Store metadata
    ymap.set('id', doc.id);
    ymap.set('title', doc.title);
    ymap.set('createdAt', doc.createdAt);
    ymap.set('updatedAt', doc.updatedAt);

    // Store blocks
    const yblocks = yarray;
    yblocks.push(doc.blocks);

    // Encode to binary
    return Y.encodeStateAsUpdate(ydoc);
  }

  /**
   * Convert Yjs binary update to JSON document
   */
  static yjsUpdateToJson(update: Uint8Array): JSONDocument | null {
    try {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, update);

      const ymap = ydoc.getMap('meta');
      const yarray = ydoc.getArray('blocks');

      // Extract metadata
      const id = ymap.get('id') as string;
      const title = (ymap.get('title') as string) || 'Untitled';
      const createdAt = (ymap.get('createdAt') as number) || Date.now();
      const updatedAt = (ymap.get('updatedAt') as number) || Date.now();

      // Extract blocks
      const blocks = yarray.toArray() as Block[];

      return {
        id,
        title,
        blocks,
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Failed to convert Yjs update to JSON:', error);
      return null;
    }
  }

  /**
   * Create initial Yjs document from blocks
   * Used for creating new documents
   */
  static createYjsDoc(
    docId: string,
    title: string,
    blocks: Block[]
  ): {
    ydoc: Y.Doc;
    update: Uint8Array;
  } {
    const ydoc = new Y.Doc();
    const ymap = ydoc.getMap('meta');
    const yarray = ydoc.getArray('blocks');

    // Set metadata
    ymap.set('id', docId);
    ymap.set('title', title);
    ymap.set('createdAt', Date.now());
    ymap.set('updatedAt', Date.now());

    // Set blocks
    const yblocks = yarray;
    if (blocks.length > 0) {
      yblocks.push(blocks);
    }

    // Encode to binary
    const update = Y.encodeStateAsUpdate(ydoc);

    return { ydoc, update };
  }

  /**
   * Apply blocks to existing Yjs document
   * Used for updating existing documents
   */
  static applyBlocksToYjs(
    ydoc: Y.Doc,
    docId: string,
    title: string,
    blocks: Block[]
  ): Uint8Array {
    const ymap = ydoc.getMap('meta');
    const yarray = ydoc.getArray('blocks');

    // Update metadata
    ymap.set('id', docId);
    ymap.set('title', title);
    ymap.set('updatedAt', Date.now());

    // Update blocks (replace all)
    const yblocks = yarray;
    yblocks.delete(0, yblocks.length);
    if (blocks.length > 0) {
      yblocks.push(blocks);
    }

    // Encode to binary
    return Y.encodeStateAsUpdate(ydoc);
  }

  /**
   * Calculate state vector for incremental sync
   */
  static getStateVector(ydoc: Y.Doc): Uint8Array {
    return Y.encodeStateVector(ydoc);
  }

  /**
   * Calculate diff for incremental sync
   */
  static getDiff(ydoc: Y.Doc, stateVector: Uint8Array): Uint8Array {
    return Y.diffUpdate(Y.encodeStateAsUpdate(ydoc), stateVector);
  }
}
