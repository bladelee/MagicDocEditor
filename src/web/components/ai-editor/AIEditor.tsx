/**
 * AI Editor Component
 * A simplified document editor for Phase 1
 * Will integrate full BlockSuite in future iterations
 */

import {
  useEffect,
  useState,
  useRef,
  type FC,
  type ChangeEvent,
  type UIEvent,
} from 'react';
import { documentService } from '../../services/document/DocumentService.js';
import type { Document } from '../../types/document.js';

interface AIEditorProps {
  docId: string;
  readonly?: boolean;
  showToolbar?: boolean;
  onSave?: (doc: Document) => void;
}

/**
 * AI Editor Component
 * Provides basic editing functionality with auto-save
 */
export const AIEditor: FC<AIEditorProps> = ({
  docId,
  readonly = false,
  showToolbar = true,
  onSave,
}) => {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load document
  useEffect(() => {
    loadDocument();
  }, [docId]);

  const loadDocument = async () => {
    setLoading(true);
    try {
      const loadedDoc = await documentService.getDoc(docId);
      if (loadedDoc) {
        setDoc(loadedDoc);
        setContent(loadedDoc.blocks?.map(b => b.text || '').join('\n') || '');
      } else {
        // Document doesn't exist, create a placeholder
        setContent('');
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-save with debounce
  const scheduleSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaving(true);
    saveTimeoutRef.current = setTimeout(() => {
      saveDocument();
    }, 1000); // Save after 1 second of inactivity
  };

  const saveDocument = async () => {
    if (!doc || readonly) return;

    try {
      // Create blocks from content
      const lines = content.split('\n');
      const blocks = lines.map((line, index) => ({
        id: `${docId}-block-${index}`,
        flavour: 'affine:paragraph',
        type: 'text',
        text: line,
      }));

      await documentService.updateDoc(docId, {
        blocks,
      });

      setSaving(false);
      onSave?.({ ...doc, blocks });
      console.log('✅ Document auto-saved');
    } catch (error) {
      console.error('Failed to save document:', error);
      setSaving(false);
    }
  };

  const handleContentChange = (e: ChangeEvent<HTMLDivElement>) => {
    setContent(e.currentTarget.innerText);
    scheduleSave();
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '40px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div style={{ color: '#666' }}>Loading document...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      {showToolbar && (
        <div
          style={{
            borderBottom: '1px solid #e0e0e0',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'white',
          }}
        >
          <div>
            <input
              type="text"
              value={doc?.title || ''}
              onChange={e => {
                if (doc) {
                  setDoc({ ...doc, title: e.target.value });
                  scheduleSave();
                }
              }}
              readOnly={readonly}
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                border: 'none',
                outline: 'none',
                padding: '4px 0',
                minWidth: '200px',
              }}
              placeholder="Untitled"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Save indicator */}
            {saving && (
              <span style={{ fontSize: '12px', color: '#1890ff' }}>
                💾 Saving...
              </span>
            )}

            {/* Read-only indicator */}
            {readonly && (
              <span
                style={{
                  fontSize: '12px',
                  background: '#f0f0f0',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                🔒 Read-only
              </span>
            )}
          </div>
        </div>
      )}

      {/* Editor area */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '40px',
          background: '#fff',
        }}
      >
        <div
          ref={editorRef}
          contentEditable={!readonly}
          onInput={handleContentChange}
          style={{
            minHeight: '100%',
            outline: 'none',
            fontSize: '16px',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
          suppressContentEditableWarning
        >
          {content}
        </div>
      </div>

      {/* Status bar */}
      <div
        style={{
          borderTop: '1px solid #e0e0e0',
          padding: '8px 20px',
          fontSize: '12px',
          color: '#999',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{doc?.id || 'Unknown document'}</span>
        <span>
          {content.length} characters • {content.split('\n').length} lines
        </span>
      </div>
    </div>
  );
};
