/**
 * EditorContainer - 使用完整的 Blocksuite 编辑器
 */

import type { FC } from 'react';
import { useState, useCallback } from 'react';
import {
  BlocksuiteEditor,
  type BlocksuiteEditorHandle,
} from './blocksuite-editor.js';

interface EditorContainerProps {
  docId: string;
  workspaceId: string;
  mode?: 'page' | 'edgeless';
  content?: string;
  onSave?: (content: string) => void;
  onReady?: (store: unknown | null) => void;
}

export const EditorContainer: FC<EditorContainerProps> = ({
  docId,
  workspaceId,
  mode: _mode = 'page',
  content,
  onSave,
  onReady,
}) => {
  const [editorHandle, setEditorHandle] =
    useState<BlocksuiteEditorHandle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(
    (data: any) => {
      try {
        const savedContent = JSON.stringify(data);
        onSave?.(savedContent);
        console.log('Document saved:', {
          docId,
          contentLength: savedContent.length,
        });
      } catch (err) {
        console.error('Failed to save content:', err);
        setError('Failed to save document');
      }
    },
    [docId, onSave]
  );

  const handleEditorReady = useCallback(
    (handle: BlocksuiteEditorHandle) => {
      setEditorHandle(handle);
      onReady?.(handle);
      console.log('Editor ready:', handle);
    },
    [onReady]
  );

  // AI 操作处理
  const handleAISummarize = useCallback(() => {
    if (!editorHandle) return;
    const doc = editorHandle.getDocument();
    const fullText = doc.blocks.map(b => b.content).join('\n');

    // 触发 AI Chat（通过事件或全局状态）
    window.dispatchEvent(
      new CustomEvent('ai-chat-trigger', {
        detail: {
          action: 'summarize',
          content: fullText,
        },
      })
    );
  }, [editorHandle]);

  const handleAIImprove = useCallback(() => {
    if (!editorHandle) return;
    const doc = editorHandle.getDocument();

    // 触发 AI Chat
    window.dispatchEvent(
      new CustomEvent('ai-chat-trigger', {
        detail: {
          action: 'improve',
          content: doc.blocks.map(b => b.content).join('\n'),
        },
      })
    );
  }, [editorHandle]);

  return (
    <div
      className="editor-container"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* AI 快捷操作栏 */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '14px' }}>✨ AI 助手</span>
        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'rgba(255,255,255,0.3)',
            margin: '0 8px',
          }}
        />
        <button
          onClick={handleAISummarize}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            color: 'white',
          }}
        >
          📝 总结文档
        </button>
        <button
          onClick={handleAIImprove}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            color: 'white',
          }}
        >
          ✨ 改进写作
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fee',
            color: '#c00',
            fontSize: '14px',
            borderBottom: '1px solid #fcc',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Blocksuite 编辑器 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <BlocksuiteEditor
          docId={docId}
          workspaceId={workspaceId}
          content={content}
          onSave={handleSave}
          onReady={handleEditorReady}
        />
      </div>
    </div>
  );
};
