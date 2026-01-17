/**
 * GraphQL Queries and Mutations for AI Chat
 * Using AFFiNE Copilot API
 */

// AFFiNE Copilot Mutations
export const COPILOT_MUTATIONS = {
  // Create a new copilot session
  // Returns: String! (session ID, not an object)
  CREATE_SESSION: `
    mutation CreateCopilotSession($options: CreateChatSessionInput!) {
      createCopilotSession(options: $options)
    }
  `,

  // Create a copilot message (chat with AI)
  CREATE_MESSAGE: `
    mutation CreateCopilotMessage($sessionId: String!, $content: String!) {
      createCopilotMessage(sessionId: $sessionId, content: $content) {
        id
        role
        content
        createdAt
      }
    }
  `,

  // Create a copilot prompt (for prompt templates)
  CREATE_PROMPT: `
    mutation CreateCopilotPrompt($input: CreateCopilotPromptInput!) {
      createCopilotPrompt(input: $input) {
        id
        name
        action
        model
        createdAt
      }
    }
  `,

  // Update copilot prompt
  UPDATE_PROMPT: `
    mutation UpdateCopilotPrompt($id: String!, $input: UpdateCopilotPromptInput!) {
      updateCopilotPrompt(id: $id, input: $input) {
        id
        name
        updatedAt
      }
    }
  `,

  // Delete copilot prompt
  DELETE_PROMPT: `
    mutation DeleteCopilotPrompt($id: String!) {
      deleteCopilotPrompt(id: $id) {
        id
        success
      }
    }
  `,
};

// AFFiNE Copilot Queries
export const COPILOT_QUERIES = {
  // List copilot prompts (for prompt templates)
  // Note: This API does NOT accept any parameters
  // Returns: name, action, model, config (no id, description, createdAt, updatedAt)
  LIST_PROMPTS: `
    query ListCopilotPrompts {
      listCopilotPrompts {
        name
        action
        model
      }
    }
  `,

  // Get copilot session
  GET_SESSION: `
    query GetCopilotSession($sessionId: String!) {
      copilotSession(id: $sessionId) {
        id
        workspaceId
        docId
        messages {
          id
          role
          content
          createdAt
        }
        createdAt
      }
    }
  `,
};

// Input Types for TypeScript
export interface CreateChatSessionInput {
  workspaceId: string;
  docId?: string;
  promptName?: string;
  pinned?: boolean;
  reuseLatestChat?: boolean;
}

export interface CreateCopilotPromptInput {
  name: string;
  description?: string;
  action: 'chat' | 'generate' | 'edit';
  model?: string;
  workspaceId: string;
}

export interface UpdateCopilotPromptInput {
  name?: string;
  description?: string;
  action?: string;
  model?: string;
}

export interface CopilotMessageInput {
  sessionId: string;
  content: string;
}

// Legacy mutations for backward compatibility with mock mode
export const AI_MUTATIONS = {
  CREATE_SESSION: `
    mutation CreateChatSession($docId: String) {
      createAIChatSession(docId: $docId) {
        id
        docId
        createdAt
      }
    }
  `,

  SEND_MESSAGE: `
    mutation SendMessage($sessionId: String!, $content: String!) {
      sendAIMessage(sessionId: $sessionId, content: $content) {
        id
        role
        content
        timestamp
      }
    }
  `,

  GENERATE_DOC: `
    mutation GenerateDocument($prompt: String!, $options: GenerateOptions) {
      generateDocument(prompt: $prompt, options: $options) {
        content
        title
      }
    }
  `,

  LOCAL_EDIT: `
    mutation LocalEdit($docId: String!, $selection: SelectionInput!, $instruction: String!) {
      localEdit(docId: $docId, selection: $selection, instruction: $instruction) {
        content
      }
    }
  `,
};

// Legacy queries for backward compatibility
export const AI_QUERIES = {
  GET_SESSION: `
    query GetChatSession($sessionId: String!) {
      chatSession(sessionId: $sessionId) {
        id
        docId
        messages {
          id
          role
          content
          timestamp
        }
        createdAt
      }
    }
  `,

  GET_HISTORY: `
    query GetChatHistory($docId: String!) {
      chatHistory(docId: $docId) {
        id
        role
        content
        timestamp
      }
    }
  `,
};

// Types
export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SelectionInput {
  from: number;
  to: number;
  text: string;
}
