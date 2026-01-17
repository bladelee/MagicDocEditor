/**
 * Navigation - Main Navigation Component
 */

import type { FC } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';

interface NavigationProps {
  workspaceId?: string;
  onNewDocument?: () => void;
}

export const Navigation: FC<NavigationProps> = ({
  workspaceId,
  onNewDocument,
}) => {
  const { workspaceId: paramsWorkspaceId } = useParams();
  const location = useLocation();

  const currentWorkspaceId = workspaceId || paramsWorkspaceId;

  const navItems = [
    {
      path: `/workspace/${currentWorkspaceId}/all`,
      label: 'All Pages',
      icon: '📄',
    },
    {
      path: `/workspace/${currentWorkspaceId}/prompts`,
      label: 'Prompt Templates',
      icon: '📋',
    },
    {
      path: `/workspace/${currentWorkspaceId}/database/demo-db`,
      label: 'Database View',
      icon: '📊',
    },
    {
      path: `/workspace/${currentWorkspaceId}/trash`,
      label: 'Trash',
      icon: '🗑️',
    },
    {
      path: `/workspace/${currentWorkspaceId}/settings`,
      label: 'Settings',
      icon: '⚙️',
    },
  ];

  return (
    <div
      style={{
        width: '240px',
        height: '100vh',
        background: '#f5f5f5',
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #e0e0e0',
          fontWeight: 'bold',
          fontSize: '18px',
        }}
      >
        AI Editor
      </div>

      {/* New Document Button */}
      <div style={{ padding: '12px 16px' }}>
        <button
          onClick={onNewDocument}
          style={{
            width: '100%',
            padding: '10px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          + New Document
        </button>
      </div>

      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: '8px' }}>
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                color: isActive ? '#0066cc' : '#333',
                textDecoration: 'none',
                borderRadius: '6px',
                background: isActive ? '#e6f0ff' : 'transparent',
                fontSize: '14px',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e0e0e0',
          fontSize: '13px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            👤
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>User</div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              user@example.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
