/**
 * Sync Status Indicator Component
 * Shows the synchronization status between local and AFFiNE backend
 */

import type { FC } from 'react';
import type { SyncStatus } from '../../types/sync.js';

interface SyncIndicatorProps {
  status: SyncStatus;
  lastSyncTime?: number;
  pendingCount?: number;
  error?: string;
}

/**
 * Sync status indicator with icon and message
 */
export const SyncIndicator: FC<SyncIndicatorProps> = ({
  status,
  lastSyncTime,
  pendingCount,
  error,
}) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'idle':
        return { icon: '🏠', text: '本地模式', color: '#52c41a' };
      case 'syncing':
        return { icon: '🔄', text: '同步中...', color: '#1890ff' };
      case 'synced':
        return {
          icon: '☁️',
          text: `已同步${lastSyncTime ? ` (${formatTime(lastSyncTime)})` : ''}`,
          color: '#52c41a',
        };
      case 'pending':
        return {
          icon: '⏳',
          text: `待同步${pendingCount ? ` (${pendingCount})` : ''}`,
          color: '#faad14',
        };
      case 'conflict':
        return { icon: '⚠️', text: '有冲突', color: '#faad14' };
      case 'offline':
        return { icon: '📴', text: '离线', color: '#8c8c8c' };
      case 'error':
        return {
          icon: '❌',
          text: error || '同步错误',
          color: '#ff4d4f',
        };
      default:
        return { icon: '❓', text: '未知状态', color: '#8c8c8c' };
    }
  };

  const display = getStatusDisplay();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: status === 'idle' ? '#f6f8fa' : '#e6f7ff',
        border: '1px solid #d0d7de',
        borderRadius: '4px',
        fontSize: '12px',
      }}
      title={error}
    >
      <span style={{ fontSize: '14px' }}>{display.icon}</span>
      <span style={{ color: display.color }}>{display.text}</span>
    </div>
  );
};

/**
 * Format timestamp for display
 */
function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    // Less than 1 minute
    return '刚刚';
  } else if (diff < 3600000) {
    // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes} 分钟前`;
  } else if (diff < 86400000) {
    // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours} 小时前`;
  } else {
    // More than 1 day
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
}
