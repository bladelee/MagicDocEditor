/**
 * Prompt Template Service
 * Phase 1 Implementation: Uses AFFiNE Copilot Prompt API
 */

import { apolloClient } from '../lib/apollo-client.js';
import { COPILOT_MUTATIONS, COPILOT_QUERIES } from '../graphql/ai-queries.js';
import { gql } from '@apollo/client';

// Cache for prompts to avoid repeated failed queries
let promptsCache: PromptTemplate[] | null = null;
let listQueryFailed = false;

// Types
// Note: Based on actual AFFiNE API testing, CopilotPromptType only has:
// - name: string
// - action: string
// - model: string
// - config: any (contains additional settings)
export interface PromptTemplate {
  name: string;
  action: 'chat' | 'generate' | 'edit';
  model?: string;
  config?: any;
  // Deprecated fields (kept for backward compatibility but not used)
  id?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptVariable {
  name: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'TEXTAREA';
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
  options?: string[];
}

export interface UseTemplateResult {
  content: string;
  docId?: string;
  tokensUsed?: number;
}

/**
 * Prompt Template Service
 * Phase 1: Uses AFFiNE listCopilotPrompts, createCopilotPrompt, updateCopilotPrompt
 */
export const promptTemplateService = {
  /**
   * List all prompt templates
   * Phase 1: Uses AFFiNE listCopilotPrompts
   * Note: This API does NOT accept any parameters
   */
  async listPrompts(_workspaceId?: string): Promise<any[]> {
    // Return cached prompts if available
    if (promptsCache) {
      return promptsCache;
    }

    // If query already failed, return mock data
    if (listQueryFailed) {
      return [
        {
          name: 'Chat With AFFiNE AI',
          action: 'chat',
          model: 'gemini-2.0-flash-exp',
          config: {},
        },
        {
          name: 'Brainstorm ideas about this',
          action: 'chat',
          model: 'gemini-2.0-flash-exp',
          config: {},
        },
      ];
    }

    try {
      const response = await apolloClient.query({
        query: gql(COPILOT_QUERIES.LIST_PROMPTS),
        variables: {}, // No parameters accepted
        fetchPolicy: 'network-only',
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      const prompts = response.data.listCopilotPrompts || [];
      promptsCache = prompts;
      return prompts;
    } catch (error: any) {
      console.error('Failed to list prompts:', error);
      // Mark query as failed and return mock data
      if (!listQueryFailed) {
        console.warn(
          '⚠️ listCopilotPrompts query not supported, using mock data'
        );
        listQueryFailed = true;
      }
      return [
        {
          name: 'Chat With AFFiNE AI',
          action: 'chat',
          model: 'gemini-2.0-flash-exp',
          config: {},
        },
        {
          name: 'Brainstorm ideas about this',
          action: 'chat',
          model: 'gemini-2.0-flash-exp',
          config: {},
        },
      ];
    }
  },

  /**
   * Get a single prompt template by ID
   * Phase 1: Uses AFFiNE query (to be verified)
   */
  async getPrompt(id: string): Promise<PromptTemplate | null> {
    try {
      const response = await apolloClient.query({
        query: gql`
          query GetCopilotPrompt($id: ID!) {
            copilotPrompt(id: $id) {
              id
              name
              description
              action
              model
              createdAt
              updatedAt
            }
          }
        `,
        variables: { id },
        fetchPolicy: 'network-only',
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data.copilotPrompt;
    } catch (error) {
      console.error('Failed to get prompt:', error);
      return null;
    }
  },

  /**
   * Create a new prompt template
   * Phase 1: Uses AFFiNE createCopilotPrompt
   */
  async createPrompt(input: {
    name: string;
    description?: string;
    action: 'chat' | 'generate' | 'edit';
    model?: string;
    workspaceId: string;
  }): Promise<PromptTemplate | null> {
    try {
      const response = await apolloClient.mutate({
        mutation: gql(COPILOT_MUTATIONS.CREATE_PROMPT),
        variables: { input },
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data.createCopilotPrompt;
    } catch (error) {
      console.error('Failed to create prompt:', error);
      return null;
    }
  },

  /**
   * Update a prompt template
   * Phase 1: Uses AFFiNE updateCopilotPrompt
   */
  async updatePrompt(
    id: string,
    input: {
      name?: string;
      description?: string;
      action?: string;
      model?: string;
    }
  ): Promise<PromptTemplate | null> {
    try {
      const response = await apolloClient.mutate({
        mutation: gql(COPILOT_MUTATIONS.UPDATE_PROMPT),
        variables: { id, input },
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data.updateCopilotPrompt;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      return null;
    }
  },

  /**
   * Delete a prompt template
   * Phase 1: Uses AFFiNE deleteCopilotPrompt
   */
  async deletePrompt(id: string): Promise<boolean> {
    try {
      const response = await apolloClient.mutate({
        mutation: gql(COPILOT_MUTATIONS.DELETE_PROMPT),
        variables: { id },
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data.deleteCopilotPrompt?.success !== false;
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      return false;
    }
  },

  /**
   * Use a prompt template to generate content
   * Phase 1: Creates a copilot session and sends the prompt as a message
   * Note: AFFiNE prompts are identified by name, not ID
   */
  async useTemplate(
    workspaceId: string,
    promptName: string,
    values: Record<string, any>
  ): Promise<UseTemplateResult> {
    try {
      // 1. Get the prompt template by name from the list
      const prompts = await this.listPrompts();
      const prompt = prompts.find((p: any) => p.name === promptName);

      if (!prompt) {
        throw new Error(`Prompt template "${promptName}" not found`);
      }

      // 2. Create a copilot session with the prompt name
      const sessionResponse = await apolloClient.mutate({
        mutation: gql(COPILOT_MUTATIONS.CREATE_SESSION),
        variables: {
          options: {
            workspaceId,
            docId: null, // No document associated
            promptName, // Pass the prompt name to use the template
          },
        },
      });

      if (sessionResponse.errors) {
        throw new Error(sessionResponse.errors[0].message);
      }

      // API returns String! directly (session ID), not an object
      const sessionId = sessionResponse.data.createCopilotSession;

      // 3. Build the message content from template and values
      const message = this.buildMessageFromTemplate(prompt, values);

      // 4. Send the message to get AI response
      const messageResponse = await apolloClient.mutate({
        mutation: gql(COPILOT_MUTATIONS.CREATE_MESSAGE),
        variables: {
          sessionId,
          content: message,
        },
      });

      if (messageResponse.errors) {
        throw new Error(messageResponse.errors[0].message);
      }

      return {
        content: messageResponse.data.createCopilotMessage.content,
        docId: sessionId, // Using sessionId as reference
      };
    } catch (error) {
      console.error('Failed to use template:', error);
      throw error;
    }
  },

  /**
   * Build message content from template and values
   * Phase 1: Simple variable substitution
   */
  buildMessageFromTemplate(
    prompt: PromptTemplate,
    values: Record<string, any>
  ): string {
    // Phase 1: Simple implementation
    // In a full implementation, this would:
    // 1. Parse the template's message content
    // 2. Replace {{variable}} placeholders with actual values
    // 3. Handle different variable types (text, number, date, etc.)

    let message = `使用模板：${prompt.name}\n\n`;

    // Add all values to the message
    for (const [key, value] of Object.entries(values)) {
      if (value) {
        message += `${key}: ${value}\n`;
      }
    }

    message += `\n请根据以上信息生成内容。`;

    return message;
  },
};
