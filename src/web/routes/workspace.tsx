/**
 * Workspace Page Component
 */
import type { FC } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export const WorkspacePage: FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  console.log('WorkspacePage rendered, workspaceId:', workspaceId);

  // Redirect to all pages if no sub-route
  useEffect(() => {
    console.log('Navigating to /workspace/' + workspaceId + '/all');
    navigate(`/workspace/${workspaceId}/all`, { replace: true });
  }, [workspaceId, navigate]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '280px',
          borderRight: '1px solid #e0e0e0',
          padding: '16px',
        }}
      >
        <h2>Workspace: {workspaceId}</h2>
        <nav>
          <a href={`#/workspace/${workspaceId}/all`}>All Pages</a>
          <br />
          <a href={`#/workspace/${workspaceId}/trash`}>Trash</a>
          <br />
          <a href={`#/workspace/${workspaceId}/settings`}>Settings</a>
        </nav>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};
