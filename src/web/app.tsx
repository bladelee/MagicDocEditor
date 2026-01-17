/**
 * Root Application Component
 *
 * Simplified version without AFFiNE infrastructure
 */
import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import { LoadingScreen } from './components/loading-screen.js';
import { AuthGuard } from './components/auth-guard.js';
import { routes } from './routes';

export function App() {
  // Debug: Log when App renders
  console.log('App component rendered');

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/auth/*" element={<div>Auth Pages (TODO)</div>} />

        {/* Protected routes */}
        <Route element={<AuthGuard>{null}</AuthGuard>}>
          {routes.map(route => {
            console.log('Registering route:', route.path);
            return (
              <Route
                key={route.path}
                path={route.path}
                element={<route.component />}
              />
            );
          })}
        </Route>

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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
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
                    href="#/workspace/demo/all"
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

        {/* 404 route */}
        <Route
          path="*"
          element={
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h1>404 - Page Not Found</h1>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
