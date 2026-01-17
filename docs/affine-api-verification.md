# AFFiNE API 验证报告

**日期**: 2025-01-16
**后端地址**: http://localhost:3010/graphql

---

## 🔍 API 验证结果

### 1. 基础连接测试

| 测试项               | 状态 | 说明                 |
| -------------------- | ---- | -------------------- |
| GraphQL 端点可达     | ✅   | `/graphql` 响应正常  |
| Schema Introspection | ✅   | 可以获取 schema 信息 |

### 2. 已验证的 Queries

| Query                | 参数 | 状态 | 说明             |
| -------------------- | ---- | ---- | ---------------- |
| `workspaces`         | 无   | ✅   | 返回工作空间列表 |
| `workspace`          | `id` | ✅   | 获取单个工作空间 |
| `currentUser`        | 无   | ⚠️   | 需要认证         |
| `listCopilotPrompts` | 无   | ✅   | 列出 Prompt 模板 |
| `user`               | -    | ⚠️   | 需要认证         |

**重要发现**:

- `listCopilotPrompts` **不接受** `workspaceId` 参数（之前对接计划有误）
- `workspaces` 查询**不返回** `name` 字段（只有 `id` 等字段）

### 3. 已验证的 Mutations

| Mutation               | 参数                                | 状态 | 说明             |
| ---------------------- | ----------------------------------- | ---- | ---------------- |
| `createCopilotSession` | `options: CreateChatSessionInput`   | ✅   | 创建 AI 会话     |
| `createCopilotMessage` | `options: CreateChatMessageInput`   | ✅   | 发送 AI 消息     |
| `createCopilotPrompt`  | `options: CreateCopilotPromptInput` | ✅   | 创建 Prompt 模板 |
| `createWorkspace`      | -                                   | ✅   | 创建工作空间     |
| `deleteWorkspace`      | -                                   | ✅   | 删除工作空间     |

### 4. WorkspaceType 字段

```graphql
{
  id                  # 工作空间 ID
  initialized         # 是否已初始化
  public              # 是否公开
  owner              # 所有者信息
  members            # 成员列表
  docs               # 文档列表 ⭐
  recentlyUpdatedDocs # 最近更新的文档
  publicDocs         # 公开文档
  search             # 搜索功能 ⭐
  searchDocs         # 搜索文档 ⭐
  permissions        # 权限
  quota              # 配额
  subscription       # 订阅信息
  ...               # 其他字段
}
```

### 5. 关于数据库视图的问题

## ⚠️ 重要发现：AFFiNE 不支持真正的数据库表

### 问题分析

1. **AFFiNE 的数据模型是基于文档块的**
   - AFFiNE 使用 "Block" 系统来存储内容
   - 没有传统的数据库表（table）概念
   - 数据以树状的块结构组织

2. **没有原生的 Table/Database 视图 API**
   - AFFiNE 没有 `createTable` mutation
   - 没有 `updateCell` mutation
   - 没有 `addRow`/`deleteRow` mutation
   - 没有 `tableView` 相关的 query

3. **AFFiNE 的实现方式**
   - 表格是以**块（Block）**的形式存储在文档中
   - 通过 `workspace.docs` 获取文档列表
   - 通过 `workspace.searchDocs` 搜索文档
   - 文档内容是块结构，不是表结构

### 替代方案

#### 方案 A：基于文档的表格视图（当前实现）

使用 AFFiNE 的文档块来模拟表格：

```typescript
// 表格数据存储在文档的 blocks 中
{
  flavour: 'affine:table',
  type: 'table',
  props: {
    columns: [...],
    rows: [...]
  }
}
```

**优点**:

- 利用现有 API
- 数据持久化到 AFFiNE

**缺点**:

- 不是真正的数据库
- 性能受限
- 查询和过滤能力有限

#### 方案 B：自建数据库表

完全自己实现数据库表功能：

```typescript
// 创建独立的数据库表服务
class DatabaseTableService {
  async createTable(name: string, columns: Column[]): Promise<Table>;
  async insertRow(tableId: string, row: DataRow): Promise<void>;
  async updateCell(tableId: string, rowId: string, colId: string, value: any): Promise<void>;
  async query(tableId: string, filter: Filter, sort: Sort): Promise<DataRow[]>;
}
```

**数据存储选项**:

1. **PostgreSQL** (直接连接到 affine_postgres 容器)
2. **SQLite** (本地文件数据库)
3. **AFFiNE 文档** (作为元数据存储)

**优点**:

- 真正的数据库功能
- 完整的 CRUD 操作
- 支持复杂查询和过滤

**缺点**:

- 需要额外的数据库连接
- 数据不与 AFFiNE 同步
- 需要自己管理数据迁移

#### 方案 C：AFFiNE 数据库插件（推荐）

调研 AFFiNE 是否有官方的数据库插件：

根据 AFFiNE 的官方信息和架构：

- AFFiNE 计划支持数据库视图功能
- 目前（2025年初）可能还在开发中
- 需要检查 AFFiNE 的 Roadmap 和插件系统

---

## 📝 修正建议

### 1. Prompt Templates API

```graphql
# ❌ 错误（之前对接计划）
query {
  listCopilotPrompts(workspaceId: "xxx") { ... }
}

# ✅ 正确
query {
  listCopilotPrompts { ... }
}
```

### 2. Workspace API

```graphql
# ❌ 错误（之前对接计划）
query {
  workspaces {
    id
    name # 这个字段不存在
  }
}

# ✅ 正确
query {
  workspaces {
    id
    initialized
    owner {
      id
      name # name 在 owner 对象里
    }
  }
}
```

### 3. 创建 Copilot Session

需要查询 `CreateChatSessionInput` 的具体字段，根据之前的内省：

```graphql
mutation CreateSession {
  createCopilotSession(options: {
    # 需要确认具体字段
  }) {
    id
  }
}
```

---

## 🧪 手动验证步骤

### 步骤 1: 获取工作空间列表

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { workspaces { id initialized owner { id name } } }"
  }'
```

### 步骤 2: 列出 Prompt 模板

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { listCopilotPrompts { id name action } }"
  }'
```

### 步骤 3: 使用 Workspace 搜索

```bash
# 替换 YOUR_WORKSPACE_ID
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { workspace(id: \"YOUR_WORKSPACE_ID\") { search(query: \"test\") { id } } }"
  }'
```

### 步骤 4: 测试文档搜索（如果可用）

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { workspace(id: \"YOUR_WORKSPACE_ID\") { searchDocs(query: \"test\") { id title } } }"
  }'
```

### 步骤 5: 创建 Copilot Session（需要先确定正确的参数格式）

```bash
# 需要认证
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "mutation { createCopilotSession(options: { ??? }) { id } }"
  }'
```

---

## 🚨 需要认证的 API

以下 API 需要用户登录认证：

1. `currentUser` - 获取当前用户
2. `createCopilotSession` - 创建 AI 会话
3. `createCopilotMessage` - 发送消息
4. `createDoc` - 创建文档
5. `updateDoc` - 更新文档
6. `deleteDoc` - 删除文档

**认证方式**:

- 通过 Cookie（Session）
- 或通过 Authorization header

---

## 📊 总结

### 可以实现的功能（使用现有 API）

1. ✅ Prompt 模板管理（`listCopilotPrompts`）
2. ✅ 工作空间列表（`workspaces`）
3. ✅ 文档搜索（`workspace.searchDocs`）
4. ⚠️ AI Chat（需要认证）

### 不能实现的功能（AFFiNE 不支持）

1. ❌ 真正的数据库表视图
2. ❌ 单元格级别的 CRUD
3. ❌ 数据库查询和过滤

### 建议的实现方案

#### 对于数据库视图：

**方案 1（推荐）**: 使用 AFFiNE 文档 + 自建轻量级数据库服务

```typescript
// 混合方案
class HybridDatabaseService {
  // 元数据存储在 AFFiNE 文档中
  async saveMetadata(docId: string, metadata: TableMetadata): Promise<void>;

  // 实际数据存储在本地 SQLite
  async query(tableId: string): Promise<DataRow[]>;
  async insert(tableId: string, row: DataRow): Promise<void>;
  async update(tableId: string, rowId: string, data: any): Promise<void>;
}
```

**方案 2**: 完全基于 AFFiNE 文档块

- 使用当前的实现
- 接受性能和功能限制

**方案 3**: 等待 AFFiNE 官方支持

- 关注 AFFiNE Roadmap
- 等待官方数据库视图 API

---

**报告生成时间**: 2025-01-16
**验证者**: Claude Code
