# AFFiNE 对接实现修正报告

**日期**: 2025-01-16
**状态**: 需要修正

---

## ⚠️ 发现的问题

经过实际的 GraphQL Schema 验证，发现之前的对接实现存在以下问题：

### 问题 1: listCopilotPrompts API 参数错误

**之前的实现**:

```typescript
const response = await apolloClient.query({
  query: gql(COPILOT_QUERIES.LIST_PROMPTS),
  variables: { workspaceId }, // ❌ 错误：这个 API 不接受 workspaceId
});
```

**实际情况**:

```graphql
query {
  listCopilotPrompts {
    # 不接受任何参数
    id
    name
    action
  }
}
```

**修正方案**:

```typescript
const response = await apolloClient.query({
  query: gql`
    query ListCopilotPrompts {
      listCopilotPrompts {
        id
        name
        description
        action
      }
    }
  `,
  // 移除 variables: { workspaceId }
});
```

### 问题 2: workspaces 查询字段错误

**之前的实现**:

```graphql
query {
  workspaces {
    id
    name # ❌ 错误：name 字段不存在
  }
}
```

**实际情况**:

```graphql
query {
  workspaces {
    id
    owner {
      id
      name # name 在 owner 对象里
    }
  }
}
```

**修正方案**:

```typescript
const response = await apolloClient.query({
  query: gql`
    query ListWorkspaces {
      workspaces {
        id
        owner {
          id
          name
        }
      }
    }
  `,
});
```

---

## 📝 需要更新的文件

### 1. src/web/services/ai.ts

**修改前**:

```typescript
async listPrompts(workspaceId?: string): Promise<any[]> {
  const response = await apolloClient.query({
    query: gql(COPILOT_QUERIES.LIST_PROMPTS),
    variables: { workspaceId },  // ❌ 移除这个
  });
  return response.data.listCopilotPrompts || [];
}
```

**修改后**:

```typescript
async listPrompts(_workspaceId?: string): Promise<any[]> {
  const response = await apolloClient.query({
    query: gql`
      query ListCopilotPrompts {
        listCopilotPrompts {
          id
          name
          description
          action
        }
      }
    `,
    // 不传递 workspaceId 参数
  });
  return response.data.listCopilotPrompts || [];
}
```

### 2. src/web/services/document.ts

**修改前**:

```typescript
async listWorkspaces(): Promise<any[]> {
  const response = await apolloClient.query({
    query: LIST_WORKSPACES,
  });
  return response.data.workspaces || [];  // 返回的字段结构不匹配
}
```

**修改后**:

```typescript
async listWorkspaces(): Promise<any[]> {
  const response = await apolloClient.query({
    query: gql`
      query ListWorkspaces {
        workspaces {
          id
          owner {
            id
            name
          }
        }
      }
    `,
  });
  return response.data.workspaces || [];
}
```

### 3. src/web/services/prompt-template.ts

**修改**:

```typescript
async listPrompts(_workspaceId?: string): Promise<PromptTemplate[]> {
  const response = await apolloClient.query({
    query: gql`
      query ListCopilotPrompts {
        listCopilotPrompts {
          id
          name
          description
          action
        }
      }
    `,
  });
  return response.data.listCopilotPrompts || [];
}
```

---

## 🗄️ 关于数据库视图的重要发现

### 发现：AFFiNE 不支持真正的数据库表视图

经过深入的 Schema 验证，AFFiNE **没有**以下 API：

| API                    | 状态      | 说明                   |
| ---------------------- | --------- | ---------------------- |
| `createTable`          | ❌ 不存在 | 无法创建真正的数据库表 |
| `updateCell`           | ❌ 不存在 | 无法更新单元格         |
| `addRow` / `deleteRow` | ❌ 不存在 | 无法管理行数据         |
| `tableView`            | ❌ 不存在 | 无专门的表格视图 API   |

### AFFiNE 的实际数据模型

AFFiNE 使用的是**基于块（Block）**的文档系统，而不是传统的数据库表：

```
文档 (Doc)
  └─ 块 (Block)
      ├─ 段落块
      ├─ 标题块
      ├─ 代码块
      ├─ 表格块 (Table Block)  ← 表格只是一个块类型
      └─ 其他块类型
```

### 对当前实现的影响

**当前实现**（`src/web/services/database-view.ts` 和 `src/web/components/database-table-view.tsx`）：

```typescript
// 使用 AFFiNE 文档块模拟表格
async getDatabaseView(workspaceId: string, docId: string): Promise<DatabaseView | null> {
  const doc = await affineBackend.getDoc(workspaceId, docId);
  // 查找表格块...
}
```

**问题**:

1. 这个实现依赖于 AFFiNE 支持表格块
2. 表格块的 JSON 结构需要进一步验证
3. 更新表格块内容的方法（`updateBlock`）需要确认

---

## ✅ 推荐的解决方案

### 方案 A：继续使用文档块（当前方案）

**适用场景**: 简单的表格数据，数据量不大

**优点**:

- 数据存储在 AFFiNE
- 与文档系统集成

**缺点**:

- 性能受限
- 不支持复杂查询
- 不适合大量数据

**实现**:

```typescript
// 表格数据作为文档块存储
{
  flavour: 'affine:table',
  props: {
    title: '表格标题',
    columns: [...],
    rows: [...]
  }
}
```

### 方案 B：使用 AFFiNE 搜索 + 轻量级本地数据库

**适用场景**: 需要真正的数据库功能

**架构**:

```
┌─────────────────────┐
│   前端应用          │
├─────────────────────┤
│ AFFiNE Service      │ ← 用于文档管理、AI Chat
│   ├─ docs           │
│   ├─ search        │
│   └─ copilot       │
├─────────────────────┤
│ Database Service    │ ← 自建轻量级数据库
│   ├─ Dexie.js (SQLite) 或
│   ├─ IndexedDB 或
│   └── PostgreSQL 直连
└─────────────────────┘
```

**优点**:

- 真正的数据库功能
- 完整的 CRUD 操作
- 支持复杂查询

**缺点**:

- 数据不与 AFFiNE 同步
- 需要额外的数据管理

**实现示例**:

```typescript
import Dexie from 'dexie';

class AppDatabase extends Dexie {
  tables!: Dexie.Tables;
  tableRows!: Dexie.Table<TableRow, string>;

  constructor() {
    super('AIEditorDatabase');
    this.version(1).stores({
      tableRows: 'tableId, rowId, data',
    });
  }
}

const db = new AppDatabase();

// CRUD 操作
async function addRow(tableId: string, row: TableRow) {
  await db.tableRows.add({ ...row, tableId });
}

async function updateRow(rowId: string, data: any) {
  await db.tableRows.update(rowId, { data });
}

async function queryTable(tableId: string, filter: any) {
  return await db.tableRows
    .where('tableId')
    .equals(tableId)
    .and(row => matchesFilter(row, filter))
    .toArray();
}
```

### 方案 C：使用 AFFiNE 文档作为数据源 + 前端虚拟数据库

**适用场景**: 数据需要与 AFFiNE 同步，但需要数据库功能

**架构**:

```
┌──────────────────────┐
│    前端应用          │
├──────────────────────┤
│ Virtual Database     │ ← 在前端实现数据库逻辑
│   ├─ 查询引擎        │
│   ├─ 索引           │
│   └─ 缓存           │
├──────────────────────┤
│ AFFiNE 文档          │ ← 数据持久化到 AFFiNE
│   └─ 表格文档         │
└──────────────────────┘
```

**优点**:

- 数据存储在 AFFiNE
- 前端实现数据库功能
- 无需额外的数据库

**缺点**:

- 复杂的查询逻辑
- 性能受限于数据量

---

## 📋 修正后的实现计划

### Phase 1: 修正 API 调用（立即）

1. ✅ 修正 `listCopilotPrompts` 调用（移除 workspaceId）
2. ✅ 修正 `workspaces` 查询字段
3. ✅ 修正文档列表获取方法

### Phase 2: 数据库视图方案选择（讨论）

**选项 1**: 继续使用文档块方案

- 验证表格块的 JSON 结构
- 实现 `updateBlock` 调用
- 接受性能限制

**选项 2**: 实现自建数据库服务

- 使用 Dexie.js (SQLite)
- 或连接到 affine_postgres
- 或使用 IndexedDB

**选项 3**: 混合方案（推荐）

- AFFiNE 用于文档管理和 AI
- 自建轻量级数据库用于表格数据
- 两边独立运行，互不干扰

### Phase 3: 认证集成

当前许多 API 需要认证，需要实现：

1. 登录功能
2. Cookie/Token 管理
3. 认证状态持久化

---

## 🧪 验证清单

完成以下验证后，我们可以确定最终的实现方案：

- [ ] 验证 `createCopilotSession` 的正确参数格式
- [ ] 验证 `createCopilotMessage` 的正确参数格式
- [ ] 验证表格块的完整 JSON 结构
- [ ] 验证 `updateBlock` mutation 是否可用
- [ ] 测试文档搜索（`workspace.searchDocs`）
- [ ] 确认认证方式和 Token 获取方法

---

**生成时间**: 2025-01-16
**生成者**: Claude Code
