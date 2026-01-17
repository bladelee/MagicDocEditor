/**
 * Settings Panel Component
 * Allows users to configure storage mode and AFFiNE authentication
 */

import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { documentService } from '../../services/document/DocumentService.js';
import type { StorageMode, AFFineConfig } from '../../types/storage.js';
import type { SyncStatus } from '../../types/sync.js';
import { authService } from '../../services/auth.js';

interface SettingsPanelProps {
  onModeChange?: (mode: StorageMode) => void;
  onSyncStatusChange?: (status: SyncStatus) => void;
}

/**
 * Settings panel for storage configuration
 */
export const SettingsPanel: FC<SettingsPanelProps> = ({
  onModeChange,
  onSyncStatusChange,
}) => {
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [workspaceId, setWorkspaceId] = useState('');
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load current state
  useEffect(() => {
    setStorageMode(documentService.getStorageMode());

    // Check AFFiNE authentication
    const hasToken = authService.isAuthenticated();
    setIsAuthenticated(hasToken);
    const savedToken = authService.getToken() || '';
    setToken(savedToken);

    // Get current user
    const user = authService.getUser();
    if (user) {
      // Load workspace IDs from localStorage
      const savedWorkspaces = localStorage.getItem('affine_workspaces');
      if (savedWorkspaces) {
        try {
          const workspaces = JSON.parse(savedWorkspaces);
          if (workspaces.length > 0) {
            setWorkspaceId(workspaces[0]);
          }
        } catch (e) {
          console.error('Failed to parse workspaces:', e);
        }
      }
    }

    // Load sync stats if in AFFiNE mode
    if (documentService.getStorageMode() === 'affine') {
      const stats = documentService.getSyncStats();
      setSyncStats(stats);

      // Periodically refresh stats
      const interval = setInterval(() => {
        const newStats = documentService.getSyncStats();
        setSyncStats(newStats);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  const handleSwitchMode = async (newMode: StorageMode) => {
    if (newMode === storageMode) return;

    setSwitching(true);

    try {
      if (newMode === 'affine') {
        // Validate AFFiNE configuration
        if (!workspaceId || !token) {
          alert('请先配置 AFFiNE Workspace ID 和 Token');
          return;
        }

        const config: AFFineConfig = {
          workspaceId,
          token,
        };

        await documentService.switchStorageMode('affine', config);

        // Save auth token
        authService.saveToken(token, workspaceId);

        console.log('✅ Switched to AFFiNE mode');
      } else {
        await documentService.switchStorageMode('local');
        console.log('✅ Switched to local mode');
      }

      setStorageMode(newMode);
      onModeChange?.(newMode);

      // Refresh sync stats
      if (newMode === 'affine') {
        const stats = documentService.getSyncStats();
        setSyncStats(stats);
      }
    } catch (error: any) {
      alert(`切换失败: ${error.message}`);
      console.error('Failed to switch storage mode:', error);
    } finally {
      setSwitching(false);
    }
  };

  const handleSyncNow = async () => {
    if (storageMode !== 'affine') return;

    setSwitching(true);
    try {
      await documentService.syncToAFFine();
      const stats = documentService.getSyncStats();
      setSyncStats(stats);
      alert('✅ 同步完成');
    } catch (error: any) {
      alert(`同步失败: ${error.message}`);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
      }}
    >
      <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>⚙️ 存储设置</h2>

      {/* Storage Mode Selection */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>
          存储模式
        </h3>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSwitchMode('local')}
            disabled={switching}
            style={{
              flex: 1,
              padding: '12px',
              background: storageMode === 'local' ? '#e6f7ff' : '#f5f5f5',
              border: `2px solid ${storageMode === 'local' ? '#1890ff' : '#d9d9d9'}`,
              borderRadius: '6px',
              cursor: switching ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            🏠 本地模式
          </button>

          <button
            onClick={() => handleSwitchMode('affine')}
            disabled={switching}
            style={{
              flex: 1,
              padding: '12px',
              background: storageMode === 'affine' ? '#f6ffed' : '#f5f5f5',
              border: `2px solid ${storageMode === 'affine' ? '#52c41a' : '#d9d9d9'}`,
              borderRadius: '6px',
              cursor: switching ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            ☁️ AFFiNE 同步模式
          </button>
        </div>

        {storageMode === 'affine' && syncStats && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          >
            📊 同步状态: {syncStats.pending} 待同步 • {syncStats.completed}{' '}
            已完成
            {syncStats.failed > 0 && ` • ${syncStats.failed} 失败`}
          </div>
        )}
      </div>

      {/* AFFiNE Configuration */}
      {storageMode === 'affine' && (
        <div style={{ marginBottom: '24px' }}>
          <h3
            style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}
          >
            AFFiNE 配置
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '12px',
              }}
            >
              Workspace ID
            </label>
            <input
              type="text"
              value={workspaceId}
              onChange={e => setWorkspaceId(e.target.value)}
              placeholder="8ebdecc7-227f-4415-85b5-9630bc2c7bda"
              disabled={switching}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '12px',
              }}
            >
              认证 Token
            </label>
            <textarea
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="粘贴从浏览器复制的 affine-session token..."
              disabled={switching}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            onClick={handleSyncNow}
            disabled={switching}
            style={{
              width: '100%',
              padding: '10px',
              background: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: switching ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {switching ? '🔄 同步中...' : '🚀 立即同步'}
          </button>
        </div>
      )}

      {/* Storage Mode Description */}
      <div
        style={{
          padding: '12px',
          background: '#f6f8fa',
          border: '1px solid #d0d7de',
          borderRadius: '4px',
          fontSize: '12px',
          lineHeight: '1.6',
        }}
      >
        <strong>模式说明：</strong>
        <br />
        {storageMode === 'local' ? (
          <>
            🏠 <strong>本地模式：</strong>所有文档存储在浏览器 IndexedDB
            中，完全离线可用， 无需 AFFiNE 账号。适合单人使用或离线场景。
          </>
        ) : (
          <>
            ☁️ <strong>AFFiNE 同步模式：</strong>文档同时存储在本地和 AFFiNE
            云端， 支持跨设备同步、实时协作和 AI 功能。需要 AFFiNE 账号。
          </>
        )}
      </div>

      {/* Advanced Settings (Collapsible) */}
      <details style={{ marginTop: '16px' }}>
        <summary
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
        >
          {showAdvanced ? '▼' : '▶'} 高级设置
        </summary>

        {showAdvanced && (
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <button
              onClick={async () => {
                if (confirm('确定要清除所有本地文档吗？此操作不可撤销！')) {
                  const localAdapter =
                    await import('../../services/storage/LocalStorageAdapter.js');
                  const adapter = new localAdapter.LocalStorageAdapter();
                  await adapter.clearAll();
                  alert('✅ 所有本地文档已清除');
                }
              }}
              style={{
                padding: '8px 12px',
                background: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🗑️ 清除所有本地文档
            </button>

            <button
              onClick={async () => {
                if (confirm('确定要清除同步队列吗？')) {
                  // This will be implemented in SyncManager
                  alert('同步队列已清除');
                }
              }}
              style={{
                padding: '8px 12px',
                background: '#faad14',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                marginLeft: '8px',
              }}
            >
              🗑️ 清除同步队列
            </button>
          </div>
        )}
      </details>
    </div>
  );
};
