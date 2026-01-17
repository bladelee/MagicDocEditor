/**
 * Light Editor Page - 使用简化的 AIEditor
 * 轻量级编辑器，适合快速编辑和简单场景
 */

import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AIChatPanel } from '../components/ai-chat-panel.js';
import { Navigation } from '../components/navigation.js';
import { useAIChat } from '../hooks/use-ai-chat.js';
import { AIEditor } from '../components/ai-editor/AIEditor.js';
import { features } from '../../config/features.js';
import type { Document } from '../types/document.js';

export const LightEditorPage: FC = () => {
  const { workspaceId, pageId } = useParams<{
    workspaceId: string;
    pageId: string;
  }>();
  const navigate = useNavigate();

  const {
    messages,
    isLoading: aiLoading,
    error: aiError,
    sendMessage,
    startNewSession,
  } = useAIChat({
    docId: pageId,
    onError: error => {
      console.error('AI chat error:', error);
    },
  });

  const handleSave = (doc: Document) => {
    console.log('Document saved:', doc);
  };

  const handleNewDocument = () => {
    console.log('Creating new document...');
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Navigation */}
      <Navigation workspaceId={workspaceId} onNewDocument={handleNewDocument} />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          marginLeft: '240px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e0e0e0',
            background: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '20px', margin: 0 }}>✨ 轻量级编辑器</h1>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
              简洁快速 • {pageId}
            </p>
          </div>
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/${pageId}`)}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            切换到完整编辑器
          </button>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <AIEditor
            docId={pageId || ''}
            onSave={handleSave}
            showToolbar={true}
          />
        </div>
      </div>

      {/* AI Chat Panel */}
      {features.ai.chat && (
        <div
          style={{
            width: '360px',
            position: 'fixed',
            right: 0,
            top: 0,
            height: '100vh',
            padding: '20px',
            background: '#fafafa',
          }}
        >
          <AIChatPanel
            docId={pageId}
            messages={messages}
            isLoading={aiLoading}
            error={aiError}
            onSendMessage={sendMessage}
            onNewSession={startNewSession}
          />
        </div>
      )}
    </div>
  );
};
