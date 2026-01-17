/**
 * All Pages Component - Document Management with Hybrid Storage
 * Features:
 * - List all documents
 * - Search documents
 * - Create new document
 * - Delete document
 * - Navigate to editor
 * - Storage mode settings
 */
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentService } from '../services/document/DocumentService.js';
import type { Document } from '../types/document.js';
import type { StorageMode } from '../types/storage.js';
import type { SyncStatus } from '../types/sync.js';
import { SettingsPanel } from '../components/ai-editor/SettingsPanel.js';

export const AllPagesPage: FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>(
    documentService.getStorageMode()
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    'idle' as SyncStatus
  );

  // Load documents
  useEffect(() => {
    loadDocuments();
  }, [workspaceId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await documentService.listDocs(
        workspaceId ? { workspaceId } : undefined
      );
      setDocuments(docs);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Search documents
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await documentService.searchDocs(searchQuery);
      setDocuments(docs);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      } else {
        loadDocuments();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, workspaceId]);

  // Create new document
  const handleCreate = async () => {
    if (!newDocTitle.trim()) {
      alert('Please enter a document title');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const docId = await documentService.createDoc(newDocTitle.trim(), {
        workspaceId,
      });

      setNewDocTitle('');
      setShowCreateDialog(false);

      // Reload documents
      await loadDocuments();

      // Navigate to editor
      navigate(`/workspace/${workspaceId || 'default'}/${docId}`);
    } catch (err) {
      setError(err as Error);
      alert(`Failed to create document: ${(err as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  // Delete document
  const handleDelete = async (docId: string) => {
    if (!confirm('确定要删除这个文档吗？此操作不可撤销。')) return;

    setError(null);
    try {
      await documentService.deleteDoc(docId);
      await loadDocuments();
    } catch (err) {
      setError(err as Error);
      alert(`Failed to delete document: ${(err as Error).message}`);
    }
  };

  return (
    <div
      style={{
        padding: '40px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }}>📄 所有文档</h1>
        <p style={{ margin: 0, color: '#666' }}>
          Workspace: {workspaceId || 'default'} • 共 {documents.length} 个文档 •
          存储:{' '}
          {documentService.getStorageMode() === 'local'
            ? '🏠 本地'
            : '☁️ AFFiNE'}
        </p>
      </div>

      {/* Actions Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '24px',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索文档..."
          style={{
            flex: 1,
            maxWidth: '400px',
            padding: '10px 14px',
            border: '1px solid #d0d0d0',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />

        {/* Create Button */}
        <button
          onClick={() => setShowCreateDialog(true)}
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
          + 新建文档
        </button>

        {/* Refresh Button */}
        <button
          onClick={loadDocuments}
          disabled={loading}
          style={{
            padding: '10px 16px',
            background: 'white',
            border: '1px solid #d0d0d0',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
          }}
        >
          🔄 刷新
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          style={{
            padding: '10px 16px',
            background: storageMode === 'local' ? '#e6f7ff' : '#f6ffed',
            border: '1px solid #d0d0d0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ⚙️ 设置
        </button>
      </div>

      {/* Settings Panel Dialog */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflow: 'auto',
            padding: '20px',
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{
              background: 'white',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <SettingsPanel
              onModeChange={mode => {
                setStorageMode(mode);
                loadDocuments();
              }}
              onSyncStatusChange={status => {
                setSyncStatus(status);
              }}
            />
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  padding: '10px 30px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                关闭
              </button>
            </div>
          </div>
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
            marginBottom: '16px',
          }}
        >
          ⚠️ {error.message}
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          加载中...
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p style={{ margin: 0, fontSize: '16px' }}>
            {searchQuery ? '没有找到匹配的文档' : '暂无文档'}
          </p>
          {!searchQuery && (
            <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
              点击"新建文档"按钮创建第一个文档
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            flex: 1,
            overflow: 'auto',
          }}
        >
          {documents.map(doc => (
            <div
              key={doc.id}
              style={{
                padding: '20px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => navigate(`/workspace/${workspaceId}/${doc.id}`)}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.boxShadow =
                  '0 4px 12px rgba(102, 126, 234, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e0e0e0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Document Title */}
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '16px',
                  marginBottom: '8px',
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {doc.title || 'Untitled'}
              </div>

              {/* Document Info */}
              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  marginBottom: '12px',
                }}
              >
                创建于 {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    navigate(`/workspace/${workspaceId}/${doc.id}`);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background:
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="使用完整块编辑器"
                >
                  完整
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    navigate(`/workspace/${workspaceId}/light/${doc.id}`);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#1890ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="使用轻量级编辑器"
                >
                  轻量
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid #f56565',
                    color: '#f56565',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="删除文档"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowCreateDialog(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '12px',
              minWidth: '400px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>新建文档</h2>
            <input
              type="text"
              value={newDocTitle}
              onChange={e => setNewDocTitle(e.target.value)}
              placeholder="输入文档标题..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleCreate();
                }
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d0d0d0',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
                outline: 'none',
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '6px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newDocTitle.trim() || creating}
                style={{
                  padding: '10px 20px',
                  background:
                    !newDocTitle.trim() || creating
                      ? '#ccc'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor:
                    !newDocTitle.trim() || creating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
