/**
 * AI Service - Handles AI operations via AFFiNE Copilot API
 *
 * Phase 1 Implementation:
 * - Connects to AFFiNE Copilot API for basic chat functionality
 * - Falls back to mock mode if backend is unavailable
 * - Preserves existing API interface for compatibility
 */

import type { AIChatMessage, AIResponse } from '../shared/types/ai.js';
import { apolloClient } from '../lib/apollo-client.js';
import { COPILOT_MUTATIONS, COPILOT_QUERIES } from '../graphql/ai-queries.js';
import { gql } from '@apollo/client';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '';
const USE_MOCK_MODE =
  !GRAPHQL_URL || import.meta.env.VITE_USE_MOCK_API === 'true';

// Mock session storage
let mockSessionId: string | null = null;
let mockMessages: Map<string, AIChatMessage[]> = new Map();

// Cache for failed queries to avoid repeated attempts
let historyQueryFailed = false;

/**
 * Generate mock AI responses based on user input
 */
function generateMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  // Pattern matching for common requests
  if (lowerMessage.includes('总结') || lowerMessage.includes('summarize')) {
    return '📝 **文档总结**\n\n这是一个模拟的总结功能。在实际的 AI 服务中，这里会:\n\n1. 分析文档内容\n2. 提取关键要点\n3. 生成简洁的摘要\n\n当前使用的是 Mock 模式，因为后端服务未连接。';
  }

  if (
    lowerMessage.includes('改进') ||
    lowerMessage.includes('improve') ||
    lowerMessage.includes('优化')
  ) {
    return '✨ **文本改进建议**\n\n以下是改进建议:\n\n1. **结构优化**: 考虑添加更清晰的段落划分\n2. **表达提升**: 使用更具体的词汇和例子\n3. **语法检查**: 确保句子结构完整\n\n(这是 Mock 响应 - 实际 AI 功能需要后端服务)';
  }

  if (
    lowerMessage.includes('扩展') ||
    lowerMessage.includes('expand') ||
    lowerMessage.includes('展开')
  ) {
    return '📖 **内容扩展**\n\n我可以帮助您扩展这个想法:\n\n• 添加更多细节和例子\n• 提供不同的视角\n• 补充背景信息\n• 增加论证支撑\n\n(这是 Mock 响应 - 实际 AI 功能需要后端服务)';
  }

  if (lowerMessage.includes('翻译') || lowerMessage.includes('translate')) {
    return '🌐 **翻译功能**\n\n我可以帮您翻译文本到多种语言。请指定目标语言。\n\n(这是 Mock 响应 - 实际 AI 功能需要后端服务)';
  }

  // Default response
  const responses = [
    `我理解您说的是："${userMessage}"\n\n这是一个模拟的 AI 响应。要使用真实的 AI 功能，请：\n\n1. 设置环境变量 VITE_GRAPHQL_URL 指向您的 GraphQL 后端\n2. 或者设置 VITE_USE_MOCK_API=true 使用 Mock 模式\n\n当前正在使用 Mock 模式进行演示。`,
    `感谢您的提问！关于"${userMessage}"，在实际的 AI 服务中，我会提供更详细和智能的回复。\n\n当前这是一个前端演示版本，展示了 AI 编辑器的基本界面和交互。`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

export const aiService = {
  /**
   * Create a new AI chat session
   * Phase 1: Uses AFFiNE createCopilotSession mutation
   */
  async createSession(docId?: string, workspaceId?: string): Promise<string> {
    if (USE_MOCK_MODE) {
      console.log('🤖 [Mock Mode] Creating AI session for doc:', docId);
      mockSessionId = `mock-session-${docId || 'default'}-${Date.now()}`;
      mockMessages.set(mockSessionId, []);
      return mockSessionId;
    }

    try {
      const response = await apolloClient.mutate({
        mutation: gql(COPILOT_MUTATIONS.CREATE_SESSION),
        variables: {
          options: {
            workspaceId: workspaceId || 'default',
            docId,
          },
        },
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      // API returns String! directly (session ID), not an object
      return response.data.createCopilotSession;
    } catch (error) {
      console.error('Failed to create AI session:', error);
      // Fallback to mock mode
      console.warn('⚠️ Falling back to mock mode');
      mockSessionId = `fallback-session-${docId || 'default'}-${Date.now()}`;
      mockMessages.set(mockSessionId, []);
      return mockSessionId;
    }
  },

  /**
   * Send a message to AI and get response
   * Phase 1: Uses AFFiNE createCopilotMessage mutation
   */
  async sendMessage(sessionId: string, content: string): Promise<AIResponse> {
    if (
      USE_MOCK_MODE ||
      sessionId.startsWith('mock-session') ||
      sessionId.startsWith('fallback-session')
    ) {
      console.log('🤖 [Mock Mode] Sending message:', content);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      const responseContent = generateMockResponse(content);

      // Store messages in mock storage
      if (mockMessages.has(sessionId)) {
        const messages = mockMessages.get(sessionId)!;
        messages.push({
          id: `msg-user-${Date.now()}`,
          role: 'user',
          content,
          timestamp: Date.now(),
        });
        messages.push({
          id: `msg-ai-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: Date.now(),
        });
      }

      return { content: responseContent };
    }

    try {
      const response = await apolloClient.mutate({
        mutation: gql(COPILOT_MUTATIONS.CREATE_MESSAGE),
        variables: {
          sessionId,
          content,
        },
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return {
        content: response.data.createCopilotMessage.content,
      };
    } catch (error) {
      console.error('Failed to send AI message:', error);
      // Fallback: return a mock response
      const responseContent = generateMockResponse(content);
      return { content: responseContent };
    }
  },

  /**
   * Generate a document from a prompt
   * Phase 1: Basic implementation, may need AFFiNE API integration
   */
  async generateDoc(
    prompt: string,
    options: { model?: string; temperature?: number } = {}
  ): Promise<{ content: string; title: string }> {
    if (USE_MOCK_MODE) {
      console.log('🤖 [Mock Mode] Generating document from prompt:', prompt);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      return {
        title: prompt.split('\n')[0].substring(0, 50) || 'Generated Document',
        content: `# ${prompt}\n\n## Introduction\n\nThis is a generated document based on your prompt.\n\n## Main Content\n\n\n## Conclusion\n\n\n*Generated with Mock AI - Connect to a real backend for actual AI generation*`,
      };
    }

    // Phase 1: Use mock as we don't have confirmed AFFiNE API for this
    // TODO: Verify if AFFiNE has a generateDoc mutation
    return {
      title: prompt.split('\n')[0].substring(0, 50) || 'Generated Document',
      content: `# ${prompt}\n\n## Introduction\n\nThis is a generated document based on your prompt.\n\n## Main Content\n\n\n## Conclusion\n\n\n*Note: Full AI generation requires backend API confirmation*`,
    };
  },

  /**
   * Perform local edit on selected text
   * Phase 1: Not implementing as backend API support is unconfirmed
   */
  async localEdit(
    docId: string,
    selection: { from: number; to: number; text: string },
    instruction: string
  ): Promise<{ content: string }> {
    // Phase 1: Return mock response as AFFiNE API support is unconfirmed
    console.log('🤖 [Mock Mode] Local edit:', instruction);
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      content: `[AI Edited: ${instruction}]\n\n${selection.text}`,
    };
  },

  /**
   * Get chat history for a document
   * Note: Falls back to mock mode if query fails (400 error means field doesn't exist)
   */
  async getHistory(docId: string): Promise<AIChatMessage[]> {
    if (USE_MOCK_MODE) {
      console.log('🤖 [Mock Mode] Getting chat history for:', docId);
      // Return messages from mock storage
      if (mockSessionId && mockMessages.has(mockSessionId)) {
        return mockMessages.get(mockSessionId)!;
      }
      return [];
    }

    // Skip query if we already know it's not supported
    if (historyQueryFailed) {
      // Return mock data silently
      if (mockSessionId && mockMessages.has(mockSessionId)) {
        return mockMessages.get(mockSessionId)!;
      }
      return [];
    }

    try {
      const response = await apolloClient.query({
        query: gql(COPILOT_QUERIES.GET_SESSION),
        variables: {
          sessionId: docId, // Using docId as sessionId for now
        },
        fetchPolicy: 'network-only',
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data.copilotSession?.messages || [];
    } catch (error: any) {
      // If 400 error, the copilotSession field doesn't exist in schema
      // Mark as failed and use mock mode
      if (
        error?.message?.includes('400') ||
        error?.message?.includes('Cannot query field') ||
        error?.networkError
      ) {
        if (!historyQueryFailed) {
          console.warn(
            '⚠️ copilotSession query not supported by backend, using mock mode for future requests'
          );
          historyQueryFailed = true;
        }
        if (mockSessionId && mockMessages.has(mockSessionId)) {
          return mockMessages.get(mockSessionId)!;
        }
      }
      return [];
    }
  },

  /**
   * List copilot prompts (for prompt templates)
   * Phase 1: Uses AFFiNE listCopilotPrompts query
   * Note: This API does NOT accept any parameters
   */
  async listPrompts(_workspaceId?: string): Promise<any[]> {
    if (USE_MOCK_MODE) {
      console.log('🤖 [Mock Mode] Listing prompts');
      // Return mock prompts
      return [
        {
          name: 'Chat With AFFiNE AI',
          action: 'chat',
          model: 'gemini-2.0-flash-exp',
        },
        {
          name: 'Brainstorm ideas about this',
          action: 'chat',
          model: 'gemini-2.0-flash-exp',
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

      return response.data.listCopilotPrompts || [];
    } catch (error) {
      console.error('Failed to list prompts:', error);
      return [];
    }
  },

  /**
   * Check if using mock mode
   */
  isMockMode(): boolean {
    return USE_MOCK_MODE;
  },
};
