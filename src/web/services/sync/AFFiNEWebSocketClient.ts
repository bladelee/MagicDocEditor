/**
 * AFFiNE WebSocket Client
 * Manages WebSocket connection to AFFiNE backend for document synchronization
 */

import { io, type Socket } from 'socket.io-client';
import type { AFFineConfig } from '../../types/storage.js';

// WebSocket event types matching AFFiNE's protocol
export interface AFFiNEServerEvents {
  'space:broadcast-doc-update': {
    spaceType: string;
    spaceId: string;
    docId: string;
    update: string;
    timestamp: number;
    editor: string;
  };
}

export interface AFFiNEClientEvents {
  'space:join': {
    spaceType: string;
    spaceId: string;
    clientVersion: string;
  };
  'space:leave': {
    spaceType: string;
    spaceId: string;
  };
  'space:push-doc-update': {
    spaceType: string;
    spaceId: string;
    docId: string;
    update: string;
  };
  'space:load-doc': {
    spaceType: string;
    spaceId: string;
    docId: string;
    stateVector?: string;
  };
  'space:delete-doc': {
    spaceType: string;
    spaceId: string;
    docId: string;
  };
}

// Response wrapper from AFFiNE
interface AFFiNEResponse<T> {
  data?: T;
  error?: {
    name: string;
    message: string;
  };
}

// Callback type for document updates
export type DocUpdateCallback = (
  docId: string,
  update: Uint8Array,
  timestamp: number
) => void;

/**
 * AFFiNE WebSocket Client
 * Handles connection, authentication, and document synchronization
 */
export class AFFiNEWebSocketClient {
  private socket: Socket | null = null;
  private config: AFFineConfig | null = null;
  private connected = false;
  private updateCallbacks: Set<DocUpdateCallback> = new Set();

  /**
   * Connect to AFFiNE WebSocket server
   */
  async connect(config: AFFineConfig): Promise<void> {
    if (this.connected && this.socket?.connected) {
      console.log('✅ Already connected to AFFiNE');
      return;
    }

    this.config = config;
    const wsUrl = config.serverUrl || 'http://localhost:10003';

    console.log('🔌 Connecting to AFFiNE WebSocket:', wsUrl);

    return new Promise((resolve, reject) => {
      this.socket = io(wsUrl, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        auth: cb => {
          // AFFiNE expects token in auth
          cb({ token: config.token });
        },
      });

      // Handle connection success
      this.socket.on('connect', async () => {
        console.log('✅ WebSocket connected');

        try {
          // Join workspace
          await this.joinWorkspace();
          this.connected = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      // Handle connection errors
      this.socket.on('connect_error', error => {
        console.error('❌ WebSocket connection error:', error);
        reject(error);
      });

      // Listen for document updates from other clients
      this.socket.on('space:broadcast-doc-update', data => {
        console.log('📥 Received doc update from server:', data.docId);
        this.handleServerUpdate(data);
      });

      // Handle disconnection
      this.socket.on('disconnect', reason => {
        console.log('🔌 WebSocket disconnected:', reason);
        this.connected = false;
      });

      // Connect to server
      this.socket.connect();
    });
  }

  /**
   * Join workspace after connection
   */
  private async joinWorkspace(): Promise<void> {
    if (!this.socket || !this.config) {
      throw new Error('Socket or config not initialized');
    }

    const response = await this.socket.emitWithAck('space:join', {
      spaceType: 'workspace',
      spaceId: this.config.workspaceId,
      clientVersion: '1.0.0',
    });

    this.handleResponse(response, 'Failed to join workspace');
    console.log('✅ Joined workspace:', this.config.workspaceId);
  }

  /**
   * Push document update to AFFiNE
   */
  async pushDocUpdate(docId: string, update: Uint8Array): Promise<number> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    // Convert Uint8Array to base64
    const base64Update = this.uint8ArrayToBase64(update);

    const response = await this.socket.emitWithAck('space:push-doc-update', {
      spaceType: 'workspace',
      spaceId: this.config!.workspaceId,
      docId: docId,
      update: base64Update,
    });

    const result = this.handleResponse<{ timestamp: number }>(
      response,
      'Failed to push doc update'
    );

    console.log(
      '✅ Doc update pushed to AFFiNE:',
      docId,
      'timestamp:',
      result.timestamp
    );
    return result.timestamp;
  }

  /**
   * Load document from AFFiNE
   */
  async loadDoc(
    docId: string,
    stateVector?: Uint8Array
  ): Promise<{
    missing: Uint8Array;
    state: Uint8Array;
    timestamp: number;
  } | null> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    const payload: any = {
      spaceType: 'workspace',
      spaceId: this.config!.workspaceId,
      docId: docId,
    };

    if (stateVector) {
      payload.stateVector = this.uint8ArrayToBase64(stateVector);
    }

    const response = await this.socket.emitWithAck('space:load-doc', payload);

    // Handle DOC_NOT_FOUND gracefully
    if (response.error && response.error.name === 'DOC_NOT_FOUND') {
      console.log('📄 Doc not found in AFFiNE (will create):', docId);
      return null;
    }

    const result = this.handleResponse<{
      missing: string;
      state: string;
      timestamp: number;
    }>(response, 'Failed to load doc');

    console.log('✅ Doc loaded from AFFiNE:', docId);
    return {
      missing: this.base64ToUint8Array(result.missing),
      state: this.base64ToUint8Array(result.state),
      timestamp: result.timestamp,
    };
  }

  /**
   * Delete document from AFFiNE
   */
  async deleteDoc(docId: string): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('space:delete-doc', {
      spaceType: 'workspace',
      spaceId: this.config!.workspaceId,
      docId: docId,
    });

    console.log('✅ Doc deletion sent to AFFiNE:', docId);
  }

  /**
   * Disconnect from AFFiNE
   */
  async disconnect(): Promise<void> {
    if (this.socket?.connected) {
      await this.socket.emitWithAck('space:leave', {
        spaceType: 'workspace',
        spaceId: this.config!.workspaceId,
      });
    }

    this.socket?.disconnect();
    this.connected = false;
    console.log('🔌 Disconnected from AFFiNE');
  }

  /**
   * Subscribe to document updates from server
   */
  onDocUpdate(callback: DocUpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  /**
   * Handle server broadcast update
   */
  private handleServerUpdate(
    data: AFFiNEServerEvents['space:broadcast-doc-update']
  ): void {
    const update = this.base64ToUint8Array(data.update);
    this.updateCallbacks.forEach(callback => {
      callback(data.docId, update, data.timestamp);
    });
  }

  /**
   * Handle AFFiNE response
   */
  private handleResponse<T>(
    response: AFFiNEResponse<T>,
    errorMessage: string
  ): T {
    if (response.error) {
      throw new Error(
        `${errorMessage}: ${response.error.message} (${response.error.name})`
      );
    }
    if (!response.data) {
      throw new Error(`${errorMessage}: No data in response`);
    }
    return response.data;
  }

  /**
   * Convert Uint8Array to base64
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    let binary = '';
    const len = array.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(array[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }
}

// Export singleton instance
export const affineWebSocketClient = new AFFiNEWebSocketClient();
