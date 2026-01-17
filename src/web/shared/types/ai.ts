/**
 * AI Chat Type Definitions
 */

export type AIChatRole = 'user' | 'assistant' | 'system';

export interface AIChatMessage {
  id: string;
  role: AIChatRole;
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    finishReason?: string;
  };
}

export interface AIChatSession {
  id: string;
  docId?: string;
  messages: AIChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AIResponse {
  content: string;
  metadata?: {
    model?: string;
    tokens?: number;
    finishReason?: string;
  };
}

export interface AIDocGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIDocGenerationResult {
  content: string;
  title: string;
  metadata?: {
    model?: string;
    tokens?: number;
  };
}

export interface AILocalEditOptions {
  instruction: string;
  selection: {
    from: number;
    to: number;
    text: string;
  };
  mode?: 'replace' | 'insert' | 'append';
}
