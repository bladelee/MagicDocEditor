/**
 * Settings Page - Authentication Configuration
 *
 * Simple authentication setup for AFFiNE backend:
 * 1. User logs into AFFiNE web UI (http://localhost:10003)
 * 2. User copies session token from browser
 * 3. User pastes token here
 */
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService, type AuthUser } from '../services/auth.js';
import { apolloClient } from '../lib/apollo-client.js';
import { gql } from '@apollo/client';

const GET_WORKSPACES = gql`
  query GetWorkspaces {
    workspaces {
      id
    }
  }
`;

export const SettingsPage: FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [workspaces, setWorkspaces] = useState<string[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  useEffect(() => {
    // Load current auth status
    setIsAuthenticated(authService.isAuthenticated());
    const token = authService.getToken();
    const user = authService.getUser() as AuthUser | null;
    if (user) {
      setEmail(user.email);
      // Prefer token from user object (which has the original token)
      setToken(user.token || token || '');
      // Fetch workspaces when authenticated
      fetchWorkspaces();
    } else if (token) {
      setToken(token);
    }
  }, []);

  const fetchWorkspaces = async () => {
    if (!authService.isAuthenticated()) return;

    setLoadingWorkspaces(true);
    try {
      const { data } = await apolloClient.query({
        query: GET_WORKSPACES,
        fetchPolicy: 'network-only',
      });
      const workspaceIds = data?.workspaces?.map((w: any) => w.id) || [];
      setWorkspaces(workspaceIds);

      // 保存到 localStorage 供其他页面使用
      if (workspaceIds.length > 0) {
        localStorage.setItem('affine_workspaces', JSON.stringify(workspaceIds));
        console.log('✅ Workspaces saved to localStorage:', workspaceIds);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  const handleSaveToken = () => {
    if (!token.trim()) {
      alert('请输入认证 token');
      return;
    }

    authService.saveToken(token, email);
    setIsAuthenticated(true);
    alert('✅ 认证 token 已保存！\n\n现在您可以访问 AFFiNE 后端功能了。');

    // 自动获取 workspaces
    fetchWorkspaces();
  };

  const handleLogout = async () => {
    if (confirm('确定要退出登录吗？')) {
      await authService.signOut();
      setIsAuthenticated(false);
      setToken('');
      setEmail('');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '24px' }}>⚙️ 设置</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Workspace: {workspaceId}
      </p>

      {/* Authentication Section */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>
          🔐 AFFiNE 认证
        </h2>

        {isAuthenticated ? (
          <div>
            <p
              style={{
                color: '#52c41a',
                fontWeight: 500,
                marginBottom: '16px',
              }}
            >
              ✅ 已认证为: {authService.getUser()?.email}
            </p>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              退出登录
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              要使用 AFFiNE 后端功能（AI 聊天、数据库视图等），需要配置认证。
            </p>

            <button
              onClick={() => setShowInstructions(!showInstructions)}
              style={{
                padding: '8px 16px',
                background: '#1890ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '16px',
              }}
            >
              {showInstructions ? '▼' : '▶'} 如何获取认证 Token？
            </button>

            {showInstructions && (
              <div
                style={{
                  background: '#f6f8fa',
                  border: '1px solid #d0d7de',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: '20px',
                  fontSize: '14px',
                }}
              >
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
                  获取 AFFiNE 认证 Token 的步骤：
                </h3>
                <ol style={{ margin: 0, paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '8px' }}>
                    在新标签页打开 AFFiNE:{' '}
                    <a
                      href="http://localhost:10003"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1890ff' }}
                    >
                      http://localhost:10003
                    </a>
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    使用邮箱注册或登录账号
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    登录成功后，按{' '}
                    <kbd
                      style={{
                        padding: '2px 6px',
                        background: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '3px',
                      }}
                    >
                      F12
                    </kbd>{' '}
                    打开开发者工具
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    切换到 <strong>Application</strong> 标签 → 左侧{' '}
                    <strong>Cookies</strong>
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    找到{' '}
                    <code
                      style={{
                        background: '#f0f0f0',
                        padding: '2px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      affine-session
                    </code>{' '}
                    或{' '}
                    <code
                      style={{
                        background: '#f0f0f0',
                        padding: '2px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      better-auth.session_token
                    </code>
                  </li>
                  <li style={{ marginBottom: '8px' }}>
                    复制对应的 <strong>Value</strong> 值（一长串字符串）
                  </li>
                  <li>粘贴到下面的输入框中</li>
                </ol>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                认证 Token:
              </label>
              <textarea
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="粘贴从浏览器复制的 affine-session token..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                邮箱（可选）:
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>

            <button
              onClick={handleSaveToken}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              保存 Token
            </button>
          </div>
        )}
      </div>

      {/* Workspaces Section */}
      {isAuthenticated && (
        <div
          style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>
            📁 你的 Workspaces
          </h2>
          {loadingWorkspaces ? (
            <p style={{ color: '#666' }}>加载中...</p>
          ) : workspaces.length > 0 ? (
            <div>
              <p style={{ marginBottom: '12px', color: '#666' }}>
                你的账号有以下 workspace，请使用正确的 ID 访问：
              </p>
              {workspaces.map(wsId => (
                <div
                  key={wsId}
                  style={{
                    background: '#f6f8fa',
                    border: '1px solid #d0d7de',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <code
                    style={{
                      background: '#fff',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                    }}
                  >
                    {wsId}
                  </code>
                  <button
                    onClick={() => navigate(`/workspace/${wsId}/all`)}
                    style={{
                      padding: '6px 12px',
                      background: '#1890ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    打开
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#faad14' }}>未找到任何 workspace</p>
          )}
        </div>
      )}

      {/* Status Section */}
      <div
        style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '24px',
        }}
      >
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>📊 功能状态</h2>
        <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ display: 'inline-block', width: '120px' }}>
              AI Chat:
            </span>
            <span style={{ color: isAuthenticated ? '#52c41a' : '#faad14' }}>
              {isAuthenticated ? '✅ 已启用（需认证）' : '⚠️ Mock 模式'}
            </span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ display: 'inline-block', width: '120px' }}>
              Prompt 模板:
            </span>
            <span style={{ color: isAuthenticated ? '#52c41a' : '#faad14' }}>
              {isAuthenticated ? '✅ 已启用（需认证）' : '⚠️ Mock 模式'}
            </span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ display: 'inline-block', width: '120px' }}>
              Database View:
            </span>
            <span style={{ color: '#52c41a' }}>✅ 本地模式</span>
          </div>
          <div>
            <span style={{ display: 'inline-block', width: '120px' }}>
              Document 编辑:
            </span>
            <span style={{ color: '#52c41a' }}>✅ 已启用</span>
          </div>
        </div>
      </div>
    </div>
  );
};
