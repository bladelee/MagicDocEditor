# AI Chat 生成完整文档前端设计文档

**功能模块**: AI Chat 功能 (US-003)
**版本**: 1.0.0
**最后更新**: 2025-01-16

---

## 📋 目录

1. [功能需求](#功能需求)
2. [当前实现状态](#当前实现状态)
3. [缺失功能设计](#缺失功能设计)
4. [技术实现方案](#技术实现方案)
5. [WebSocket流式输出](#websocket流式输出)
6. [性能优化](#性能优化)

---

## 功能需求

### US-003: AI Chat生成完整文档

**验收准则**:

1. ✅ 编辑器侧边栏提供「AI Chat面板」，支持输入自然语言指令
2. ✅ AI响应首字符时间≤3秒
3. ❌ **流式实时输出内容，逐段渲染至文档**
4. ❌ **生成过程中支持「取消生成」**
5. ⚠️ 生成内容自动继承文档基础格式
6. ❌ **支持选择AI模型（OpenAI GPT-3.5/4o、Gemini Pro）**
7. ❌ **生成记录计入AI使用配额，消耗Token数实时统计**

---

## 当前实现状态

### ✅ 已实现

| 功能         | 实现位置            | 状态                   |
| ------------ | ------------------- | ---------------------- |
| 聊天界面     | `ai-chat-panel.tsx` | 完整的UI和交互         |
| 消息展示     | `ai-chat-panel.tsx` | 用户消息和AI响应       |
| 快捷操作按钮 | `ai-chat-panel.tsx` | 总结、改进、扩展、翻译 |
| 编辑器集成   | `ai-chat-panel.tsx` | 插入、替换功能         |
| 键盘快捷键   | `ai-chat-panel.tsx` | Cmd/Ctrl+Enter 发送    |
| 打字动画     | `ai-chat-panel.tsx` | 模拟AI响应             |

### ❌ 缺失功能

| 功能                  | 优先级 | 影响范围         |
| --------------------- | ------ | ---------------- |
| **WebSocket流式输出** | 🔴 高  | 用户体验和实时性 |
| **取消生成功能**      | 🔴 高  | 用户控制能力     |
| **模型选择**          | 🟡 中  | 成本和质量控制   |
| **Token配额统计**     | 🟡 中  | 使用量监控       |
| **对话历史持久化**    | 🟡 中  | 上下文保持       |
| **多轮对话上下文**    | 🟡 中  | 对话连贯性       |

---

## 缺失功能设计

### 1. WebSocket 流式输出

#### 设计方案

**WebSocket 客户端**:

```typescript
// src/web/lib/websocket-client.ts

import { createClient, Client } from 'graphql-ws';

export class AICodecWebSocketClient {
  private client: Client;
  private activeController: AbortController | null = null;

  constructor(url: string, authToken: string) {
    this.client = createClient({
      url: url,

      connectionParams: async () => ({
        Authorization: `Bearer ${authToken}`,
      }),

      on: {
        connected: () => console.log('WebSocket connected'),
        error: err => console.error('WebSocket error:', err),
        disconnected: () => console.log('WebSocket disconnected'),
      },
    });
  }

  /**
   * 流式生成文档
   * @param prompt 用户提示词
   * @param onChunk 接收文本块的回调
   * @param onComplete 完成回调
   * @param onError 错误回调
   * @returns 取消函数
   */
  streamGenerateDoc(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
    callbacks: {
      onChunk: (chunk: string) => void;
      onComplete: (fullContent: string) => void;
      onError: (error: Error) => void;
    }
  ): () => void {
    // 创建新的 AbortController 用于取消
    this.activeController = new AbortController();

    // 订阅流式响应
    const subscription = this.client.subscribe(
      {
        query: `
          subscription StreamGenerateDoc($prompt: String!, $model: String, $temperature: Float, $maxTokens: Int) {
            streamGenerateDoc(
              prompt: $prompt
              model: $model
              temperature: $temperature
              maxTokens: $maxTokens
            ) {
              chunk
              isComplete
              error
              tokensUsed
            }
          }
        `,
        variables: {
          prompt,
          model: options.model || 'gpt-3.5-turbo',
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 2000,
        },
      },
      {
        next: data => {
          const { chunk, isComplete, error, tokensUsed } = data.data.streamGenerateDoc;

          if (error) {
            callbacks.onError(new Error(error));
            return;
          }

          if (isComplete) {
            callbacks.onComplete(chunk);
            return;
          }

          // 实时接收文本块
          callbacks.onChunk(chunk);
        },
        error: err => {
          callbacks.onError(err);
        },
        complete: () => {
          // 订阅完成
        },
      }
    );

    // 返回取消函数
    return () => {
      subscription.unsubscribe();
      this.activeController = null;
    };
  }

  /**
   * 取消当前生成
   */
  cancelGeneration() {
    if (this.activeController) {
      this.activeController.abort();
      this.activeController = null;
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.client.dispose();
  }
}
```

**AI Chat Hook（集成流式输出）**:

```typescript
// src/web/hooks/use-ai-chat-stream.ts

interface UseAIChatStreamOptions {
  docId: string;
  onError?: (error: Error) => void;
  onTokenUpdate?: (tokens: number) => void;
}

export const useAIChatStream = (options: UseAIChatStreamOptions) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [tokensUsed, setTokensUsed] = useState(0);
  const [model, setModel] = useState('gpt-3.5-turbo');

  const wsClient = useRef<AICodecWebSocketClient | null>(null);
  const cancelGenerationRef = useRef<(() => void) | null>(null);

  // 初始化 WebSocket 客户端
  useEffect(() => {
    const authToken = getAuthToken();
    wsClient.current = new AICodecWebSocketClient(import.meta.env.VITE_WS_URL, authToken);

    return () => {
      wsClient.current?.disconnect();
    };
  }, []);

  // 发送消息并流式生成
  const generate = useCallback(
    async (prompt: string) => {
      if (!wsClient.current || isGenerating) return;

      setIsGenerating(true);
      setGeneratedContent('');
      setTokensUsed(0);

      // 添加用户消息
      const userMessage: AIMessage = {
        id: generateId(),
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMessage]);

      // 添加AI消息占位符
      const aiMessage: AIMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);

      try {
        // 开始流式生成
        cancelGenerationRef.current = wsClient.current.streamGenerateDoc(
          prompt,
          { model },
          {
            onChunk: chunk => {
              // 实时更新生成的内容
              setGeneratedContent(prev => prev + chunk);

              // 更新AI消息
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.role === 'assistant') {
                  return [...prev.slice(0, -1), { ...lastMessage, content: lastMessage.content + chunk }];
                }
                return prev;
              });
            },
            onComplete: fullContent => {
              setIsGenerating(false);
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.role === 'assistant') {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMessage,
                      content: fullContent,
                      complete: true,
                    },
                  ];
                }
                return prev;
              });
            },
            onError: error => {
              setIsGenerating(false);
              options.onError?.(error);
            },
          }
        );
      } catch (error) {
        setIsGenerating(false);
        options.onError?.(error as Error);
      }
    },
    [isGenerating, model, options]
  );

  // 取消生成
  const cancel = useCallback(() => {
    if (cancelGenerationRef.current) {
      cancelGenerationRef.current();
      cancelGenerationRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  // 选择模型
  const selectModel = useCallback((modelName: string) => {
    setModel(modelName);
  }, []);

  return {
    messages,
    isGenerating,
    generatedContent,
    tokensUsed,
    model,
    generate,
    cancel,
    selectModel,
  };
};
```

**AI Chat 面板组件（更新）**:

```typescript
// src/web/components/ai-chat-panel.tsx (更新版)

interface AIChatPanelProps {
  onInsertToEditor: (content: string) => void;
  onReplaceSelection: (content: string) => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  onInsertToEditor,
  onReplaceSelection,
}) => {
  const {
    messages,
    isGenerating,
    generatedContent,
    tokensUsed,
    model,
    generate,
    cancel,
    selectModel,
  } = useAIChatStream({
    docId: currentDocId,
    onTokenUpdate: (tokens) => {
      console.log('Tokens used:', tokens);
    },
    onError: (error) => {
      toast.error(`AI 生成失败: ${error.message}`);
    },
  });

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generatedContent]);

  const handleSend = () => {
    if (!inputValue.trim() || isGenerating) return;
    generate(inputValue);
    setInputValue('');
  };

  return (
    <div className="ai-chat-panel">
      {/* 模型选择器 */}
      <div className="chat-header">
        <ModelSelector
          currentModel={model}
          onSelectModel={selectModel}
          disabled={isGenerating}
        />
        <TokenCounter tokens={tokensUsed} />
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
          />
        ))}

        {/* 流式输出动画 */}
        {isGenerating && generatedContent && (
          <ChatMessage
            message={{
              id: 'streaming',
              role: 'assistant',
              content: generatedContent,
              streaming: true,
            }}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作 */}
      {!isGenerating && (
        <QuickActions
          onAction={(prompt) => {
            setInputValue(prompt);
            generate(prompt);
          }}
        />
      )}

      {/* 输入框 */}
      <div className="chat-input-area">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入指令，如：写一篇关于AI的文章..."
          disabled={isGenerating}
          rows={3}
        />

        {/* 取消/发送按钮 */}
        <div className="chat-actions">
          {isGenerating ? (
            <Button
              onClick={cancel}
              variant="destructive"
              icon="stop"
            >
              停止生成
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              icon="send"
            >
              生成 (Ctrl+Enter)
            </Button>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="chat-operations">
        <Button
          onClick={() => onInsertToEditor(generatedContent)}
          disabled={!generatedContent}
          variant="secondary"
        >
          插入到文档
        </Button>
        <Button
          onClick={() => onReplaceSelection(generatedContent)}
          disabled={!generatedContent}
          variant="secondary"
        >
          替换选中内容
        </Button>
      </div>
    </div>
  );
};
```

### 2. 模型选择功能

#### 设计方案

**模型配置**:

```typescript
// src/config/ai-models.ts

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  version: string;
  contextWindow: number; // 上下文窗口大小
  maxTokens: number; // 最大输出token数
  pricePer1kTokens: {
    input: number;
    output: number;
  };
  features: string[]; // 支持的功能
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    version: '0613',
    contextWindow: 16384,
    maxTokens: 4096,
    pricePer1kTokens: { input: 0.0005, output: 0.0015 },
    features: ['chat', 'completion', 'streaming'],
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    version: '2024-05-13',
    contextWindow: 128000,
    maxTokens: 4096,
    pricePer1kTokens: { input: 0.005, output: 0.015 },
    features: ['chat', 'completion', 'streaming', 'vision'],
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'gemini',
    version: '1.5',
    contextWindow: 1000000,
    maxTokens: 8192,
    pricePer1kTokens: { input: 0.00025, output: 0.0005 },
    features: ['chat', 'completion', 'streaming', 'vision'],
  },
];
```

**模型选择器组件**:

```typescript
// src/web/components/model-selector.tsx

interface ModelSelectorProps {
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  onSelectModel,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentModelData = AVAILABLE_MODELS.find(m => m.id === currentModel);

  return (
    <div className="model-selector">
      <button
        className="model-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <ModelIcon provider={currentModelData?.provider} />
        <span>{currentModelData?.name || '选择模型'}</span>
        <ChevronIcon open={isOpen} />
      </button>

      {isOpen && (
        <div className="model-dropdown">
          {AVAILABLE_MODELS.map((model) => (
            <div
              key={model.id}
              className={`model-option ${model.id === currentModel ? 'active' : ''}`}
              onClick={() => {
                onSelectModel(model.id);
                setIsOpen(false);
              }}
            >
              <div className="model-info">
                <div className="model-name">{model.name}</div>
                <div className="model-meta">
                  <span>{model.provider}</span>
                  <span>•</span>
                  <span>{(model.contextWindow / 1000).toFixed(0)}K 上下文</span>
                </div>
              </div>
              <div className="model-pricing">
                ${model.pricePer1kTokens.input.toFixed(4)}/1K tokens
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 3. Token 配额统计

#### 设计方案

**Token 统计服务**:

```typescript
// src/web/services/token-usage.ts

interface TokenUsageRecord {
  id: string;
  docId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: number;
}

export class TokenUsageService {
  private usage: TokenUsageRecord[] = [];
  private readonly STORAGE_KEY = 'ai_token_usage';

  constructor() {
    this.loadFromStorage();
  }

  // 记录Token使用
  recordUsage(docId: string, model: string, promptTokens: number, completionTokens: number): number {
    const modelData = AVAILABLE_MODELS.find(m => m.id === model);
    if (!modelData) return 0;

    const cost = (promptTokens / 1000) * modelData.pricePer1kTokens.input + (completionTokens / 1000) * modelData.pricePer1kTokens.output;

    const record: TokenUsageRecord = {
      id: generateId(),
      docId,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
      timestamp: Date.now(),
    };

    this.usage.push(record);
    this.saveToStorage();

    return cost;
  }

  // 获取总使用量
  getTotalUsage(
    startDate?: Date,
    endDate?: Date
  ): {
    tokens: number;
    cost: number;
    requests: number;
  } {
    let filteredUsage = this.usage;

    if (startDate || endDate) {
      filteredUsage = this.usage.filter(record => {
        const timestamp = new Date(record.timestamp);
        if (startDate && timestamp < startDate) return false;
        if (endDate && timestamp > endDate) return false;
        return true;
      });
    }

    return {
      tokens: filteredUsage.reduce((sum, r) => sum + r.totalTokens, 0),
      cost: filteredUsage.reduce((sum, r) => sum + r.cost, 0),
      requests: filteredUsage.length,
    };
  }

  // 获取文档使用量
  getDocUsage(docId: string): {
    tokens: number;
    cost: number;
  } {
    const docRecords = this.usage.filter(r => r.docId === docId);
    return {
      tokens: docRecords.reduce((sum, r) => sum + r.totalTokens, 0),
      cost: docRecords.reduce((sum, r) => sum + r.cost, 0),
    };
  }

  private saveToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.usage));
  }

  private loadFromStorage() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      this.usage = JSON.parse(data);
    }
  }
}

export const tokenUsageService = new TokenUsageService();
```

**Token 计数器组件**:

```typescript
// src/web/components/token-counter.tsx

interface TokenCounterProps {
  tokens: number;
  model?: string;
}

export const TokenCounter: React.FC<TokenCounterProps> = ({ tokens, model }) => {
  const [cost, setCost] = useState(0);

  useEffect(() => {
    const modelData = AVAILABLE_MODELS.find(m => m.id === model);
    if (modelData) {
      // 假设都是output tokens（简化）
      const calculatedCost = (tokens / 1000) * modelData.pricePer1kTokens.output;
      setCost(calculatedCost);
    }
  }, [tokens, model]);

  return (
    <div className="token-counter" title="已使用Token数">
      <SparkleIcon />
      <span>{tokens.toLocaleString()}</span>
      <span className="cost">(${cost.toFixed(4)} USD)</span>
    </div>
  );
};
```

### 4. 对话历史持久化

#### 设计方案

**会话管理器**:

```typescript
// src/web/services/chat-session.ts

export interface ChatSession {
  id: string;
  docId: string;
  title: string; // 从第一条消息提取
  messages: AIMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export class ChatSessionManager {
  private sessions: ChatSession[] = [];
  private currentSessionId: string | null = null;
  private readonly STORAGE_KEY = 'ai_chat_sessions';

  constructor() {
    this.loadFromStorage();
  }

  // 创建新会话
  createSession(docId: string): ChatSession {
    const session: ChatSession = {
      id: generateId(),
      docId,
      title: '新对话',
      messages: [],
      model: 'gpt-3.5-turbo',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.push(session);
    this.currentSessionId = session.id;
    this.saveToStorage();

    return session;
  }

  // 添加消息到当前会话
  addMessage(message: AIMessage) {
    const session = this.getCurrentSession();
    if (!session) return;

    session.messages.push(message);
    session.updatedAt = Date.now();

    // 更新标题（使用第一条用户消息）
    if (session.messages.length === 1 && message.role === 'user') {
      session.title = message.content.slice(0, 30);
    }

    this.saveToStorage();
  }

  // 获取当前会话
  getCurrentSession(): ChatSession | null {
    if (!this.currentSessionId) return null;
    return this.sessions.find(s => s.id === this.currentSessionId) || null;
  }

  // 获取文档的所有会话
  getDocSessions(docId: string): ChatSession[] {
    return this.sessions.filter(s => s.docId === docId);
  }

  // 切换会话
  switchSession(sessionId: string) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      this.currentSessionId = sessionId;
      return session;
    }
    return null;
  }

  // 删除会话
  deleteSession(sessionId: string) {
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
    this.saveToStorage();
  }

  // 重命名会话
  renameSession(sessionId: string, title: string) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (session) {
      session.title = title;
      this.saveToStorage();
    }
  }

  private saveToStorage() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.sessions));
  }

  private loadFromStorage() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      this.sessions = JSON.parse(data);
    }
  }
}

export const chatSessionManager = new ChatSessionManager();
```

**会话历史面板**:

```typescript
// src/web/components/chat-history-panel.tsx

export const ChatHistoryPanel: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const currentDocId = useCurrentDocId();

  useEffect(() => {
    const docSessions = chatSessionManager.getDocSessions(currentDocId);
    setSessions(docSessions.sort((a, b) => b.updatedAt - a.updatedAt));
  }, [currentDocId]);

  const handleSwitchSession = (sessionId: string) => {
    chatSessionManager.switchSession(sessionId);
    // 重新加载消息
    window.location.reload();  // 简化处理
  };

  const handleDeleteSession = (sessionId: string) => {
    if (confirm('确定要删除这个对话吗？')) {
      chatSessionManager.deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
    }
  };

  return (
    <div className="chat-history-panel">
      <button
        className="history-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <HistoryIcon />
        <span>对话历史</span>
      </button>

      {isOpen && (
        <div className="history-list">
          <div className="history-header">
            <h3>历史对话</h3>
            <button onClick={() => chatSessionManager.createSession(currentDocId)}>
              + 新建对话
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="empty-state">暂无历史对话</div>
          ) : (
            <div className="sessions">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="session-item"
                  onClick={() => handleSwitchSession(session.id)}
                >
                  <div className="session-title">{session.title}</div>
                  <div className="session-meta">
                    {formatDate(session.updatedAt)}
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 技术实现方案

### 组件架构

```
AIChatPanel (主容器)
├── ChatHeader (头部)
│   ├── ModelSelector (模型选择)
│   └── TokenCounter (Token计数)
├── ChatMessages (消息列表)
│   ├── ChatMessage (单条消息)
│   └── StreamingIndicator (流式输出动画)
├── QuickActions (快捷操作)
├── ChatInputArea (输入区域)
│   ├── TextArea (输入框)
│   └── ActionButtons (发送/取消按钮)
└── ChatOperations (操作按钮)
    ├── InsertToEditor (插入到文档)
    └── ReplaceSelection (替换选中)
```

### Hook 集成

```typescript
// 主Hook集成
export const useAIChat = () => {
  const stream = useAIChatStream({ ... });
  const session = useChatSession({ ... });
  const quota = useTokenQuota({ ... });

  return {
    // 流式输出
    ...stream,

    // 会话管理
    sessions: session.sessions,
    currentSession: session.currentSession,
    createSession: session.createSession,
    switchSession: session.switchSession,

    // 配额
    totalTokens: quota.totalTokens,
    totalCost: quota.totalCost,
    remainingQuota: quota.remaining,
  };
};
```

---

## WebSocket流式输出

### 连接管理

```typescript
// 断线重连策略
class WebSocketManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1秒

  async connectWithRetry(url: string) {
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.connect(url);
        return; // 连接成功
      } catch (error) {
        this.reconnectAttempts++;
        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts));
      }
    }
    throw new Error('WebSocket连接失败');
  }
}
```

### 错误处理

```typescript
// 流式输出错误处理
const handleStreamError = (error: Error) => {
  if (error.message.includes('NetworkError')) {
    toast.error('网络连接中断，请检查网络');
    // 降级到非流式模式
    fallbackToNonStreaming();
  } else if (error.message.includes('rate_limit')) {
    toast.error('API速率限制，请稍后再试');
  } else {
    toast.error(`AI生成失败: ${error.message}`);
  }
};
```

---

## 性能优化

### 消息虚拟滚动

```typescript
// 大量消息时的性能优化
import { useVirtualizer } from '@tanstack/react-virtual';

export const VirtualizedChatMessages: React.FC<{ messages: AIMessage[] }> = ({
  messages,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 估计每条消息高度
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="chat-messages-container">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualMessage) => (
          <div
            key={virtualMessage.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualMessage.size}px`,
              transform: `translateY(${virtualMessage.start}px)`,
            }}
          >
            <ChatMessage message={messages[virtualMessage.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 防抖和节流

```typescript
// Token更新防抖（避免频繁更新UI）
const debouncedTokenUpdate = debounce((tokens: number) => {
  updateTokenDisplay(tokens);
}, 1000); // 1秒内只更新一次
```

---

## 实现优先级

### Phase 1: 核心功能（必须实现）

- [ ] WebSocket 流式输出
- [ ] 取消生成功能
- [ ] Token 配额统计

### Phase 2: 增强功能（重要）

- [ ] 模型选择
- [ ] 对话历史持久化
- [ ] 多轮对话上下文

### Phase 3: 优化功能（可选）

- [ ] 消息虚拟滚动
- [ ] 离线缓存
- [ ] 语音输入

---

**文档版本**: 1.0
**最后更新**: 2025-01-16
**预计工时**: Phase 1 (4-5天), Phase 2 (3-4天), Phase 3 (2-3天)
