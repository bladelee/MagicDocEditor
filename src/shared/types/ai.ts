/**
 * AI-related type definitions
 */
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AIChatSession {
  id: string;
  docId: string;
  messages: AIChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AIProvider {
  name: string;
  models: string[];
  defaultModel: string;
}

export interface AIGenerateRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AILocalEditRequest {
  docId: string;
  selection: {
    from: number;
    to: number;
  };
  instruction: string;
  model?: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
