/**
 * Test App - Full routing with AI Service
 */
import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import { LoadingScreen } from './components/loading-screen.js';
import { WorkspacePage } from './routes/workspace.js';
import { EditorPage } from './routes/editor.js';
import { LightEditorPage } from './routes/light-editor.js';
import { AllPagesPage } from './routes/all-pages.js';
import { TrashPage } from './routes/trash.js';
import { SettingsPage } from './routes/settings.js';
import { PromptTemplatesPage } from './routes/prompt-templates.js';
import { DatabaseViewPage } from './routes/database-view.js';
import { BackendTestPage } from './routes/backend-test.js';

export function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* All routes WITHOUT AuthGuard for now */}
        <Route path="/backend-test" element={<BackendTestPage />} />
        <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
        {/* Specific routes must come before generic :pageId route */}
        <Route path="/workspace/:workspaceId/all" element={<AllPagesPage />} />
        <Route
          path="/workspace/:workspaceId/light/:pageId"
          element={<LightEditorPage />}
        />
        <Route
          path="/workspace/:workspaceId/prompts"
          element={<PromptTemplatesPage />}
        />
        <Route
          path="/workspace/:workspaceId/database/:docId"
          element={<DatabaseViewPage />}
        />
        <Route path="/workspace/:workspaceId/trash" element={<TrashPage />} />
        <Route
          path="/workspace/:workspaceId/settings"
          element={<SettingsPage />}
        />
        {/* Generic catch-all route must be last */}
        <Route
          path="/workspace/:workspaceId/:pageId"
          element={<EditorPage />}
        />

        {/* Default route */}
        <Route
          path="/"
          element={
            <div
              style={{
                padding: '40px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                minHeight: '100vh',
              }}
            >
              <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
                🎉 AI Document Editor
              </h1>
              <p style={{ fontSize: '18px', marginBottom: '30px' }}>
                A minimal AI-powered document editor
              </p>
              <div
                style={{
                  background: 'white',
                  color: '#333',
                  padding: '20px',
                  borderRadius: '8px',
                  minWidth: '300px',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    marginBottom: '15px',
                    fontWeight: 'bold',
                  }}
                >
                  Quick Start:
                </p>
                <a
                  href="#/backend-test"
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: '16px',
                  }}
                >
                  🔗 Backend Connection Test
                </a>
                <a
                  href="#/workspace/demo/all"
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: '16px',
                  }}
                >
                  📄 All Pages
                </a>
                <a
                  href="#/workspace/demo/prompts"
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: '16px',
                  }}
                >
                  📋 Prompt Templates
                </a>
                <a
                  href="#/workspace/demo/database/demo-db"
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: '16px',
                  }}
                >
                  📊 Database View
                </a>
                <a
                  href="#/workspace/demo/trash"
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: '16px',
                  }}
                >
                  🗑️ Trash
                </a>
                <div
                  style={{
                    marginTop: '20px',
                    paddingTop: '15px',
                    borderTop: '1px solid #e0e0e0',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      marginBottom: '10px',
                      fontSize: '14px',
                      color: '#666',
                    }}
                  >
                    编辑器选项:
                  </p>
                  <a
                    href="#/workspace/demo/page1"
                    style={{
                      display: 'block',
                      marginTop: '8px',
                      color: '#52c41a',
                      textDecoration: 'none',
                      fontSize: '15px',
                      fontWeight: '500',
                    }}
                  >
                    📝 完整编辑器 (块编辑器)
                  </a>
                  <a
                    href="#/workspace/demo/light/test-doc"
                    style={{
                      display: 'block',
                      marginTop: '8px',
                      color: '#1890ff',
                      textDecoration: 'none',
                      fontSize: '15px',
                      fontWeight: '500',
                    }}
                  >
                    ✨ 轻量级编辑器
                  </a>
                </div>
              </div>
              <p style={{ marginTop: '30px', fontSize: '14px', opacity: 0.8 }}>
                支持本地存储和 AFFiNE 云端同步
              </p>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
