/**
 * Database View Page - Phase 1
 * Features:
 * - Display database table view
 * - Inline cell editing
 * - Add/delete rows
 * - Multiple column types
 */
import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseTableView } from '../components/database-table-view.js';

export const DatabaseViewPage: FC = () => {
  const { workspaceId, docId } = useParams<{
    workspaceId: string;
    docId: string;
  }>();

  const handleRowClick = (row: any) => {
    console.log('Row clicked:', row);
    // Phase 1: Just log, in future could open a detail view
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          background: 'white',
        }}
      >
        <h1 style={{ fontSize: '24px', margin: 0 }}>📊 数据库视图</h1>
        <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0 0' }}>
          Workspace: {workspaceId} • Document: {docId}
        </p>
      </div>

      {/* Database Table */}
      <div style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
        <DatabaseTableView
          workspaceId={workspaceId || ''}
          docId={docId || ''}
          onRowClick={handleRowClick}
        />
      </div>
    </div>
  );
};
