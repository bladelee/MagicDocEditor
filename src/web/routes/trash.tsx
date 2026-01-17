/**
 * Trash Component
 */
import type { FC } from 'react';
import { useParams } from 'react-router-dom';

export const TrashPage: FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <div style={{ padding: '40px' }}>
      <h1>Trash</h1>
      <p>Workspace: {workspaceId}</p>
      <p style={{ color: '#999' }}>Deleted pages will be displayed here</p>
    </div>
  );
};
