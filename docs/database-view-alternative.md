# 真正的数据库表视图实现方案（使用 Dexie.js）

## 概述

由于 AFFiNE 不支持真正的数据库表视图 API，我们提供一个基于 **Dexie.js**（IndexedDB 的封装）的自建数据库方案。

---

## 方案对比

| 方案         | AFFiNE 文档块  | Dexie.js (IndexedDB) | PostgreSQL 直连      |
| ------------ | -------------- | -------------------- | -------------------- |
| **数据存储** | AFFiNE 服务器  | 浏览器本地数据库     | affine_postgres 容器 |
| **性能**     | 低（网络请求） | 高（本地访问）       | 最高                 |
| **复杂查询** | ❌ 不支持      | ✅ 支持              | ✅ 支持              |
| **持久化**   | ✅ 云端存储    | ⚠️ 仅本地            | ✅ 云端存储          |
| **离线支持** | ❌ 需要网络    | ✅ 完全离线          | ❌ 需要网络          |
| **实现难度** | 低             | 中                   | 高                   |

---

## 推荐实现：Dexie.js 方案

### 安装依赖

```bash
cd /home/ubuntu/proj/AFFiNE/src/web
npm install dexie
```

### 数据库服务实现

```typescript
// src/web/services/database.service.ts
import Dexie, { Table } from 'dexie';

// 定义数据类型
export interface DatabaseTable {
  id: string;
  name: string;
  description?: string;
  workspaceId?: string;
  columns: DatabaseColumn[];
  createdAt: number;
  updatedAt: number;
}

export interface DatabaseColumn {
  id: string;
  tableId: string;
  name: string;
  type: ColumnType;
  visible: boolean;
  order: number;
  width?: number;
}

export type ColumnType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'CHECKBOX' | 'URL' | 'EMAIL' | 'PHONE';

export interface DatabaseRow {
  id: string;
  tableId: string;
  cells: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface DatabaseCell {
  id: string;
  rowId: string;
  columnId: string;
  value: any;
  updatedAt: number;
}

// 定义 Dexie 数据库
class AppDatabase extends Dexie {
  tables!: Dexie.Tables;

  // 表定义
  databaseTables!: Table<DatabaseTable, string>;
  databaseColumns!: Table<DatabaseColumn, string>;
  databaseRows!: Table<DatabaseRow, string>;
  databaseCells!: Table<DatabaseCell, string>;

  constructor() {
    super('AIEditorDatabase');

    // 定义表结构
    this.version(1).stores({
      databaseTables: 'id, workspaceId, createdAt, updatedAt',
      databaseColumns: 'id, tableId, visible, order',
      databaseRows: 'id, tableId, createdAt, updatedAt',
      databaseCells: 'id, rowId, columnId, updatedAt',
    });
  }
}

const db = new AppDatabase();

// 数据库服务
export const databaseService = {
  // ========== 表操作 ==========

  async createTable(name: string, columns: Omit<DatabaseColumn, 'id' | 'tableId'>[], workspaceId?: string): Promise<DatabaseTable> {
    const tableId = `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const table: DatabaseTable = {
      id: tableId,
      name,
      columns: columns.map((col, idx) => ({
        ...col,
        id: `col-${Date.now()}-${idx}`,
        tableId,
      })),
      workspaceId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.databaseTables.add(table);

    // 添加列到数据库
    for (const column of table.columns) {
      await db.databaseColumns.add(column);
    }

    return table;
  },

  async getTable(tableId: string): Promise<DatabaseTable | undefined> {
    const table = await db.databaseTables.get(tableId);
    if (table) {
      const columns = await db.databaseColumns.where('tableId').equals(tableId).sortBy('order');
      table.columns = columns;
    }
    return table;
  },

  async listTables(workspaceId?: string): Promise<DatabaseTable[]> {
    let tables: DatabaseTable[];

    if (workspaceId) {
      tables = await db.databaseTables.where('workspaceId').equals(workspaceId).toArray();
    } else {
      tables = await db.databaseTables.toArray();
    }

    // 加载每张表的列
    for (const table of tables) {
      table.columns = await db.databaseColumns.where('tableId').equals(table.id).sortBy('order');
    }

    return tables;
  },

  async updateTable(tableId: string, updates: Partial<DatabaseTable>): Promise<void> {
    await db.databaseTables.update(tableId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  async deleteTable(tableId: string): Promise<void> {
    // 删除表的所有列
    await db.databaseColumns.where('tableId').equals(tableId).delete();
    // 删除表的所有行
    await db.databaseRows.where('tableId').equals(tableId).delete();
    // 删除表
    await db.databaseTables.delete(tableId);
  },

  // ========== 行操作 ==========

  async addRow(tableId: string, cells: Record<string, any>): Promise<DatabaseRow> {
    const rowId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const row: DatabaseRow = {
      id: rowId,
      tableId,
      cells,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.databaseRows.add(row);

    return row;
  },

  async getRow(rowId: string): Promise<DatabaseRow | undefined> {
    return await db.databaseRows.get(rowId);
  },

  async getRows(tableId: string): Promise<DatabaseRow[]> {
    return await db.databaseRows.where('tableId').equals(tableId).toArray();
  },

  async updateRow(rowId: string, updates: Partial<DatabaseRow>): Promise<void> {
    await db.databaseRows.update(rowId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  async updateCell(rowId: string, columnId: string, value: any): Promise<void> {
    const row = await db.databaseRows.get(rowId);
    if (row) {
      const updatedCells = { ...row.cells, [columnId]: value };
      await db.databaseRows.update(rowId, {
        cells: updatedCells,
        updatedAt: Date.now(),
      });
    }
  },

  async deleteRow(rowId: string): Promise<void> {
    await db.databaseRows.delete(rowId);
  },

  async deleteRows(tableId: string): Promise<void> {
    await db.databaseRows.where('tableId').equals(tableId).delete();
  },

  // ========== 查询操作 ==========

  async query(
    tableId: string,
    options: {
      filter?: {
        columnId: string;
        operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'startsWith';
        value: any;
      }[];
      sort?: {
        columnId: string;
        order: 'asc' | 'desc';
      }[];
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<DatabaseRow[]> {
    let query = db.databaseRows.where('tableId').equals(tableId);

    // 获取所有行（需要在内存中过滤）
    let rows = await query.toArray();

    // 应用过滤
    if (options.filter && options.filter.length > 0) {
      rows = rows.filter(row => {
        return options.filter!.every(filter => {
          const cellValue = row.cells[filter.columnId];

          switch (filter.operator) {
            case 'eq':
              return cellValue === filter.value;
            case 'ne':
              return cellValue !== filter.value;
            case 'gt':
              return cellValue > filter.value;
            case 'lt':
              return cellValue < filter.value;
            case 'contains':
              return String(cellValue).toLowerCase().includes(String(filter.value).toLowerCase());
            case 'startsWith':
              return String(cellValue).toLowerCase().startsWith(String(filter.value).toLowerCase());
            default:
              return true;
          }
        });
      });
    }

    // 应用排序
    if (options.sort && options.sort.length > 0) {
      rows.sort((a, b) => {
        for (const sort of options.sort!) {
          const aValue = a.cells[sort.columnId];
          const bValue = b.cells[sort.columnId];

          if (aValue !== bValue) {
            const result = aValue < bValue ? -1 : 1;
            return sort.order === 'desc' ? -result : result;
          }
        }
        return 0;
      });
    }

    // 应用分页
    if (options.offset) {
      rows = rows.slice(options.offset);
    }
    if (options.limit) {
      rows = rows.slice(0, options.limit);
    }

    return rows;
  },

  async count(tableId: string): Promise<number> {
    return await db.databaseRows.where('tableId').equals(tableId).count();
  },

  // ========== 列操作 ==========

  async addColumn(tableId: string, column: Omit<DatabaseColumn, 'id' | 'tableId'>): Promise<DatabaseColumn> {
    // 获取当前列数量
    const existingColumns = await db.databaseColumns.where('tableId').equals(tableId).count();

    const newColumn: DatabaseColumn = {
      ...column,
      id: `col-${Date.now()}`,
      tableId,
      order: existingColumns,
    };

    await db.databaseColumns.add(newColumn);

    return newColumn;
  },

  async updateColumn(columnId: string, updates: Partial<DatabaseColumn>): Promise<void> {
    await db.databaseColumns.update(columnId, updates);
  },

  async deleteColumn(columnId: string): Promise<void> {
    await db.databaseColumns.delete(columnId);
  },

  // ========== 批量操作 ==========

  async bulkAddRows(tableId: string, rowsData: Record<string, any>[]): Promise<DatabaseRow[]> {
    const rows = rowsData.map(cells => ({
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tableId,
      cells,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    await db.databaseRows.bulkAdd(rows);

    return rows;
  },

  async bulkDeleteRows(rowIds: string[]): Promise<void> {
    await db.databaseRows.bulkDelete(rowIds);
  },

  // ========== 导入/导出 ==========

  async exportTable(tableId: string): Promise<{
    table: DatabaseTable;
    rows: DatabaseRow[];
  }> {
    const table = await this.getTable(tableId);
    const rows = await this.getRows(tableId);

    return { table: table!, rows };
  },

  async importTable(data: { table: DatabaseTable; rows: DatabaseRow[] }): Promise<void> {
    // 导入表
    const tableId = data.table.id;
    await db.databaseTables.put(data.table);

    // 导入列
    for (const column of data.table.columns) {
      await db.databaseColumns.put(column);
    }

    // 导入行
    await db.databaseRows.bulkPut(data.rows);
  },
};
```

---

## React 组件集成

```typescript
// src/web/components/database-table-real.tsx
import { FC, useEffect, useState } from 'react';
import { databaseService } from '../services/database.service';

export const DatabaseTableReal: FC<{
  tableId: string;
}> = ({ tableId }) => {
  const [table, setTable] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tableId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const tableData = await databaseService.getTable(tableId);
      const rowData = await databaseService.getRows(tableId);
      setTable(tableData);
      setRows(rowData);
    } catch (error) {
      console.error('Failed to load table:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = async () => {
    const newRow = await databaseService.addRow(tableId, {});
    setRows([...rows, newRow]);
  };

  const handleUpdateCell = async (rowId: string, columnId: string, value: any) => {
    await databaseService.updateCell(rowId, columnId, value);
    setRows(rows.map(row =>
      row.id === rowId
        ? { ...row, cells: { ...row.cells, [columnId]: value } }
        : row
    ));
  };

  if (loading) return <div>Loading...</div>;
  if (!table) return <div>Table not found</div>;

  return (
    <div>
      <h2>{table.name}</h2>
      <table>
        <thead>
          <tr>
            {table.columns.map((col: any) => (
              <th key={col.id}>{col.name}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {table.columns.map((col: any) => (
                <td key={col.id}>
                  <input
                    value={row.cells[col.id] || ''}
                    onChange={(e) => handleUpdateCell(row.id, col.id, e.target.value)}
                  />
                </td>
              ))}
              <td>
                <button onClick={() => databaseService.deleteRow(row.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={handleAddRow}>Add Row</button>
    </div>
  );
};
```

---

## 使用示例

```typescript
// 创建表
const table = await databaseService.createTable('Project Tasks', [
  { name: 'Task Name', type: 'TEXT', visible: true, order: 0 },
  { name: 'Status', type: 'SELECT', visible: true, order: 1 },
  { name: 'Priority', type: 'NUMBER', visible: true, order: 2 },
  { name: 'Due Date', type: 'DATE', visible: true, order: 3 },
]);

// 添加行
await databaseService.addRow(table.id, {
  [table.columns[0].id]: 'Complete documentation',
  [table.columns[1].id]: 'In Progress',
  [table.columns[2].id]: 1,
  [table.columns[3].id]: '2025-01-20',
});

// 查询（过滤 + 排序）
const results = await databaseService.query(table.id, {
  filter: [
    { columnId: table.columns[1].id, operator: 'eq', value: 'In Progress' },
    { columnId: table.columns[2].id, operator: 'gt', value: 0 },
  ],
  sort: [
    { columnId: table.columns[2].id, order: 'desc' }, // 按优先级降序
  ],
  limit: 10,
});

// 导出数据
const exportData = await databaseService.exportTable(table.id);
console.log(exportData);
```

---

## 总结

### AFFiNE 是否支持真正的数据库表视图？

**答案**: **不支持**。AFFiNE 是基于文档块的系统，不是传统的数据库系统。

### 推荐的实现方案

1. **使用 Dexie.js (IndexedDB)** - 推荐
   - 真正的数据库功能
   - 完全在本地运行
   - 支持复杂查询
   - 可以导出/导入数据

2. **继续使用 AFFiNE 文档块**
   - 数据存储在 AFFiNE
   - 功能有限
   - 适合简单场景

3. **直连 PostgreSQL**
   - 最强大的功能
   - 实现复杂
   - 需要额外的数据库连接

---

**文档生成**: 2025-01-16
**作者**: Claude Code
