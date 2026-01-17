/**
 * AIChatPanel - AI Chat Interface Component with Editor Integration
 *
 * 增强功能：
 * - 支持将 AI 响应插入到编辑器
 * - 支持替换选中的文本
 * - 显示 AI 操作结果预览
 */

import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { AIChatMessage } from '../shared/types/ai.js';

interface AIChatPanelProps {
  docId?: string;
  messages: AIChatMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onNewSession?: () => void;
  error?: Error | null;
}

export const AIChatPanel: FC<AIChatPanelProps> = ({
  docId: _docId,
  messages,
  isLoading,
  onSendMessage,
  onNewSession,
  error,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || isLoading) return;
    onSendMessage(content);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * 将 AI 响应插入到编辑器
   */
  const insertToEditor = (content: string) => {
    // 通过事件通知编辑器
    window.dispatchEvent(
      new CustomEvent('ai-insert-content', {
        detail: { content },
      })
    );
  };

  /**
   * 替换编辑器中选中的内容
   */
  const replaceInEditor = (content: string) => {
    window.dispatchEvent(
      new CustomEvent('ai-replace-selection', {
        detail: { content },
      })
    );
  };

  const quickActions = [
    { label: '📝 总结', prompt: '请总结这个文档的主要要点' },
    { label: '✨ 改进', prompt: '请帮我改进这段文字的写作' },
    { label: '📖 扩展', prompt: '请扩展这个主题，添加更多细节' },
    { label: '🌐 翻译', prompt: '请将这段文字翻译成英文' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '14px' }}>✨ AI 助手</div>
        {onNewSession && (
          <button
            onClick={onNewSession}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              background: 'white',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            新对话
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          background: '#f9f9f9',
        }}
      >
        {quickActions.map(action => (
          <button
            key={action.label}
            onClick={() => onSendMessage(action.prompt)}
            disabled={isLoading}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              background: 'white',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          background: '#fff',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: '#999',
              marginTop: '40px',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
            <p style={{ margin: 0 }}>开始与 AI 对话</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              您可以让我总结、改进或扩展您的文档
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id || index}
              style={{
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {/* Message Header */}
              <div
                style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '4px',
                  padding: '0 4px',
                }}
              >
                {msg.role === 'user' ? '您' : 'AI 助手'}
                {msg.timestamp && (
                  <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Message Content */}
              <div
                style={{
                  maxWidth: '80%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background:
                    msg.role === 'user'
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#f5f5f5',
                  color: msg.role === 'user' ? 'white' : '#333',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>

              {/* AI Actions - 只对 AI 消息显示 */}
              {msg.role === 'assistant' && (
                <div
                  style={{
                    marginTop: '8px',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <button
                    onClick={() => insertToEditor(msg.content)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: 'white',
                      border: '1px solid #667eea',
                      color: '#667eea',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    title="将此内容插入到文档末尾"
                  >
                    + 插入到文档
                  </button>
                  <button
                    onClick={() => replaceInEditor(msg.content)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: 'white',
                      border: '1px solid #d0d0d0',
                      color: '#666',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    title="替换文档中选中的内容"
                  >
                    🔄 替换选中内容
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              background: '#f5f5f5',
              borderRadius: '8px',
            }}
          >
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span style={{ fontSize: '12px', color: '#666' }}>
              AI 正在思考...
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '12px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
              fontSize: '13px',
            }}
          >
            ⚠️ {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid #e0e0e0',
          background: '#fafafa',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-end',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Cmd+Enter 发送)"
            disabled={isLoading}
            style={{
              flex: 1,
              minHeight: '60px',
              maxHeight: '120px',
              padding: '10px',
              border: '1px solid #d0d0d0',
              borderRadius: '6px',
              resize: 'none',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              padding: '10px 16px',
              background:
                !input.trim() || isLoading
                  ? '#ccc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            发送
          </button>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#999',
            marginTop: '8px',
            textAlign: 'center',
          }}
        >
          提示：AI 生成的内容可以点击"插入到文档"添加到编辑器中
        </div>
      </div>

      <style>{`
        .typing-indicator {
          display: flex;
          gap: 4px;
        }
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};
