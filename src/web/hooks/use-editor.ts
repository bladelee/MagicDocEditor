/**
 * useEditor Hook - Manages editor state
 */

import { useMemo } from 'react';

interface UseEditorOptions {
  docId: string;
  workspaceId: string;
}

interface UseEditorReturn {
  store: unknown | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for accessing the editor
 * Note: Full AFFiNE infrastructure integration requires more setup
 */
export function useEditor(options: UseEditorOptions): UseEditorReturn {
  const { docId, workspaceId } = options;

  const store = useMemo(() => {
    // TODO: Create actual store using AFFiNE's DocService
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log('useEditor:', { docId, workspaceId, storeExists: !!store });

  return {
    store,
    isLoading: !store,
    error: null,
  };
}
