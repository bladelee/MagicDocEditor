# 对接验证测试总结

**日期**: 2025-01-16
**测试范围**: 所有5个功能模块

---

## 📊 测试结果总览

| 模块                | 测试状态      | 发现问题                      | 修正优先级 |
| ------------------- | ------------- | ----------------------------- | ---------- |
| AI Chat Phase 1     | ⚠️ 需要认证   | API 参数格式待确认            | 高         |
| Document Editing    | ⚠️ 需要认证   | 需要验证 getDoc/updateDoc     | 高         |
| Document Management | ⚠️ 需要认证   | API 字段错误已发现            | 高         |
| Prompt Templates    | ⚠️ 需要认证   | `listCopilotPrompts` 参数错误 | 高         |
| Database View       | ❌ API 不存在 | AFFiNE 不支持数据库表         | 中         |

---

## 🔴 关键发现

### 1. AFFiNE API 需要认证

**问题**: 大部分读写 API 需要用户登录认证

**受影响的 API**:

- `createCopilotSession`
- `createCopilotMessage`
- `createDoc` / `updateDoc` / `deleteDoc`
- `workspace.docs`

**解决方案**: 需要实现登录功能

```typescript
// TODO: 实现登录
async function login(email: string, password: string) {
  const response = await fetch('http://localhost:3010/api/auth/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include', // 重要：包含 Cookie
  });
  // 保存 Cookie
}

// TODO: 在 GraphQL 请求中包含 Cookie
await apolloClient.query({
  query: MY_QUERY,
  context: {
    headers: {
      Cookie: cookieString,
    },
  },
});
```

### 2. API 参数错误

**错误 1**: `listCopilotPrompts` 不接受参数

```graphql
# ❌ 错误
query {
  listCopilotPrompts(workspaceId: "xxx") # 参数不存在
}

# ✅ 正确
query {
  listCopilotPrompts # 无参数
}
```

**错误 2**: `workspaces` 没有 `name` 字段

```graphql
# ❌ 错误
query {
  workspaces {
    id
    name # 字段不存在
  }
}

# ✅ 正确
query {
  workspaces {
    id
    owner {
      name # name 在 owner 里
    }
  }
}
```

### 3. 数据库视图 API 不存在

**发现**: AFFiNE **没有**真正的数据库表视图 API

- ❌ 没有 `createTable`
- ❌ 没有 `updateCell`
- ❌ 没有 `addRow` / `deleteRow`
- ❌ 没有 `tableView` query

**结论**: 需要使用替代方案（见 `database-view-alternative.md`）

---

## 🧪 手工验证步骤

### 第一步：获取认证 Cookie

```bash
# 1. 打开浏览器访问 http://localhost:3010
# 2. 登录 AFFiNE
# 3. 打开开发者工具 (F12) → Application → Cookies
# 4. 复制 affine.session 或类似的 Cookie 值
export AFFINE_COOKIE="复制的Cookie值"
```

### 第二步：运行基础测试

```bash
# 测试 1: 列出工作空间
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{"query": "{ workspaces { id owner { name } } }"}' | jq

# 预期输出：
# {
#   "data": {
#     "workspaces": [
#       { "id": "workspace-xxx", "owner": { "name": "Your Name" } }
#     ]
#   }
# }
```

```bash
# 测试 2: 列出 Prompt 模板（无参数）
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{"query": "{ listCopilotPrompts { id name } }"}' | jq

# 预期输出：
# {
#   "data": {
#     "listCopilotPrompts": [ ... ]
#   }
# }
```

```bash
# 测试 3: 获取工作空间详情
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{"query": "{ workspace(id: \"YOUR_WORKSPACE_ID\") { docs { id title } } }"}' | jq
```

### 第三步：验证测试结果记录表

| 测试项         | 通过 | 失败原因 |
| -------------- | ---- | -------- |
| 列出工作spaces | ⬜   |          |
| 列出 Prompts   | ⬜   |          |
| 获取文档列表   | ⬜   |          |
| 创建文档       | ⬜   |          |
| 创建 AI 会话   | ⬜   |          |

---

## 📝 需要修正的代码

### 修正 1: Prompt Templates API

**文件**: `src/web/services/prompt-template.ts`

```typescript
// ❌ 错误
async listPrompts(workspaceId?: string): Promise<PromptTemplate[]> {
  const response = await apolloClient.query({
    query: gql(COPILOT_QUERIES.LIST_PROMPTS),
    variables: { workspaceId },  // ← 删除这个
  });
}

// ✅ 正确
async listPrompts(): Promise<PromptTemplate[]> {
  const response = await apolloClient.query({
    query: gql`
      query {
        listCopilotPrompts {
          id
          name
          description
          action
        }
      }
    `,
  });
}
```

### 修正 2: Workspace 列表

**文件**: `src/web/services/document.ts`

```typescript
// ❌ 错误
async listWorkspaces(): Promise<any[]> {
  const response = await apolloClient.query({
    query: LIST_WORKSPACES,
  });
  return response.data.workspaces;
}

// ✅ 正确
async listWorkspaces(): Promise<any[]> {
  const response = await apolloClient.query({
    query: gql`
      query {
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

---

## 🚧 下一步行动建议

### 立即行动（高优先级）

1. **获取 AFFiNE Cookie** 并运行手工验证
2. **修正 API 调用错误**（见上表）
3. **实现登录功能**以获取认证

### 短期行动（1-2天）

1. **验证所有需要认证的 API**
   - 创建 Copilot Session
   - 发送消息
   - 创建/更新/删除文档

2. **决定数据库视图方案**
   - 选项 A: 使用 Dexie.js（推荐）
   - 选项 B: 继续使用 AFFiNE 文档块
   - 选项 C: 直连 PostgreSQL

### 中期行动（1周内）

1. **实现完整的认证流程**
   - 登录/登出
   - Token 管理
   - 权限检查

2. **完善错误处理**
   - 网络错误
   - 认证错误
   - API 错误

---

## 📚 相关文档

1. **[手工验证指南](./manual-verification-guide.md)** - 详细的手工测试步骤
2. **[AFFiNE API 验证报告](./affine-api-verification.md)** - API 验证结果
3. **[实现修正报告](./implementation-corrections.md)** - 代码修正方案
4. **[数据库视图替代方案](./database-view-alternative.md)** - Dexie.js 实现方案

---

## ✅ 检查清单

在开始正式使用前，请确认：

- [ ] 已获取 AFFiNE Cookie
- [ ] 已运行基础测试并验证结果
- [ ] 已修正 API 调用错误
- [ ] 已决定数据库视图方案
- [ ] 已实现或计划实现认证功能

---

**生成时间**: 2025-01-16
**测试者**: Claude Code
