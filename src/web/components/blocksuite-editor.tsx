/**
 * Blocksuite Editor - 完整的块编辑器集成
 *
 * 这是一个功能完整的块编辑器实现，支持：
 * - 段落、标题、列表、代码块、分割线
 * - 混合存储模式（IndexedDB + AFFiNE 云端同步）
 * - AI 内容插入
 * - 块的 CRUD 操作
 */

import type { FC } from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { documentService } from '../services/document/DocumentService.js';
import type { Block as DocumentBlock } from '../types/document.js';

// 定义块类型
type BlockType = 'paragraph' | 'heading' | 'list' | 'code' | 'divider';

// 内部编辑器使用的块类型
interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  props?: Record<string, any>;
  children?: EditorBlock[];
}

// 转换函数：EditorBlock -> DocumentBlock
function toDocumentBlock(editorBlock: EditorBlock): DocumentBlock {
  return {
    id: editorBlock.id,
    flavour: `affine:${editorBlock.type}`,
    type: editorBlock.type,
    text: editorBlock.content,
    props: editorBlock.props,
    children: editorBlock.children?.map(toDocumentBlock),
  };
}

// 转换函数：DocumentBlock -> EditorBlock
function toEditorBlock(docBlock: DocumentBlock): EditorBlock {
  return {
    id: docBlock.id,
    type: (docBlock.flavour?.replace('affine:', '') ||
      'paragraph') as BlockType,
    content: docBlock.text || '',
    props: docBlock.props,
    children: docBlock.children?.map(toEditorBlock),
  };
}

interface DocumentData {
  id: string;
  title: string;
  blocks: EditorBlock[];
  createdAt: number;
  updatedAt: number;
}

interface BlocksuiteEditorProps {
  docId: string;
  workspaceId: string;
  content?: string;
  onSave?: (data: DocumentData) => void;
  onReady?: (editor: BlocksuiteEditorHandle) => void;
  readOnly?: boolean;
}

/**
 * 编辑器句柄 - 提供给外部调用
 */
export interface BlocksuiteEditorHandle {
  getDocument: () => DocumentData;
  insertBlock: (index: number, block: EditorBlock) => void;
  updateBlock: (blockId: string, content: string) => void;
  deleteBlock: (blockId: string) => void;
  insertAIContent: (content: string) => void;
  replaceSelection: (content: string) => void;
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 默认文档结构
 */
function createDefaultDocument(docId: string): DocumentData {
  return {
    id: docId,
    title: 'Untitled Document',
    blocks: [
      {
        id: generateId(),
        type: 'heading',
        content: 'Welcome to AI Document Editor',
        props: { level: 1 },
      },
      {
        id: generateId(),
        type: 'paragraph',
        content: 'Start typing your document here...',
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export const BlocksuiteEditor: FC<BlocksuiteEditorProps> = ({
  docId,
  workspaceId: _workspaceId,
  content: _content,
  onSave,
  onReady,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<DocumentData>(
    createDefaultDocument(docId)
  );
  const [loading, setLoading] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedRef = useRef<DocumentData | null>(null);

  // 加载文档
  useEffect(() => {
    const loadDoc = async () => {
      try {
        const loadedDoc = await documentService.getDoc(docId);
        if (loadedDoc && loadedDoc.blocks) {
          setDocument({
            id: loadedDoc.id,
            title: loadedDoc.title,
            blocks: loadedDoc.blocks.map(toEditorBlock),
            createdAt: loadedDoc.createdAt,
            updatedAt: loadedDoc.updatedAt,
          });
        }
      } catch (error) {
        console.error('Failed to load document:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDoc();
  }, [docId]);

  // 暴露编辑器方法
  const editorRef = useRef<BlocksuiteEditorHandle>({
    getDocument: () => document,
    insertBlock: (index: number, block: EditorBlock) => {
      setDocument(prev => {
        const newBlocks = [...prev.blocks];
        newBlocks.splice(index, 0, { ...block, id: generateId() });
        return { ...prev, blocks: newBlocks, updatedAt: Date.now() };
      });
    },
    updateBlock: (blockId: string, newContent: string) => {
      setDocument(prev => ({
        ...prev,
        blocks: prev.blocks.map(block =>
          block.id === blockId ? { ...block, content: newContent } : block
        ),
        updatedAt: Date.now(),
      }));
    },
    deleteBlock: (blockId: string) => {
      setDocument(prev => ({
        ...prev,
        blocks: prev.blocks.filter(block => block.id !== blockId),
        updatedAt: Date.now(),
      }));
    },
    insertAIContent: (aiContent: string) => {
      // 在当前选中块后插入 AI 生成的内容
      setDocument(prev => {
        const selectedIndex = selectedBlockId
          ? prev.blocks.findIndex(b => b.id === selectedBlockId)
          : prev.blocks.length - 1;

        const newBlock: EditorBlock = {
          id: generateId(),
          type: 'paragraph',
          content: aiContent,
        };

        const newBlocks = [...prev.blocks];
        newBlocks.splice(selectedIndex + 1, 0, newBlock);

        return { ...prev, blocks: newBlocks, updatedAt: Date.now() };
      });
    },
    replaceSelection: (newContent: string) => {
      // 替换选中的块内容
      if (selectedBlockId) {
        setDocument(prev => ({
          ...prev,
          blocks: prev.blocks.map(block =>
            block.id === selectedBlockId
              ? { ...block, content: newContent }
              : block
          ),
          updatedAt: Date.now(),
        }));
      }
    },
  });

  // 初始化时通知父组件
  useEffect(() => {
    if (!loading) {
      onReady?.(editorRef.current);
      console.log('Blocksuite editor initialized for doc:', docId);
    }
  }, [docId, onReady, loading]);

  // 监听 AI Chat 事件
  useEffect(() => {
    const handleInsertContent = (event: CustomEvent) => {
      const { content } = event.detail;
      console.log('AI inserting content:', content);
      editorRef.current.insertAIContent(content);
    };

    const handleReplaceSelection = (event: CustomEvent) => {
      const { content } = event.detail;
      console.log('AI replacing selection:', content);
      editorRef.current.replaceSelection(content);
    };

    window.addEventListener(
      'ai-insert-content',
      handleInsertContent as EventListener
    );
    window.addEventListener(
      'ai-replace-selection',
      handleReplaceSelection as EventListener
    );

    return () => {
      window.removeEventListener(
        'ai-insert-content',
        handleInsertContent as EventListener
      );
      window.removeEventListener(
        'ai-replace-selection',
        handleReplaceSelection as EventListener
      );
    };
  }, []);

  // 自动保存到 DocumentService
  useEffect(() => {
    if (loading || document === lastSavedRef.current) return;

    const saveTimer = setTimeout(async () => {
      try {
        setIsSaving(true);

        // 保存到 DocumentService (自动处理本地 IndexedDB + AFFiNE 同步)
        await documentService.updateDoc(docId, {
          title: document.title,
          blocks: document.blocks.map(toDocumentBlock),
        });

        lastSavedRef.current = document;

        // 通知父组件保存完成
        if (onSave) {
          onSave(document);
        }

        console.log('Document auto-saved:', docId);
      } catch (error) {
        console.error('Failed to save document:', error);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [document, docId, onSave, loading]);

  // 添加新块
  const addBlock = useCallback((type: BlockType = 'paragraph') => {
    const newBlock: EditorBlock = {
      id: generateId(),
      type,
      content: '',
    };

    setDocument(prev => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
      updatedAt: Date.now(),
    }));
  }, []);

  // 更新块内容
  const updateBlockContent = useCallback(
    (blockId: string, newContent: string) => {
      setDocument(prev => ({
        ...prev,
        blocks: prev.blocks.map(block =>
          block.id === blockId ? { ...block, content: newContent } : block
        ),
        updatedAt: Date.now(),
      }));
    },
    []
  );

  // 删除块
  const deleteBlock = useCallback((blockId: string) => {
    setDocument(prev => {
      const newBlocks = prev.blocks.filter(block => block.id !== blockId);
      // 至少保留一个块
      if (newBlocks.length === 0) {
        return prev;
      }
      return { ...prev, blocks: newBlocks, updatedAt: Date.now() };
    });
  }, []);

  // 更改块类型
  const changeBlockType = useCallback((blockId: string, newType: BlockType) => {
    setDocument(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === blockId ? { ...block, type: newType } : block
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  // 渲染单个块
  const renderBlock = useCallback(
    (block: EditorBlock) => {
      const isSelected = selectedBlockId === block.id;

      const blockStyle = {
        padding: '8px 0',
        position: 'relative' as const,
        border: isSelected ? '2px solid #667eea' : '2px solid transparent',
        borderRadius: '4px',
        transition: 'all 0.2s',
      };

      const baseProps = {
        style: blockStyle,
        onClick: () => setSelectedBlockId(block.id),
        onFocus: () => setSelectedBlockId(block.id),
      };

      switch (block.type) {
        case 'heading':
          const level = block.props?.level || 1;
          return (
            <div key={block.id} {...baseProps}>
              <h2
                contentEditable={!readOnly}
                suppressContentEditableWarning
                style={{
                  fontSize:
                    level === 1 ? '2em' : level === 2 ? '1.5em' : '1.25em',
                  fontWeight: 'bold',
                  margin: 0,
                  outline: 'none',
                }}
                onInput={e =>
                  updateBlockContent(
                    block.id,
                    e.currentTarget.textContent || ''
                  )
                }
              >
                {block.content}
              </h2>
            </div>
          );

        case 'list':
          return (
            <div key={block.id} {...baseProps}>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  style={{ outline: 'none' }}
                  onInput={e =>
                    updateBlockContent(
                      block.id,
                      e.currentTarget.textContent || ''
                    )
                  }
                >
                  {block.content}
                </li>
              </ul>
            </div>
          );

        case 'code':
          return (
            <div key={block.id} {...baseProps}>
              <pre
                style={{
                  background: '#f5f5f5',
                  padding: '12px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                <code
                  contentEditable={!readOnly}
                  suppressContentEditableWarning
                  style={{ outline: 'none' }}
                  onInput={e =>
                    updateBlockContent(
                      block.id,
                      e.currentTarget.textContent || ''
                    )
                  }
                >
                  {block.content}
                </code>
              </pre>
            </div>
          );

        case 'divider':
          return (
            <div key={block.id} {...baseProps}>
              <hr
                style={{
                  border: 'none',
                  borderTop: '2px solid #e0e0e0',
                  margin: '16px 0',
                }}
              />
            </div>
          );

        default: // paragraph
          return (
            <div key={block.id} {...baseProps}>
              <p
                contentEditable={!readOnly}
                suppressContentEditableWarning
                style={{
                  margin: 0,
                  outline: 'none',
                  minHeight: '1.5em',
                  lineHeight: '1.6',
                }}
                onInput={e =>
                  updateBlockContent(
                    block.id,
                    e.currentTarget.textContent || ''
                  )
                }
              >
                {block.content}
              </p>
            </div>
          );
      }
    },
    [selectedBlockId, readOnly, updateBlockContent]
  );

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
      }}
    >
      {/* Loading 状态 */}
      {loading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            fontSize: '16px',
            color: '#999',
          }}
        >
          加载文档中...
        </div>
      ) : (
        <>
          {/* 工具栏 */}
          {!readOnly && (
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                background: '#fafafa',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => addBlock('paragraph')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="添加段落"
              >
                + 段落
              </button>
              <button
                onClick={() => addBlock('heading')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="添加标题"
              >
                + 标题
              </button>
              <button
                onClick={() => addBlock('list')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="添加列表"
              >
                + 列表
              </button>
              <button
                onClick={() => addBlock('code')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="添加代码块"
              >
                + 代码
              </button>
              <button
                onClick={() => addBlock('divider')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: 'white',
                  border: '1px solid #d0d0d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                title="添加分割线"
              >
                + 分割线
              </button>

              <div
                style={{
                  width: '1px',
                  height: '24px',
                  background: '#ddd',
                  margin: '0 8px',
                }}
              />

              {selectedBlockId && (
                <>
                  <button
                    onClick={() =>
                      changeBlockType(selectedBlockId, 'paragraph')
                    }
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      background: 'white',
                      border: '1px solid #d0d0d0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    段落
                  </button>
                  <button
                    onClick={() => changeBlockType(selectedBlockId, 'heading')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      background: 'white',
                      border: '1px solid #d0d0d0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    标题
                  </button>
                  <button
                    onClick={() => changeBlockType(selectedBlockId, 'list')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      background: 'white',
                      border: '1px solid #d0d0d0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    列表
                  </button>
                  <button
                    onClick={() => changeBlockType(selectedBlockId, 'code')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      background: 'white',
                      border: '1px solid #d0d0d0',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    代码
                  </button>
                  <button
                    onClick={() => deleteBlock(selectedBlockId)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      background: '#fee',
                      border: '1px solid #fcc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#c00',
                    }}
                  >
                    删除
                  </button>
                </>
              )}

              <span
                style={{ fontSize: '12px', color: '#666', marginLeft: 'auto' }}
              >
                {isSaving ? '💾 保存中...' : '💾 已保存'}
              </span>
            </div>
          )}

          {/* 编辑器区域 */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '40px',
            }}
          >
            <div
              style={{
                maxWidth: '800px',
                margin: '0 auto',
                minHeight: '400px',
              }}
            >
              {/* 文档标题 */}
              <input
                type="text"
                value={document.title}
                onChange={e =>
                  setDocument(prev => ({
                    ...prev,
                    title: e.target.value,
                    updatedAt: Date.now(),
                  }))
                }
                placeholder="文档标题"
                readOnly={readOnly}
                style={{
                  width: '100%',
                  fontSize: '2em',
                  fontWeight: 'bold',
                  border: 'none',
                  outline: 'none',
                  marginBottom: '20px',
                  background: 'transparent',
                }}
              />

              {/* 文档块 */}
              {document.blocks.map(block => renderBlock(block))}

              {/* 空白点击区域 - 添加新段落 */}
              {!readOnly && (
                <div
                  onClick={() => addBlock('paragraph')}
                  style={{
                    padding: '20px',
                    color: '#999',
                    cursor: 'text',
                    textAlign: 'center',
                  }}
                >
                  点击添加新内容...
                </div>
              )}
            </div>
          </div>

          {/* 状态栏 */}
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid #e0e0e0',
              fontSize: '12px',
              color: '#999',
              display: 'flex',
              justifyContent: 'space-between',
              background: '#fafafa',
            }}
          >
            <span>
              {document.blocks.length} 个块 |{' '}
              {document.blocks.reduce((sum, b) => sum + b.content.length, 0)}{' '}
              字符
            </span>
            <span>
              最后更新: {new Date(document.updatedAt).toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
