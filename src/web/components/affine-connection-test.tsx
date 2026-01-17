/**
 * AFFiNE Connection Test Component
 * Shows the connection status to AFFiNE backend
 */
import { useEffect, useState } from 'react';
import { affineBackend } from '../services/affine-backend';

interface ConnectionStatus {
  connected: boolean;
  workspaceCount: number;
  error?: string;
}

export function AffineConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    workspaceCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
  }, []);

  async function testConnection() {
    setLoading(true);
    try {
      const workspaces = await affineBackend.listWorkspaces();
      setStatus({
        connected: true,
        workspaceCount: workspaces.length,
      });
    } catch (error: any) {
      setStatus({
        connected: false,
        workspaceCount: 0,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '20px',
          background: '#f0f0f0',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <p>Testing connection to AFFiNE backend...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '20px',
        background: status.connected ? '#e8f5e9' : '#ffebee',
        borderRadius: '8px',
        margin: '20px 0',
      }}
    >
      <h3>AFFiNE Backend Connection</h3>
      <p>
        Status:{' '}
        <strong>{status.connected ? '✅ Connected' : '❌ Failed'}</strong>
      </p>
      {status.connected && (
        <p>
          Workspaces found: <strong>{status.workspaceCount}</strong>
        </p>
      )}
      {status.error && (
        <p style={{ color: '#c62828' }}>Error: {status.error}</p>
      )}
      <button
        onClick={testConnection}
        style={{
          padding: '8px 16px',
          background: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Retest Connection
      </button>
    </div>
  );
}
