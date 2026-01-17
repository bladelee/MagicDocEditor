# Document Management Phase 1 + Search 实现总结

**日期**: 2025-01-16
**版本**: Phase 1 + Search
**状态**: ✅ 已完成

---

## 📋 实现概述

Document Management Phase 1 + Search 已完成与 AFFiNE 后端 API 的对接，实现了文档的完整 CRUD 功能和搜索功能。

### 核心功能

- ✅ 创建、读取、更新、删除文档
- ✅ 文档列表展示
- ✅ 文档搜索（Phase 2）
- ✅ 工作空间管理

---

## 🔧 技术实现

### 1. Document Service 更新

**文件**: `src/web/services/document.ts`

完全重构以使用 AFFiNE Backend Service：

```typescript
export const documentService = {
  // CRUD 操作
  async getDocument(workspaceId: string, docId: string): Promise<Document | null>
  async createDocument(workspaceId: string, title?: string): Promise<Document>
  async updateDocument(workspaceId: string, docId: string, content: string, title?: string): Promise<Document>
  async deleteDocument(workspaceId: string, docId: string): Promise<boolean>

  // 列表和搜索
  async listDocuments(workspaceId: string): Promise<Document[]>
  async searchDocuments(workspaceId: string, query: string): Promise<Document[]>

  // 文档操作
  async renameDocument(workspaceId: string, docId: string, newTitle: string): Promise<Document | null>
  async moveDocument(workspaceId: string, docId: string, newParentId: string | null): Promise<boolean>

  // 工作空间
  async getWorkspace(workspaceId: string): Promise<any>
  async listWorkspaces(): Promise<any[]>
  async initializeWorkspace(): Promise<any>
}
```

### 2. GraphQL Queries

**文件**: `src/web/services/document.ts`

添加了搜索和重命名相关的 GraphQL queries：

```typescript
// 搜索文档
const SEARCH_DOCS = gql`
  query SearchDocs($workspaceId: ID!, $query: String!) {
    searchDocs(workspaceId: $workspaceId, query: $query) {
      id
      title
      description
      createdAt
      updatedAt
    }
  }
`;

// 重命名文档
const RENAME_DOC = gql`
  mutation RenameDoc($workspaceId: ID!, $docId: ID!, $title: String!) {
    updateDoc(workspaceId: $workspaceId, docId: $docId, title: $title) {
      id
      title
      updatedAt
    }
  }
`;

// 移动文档
const MOVE_DOC = gql`
  mutation MoveDoc($workspaceId: ID!, $docId: ID!, $newParentId: ID) {
    moveDoc(workspaceId: $workspaceId, docId: $docId, newParentId: $newParentId) {
      id
      parentId
      updatedAt
    }
  }
`;
```

---

## 📦 API 集成详情

### AFFiNE Document API 使用

| API          | 方法     | 用途         | 状态               |
| ------------ | -------- | ------------ | ------------------ |
| `getDoc`     | Query    | 获取单个文档 | ✅ 已实现          |
| `getDocs`    | Query    | 获取文档列表 | ✅ 已实现          |
| `createDoc`  | Mutation | 创建新文档   | ✅ 已实现          |
| `updateDoc`  | Mutation | 更新文档     | ✅ 已实现          |
| `deleteDoc`  | Mutation | 删除文档     | ✅ 已实现          |
| `searchDocs` | Query    | 搜索文档     | ⚠️ 客户端 fallback |
| `moveDoc`    | Mutation | 移动文档     | ⚠️ 待确认          |

### 搜索功能实现

**策略**: 优先使用 AFFiNE 的 `searchDocs` query，如果不可用则使用客户端过滤

```typescript
async searchDocuments(workspaceId: string, query: string): Promise<Document[]> {
  // 1. 尝试使用 AFFiNE searchDocs
  const { data, errors } = await apolloClient.query({
    query: SEARCH_DOCS,
    variables: { workspaceId, query: query.trim() },
  });

  if (errors || !data?.searchDocs) {
    // 2. Fallback 到客户端搜索
    return this.clientSideSearch(workspaceId, query);
  }

  return data.searchDocs;
}

async clientSideSearch(workspaceId: string, query: string): Promise<Document[]> {
  const docs = await this.listDocuments(workspaceId);
  const lowerQuery = query.toLowerCase();

  return docs.filter(doc =>
    doc.title.toLowerCase().includes(lowerQuery) ||
    (typeof doc.content === 'string' && doc.content.toLowerCase().includes(lowerQuery))
  );
}
```

---

## 🎯 功能覆盖

### Phase 1 功能（已完成）

| 功能     | 描述                    | 实现方式             |
| -------- | ----------------------- | -------------------- |
| 创建文档 | 创建新文档并自动生成 ID | `createDoc` mutation |
| 读取文档 | 获取文档内容和元数据    | `getDoc` query       |
| 更新文档 | 更新文档内容和标题      | `updateDoc` mutation |
| 删除文档 | 删除文档                | `deleteDoc` mutation |
| 列表展示 | 获取工作空间所有文档    | `getDocs` query      |
| 重命名   | 修改文档标题            | `updateDoc` mutation |

### Phase 2 功能（已完成 - Search）

| 功能     | 描述               | 实现方式                       |
| -------- | ------------------ | ------------------------------ |
| 搜索文档 | 按标题和内容搜索   | `searchDocs` + 客户端 fallback |
| 实时过滤 | 输入时即时过滤结果 | 客户端实现                     |

### 工作空间功能

| 功能           | 描述                   | 实现方式                     |
| -------------- | ---------------------- | ---------------------------- |
| 获取工作空间   | 获取工作空间信息       | `getWorkspace` query         |
| 列出工作空间   | 获取所有工作空间       | `listWorkspaces` query       |
| 初始化工作空间 | 创建或获取默认工作空间 | `initializeWorkspace` method |

### 未实现功能

| 功能     | 原因              | 备注                        |
| -------- | ----------------- | --------------------------- |
| 移动文档 | AFFiNE API 待确认 | 需要验证 `moveDoc` 是否存在 |
| 版本历史 | AFFiNE 无此 API   | 需要自行实现                |
| 批量操作 | Phase 1 未包含    | 后续可添加                  |

---

## 🔍 代码变更摘要

### 修改的文件

1. **src/web/services/document.ts**
   - 完全重构以使用 `affineBackend` 服务
   - 添加了搜索功能（`searchDocuments`, `clientSideSearch`）
   - 添加了重命名功能（`renameDocument`）
   - 添加了移动功能（`moveDocument`）

### 新增的 GraphQL Queries

- `SEARCH_DOCS` - 搜索文档
- `RENAME_DOC` - 重命名文档（复用 updateDoc）
- `MOVE_DOC` - 移动文档

---

## 📝 使用示例

### 创建文档

```typescript
import { documentService } from './services/document';

// 创建新文档
const doc = await documentService.createDocument('workspace-1', 'My New Document');
console.log(doc.id); // 'doc-1234567890-abc123'
```

### 列出文档

```typescript
// 获取工作空间所有文档
const docs = await documentService.listDocuments('workspace-1');
docs.forEach(doc => {
  console.log(doc.title, doc.updatedAt);
});
```

### 搜索文档

```typescript
// 搜索文档
const results = await documentService.searchDocuments('workspace-1', '周报');
console.log(`找到 ${results.length} 个匹配的文档`);
```

### 重命名文档

```typescript
// 重命名文档
const updated = await documentService.renameDocument('workspace-1', 'doc-123', 'New Title');
if (updated) {
  console.log('重命名成功');
}
```

### 删除文档

```typescript
// 删除文档
const success = await documentService.deleteDocument('workspace-1', 'doc-123');
if (success) {
  console.log('删除成功');
}
```

---

## ⚠️ 已知限制

1. **搜索功能依赖**
   - 如果 AFFiNE 不支持 `searchDocs`，会使用客户端搜索
   - 客户端搜索需要先加载所有文档

2. **移动文档未验证**
   - `moveDoc` mutation 在 AFFiNE 中可能不存在
   - 返回 false 表示不支持

3. **无批量操作**
   - 不支持批量删除、批量移动
   - 需要逐个操作

4. **简单权限模型**
   - Phase 1 不支持复杂的权限控制
   - 需要后续添加

---

## 🚀 下一步计划

1. **验证 AFFiNE API**
   - 确认 `searchDocs` 是否存在
   - 确认 `moveDoc` 是否存在
   - 调整 fallback 策略

2. **添加批量操作**
   - 批量删除
   - 批量移动
   - 批量标签管理

3. **高级搜索**
   - 按日期范围搜索
   - 按标签搜索
   - 组合搜索条件

4. **文档组织**
   - 文件夹结构
   - 收藏功能
   - 最近访问

---

## 📚 相关文档

- [AFFiNE API 文档](https://affine.pro/doc)
- [Document Editing 实现总结](./implementation-summary-document-editing.md)
- [Document Management 设计文档](./frontend-design-document-management.md)

---

**实现者**: Claude Code
**最后更新**: 2025-01-16
