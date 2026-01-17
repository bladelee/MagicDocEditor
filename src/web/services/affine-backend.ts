/**
 * AFFiNE Backend Service
 * Provides methods to interact with AFFiNE GraphQL API
 */
import { gql, ApolloClient } from '@apollo/client';
import { apolloClient } from '../lib/apollo-client';

// GraphQL Queries
export const GET_WORKSPACE = gql`
  query GetWorkspace($id: String!) {
    workspace(id: $id) {
      id
      avatar
      publicMode
      createdAt
      updatedAt
      owner {
        id
        name
      }
    }
  }
`;

export const LIST_WORKSPACES = gql`
  query ListWorkspaces {
    workspaces {
      id
      avatar
      publicMode
      owner {
        id
        name
      }
    }
  }
`;

export const GET_DOC = gql`
  query GetDoc($id: String!, $workspaceId: String!) {
    doc(id: $id, workspaceId: $workspaceId) {
      id
      title
      description
      createdAt
      updatedAt
      blocks
    }
  }
`;

export const GET_DOCS = gql`
  query GetDocs($workspaceId: String!) {
    workspace(id: $workspaceId) {
      id
      docs(pagination: { first: 100 }) {
        totalCount
        edges {
          node {
            id
            title
          }
        }
      }
    }
  }
`;

export const GET_WORKSPACES = gql`
  query GetWorkspaces {
    workspaces {
      id
    }
  }
`;

export const GET_BLOCS = gql`
  query GetBlocks($workspaceId: String!, $docId: String!) {
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

// GraphQL Mutations
export const CREATE_DOC = gql`
  mutation CreateDoc($workspaceId: String!, $docId: String!) {
    createDoc(workspaceId: $workspaceId, docId: $docId) {
      id
      title
      blocks
    }
  }
`;

export const UPDATE_DOC = gql`
  mutation UpdateDoc(
    $workspaceId: String!
    $docId: String!
    $title: String
    $blocks: JSON
  ) {
    updateDoc(
      workspaceId: $workspaceId
      docId: $docId
      title: $title
      blocks: $blocks
    ) {
      id
      title
      updatedAt
    }
  }
`;

export const DELETE_DOC = gql`
  mutation DeleteDoc($workspaceId: String!, $docId: String!) {
    deleteDoc(workspaceId: $workspaceId, docId: $docId) {
      success
    }
  }
`;

// AFFiNE Backend Service Class
export class AffineBackendService {
  constructor(private client: ApolloClient<any> = apolloClient) {}

  /**
   * Get workspace by ID
   */
  async getWorkspace(id: string) {
    try {
      const { data } = await this.client.query({
        query: GET_WORKSPACE,
        variables: { id },
        fetchPolicy: 'network-only',
      });
      return data.workspace;
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
      throw error;
    }
  }

  /**
   * List all workspaces
   */
  async listWorkspaces() {
    try {
      const { data } = await this.client.query({
        query: LIST_WORKSPACES,
        fetchPolicy: 'network-only',
      });
      return data.workspaces || [];
    } catch (error) {
      console.error('Failed to list workspaces:', error);
      return [];
    }
  }

  /**
   * Get document by ID
   */
  async getDoc(workspaceId: string, docId: string) {
    try {
      const { data } = await this.client.query({
        query: GET_DOC,
        variables: { workspaceId, docId },
        fetchPolicy: 'network-only',
      });
      return data.doc;
    } catch (error) {
      console.error('Failed to fetch doc:', error);
      throw error;
    }
  }

  /**
   * List documents in workspace
   */
  async getDocs(workspaceId: string) {
    try {
      const { data } = await this.client.query({
        query: GET_DOCS,
        variables: { workspaceId },
        fetchPolicy: 'network-only',
      });
      return data.workspace?.docs?.edges?.map((e: any) => e.node) || [];
    } catch (error: any) {
      console.error('Failed to list docs:', error);
      console.error('GraphQL Errors:', error.graphQLErrors);
      console.error('Network Error:', error.networkError);
      return [];
    }
  }

  /**
   * Create a new document
   */
  async createDoc(workspaceId: string, docId?: string) {
    try {
      const { data } = await this.client.mutate({
        mutation: CREATE_DOC,
        variables: { workspaceId, docId },
      });
      return data.createDoc;
    } catch (error) {
      console.error('Failed to create doc:', error);
      throw error;
    }
  }

  /**
   * Update document
   */
  async updateDoc(
    workspaceId: string,
    docId: string,
    updates: { title?: string; blocks?: any }
  ) {
    try {
      const { data } = await this.client.mutate({
        mutation: UPDATE_DOC,
        variables: {
          workspaceId,
          docId,
          ...updates,
        },
      });
      return data.updateDoc;
    } catch (error) {
      console.error('Failed to update doc:', error);
      throw error;
    }
  }

  /**
   * Delete document
   */
  async deleteDoc(workspaceId: string, docId: string) {
    try {
      const { data } = await this.client.mutate({
        mutation: DELETE_DOC,
        variables: { workspaceId, docId },
      });
      return data.deleteDoc;
    } catch (error) {
      console.error('Failed to delete doc:', error);
      throw error;
    }
  }

  /**
   * Initialize workspace (create first workspace if none exists)
   */
  async initializeWorkspace() {
    try {
      const workspaces = await this.listWorkspaces();
      if (workspaces.length > 0) {
        return workspaces[0];
      }

      // For AFFiNE self-hosted, you might need to create a workspace
      // through a different mechanism
      console.warn('No workspaces found. Please create one manually.');
      return null;
    } catch (error) {
      console.error('Failed to initialize workspace:', error);
      return null;
    }
  }
}

// Export singleton instance
export const affineBackend = new AffineBackendService();
