# AFFiNE API 修正应用报告

**日期**: 2025-01-16
**状态**: ✅ 已完成修正

---

## 修正摘要

基于实际测试结果，以下 API 调用错误已全部修正：

| 文件                                  | 修正内容                           | 状态 |
| ------------------------------------- | ---------------------------------- | ---- |
| `src/web/graphql/ai-queries.ts`       | `CREATE_SESSION` mutation 返回类型 | ✅   |
| `src/web/graphql/ai-queries.ts`       | `LIST_PROMPTS` query 参数和字段    | ✅   |
| `src/web/services/ai.ts`              | `createSession` 返回值处理         | ✅   |
| `src/web/services/ai.ts`              | `listPrompts` 参数移除             | ✅   |
| `src/web/services/prompt-template.ts` | `listPrompts` 参数移除             | ✅   |
| `src/web/services/prompt-template.ts` | `useTemplate` session ID 处理      | ✅   |
| `src/web/services/affine-backend.ts`  | 工作空间查询字段修正               | ✅   |

---

## 详细修正

### 1. CREATE_SESSION Mutation (ai-queries.ts:8-14)

**修正前**:

```graphql
mutation CreateCopilotSession($workspaceId: String!, $docId: String) {
  createCopilotSession(workspaceId: $workspaceId, docId: $docId) {
    id # ❌ 错误：API 返回 String! 不是对象
    workspaceId
    docId
    createdAt
  }
}
```

**修正后**:

```graphql
mutation CreateCopilotSession($options: CreateChatSessionInput!) {
  createCopilotSession(options: $options) # ✅ 返回 String!
}
```

**原因**: AFFiNE 的 `createCopilotSession` 返回 `String!` 类型（会话 ID），而不是对象。

---

### 2. LIST_PROMPTS Query (ai-queries.ts:68-76)

**修正前**:

```graphql
query ListCopilotPrompts($workspaceId: String) {
  listCopilotPrompts(workspaceId: $workspaceId) {
    id # ❌ 字段不存在
    name
    description # ❌ 字段不存在
    action
    model
    createdAt # ❌ 字段不存在
    updatedAt # ❌ 字段不存在
  }
}
```

**修正后**:

```graphql
query ListCopilotPrompts {
  listCopilotPrompts {
    # ✅ 无参数
    name
    action
    model
    config # ✅ 正确字段
  }
}
```

**原因**: `listCopilotPrompts` API 不接受任何参数，且 `CopilotPromptType` 没有 `id`、`description`、`createdAt`、`updatedAt` 字段。

---

### 3. AI Service createSession (ai.ts:59-92)

**修正前**:

```typescript
const response = await apolloClient.mutate({
  mutation: gql(COPILOT_MUTATIONS.CREATE_SESSION),
  variables: {
    workspaceId: workspaceId || 'default',  # ❌ 错误的参数结构
    docId,
  },
});

return response.data.createCopilotSession.id;  # ❌ 错误：返回的是字符串
```

**修正后**:

```typescript
const response = await apolloClient.mutate({
  mutation: gql(COPILOT_MUTATIONS.CREATE_SESSION),
  variables: {
    options: {  # ✅ 正确的参数结构
      workspaceId: workspaceId || 'default',
      docId,
    },
  },
});

return response.data.createCopilotSession;  # ✅ 直接返回字符串
```

---

### 4. AI Service listPrompts (ai.ts:223-262)

**修正前**:

```typescript
async listPrompts(workspaceId?: string): Promise<any[]> {
  const response = await apolloClient.query({
    query: gql(COPILOT_QUERIES.LIST_PROMPTS),
    variables: { workspaceId },  # ❌ API 不接受此参数
  });
}
```

**修正后**:

```typescript
async listPrompts(_workspaceId?: string): Promise<any[]> {
  const response = await apolloClient.query({
    query: gql(COPILOT_QUERIES.LIST_PROMPTS),
    variables: {},  # ✅ 无参数
  });
}
```

---

### 5. Prompt Template Service listPrompts (prompt-template.ts:42-78)

**修正前**:

```typescript
async listPrompts(workspaceId?: string): Promise<PromptTemplate[]> {
  const response = await apolloClient.query({
    query: gql(COPILOT_QUERIES.LIST_PROMPTS),
    variables: { workspaceId },  # ❌ API 不接受此参数
  });
  return response.data.listCopilotPrompts || [];
}
```

**修正后**:

```typescript
async listPrompts(_workspaceId?: string): Promise<any[]> {
  const response = await apolloClient.query({
    query: gql(COPILOT_QUERIES.LIST_PROMPTS),
    variables: {},  # ✅ 无参数
  });
  return response.data.listCopilotPrompts || [];
}
```

---

### 6. Prompt Template Service useTemplate (prompt-template.ts:195-253)

**修正前**:

```typescript
const sessionResponse = await apolloClient.mutate({
  mutation: gql(COPILOT_MUTATIONS.CREATE_SESSION),
  variables: {
    workspaceId,  # ❌ 错误的参数结构
    docId: null,
  },
});

const sessionId = sessionResponse.data.createCopilotSession.id;  # ❌ 错误
```

**修正后**:

```typescript
const sessionResponse = await apolloClient.mutate({
  mutation: gql(COPILOT_MUTATIONS.CREATE_SESSION),
  variables: {
    options: {  # ✅ 正确的参数结构
      workspaceId,
      docId: null,
    },
  },
});

const sessionId = sessionResponse.data.createCopilotSession;  # ✅ 直接是字符串
```

---

### 7. Workspace Queries (affine-backend.ts:8-37)

**修正前**:

```graphql
query GetWorkspace($id: ID!) {
  workspace(id: $id) {
    id
    name # ❌ 字段不存在
    avatar
    publicMode
    createdAt
    updatedAt
  }
}

query ListWorkspaces {
  workspaces {
    id
    name # ❌ 字段不存在
    avatar
    publicMode
  }
}
```

**修正后**:

```graphql
query GetWorkspace($id: ID!) {
  workspace(id: $id) {
    id
    avatar
    publicMode
    createdAt
    updatedAt
    owner {
      # ✅ name 在 owner 对象里
      id
      name
    }
  }
}

query ListWorkspaces {
  workspaces {
    id
    avatar
    publicMode
    owner {
      # ✅ name 在 owner 对象里
      id
      name
    }
  }
}
```

**原因**: `WorkspaceType` 没有 `name` 字段，名称信息在 `owner` 对象中。

---

## 新增类型定义

### CreateChatSessionInput (ai-queries.ts:99-105)

```typescript
export interface CreateChatSessionInput {
  workspaceId: string; // 必需
  docId?: string; // 可选
  promptName?: string; // 可选
  pinned?: boolean; // 可选
  reuseLatestChat?: boolean; // 可选
}
```

---

## 测试验证

### 验证方法

运行快速验证脚本：

```bash
cd /home/ubuntu/proj/AFFiNE
AFFINE_COOKIE="your_cookie" ./scripts/verify-affine-api.sh
```

### 预期结果

```
======================================
AFFiNE API 快速验证
======================================

测试 当前用户... 成功
测试 工作空间列表... 成功
测试 Prompt模板列表... 成功

======================================
结果: 通过 3 / 失败 0
======================================
```

---

## 剩余待探索的 API

以下 API 的正确参数格式仍需验证：

1. **`workspace.docs`** - 确认正确的查询参数
2. **`workspace.searchDocs`** - 确认正确的查询参数
3. **`createCopilotMessage`** - 确认 `CreateChatMessageInput` 的完整字段

---

## 后续建议

1. **测试修正后的代码** - 验证所有修正是否生效
2. **探索剩余 API** - 使用 introspection 确认参数格式
3. **实现认证流程** - 添加登录和 Cookie 管理
4. **数据库视图方案** - 决定是否使用 Dexie.js 实现

---

## 相关文档

- [AFFiNE API 验证测试最终报告](./affine-api-test-final-report.md)
- [实现修正报告](./implementation-corrections.md)
- [数据库视图替代方案](./database-view-alternative.md)

---

**修正完成时间**: 2025-01-16
**修正者**: Claude Code
**状态**: ✅ 所有已知 API 错误已修正
