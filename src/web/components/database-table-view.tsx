/**
 * Database Table View Component
 * Phase 1: Basic table view implementation
 */

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import {
  databaseViewService,
  type DatabaseView,
  type DatabaseRow,
  type DatabaseColumn,
} from '../services/database-view.js';

interface DatabaseTableViewProps {
  workspaceId: string;
  docId: string;
  onRowClick?: (row: DatabaseRow) => void;
}

export const DatabaseTableView: FC<DatabaseTableViewProps> = ({
  workspaceId,
  docId,
  onRowClick,
}) => {
  const [view, setView] = useState<DatabaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadView();
  }, [workspaceId, docId]);

  const loadView = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await databaseViewService.getDatabaseView(
        workspaceId,
        docId
      );
      setView(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellUpdate = async (
    rowId: string,
    columnId: string,
    value: any
  ) => {
    const success = await databaseViewService.updateCell(
      workspaceId,
      docId,
      rowId,
      columnId,
      value
    );
    if (success) {
      // Reload the view to reflect changes
      loadView();
    }
  };

  const handleAddRow = async () => {
    // Create a new row with empty cells
    const newCells: Record<string, any> = {};
    view?.columns.forEach(col => {
      newCells[col.id] = '';
    });

    const newRow = await databaseViewService.addRow(
      workspaceId,
      docId,
      newCells
    );
    if (newRow) {
      loadView();
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (confirm('确定要删除这一行吗？')) {
      const success = await databaseViewService.deleteRow(
        workspaceId,
        docId,
        rowId
      );
      if (success) {
        loadView();
      }
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#999',
        }}
      >
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00',
          fontSize: '13px',
        }}
      >
        ⚠️ 加载失败: {error.message}
      </div>
    );
  }

  if (!view) {
    return (
      <div
        style={{
          textAlign: 'center',
          color: '#999',
          marginTop: '40px',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <p style={{ margin: 0 }}>暂无表格视图</p>
      </div>
    );
  }

  const visibleColumns = view.columns.filter(col => col.visible !== false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '14px' }}>📊 {view.name}</div>
        <button
          onClick={handleAddRow}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          + 添加行
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              background: '#f9f9f9',
              zIndex: 1,
            }}
          >
            <tr>
              {visibleColumns.map(column => (
                <th
                  key={column.id}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #e0e0e0',
                    fontWeight: 600,
                    color: '#333',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {column.name}
                </th>
              ))}
              <th
                style={{
                  padding: '10px 12px',
                  borderBottom: '2px solid #e0e0e0',
                  width: '80px',
                }}
              />
            </tr>
          </thead>
          <tbody>
            {view.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + 1}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#999',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                    📭
                  </div>
                  <p style={{ margin: 0, fontSize: '13px' }}>暂无数据</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
                    点击"添加行"按钮创建第一条记录
                  </p>
                </td>
              </tr>
            ) : (
              view.rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  onMouseEnter={e => {
                    if (onRowClick) {
                      e.currentTarget.style.background = '#f9f9f9';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {visibleColumns.map(column => (
                    <td
                      key={column.id}
                      style={{
                        padding: '10px 12px',
                        color: '#333',
                      }}
                    >
                      <CellEditor
                        column={column}
                        value={row.cells[column.id]}
                        onChange={value =>
                          handleCellUpdate(row.id, column.id, value)
                        }
                      />
                    </td>
                  ))}
                  <td
                    style={{
                      padding: '10px 12px',
                    }}
                  >
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteRow(row.id);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        background: '#fff',
                        border: '1px solid #f56565',
                        color: '#f56565',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="删除行"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid #e0e0e0',
          background: '#fafafa',
          fontSize: '11px',
          color: '#999',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>共 {view.rows.length} 行</span>
        <span>点击单元格可编辑内容</span>
      </div>
    </div>
  );
};

/**
 * Cell Editor Component
 */
interface CellEditorProps {
  column: DatabaseColumn;
  value: any;
  onChange?: (value: any) => void;
}

const CellEditor: FC<CellEditorProps> = ({ column, value, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const handleSave = () => {
    onChange?.(editValue);
    setIsEditing(false);
  };

  if (column.type === 'TEXT') {
    return isEditing ? (
      <input
        type="text"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            handleSave();
          }
        }}
        autoFocus
        style={{
          width: '100%',
          padding: '4px 8px',
          border: '1px solid #667eea',
          borderRadius: '4px',
          fontSize: '13px',
          outline: 'none',
        }}
      />
    ) : (
      <span
        onClick={() => {
          setEditValue(value || '');
          setIsEditing(true);
        }}
        style={{
          cursor: 'pointer',
          minHeight: '20px',
          display: 'block',
        }}
      >
        {value || '-'}
      </span>
    );
  }

  if (column.type === 'NUMBER') {
    return isEditing ? (
      <input
        type="number"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        autoFocus
        style={{
          width: '100%',
          padding: '4px 8px',
          border: '1px solid #667eea',
          borderRadius: '4px',
          fontSize: '13px',
          outline: 'none',
        }}
      />
    ) : (
      <span
        onClick={() => {
          setEditValue(value || '');
          setIsEditing(true);
        }}
        style={{ cursor: 'pointer' }}
      >
        {value ?? '-'}
      </span>
    );
  }

  if (column.type === 'DATE') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange?.(e.target.value)}
        style={{
          padding: '4px 8px',
          border: '1px solid #d0d0d0',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      />
    );
  }

  if (column.type === 'SELECT') {
    return (
      <select
        value={value || ''}
        onChange={e => onChange?.(e.target.value)}
        style={{
          padding: '4px 8px',
          border: '1px solid #d0d0d0',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        <option value="">请选择...</option>
        <option value="todo">待办</option>
        <option value="in-progress">进行中</option>
        <option value="done">已完成</option>
      </select>
    );
  }

  if (column.type === 'CHECKBOX') {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={e => onChange?.(e.target.checked)}
        style={{ cursor: 'pointer' }}
      />
    );
  }

  return <span>{value || '-'}</span>;
};
