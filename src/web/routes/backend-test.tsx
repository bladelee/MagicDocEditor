/**
 * Backend Connection Test Page
 */
import { useEffect, useState } from 'react';
import { apolloClient } from '../lib/apollo-client';
import { gql } from '@apollo/client';

interface Status {
  backend: boolean;
  graphql: boolean;
  error?: string;
}

export function BackendTestPage() {
  const [status, setStatus] = useState<Status>({
    backend: false,
    graphql: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnections();
  }, []);

  async function testConnections() {
    setLoading(true);

    // Test 1: Backend HTTP
    try {
      const response = await fetch('http://localhost:10003/');
      setStatus(prev => ({ ...prev, backend: response.ok }));
    } catch (error: any) {
      setStatus(prev => ({ ...prev, backend: false, error: error.message }));
    }

    // Test 2: GraphQL API
    try {
      const result = await apolloClient.query({
        query: gql`
          query {
            __typename
          }
        `,
      });
      setStatus(prev => ({ ...prev, graphql: !!result.data }));
    } catch (error: any) {
      setStatus(prev => ({ ...prev, graphql: false, error: error.message }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '40px auto',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h1>AFFiNE 后端连接测试</h1>

      {loading ? (
        <div
          style={{
            padding: '20px',
            background: '#f0f0f0',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          测试中...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Backend Status */}
          <div
            style={{
              padding: '20px',
              background: status.backend ? '#e8f5e9' : '#ffebee',
              borderRadius: '8px',
              border: `2px solid ${status.backend ? '#4caf50' : '#f44336'}`,
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>
              {status.backend ? '✅' : '❌'} 后端服务器 (HTTP)
            </h3>
            <p style={{ margin: 0 }}>
              地址: <code>http://localhost:10003</code>
            </p>
          </div>

          {/* GraphQL Status */}
          <div
            style={{
              padding: '20px',
              background: status.graphql ? '#e8f5e9' : '#ffebee',
              borderRadius: '8px',
              border: `2px solid ${status.graphql ? '#4caf50' : '#f44336'}`,
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>
              {status.graphql ? '✅' : '❌'} GraphQL API
            </h3>
            <p style={{ margin: 0 }}>
              地址: <code>http://localhost:10003/graphql</code>
            </p>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
              通过 Vite 代理访问: <code>/graphql</code>
            </p>
          </div>

          {/* Error Message */}
          {status.error && (
            <div
              style={{
                padding: '15px',
                background: '#fff3cd',
                border: '2px solid #ffc107',
                borderRadius: '8px',
              }}
            >
              <strong>错误:</strong> {status.error}
            </div>
          )}

          {/* Retest Button */}
          <button
            onClick={testConnections}
            style={{
              padding: '12px 24px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            重新测试
          </button>

          {/* Success Message */}
          {status.backend && status.graphql && (
            <div
              style={{
                padding: '20px',
                background: '#e3f2fd',
                border: '2px solid #2196f3',
                borderRadius: '8px',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>🎉 所有连接正常！</h3>
              <p style={{ margin: 0 }}>前端已成功连接到 AFFiNE 后端服务。</p>
              <ul style={{ marginTop: '15px', marginBottom: 0 }}>
                <li>
                  前端服务器: <code>http://localhost:10009</code>
                </li>
                <li>
                  后端服务器: <code>http://localhost:10003</code>
                </li>
                <li>
                  GraphQL API: <code>http://localhost:10003/graphql</code>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
