/**
 * Loading Screen Component
 */
import type { FC } from 'react';

export const LoadingScreen: FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e0e0e0',
          borderTopColor: '#1890ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ color: '#666', fontSize: '14px' }}>Loading...</p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
