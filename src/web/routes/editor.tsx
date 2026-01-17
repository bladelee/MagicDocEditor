/**
 * Editor Page Component - Simplified without AFFiNE infrastructure
 */

import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { EditorContainer } from '../components/editor-container.js';
import { AIChatPanel } from '../components/ai-chat-panel.js';
import { Navigation } from '../components/navigation.js';
import { useAIChat } from '../hooks/use-ai-chat.js';
import { features } from '../../config/features.js';

export const EditorPage: FC = () => {
  const { workspaceId, pageId } = useParams<{
    workspaceId: string;
    pageId: string;
  }>();

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

  const handleSave = (content: string) => {
    console.log('Saving document:', { pageId, contentLength: content.length });
  };

  const handleEditorReady = (store: any) => {
    console.log('Editor ready:', { store, pageId });
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
        }}
      >
        {/* Editor Section */}
        <div
          style={{
            flex: 1,
            marginRight: features.ai.chat ? '360px' : '0',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '1px solid #e0e0e0',
              background: 'white',
            }}
          >
            <h1 style={{ fontSize: '20px', margin: 0 }}>
              {pageId || 'Untitled Document'}
            </h1>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>
              Workspace: {workspaceId} • Document: {pageId}
            </p>
          </div>

          {/* Editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <EditorContainer
              docId={pageId || ''}
              workspaceId={workspaceId || ''}
              mode="page"
              onSave={handleSave}
              onReady={handleEditorReady}
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
    </div>
  );
};
