/**
 * Application Routes
 */
import { lazy } from 'react';

// Lazy load pages for code splitting
const WorkspacePage = lazy(() =>
  import('./workspace.js').then(m => ({ default: m.WorkspacePage }))
);
const EditorPage = lazy(() =>
  import('./editor.js').then(m => ({ default: m.EditorPage }))
);
const LightEditorPage = lazy(() =>
  import('./light-editor.js').then(m => ({ default: m.LightEditorPage }))
);
const AllPagesPage = lazy(() =>
  import('./all-pages.js').then(m => ({ default: m.AllPagesPage }))
);
const TrashPage = lazy(() =>
  import('./trash.js').then(m => ({ default: m.TrashPage }))
);
const SettingsPage = lazy(() =>
  import('./settings.js').then(m => ({ default: m.SettingsPage }))
);
const PromptTemplatesPage = lazy(() =>
  import('./prompt-templates.js').then(m => ({
    default: m.PromptTemplatesPage,
  }))
);
const DatabaseViewPage = lazy(() =>
  import('./database-view.js').then(m => ({ default: m.DatabaseViewPage }))
);
const BackendTestPage = lazy(() =>
  import('./backend-test.js').then(m => ({ default: m.BackendTestPage }))
);

/**
 * Route configuration interface
 */
interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}

/**
 * Application route configuration
 */
export const routes: RouteConfig[] = [
  {
    path: '/backend-test',
    component: BackendTestPage as any,
  },
  {
    path: '/workspace/:workspaceId',
    component: WorkspacePage as any,
  },
  // Specific routes must come before generic :pageId route
  {
    path: '/workspace/:workspaceId/all',
    component: AllPagesPage as any,
  },
  {
    path: '/workspace/:workspaceId/light/:pageId',
    component: LightEditorPage as any,
  },
  {
    path: '/workspace/:workspaceId/prompts',
    component: PromptTemplatesPage as any,
  },
  {
    path: '/workspace/:workspaceId/database/:docId',
    component: DatabaseViewPage as any,
  },
  {
    path: '/workspace/:workspaceId/trash',
    component: TrashPage as any,
  },
  {
    path: '/workspace/:workspaceId/settings',
    component: SettingsPage as any,
  },
  // Generic catch-all route must be last
  {
    path: '/workspace/:workspaceId/:pageId',
    component: EditorPage as any,
  },
];
