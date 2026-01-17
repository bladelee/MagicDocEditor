# 数据库视图功能设计文档

**功能模块**: 数据库视图（Database View）
**类型**: 前端 + 后端设计
**版本**: 1.0.0
**最后更新**: 2025-01-16

---

## 📋 目录

1. [功能概述](#功能概述)
2. [需求分析](#需求分析)
3. [数据模型设计](#数据模型设计)
4. [后端API设计](#后端api设计)
5. [前端UI设计](#前端ui设计)
6. [视图类型实现](#视图类型实现)
7. [实现方案](#实现方案)

---

## 功能概述

### 核心功能

数据库视图功能允许用户将文档以结构化数据的方式展示和管理，提供类似 Notion Database 的表格、看板、日历、画廊等视图。

### 主要特性

1. **多视图支持**: 表格、看板、日历、画廊
2. **列类型定义**: 文本、数字、日期、标签、人员、文件等
3. **数据编辑**: 直接在视图中编辑数据
4. **筛选和排序**: 多条件筛选、多列排序
5. **数据关联**: 文档与数据库视图双向绑定
6. **权限控制**: 视图级别的访问控制

---

## 需求分析

### 用户故事

虽然原始需求文档中未明确提及数据库视图，但基于评审意见，此功能为**必须功能**。

**核心需求**:

1. 文档可以作为数据库视图展示
2. 支持多种视图类型（表格、看板等）
3. 数据实时同步
4. 支持数据筛选和排序
5. 嵌入场景下可正常使用

### 用户角色

| 角色       | 权限                   |
| ---------- | ---------------------- |
| **查看者** | 查看视图、只读模式     |
| **编辑者** | 编辑数据、创建/删除行  |
| **所有者** | 修改视图配置、权限管理 |

---

## 数据模型设计

### GraphQL Schema

```graphql
# 数据库视图
type DatabaseView {
  id: ID!
  name: String!                  # 视图名称
  description: String             # 描述
  docId: ID!                     # 关联的文档ID
  mode: ViewMode!                # 视图类型
  columns: [DatabaseColumn!]!   # 列定义
  filters: [DatabaseFilter!]     # 筛选条件
  sorts: [DatabaseSort!]        # 排序规则
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User
}

# 视图类型
enum ViewMode {
  TABLE                         # 表格视图
  KANBAN                        # 看板视图
  CALENDAR                      # 日历视图
  GALLERY                       # 画廊视图
  LIST                          # 列表视图
}

# 列定义
type DatabaseColumn {
  id: ID!
  name: String!                 # 列名
  type: ColumnType!             # 列类型
  property: String!             # 对应文档属性
  config: ColumnConfig           # 列配置
  width: Int                    # 列宽（像素）
  visible: Boolean!             # 是否可见
  sortable: Boolean!            # 是否可排序
  filterable: Boolean!          # 是否可筛选
}

# 列类型
enum ColumnType {
  TEXT                          # 文本
  NUMBER                        # 数字
  DATE                          # 日期
  SELECT                        # 单选
  MULTI_SELECT                  # 多选
  PERSON                        # 人员
  FILE                          # 文件
  CHECKBOX                      # 复选框
  URL                           # 链接
  EMAIL                         # 邮箱
  PHONE                         # 电话
  PROGRESS                      # 进度条
  RATING                        # 评分
}

# 列配置
type ColumnConfig {
  # 文本类型
  textColor?: ColumnTextColorConfig

  # 数字类型
  numberFormat?: NumberFormatConfig

  # 日期类型
  dateFormat?: String            # 格式：YYYY-MM-DD
  showTime?: Boolean             # 是否显示时间

  # 选择类型
  options?: [SelectOption!]    # 选项列表

  # 进度条类型
  progressColor?: String         # 颜色
  showPercent?: Boolean          # 显示百分比

  # 评分类型
  maxRating?: Int                # 最大分值（默认5）
  starIcon?: String              # 星星/爱心等
}

type SelectOption {
  id: String!
  name: String!
  color: String                 # 标签颜色
}

# 筛选条件
type DatabaseFilter {
  id: ID!
  columnId: ID!                 # 列ID
  operator: FilterOperator!     # 操作符
  value: JSON                   # 筛选值
}

enum FilterOperator {
  EQUALS                        # 等于
  NOT_EQUALS                    # 不等于
  CONTAINS                      # 包含
  NOT_CONTAINS                  # 不包含
  STARTS_WITH                   # 开头是
  ENDS_WITH                     # 结尾是
  GREATER_THAN                  # 大于
  LESS_THAN                     # 小于
  BETWEEN                       # 在...之间
  IS_EMPTY                      # 为空
  IS_NOT_EMPTY                  # 不为空
}

# 排序规则
type DatabaseSort {
  columnId: ID!
  direction: SortDirection!
}

enum SortDirection {
  ASC
  DESC
}

# 数据行
type DatabaseRow {
  id: ID!
  viewId: ID!                  # 所属视图ID
  cells: JSON!                  # 单元格数据（JSON对象）
  createdBy: User
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

### 数据示例

**表格视图示例**:

```json
{
  "id": "view-123",
  "name": "任务列表",
  "docId": "doc-456",
  "mode": "TABLE",
  "columns": [
    {
      "id": "col-1",
      "name": "任务名称",
      "type": "TEXT",
      "property": "title",
      "width": 300,
      "visible": true,
      "sortable": true,
      "filterable": true
    },
    {
      "id": "col-2",
      "name": "状态",
      "type": "SELECT",
      "property": "status",
      "config": {
        "options": [
          { "id": "todo", "name": "待办", "color": "gray" },
          { "id": "in-progress", "name": "进行中", "color": "blue" },
          { "id": "done", "name": "已完成", "color": "green" }
        ]
      },
      "width": 120,
      "visible": true,
      "sortable": true,
      "filterable": true
    },
    {
      "id": "col-3",
      "name": "截止日期",
      "type": "DATE",
      "property": "dueDate",
      "config": {
        "dateFormat": "YYYY-MM-DD",
        "showTime": false
      },
      "width": 150,
      "visible": true,
      "sortable": true,
      "filterable": true
    },
    {
      "id": "col-4",
      "name": "负责人",
      "type": "PERSON",
      "property": "assignee",
      "width": 100,
      "visible": true,
      "sortable": true,
      "filterable": true
    }
  ],
  "rows": [
    {
      "id": "row-1",
      "cells": {
        "title": "完成UI设计",
        "status": "in-progress",
        "dueDate": "2025-01-20",
        "assignee": "user-123"
      }
    }
  ]
}
```

**看板视图示例**:

```json
{
  "id": "view-456",
  "name": "任务看板",
  "docId": "doc-456",
  "mode": "KANBAN",
  "columns": [
    {
      "id": "col-1",
      "name": "待办",
      "type": "SELECT",
      "property": "status",
      "config": {
        "options": [{ "id": "todo", "name": "待办", "color": "gray" }]
      }
    },
    {
      "id": "col-2",
      "name": "进行中",
      "type": "SELECT",
      "property": "status",
      "config": {
        "options": [{ "id": "in-progress", "name": "进行中", "color": "blue" }]
      }
    }
  ]
}
```

---

## 后端API设计

### GraphQL Mutations

```graphql
# 创建数据库视图
mutation CreateDatabaseView($input: CreateDatabaseViewInput!) {
  createDatabaseView(input: $input) {
    id
    name
    mode
    columns {
      id
      name
      type
      property
      config
    }
  }
}

# 更新数据库视图
mutation UpdateDatabaseView($id: ID!, $name: String, $mode: ViewMode, $columns: [DatabaseColumnInput!], $filters: [DatabaseFilterInput!], $sorts: [DatabaseSortInput!]) {
  updateDatabaseView(id: $id, input: { name: $name, mode: $mode, columns: $columns, filters: $filters, sorts: $sorts }) {
    id
    name
    updatedAt
  }
}

# 删除数据库视图
mutation DeleteDatabaseView($id: ID!) {
  deleteDatabaseView(id: $id) {
    id
    success
  }
}

# 添加/更新行
mutation UpsertDatabaseRow($viewId: ID!, $rowId: ID, $cells: JSON!) {
  upsertDatabaseRow(viewId: $viewId, rowId: $rowId, cells: $cells) {
    id
    cells
    updatedAt
  }
}

# 删除行
mutation DeleteDatabaseRow($viewId: ID!, $rowId: ID!) {
  deleteDatabaseRow(viewId: $viewId, rowId: $rowId) {
    id
    success
  }
}

# 批量更新行
mutation BatchUpdateRows($viewId: ID!, $updates: [RowUpdateInput!]!) {
  batchUpdateRows(viewId: $viewId, updates: $updates) {
    success
    updatedCount
  }
}
```

### GraphQL Queries

```graphql
# 获取数据库视图
query GetDatabaseView($id: ID!) {
  databaseView(id: $id) {
    id
    name
    description
    docId
    mode
    columns {
      id
      name
      type
      property
      config
      width
      visible
      sortable
      filterable
    }
    filters {
      id
      columnId
      operator
      value
    }
    sorts {
      columnId
      direction
    }
  }
}

# 获取视图数据（带筛选和排序）
query GetDatabaseViewData($viewId: ID!, $limit: Int, $offset: Int) {
  databaseViewData(viewId: $viewId, limit: $limit, offset: $offset) {
    rows {
      id
      cells
      createdBy {
        id
        name
        avatarUrl
      }
      createdAt
      updatedAt
    }
    totalCount
  }
}

# 搜索数据
query SearchDatabaseRows($viewId: ID!, $query: String!, $limit: Int) {
  searchDatabaseRows(viewId: $viewId, query: $query, limit: $limit) {
    rows {
      id
      cells
    }
    totalCount
  }
}
```

### 后端服务实现

```typescript
// packages/backend/server/src/core/database-view/database-view.service.ts

@Injectable()
export class DatabaseViewService {
  constructor(
    @Inject(DocTypeORMRepository) private docRepo: DocTypeORMRepository),
  ) {}

  /**
   * 创建数据库视图
   */
  async createView(
    userId: string,
    workspaceId: string,
    input: CreateDatabaseViewInput
  ): Promise<DatabaseView> {
    // 创建视图元数据
    const view = {
      type: 'database_view',
      workspaceId,
      userId,
      properties: {
        name: input.name,
        description: input.description,
        mode: input.mode,
        columns: input.columns,
        filters: [],
        sorts: [],
      },
    };

    const savedView = await this.docRepo.create(view);
    await this.docRepo.save(savedView);

    return savedView;
  }

  /**
   * 获取视图数据
   */
  async getViewData(
    viewId: string,
    options: {
      limit?: number;
      offset?: number;
      filters?: DatabaseFilter[];
      sorts?: DatabaseSort[];
    }
  ): Promise<{ rows: DatabaseRow[]; totalCount: number }> {
    // 1. 获取视图配置
    const view = await this.getView(viewId);

    // 2. 从关联的文档中提取数据
    const doc = await this.docRepo.load(view.docId);
    const data = this.extractDataFromDoc(doc);

    // 3. 应用筛选
    let filteredData = this.applyFilters(data, view.columns, options.filters || view.filters);

    // 4. 应用排序
    filteredData = this.applySorts(filteredData, view.columns, options.sorts || view.sorts);

    // 5. 分页
    const totalCount = filteredData.length;
    const { limit = 50, offset = 0 } = options;
    const paginatedData = filteredData.slice(offset, offset + limit);

    return {
      rows: paginatedData,
      totalCount,
    };
  }

  /**
   * 从文档中提取数据
   */
  private extractDataFromDoc(doc: Doc): DatabaseRow[] {
    // 文档内容是块结构，需要转换为表格数据
    const blocks = doc.blocks;
    const rows: DatabaseRow[] = [];

    // 假设文档有特定的结构来表示表格数据
    // 例如：每个块包含表格行数据
    const tableBlocks = blocks.filter(b => b.type === 'table');

    tableBlocks.forEach(block => {
      if (block.props && block.props.rows) {
        block.props.rows.forEach((rowData: any, index) => {
          rows.push({
            id: `row-${index}`,
            viewId: doc.id,
            cells: rowData,
            createdAt: doc.createdDate,
            updatedAt: doc.updatedDate,
          });
        });
      }
    });

    return rows;
  }

  /**
   * 应用筛选条件
   */
  private applyFilters(
    data: DatabaseRow[],
    columns: DatabaseColumn[],
    filters: DatabaseFilter[]
  ): DatabaseRow[] {
    if (filters.length === 0) return data;

    return data.filter((row) => {
      return filters.every((filter) => {
        const column = columns.find(c => c.id === filter.columnId);
        if (!column) return true;

        const cellValue = row.cells[column.property];
        return this.matchFilter(cellValue, filter);
      });
    });
  }

  /**
   * 匹配单个筛选条件
   */
  private matchFilter(value: any, filter: DatabaseFilter): boolean {
    const { operator, filterValue } = filter;

    switch (operator) {
      case 'EQUALS':
        return value === filterValue;
      case 'NOT_EQUALS':
        return value !== filterValue;
      case 'CONTAINS':
        return typeof value === 'string' && value.toLowerCase().includes(filterValue.toLowerCase());
      case 'NOT_CONTAINS':
        return typeof value === 'string' && !value.toLowerCase().includes(filterValue.toLowerCase());
      case 'STARTS_WITH':
        return typeof value === 'string' && value.toLowerCase().startsWith(filterValue.toLowerCase());
      case 'ENDS_WITH':
        return typeof value === 'string' && value.toLowerCase().endsWith(filterValue.toLowerCase());
      case 'GREATER_THAN':
        return typeof value === 'number' && value > filterValue;
      case 'LESS_THAN':
        return typeof value === 'number' && value < filterValue;
      case 'BETWEEN':
        return value >= filterValue.min && value <= filterValue.max;
      case 'IS_EMPTY':
        return !value || value === '' || value === null;
      case 'IS_NOT_EMPTY':
        return value && value !== '' && value !== null;
      default:
        return true;
    }
  }

  /**
   * 应用排序
   */
  private applySorts(
    data: DatabaseRow[],
    columns: DatabaseColumn[],
    sorts: DatabaseSort[]
  ): DatabaseRow[] {
    if (sorts.length === 0) return data;

    return [...data].sort((a, b) => {
      for (const sort of sorts) {
        const column = columns.find(c => c.id === sort.columnId);
        if (!column) continue;

        const aValue = a.cells[column.property];
        const bValue = b.cells[column.property];

        let comparison = 0;

        if (sort.direction === 'ASC') {
          comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          comparison = aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }

        if (comparison !== 0) return comparison;
      }

      return 0;
    });
  }

  /**
   * 更新行数据
   */
  async updateRow(
    viewId: string,
    rowId: string,
    cells: Record<string, any>
  ): Promise<DatabaseRow> {
    const view = await this.getView(viewId);

    // 从文档中更新对应的数据
    const doc = await this.docRepo.load(view.docId);
    const updatedDoc = this.updateDocWithRowData(doc, rowId, cells);

    await this.docRepo.save(updatedDoc);

    return {
      id: rowId,
      viewId,
      cells,
      updatedAt: new Date().toISOString(),
    } as DatabaseRow;
  }

  /**
   * 更新文档中的行数据
   */
  private updateDocWithRowData(doc: Doc, rowId: string, cells: Record<string, any>): Doc {
    // 找到对应的块并更新
    const updatedBlocks = doc.blocks.map(block => {
      if (block.type === 'table' && block.props?.rows) {
        const rowIndex = parseInt(rowId.split('-')[1]);
        if (block.props.rows[rowIndex]) {
          block.props.rows[rowIndex] = cells;
        }
      }
      return block;
    });

    return {
      ...doc,
      blocks: updatedBlocks,
      updatedAt: new Date().toISOString(),
    };
  }
}
```

---

## 前端UI设计

### 表格视图组件

```typescript
// src/web/components/database-table-view.tsx

interface DatabaseTableViewProps {
  viewId: string;
  onRowClick?: (row: DatabaseRow) => void;
}

export const DatabaseTableView: React.FC<DatabaseTableViewProps> = ({
  viewId,
  onRowClick,
}) => {
  const [view, setView] = useState<DatabaseView | null>(null);
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载视图数据
  useEffect(() => {
    loadViewAndData();
  }, [viewId]);

  const loadViewAndData = async () => {
    setLoading(true);
    try {
      // 加载视图配置
      const viewData = await apolloClient.query({
        query: GET_DATABASE_VIEW,
        variables: { id: viewId },
      });
      setView(viewData.data.databaseView);

      // 加载数据
      const dataResponse = await apolloClient.query({
        query: GET_DATABASE_VIEW_DATA,
        variables: { viewId },
      });
      setRows(dataResponse.data.databaseViewData.rows);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="database-table-view">
      {/* 工具栏 */}
      <ViewToolbar
        view={view}
        onRefresh={loadViewAndData}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
      />

      {/* 表格 */}
      <table className="data-table">
        <thead>
          <tr>
            {view?.columns.map((column) => (
              <th
                key={column.id}
                style={{ width: column.width }}
                className={column.sortable ? 'sortable' : ''}
                onClick={() => column.sortable && handleSortClick(column)}
              >
                <div className="th-content">
                  <span>{column.name}</span>
                  {column.sortable && <SortIcon />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className="data-row"
            >
              {view?.columns.map((column) => (
                <td key={column.id}>
                  <CellRenderer
                    column={column}
                    value={row.cells[column.property]}
                    onChange={(value) => handleCellChange(row.id, column, value)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 分页 */}
      <TablePagination
        totalCount={100}
        pageSize={20}
        onPageChange={handlePageChange}
      />
    </div>
  );
};
```

### 单元格渲染器

```typescript
// src/web/components/cell-renderer.tsx

interface CellRendererProps {
  column: DatabaseColumn;
  value: any;
  onChange?: (value: any) => void;
}

export const CellRenderer: React.FC<CellRendererProps> = ({
  column,
  value,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onChange?.(editValue);
    setIsEditing(false);
  };

  switch (column.type) {
    case 'TEXT':
      return isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />
      ) : (
        <span
          className="cell-text"
          onDoubleClick={() => {
            setEditValue(value);
            setIsEditing(true);
          }}
        >
          {value || '-'}
        </span>
      );

    case 'NUMBER':
      return isEditing ? (
        <Input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(parseFloat(e.target.value))}
          onBlur={handleSave}
          autoFocus
        />
      ) : (
        <span
          className="cell-number"
          onDoubleClick={() => {
            setEditValue(value);
            setIsEditing(true);
          }}
        >
          {value ?? '-'}
        </span>
      );

    case 'DATE':
      return (
        <span className="cell-date">
          {value ? formatDate(value, column.config.dateFormat) : '-'}
        </span>
      );

    case 'SELECT':
      case 'MULTI_SELECT':
      const option = column.config.options?.find((o) => o.id === value);
      return (
        <Tag
          color={option?.color || 'gray'}
          className="cell-tag"
        >
          {option?.name || value}
        </Tag>
      );

    case 'PERSON':
      return (
        <div className="cell-person">
          {value ? (
            <>
              <Avatar userId={value} size="sm" />
              <UserName userId={value} />
            </>
          ) : (
            '-'
          )}
        </div>
      );

    case 'FILE':
      return (
        <div className="cell-file">
          {value ? (
            <FileLink fileId={value} />
          ) : (
            '-'
          )}
        </div>
      );

    case 'CHECKBOX':
      return (
        <Checkbox
          checked={value === true}
          onChange={(checked) => onChange?.(checked)}
          disabled={!onChange}
        />
      );

    case 'PROGRESS':
      return (
        <ProgressBar
          value={value || 0}
          color={column.config.progressColor}
          showPercent={column.config.showPercent}
        />
      );

    case 'RATING':
      return (
        <RatingStars
          value={value || 0}
          max={column.config.maxRating || 5}
          icon={column.config.starIcon}
          readonly={!onChange}
        />
      );

    default:
      return <span>{value}</span>;
  }
};
```

### 看板视图组件

```typescript
// src/web/components/database-kanban-view.tsx

interface DatabaseKanbanViewProps {
  viewId: string;
}

export const DatabaseKanbanView: React.FC<DatabaseKanbanViewProps> = ({ viewId }) => {
  const [view, setView] = useState<DatabaseView | null>(null);
  const [rows, setRows] = useState<DatabaseRow[]>([]);
  const [draggedRow, setDraggedRow] = useState<DatabaseRow | null>(null);

  useEffect(() => {
    loadViewAndData();
  }, [viewId]);

  const loadViewAndData = async () => {
    // 加载视图和数据...
  };

  // 按列分组数据
  const groupedData = useMemo(() => {
    if (!view || rows.length === 0) return {};

    const statusColumn = view.columns.find(c => c.type === 'SELECT' || c.type === 'MULTI_SELECT');
    if (!statusColumn) return {};

    // 根据选项分组
    const groups: Record<string, DatabaseRow[]> = {};

    statusColumn.config.options?.forEach((option) => {
      groups[option.id] = rows.filter(
        row => row.cells[statusColumn.property] === option.id
      );
    });

    return groups;
  }, [view, rows]);

  const handleDragStart = (row: DatabaseRow) => {
    setDraggedRow(row);
  };

  const handleDrop = async (targetColumn: string) => {
    if (!draggedRow) return;

    const statusColumn = view!.columns.find(c => c.type === 'SELECT');
    if (!statusColumn) return;

    // 更新行的状态
    await apolloClient.mutate({
      mutation: UPSERT_DATABASE_ROW,
      variables: {
        viewId,
        rowId: draggedRow.id,
        cells: {
          ...draggedRow.cells,
          [statusColumn.property]: targetColumn,
        },
      },
    });

    setDraggedRow(null);
    loadViewAndData(); // 重新加载数据
  };

  return (
    <div className="database-kanban-view">
      {/* 工具栏 */}
      <ViewToolbar view={view} onRefresh={loadViewAndData} />

      {/* 看板列 */}
      <div className="kanban-columns">
        {view?.columns.map((column) => {
          if (column.type !== 'SELECT' && column.type !== 'MULTI_SELECT') return null;

          const option = column.config.options?.find((o) => o.id === column.property);

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              rows={groupedData[column.property] || []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
          );
        })}
      </div>
    </div>
  );
};
```

### 看板列组件

```typescript
// src/web/components/kanban-column.tsx

interface KanbanColumnProps {
  column: DatabaseColumn;
  rows: DatabaseRow[];
  onDragStart: (row: DatabaseRow) => void;
  onDrop: (columnId: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  rows,
  onDragStart,
  onDrop,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    onDrop(column.property);
  };

  const option = column.config.options?.find((o) => o.id === column.property);

  return (
    <div
      className={`kanban-column ${isDraggingOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 列头 */}
      <div className="column-header">
        <Tag color={option?.color || 'gray'}>
          {option?.name}
        </Tag>
        <span className="column-count">{rows.length}</span>
      </div>

      {/* 卡片列表 */}
      <div className="column-cards">
        {rows.map((row) => (
          <KanbanCard
            key={row.id}
            row={row}
            draggable
            onDragStart={() => onDragStart(row)}
          />
        ))}
      </div>
    </div>
  );
};
```

### 看板卡片组件

```typescript
// src/web/components/kanban-card.tsx

interface KanbanCardProps {
  row: DatabaseRow;
  draggable?: boolean;
  onDragStart?: () => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  row,
  draggable = true,
  onDragStart,
}) => {
  return (
    <div
      className="kanban-card"
      draggable={draggable}
      onDragStart={onDragStart}
    >
      {/* 卡片内容 */}
      <div className="card-content">
        <h4>{row.cells.title}</h4>

        {/* 显示其他字段 */}
        <div className="card-meta">
          {row.cells.assignee && (
            <Avatar userId={row.cells.assignee} size="xs" />
          )}
          {row.cells.dueDate && (
            <span className="due-date">
              <CalendarIcon />
              {formatDate(row.cells.dueDate)}
            </span>
          )}
        </div>
      </div>

      {/* 卡片操作 */}
      <div className="card-actions">
        <IconButton size="sm" onClick={() => {/* 编辑 */}}>
          <EditIcon />
        </IconButton>
        <IconButton size="sm" onClick={() => {/* 删除 */}}>
          <TrashIcon />
        </IconButton>
      </div>
    </div>
  );
};
```

---

## 视图类型实现

### 1. 画廊视图 (Gallery)

```typescript
// src/web/components/database-gallery-view.tsx

export const DatabaseGalleryView: React.FC = ({ viewId }) => {
  return (
    <div className="database-gallery-view">
      <div className="gallery-grid">
        {rows.map((row) => (
          <GalleryCard
            key={row.id}
            row={row}
            onClick={() => {/* 显示详情 */}}
          />
        ))}
      </div>
    </div>
  );
};

const GalleryCard: React.FC<{ row: DatabaseRow }> = ({ row }) => {
  // 优先显示图片字段，其次显示标题
  const imageColumn = view?.columns.find(c => c.type === 'FILE');
  const titleColumn = view?.columns.find(c => c.type === 'TEXT');

  return (
    <div className="gallery-card" onClick={() => {/* 打开文档 */}}>
      {imageColumn && row.cells[imageColumn.property] && (
        <img
          src={row.cells[imageColumn.property]}
          alt={row.cells[titleColumn?.property || 'name']}
          className="gallery-image"
        />
      )}
      <div className="gallery-info">
        <h4>{row.cells[titleColumn?.property || 'name']}</h4>
      </div>
    </div>
  );
};
```

### 2. 日历视图 (Calendar)

```typescript
// src/web/components/database-calendar-view.tsx

export const DatabaseCalendarView: React.FC = ({ viewId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // 提取日历事件
  useEffect(() => {
    const dateColumn = view?.columns.find(c => c.type === 'DATE');
    if (!dateColumn) return;

    const calendarEvents = rows.map(row => ({
      id: row.id,
      title: row.cells.title,
      date: new Date(row.cells[dateColumn.property]),
      row,
    }));

    setEvents(calendarEvents);
  }, [rows, view]);

  return (
    <div className="database-calendar-view">
      {/* 日历头部 */}
      <CalendarHeader
        current={currentDate}
        onPrevMonth={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
        onNextMonth={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
      />

      {/* 日历网格 */}
      <CalendarGrid
        current={currentDate}
        events={events}
        onDateClick={(date) => {/* 显示该日期的事件 */}}
      />
    </div>
  );
};
```

---

## 实现方案

### 统一的视图容器

```typescript
// src/web/components/database-view-container.tsx

interface DatabaseViewContainerProps {
  docId: string;
}

export const DatabaseViewContainer: React.FC<DatabaseViewContainerProps> = ({
  docId,
}) => {
  const [view, setView] = useState<DatabaseView | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'calendar' | 'gallery'>('table');

  // 加载视图配置
  useEffect(() => {
    loadView();
  }, [docId]);

  return (
    <div className="database-view-container">
      {/* 视图切换器 */}
      <ViewModeSwitcher
        current={viewMode}
        onChange={setViewMode}
      />

      {/* 视图渲染器 */}
      {view && (
        <>
          {viewMode === 'table' && (
            <DatabaseTableView viewId={view.id} />
          )}
          {viewMode === 'kanban' && (
            <DatabaseKanbanView viewId={view.id} />
          )}
          {viewMode === 'calendar' && (
            <DatabaseCalendarView viewId={view.id} />
          )}
          {viewMode === 'gallery' && (
            <DatabaseGalleryView viewId={view.id} />
          )}
        </>
      )}
    </div>
  );
};
```

### 视图模式切换器

```typescript
// src/web/components/view-mode-switcher.tsx

interface ViewModeSwitcherProps {
  current: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeSwitcher: React.FC<ViewModeSwitcherProps> = ({
  current,
  onChange,
}) => {
  const modes = [
    { value: 'table', label: '表格', icon: TableIcon },
    { value: 'kanban', label: '看板', icon: KanbanIcon },
    { value: 'calendar', label: '日历', icon: CalendarIcon },
    { value: 'gallery', label: '画廊', icon: GalleryIcon },
  ];

  return (
    <div className="view-mode-switcher">
      {modes.map((mode) => (
        <button
          key={mode.value}
          className={`mode-btn ${current === mode.value ? 'active' : ''}`}
          onClick={() => onChange(mode.value as ViewMode)}
        >
          <mode.icon />
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
};
```

---

## API对接

### 与文档系统的集成

数据库视图与文档系统紧密集成：

1. **视图创建**: 基于文档创建数据库视图
2. **数据同步**: 视图中的数据修改同步回文档
3. **双向绑定**: 文档内容变化时视图自动更新

```typescript
// 同步更新
export class DatabaseViewSync {
  // 监听文档变化，更新视图
  async onDocUpdate(docId: string) {
    // 查找关联的视图
    const views = await this.findViewsByDocId(docId);

    // 更新所有视图的数据缓存
    for (const view of views) {
      this.invalidateViewCache(view.id);
    }
  }

  // 监听视图变化，更新文档
  async onViewUpdate(viewId: string, rowId: string, cells: Record<string, any>) {
    const view = await this.getView(viewId);

    // 更新文档中对应的数据
    await this.updateDocWithRowData(view.docId, rowId, cells);

    // 触发文档保存
    await this.saveDoc(view.docId);
  }
}
```

---

## 实现优先级

### Phase 1: 核心功能（必须实现）

- [ ] 后端 Schema 和 API
- [ ] 表格视图（完整功能）
- [ ] 列类型定义和渲染
- [ ] 数据编辑和保存
- [ ] 基础筛选和排序

### Phase 2: 其他视图（重要）

- [ ] 看板视图
- [ ] 画廊视图
- [ ] 日历视图
- [ ] 视图切换器

### Phase 3: 高级功能（可选）

- [ ] 公式化列
- [ ] 数据关联
- [ ] 导入/导出
- [ ] 权限控制
- [ ] 视图模板

---

**文档版本**: 1.0
**最后更新**: 2025-01-16
**预计工时**: 后端 (5-7天), 前端 (6-8天), 联调 (2-3天)
