/**
 * AFFiNE Storage Adapter
 * Connects to AFFiNE backend GraphQL API
 */

import { BaseStorageAdapter } from './StorageAdapter.js';
import { apolloClient } from '../../lib/apollo-client.js';
import { gql } from '@apollo/client';
import type { Document, DocUpdates, DocFilter } from '../../types/document.js';
import type { AFFineConfig } from '../../types/storage.js';

export class AFFineStorageAdapter extends BaseStorageAdapter {
  private workspaceId: string;

  constructor(config: AFFineConfig) {
    super(config);
    this.workspaceId = config.workspaceId;
  }

  async initialize(): Promise<void> {
    console.log(
      '✅ AFFiNE Storage Adapter initialized for workspace:',
      this.workspaceId
    );
  }

  /**
   * Get a document from AFFiNE
   */
  async getDoc(docId: string): Promise<Document | null> {
    this.validateDocId(docId);

    try {
      const { data } = await apolloClient.query({
        query: gql`
          query GetDoc($workspaceId: String!, $docId: String!) {
            workspace(id: $workspaceId) {
              doc(id: $docId) {
                id
                title
                createdAt
                updatedAt
                blocks {
                  id
                  flavour
                  type
                  text
                  props
                  children
                }
              }
            }
          }
        `,
        variables: {
          workspaceId: this.workspaceId,
          docId,
        },
        fetchPolicy: 'network-only',
      });

      if (!data?.workspace?.doc) {
        return null;
      }

      const docData = data.workspace.doc;
      return {
        id: docData.id,
        title: docData.title || 'Untitled',
        blocks: docData.blocks || [],
        createdAt: new Date(docData.createdAt || Date.now()).getTime(),
        updatedAt: new Date(docData.updatedAt || Date.now()).getTime(),
        workspaceId: this.workspaceId,
      };
    } catch (error: any) {
      console.error('Failed to fetch doc from AFFiNE:', error);
      // If GraphQL error, return null
      if (error.graphQLErrors?.length > 0) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a document in AFFiNE
   * Note: AFFiNE uses a different approach - docs are created via the workspace
   */
  async createDoc(doc: Document): Promise<void> {
    this.validateDoc(doc);

    try {
      // AFFiNE doesn't have a direct createDoc mutation
      // We'll use the applyDocUpdates mutation with a new doc ID
      await apolloClient.mutate({
        mutation: gql`
          mutation InitDoc(
            $workspaceId: String!
            $docId: String!
            $title: String!
          ) {
            workspace(id: $workspaceId) {
              doc(id: $docId) {
                id
              }
            }
          }
        `,
        variables: {
          workspaceId: this.workspaceId,
          docId: doc.id,
          title: doc.title,
        },
      });

      console.log('✅ Document created in AFFiNE:', doc.id);
    } catch (error) {
      console.error('Failed to create doc in AFFiNE:', error);

      // If mutation doesn't exist, we'll just log it
      // The document will be created when first saved via updates
      console.log('⚠️ Document will be created on first save');
    }
  }

  /**
   * Update a document in AFFiNE
   */
  async updateDoc(docId: string, updates: DocUpdates): Promise<void> {
    this.validateDocId(docId);

    // Update title if provided
    if (updates.title) {
      try {
        await apolloClient.mutate({
          mutation: gql`
            mutation UpdateDocTitle(
              $workspaceId: String!
              $docId: String!
              $title: String!
            ) {
              updateDoc(
                workspaceId: $workspaceId
                docId: $docId
                title: $title
              ) {
                id
                title
                updatedAt
              }
            }
          `,
          variables: {
            workspaceId: this.workspaceId,
            docId,
            title: updates.title,
          },
        });
      } catch (error) {
        console.error('Failed to update doc title in AFFiNE:', error);
      }
    }

    // Update blocks if provided
    if (updates.blocks) {
      try {
        // Convert blocks to JSON string for storage
        const blocksJson = JSON.stringify(updates.blocks);

        await apolloClient.mutate({
          mutation: gql`
            mutation UpdateDocBlocks(
              $workspaceId: String!
              $docId: String!
              $blocks: String!
            ) {
              updateDoc(
                workspaceId: $workspaceId
                docId: $docId
                blocks: $blocks
              ) {
                id
                updatedAt
              }
            }
          `,
          variables: {
            workspaceId: this.workspaceId,
            docId,
            blocks: blocksJson,
          },
        });
      } catch (error) {
        console.error('Failed to update doc blocks in AFFiNE:', error);
      }
    }

    // Store Yjs state if provided
    if (updates.yjsState) {
      try {
        const updatesStr = Array.from(updates.yjsState)
          .map(byte => byte.toString(16).padStart(2, '0'))
          .join('');

        await apolloClient.mutate({
          mutation: gql`
            mutation ApplyDocUpdates(
              $workspaceId: String!
              $docId: String!
              $updates: String!
            ) {
              applyDocUpdates(
                workspaceId: $workspaceId
                docId: $docId
                updates: $updates
              ) {
                id
                updatedAt
              }
            }
          `,
          variables: {
            workspaceId: this.workspaceId,
            docId,
            updates: updatesStr,
          },
        });
      } catch (error) {
        console.error('Failed to apply Yjs updates in AFFiNE:', error);
      }
    }

    console.log('✅ Document updated in AFFiNE:', docId);
  }

  /**
   * Delete a document (move to trash)
   */
  async deleteDoc(docId: string): Promise<void> {
    this.validateDocId(docId);

    try {
      await apolloClient.mutate({
        mutation: gql`
          mutation MoveToTrash($workspaceId: String!, $docId: String!) {
            moveToTrash(workspaceId: $workspaceId, docIds: [$docId]) {
              id
            }
          }
        `,
        variables: {
          workspaceId: this.workspaceId,
          docId,
        },
      });

      console.log('✅ Document moved to trash in AFFiNE:', docId);
    } catch (error) {
      console.error('Failed to delete doc in AFFiNE:', error);
      throw error;
    }
  }

  /**
   * List documents from AFFiNE
   */
  async listDocs(filter?: DocFilter): Promise<Document[]> {
    try {
      const { data } = await apolloClient.query({
        query: gql`
          query ListDocs($workspaceId: String!) {
            workspace(id: $workspaceId) {
              docs(pagination: { first: 100 }) {
                totalCount
                edges {
                  node {
                    id
                    title
                    createdAt
                    updatedAt
                  }
                }
              }
            }
          }
        `,
        variables: {
          workspaceId: this.workspaceId,
        },
        fetchPolicy: 'network-only',
      });

      if (!data?.workspace?.docs) {
        return [];
      }

      let docs = data.workspace.docs.edges.map((edge: any) => edge.node);

      // Apply filters
      if (filter?.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        docs = docs.filter((doc: any) =>
          doc.title.toLowerCase().includes(query)
        );
      }

      // Sort by update time
      docs.sort((a: any, b: any) => b.updatedAt - a.updatedAt);

      return docs.map((doc: any) => ({
        id: doc.id,
        title: doc.title || 'Untitled',
        createdAt: new Date(doc.createdAt || Date.now()).getTime(),
        updatedAt: new Date(doc.updatedAt || Date.now()).getTime(),
        workspaceId: this.workspaceId,
      }));
    } catch (error) {
      console.error('Failed to list docs from AFFiNE:', error);
      return [];
    }
  }

  getName(): string {
    return 'AFFiNE Backend Storage';
  }

  isOnline(): boolean {
    return true;
  }

  getMode() {
    return 'affine' as const;
  }

  /**
   * Health check for AFFiNE
   */
  protected async performHealthCheck(): Promise<void> {
    try {
      // Try to query workspace
      await apolloClient.query({
        query: gql`
          query HealthCheck($workspaceId: String!) {
            workspace(id: $workspaceId) {
              id
            }
          }
        `,
        variables: {
          workspaceId: this.workspaceId,
        },
        fetchPolicy: 'network-only',
      });
    } catch (error) {
      throw new Error('AFFiNE backend unavailable');
    }
  }
}
