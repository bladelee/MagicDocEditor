/**
 * useAIChat Hook - Manages AI chat state and operations
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import type { AIChatMessage } from '../shared/types/ai.js';
import { aiService } from '../services/ai.js';

interface UseAIChatOptions {
  docId?: string;
  onMessageReceived?: (message: AIChatMessage) => void;
  onError?: (error: Error) => void;
  autoLoadHistory?: boolean;
}

interface UseAIChatReturn {
  messages: AIChatMessage[];
  isLoading: boolean;
  error: Error | null;
  sessionId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;
  startNewSession: () => Promise<void>;
  generateDoc: (prompt: string) => Promise<void>;
  retryLastMessage: () => void;
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const { docId, onMessageReceived, onError, autoLoadHistory = true } = options;

  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const lastUserMessage = useRef<string>('');
  const sessionInitialized = useRef(false);

  // Auto-load chat history when docId changes
  useEffect(() => {
    if (docId && autoLoadHistory) {
      loadChatHistory();
    }
  }, [docId, autoLoadHistory]);

  const loadChatHistory = useCallback(async () => {
    if (!docId) return;

    try {
      const history = await aiService.getHistory(docId);
      if (history.length > 0) {
        setMessages(history);
        sessionInitialized.current = true;
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [docId]);

  const startNewSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newSessionId = await aiService.createSession(docId);
      setSessionId(newSessionId);
      setMessages([]);
      sessionInitialized.current = true;

      const welcomeMsg: AIChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content:
          "Hello! I'm your AI assistant. I can help you:\n\n• 📝 Summarize documents\n• ✍️ Improve writing\n• 🔄 Rephrase content\n• 📖 Expand ideas\n\nHow can I help you today?",
        timestamp: Date.now(),
      };
      setMessages([welcomeMsg]);
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [docId, onError]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Initialize session if needed
      if (!sessionId && !sessionInitialized.current) {
        await startNewSession();
        // Retry sending after session creation
        setTimeout(() => sendMessage(content), 100);
        return;
      }

      if (!sessionId) {
        setError(new Error('No active session'));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        lastUserMessage.current = content;

        const userMessage: AIChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMessage]);

        const response = await aiService.sendMessage(sessionId, content);

        const assistantMessage: AIChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        onMessageReceived?.(assistantMessage);
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);

        // Remove user message on error
        setMessages(prev => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, startNewSession, onMessageReceived, onError]
  );

  const generateDoc = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      try {
        setIsLoading(true);
        setError(null);

        const result = await aiService.generateDoc(prompt);

        const assistantMessage: AIChatMessage = {
          id: `generated-${Date.now()}`,
          role: 'assistant',
          content: `I've generated a document titled "${result.title}".\n\n${result.content}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        onMessageReceived?.(assistantMessage);
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    },
    [onMessageReceived, onError]
  );

  const retryLastMessage = useCallback(() => {
    if (lastUserMessage.current) {
      sendMessage(lastUserMessage.current);
    }
  }, [sendMessage]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    sessionInitialized.current = false;
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    sendMessage,
    clearHistory,
    startNewSession,
    generateDoc,
    retryLastMessage,
  };
}
