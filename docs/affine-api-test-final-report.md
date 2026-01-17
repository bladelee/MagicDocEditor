# AFFiNE API 验证测试最终报告

**测试日期**: 2025-01-16
**测试者**: Claude Code
**认证状态**: ✅ 已登录 (Cookie 验证成功)

---

## 📊 测试结果总结

| 功能            | 状态          | 说明                                |
| --------------- | ------------- | ----------------------------------- |
| 用户认证        | ✅ 成功       | Cookie 工作正常                     |
| 列出工作空间    | ✅ 成功       | `workspaces` 查询正常               |
| 创建工作空间    | ✅ 成功       | `createWorkspace` mutation 工作正常 |
| Prompt 模板列表 | ✅ 成功       | 找到 46 个模板                      |
| 创建 AI 会话    | ⚠️ 部分成功   | 返回字符串 ID，不是对象             |
| 文档列表        | ⚠️ API 待确认 | `docs` 参数格式需要确认             |
| 搜索文档        | ⚠️ API 待确认 | `searchDocs` 参数格式需要确认       |

---

## 🔍 详细发现

### 1. 认证 ✅

**工作正常**:

```bash
# Cookie 格式
better-auth.session_token=<token>; affine_session=<session_id>
```

### 2. Prompt 模板 ✅

**API**: `listCopilotPrompts`

**发现**:

- ✅ API 可用
- ✅ 不接受任何参数
- ✅ 返回 46 个内置模板
- ⚠️ 没有 `id` 字段，只有 `name`, `action`, `model`, `config`

**示例模板**:

```
1. Chat With AFFiNE AI (gemini-2.5-flash)
2. Code Artifact (claude-sonnet-4-5@20250929)
3. Apply Updates (claude-sonnet-4-5@20250929)
4. Brainstorm ideas about this (gemini-2.5-flash)
5. Brainstorm mindmap (gemini-2.5-flash)
6. Change tone to (gpt-4.1-2025-04-14)
7. Check code error (gpt-4.1-2025-04-14)
8. Continue writing (gemini-2.5-flash)
9. Conversation Summary (gpt-4.1-2025-04-14)
10. Convert to Anime style (gpt-image-1)
... 共 46 个
```

### 3. 创建 AI 会话 ⚠️

**API**: `createCopilotSession(options: CreateChatSessionInput!)`

**参数**:

```graphql
input: CreateChatSessionInput {
  docId: ID           # 可选
  workspaceId: ID!    # 必需
  promptName: String  # 可选
  pinned: Boolean     # 可选
  reuseLatestChat: Boolean # 可选
}
```

**返回**: `String!` (会话 ID，不是对象)

**示例**:

```graphql
mutation {
  createCopilotSession(options: { workspaceId: "workspace-id" }) # 返回: "session-id-string"
}
```

### 4. 发送 AI 消息 ⚠️

**API**: `createCopilotMessage(options: CreateChatMessageInput!)`

**需要先探索** `CreateChatMessageInput` 的字段

### 5. 文档管理 ⚠️

**问题**:

- `docs` 方法的参数不是 `skip`/`take`，需要确认正确格式
- `searchDocs` 方法的参数不是 `query`，需要确认正确格式

---

## 📝 需要修正的代码

### 修正 1: listCopilotPrompts

```typescript
// ❌ 错误
async listPrompts(workspaceId?: string): Promise<PromptTemplate[]> {
  const response = await apolloClient.query({
    query: gql`
      query ListPrompts($workspaceId: String) {
        listCopilotPrompts(workspaceId: $workspaceId) {
          id          # ❌ 这个字段不存在
          name
        }
      }
    `,
    variables: { workspaceId },
  });
}

// ✅ 正确
async listPrompts(): Promise<PromptTemplate[]> {
  const response = await apolloClient.query({
    query: gql`
      query {
        listCopilotPrompts {
          name
          action
          model
          config
        }
      }
    `,
  });
}
```

### 修正 2: createCopilotSession

```typescript
// ❌ 错误
const response = await apolloClient.mutate({
  mutation: gql(COPILOT_MUTATIONS.CREATE_SESSION),
  variables: { workspaceId, docId },
});

// ✅ 正确
const response = await apolloClient.mutate({
  mutation: gql`
    mutation CreateSession($options: CreateChatSessionInput!) {
      createCopilotSession(options: $options) # 返回 String!
    }
  `,
  variables: {
    options: {
      workspaceId,
      docId, // 可选
    },
  },
});
```

### 修正 3: 处理返回值

```typescript
// ❌ 错误
const sessionId = response.data.createCopilotSession.id;

// ✅ 正确
const sessionId = response.data.createCopilotSession; // 直接是字符串
```

---

## 🧪 手工验证命令

### 基础验证

```bash
# 设置环境变量
export AFFINE_COOKIE="better-auth.session_token=MJSDAOZn5l8TEAlqY38gBOKbQHgxHbVC.ZJ4RIzwAIrl9ItDMA6PiHds%2BXexHA%2Bs3apFxvIEGuZM%3D; affine_session=0a483290-bac9-4255-a8a6-973f1e3ad0de"

# 1. 获取用户信息
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{"query": "{ currentUser { id name email } }"}'

# 2. 列出工作空间
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{"query": "{ workspaces { id } }"}'

# 3. 列出 Prompt 模板
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{"query": "{ listCopilotPrompts { name action model } }"}'

# 4. 创建 AI 会话
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{"query": "mutation { createCopilotSession(options: { workspaceId: \"YOUR_WORKSPACE_ID\" }) }"}'
```

---

## 📋 待探索的 API

### 高优先级

1. **`workspace.docs`** - 确认正确的查询参数
2. **`workspace.searchDocs`** - 确认正确的查询参数
3. **`createCopilotMessage`** - 确认必需的参数
4. **`CreateChatMessageInput`** - 查看完整的输入字段

### 中优先级

1. **文档创建** - AFFiNE 没有直接的 `createDoc` mutation
2. **文档更新** - 需要确认 `updateDoc` 的正确用法
3. **块操作** - 确认块（block）相关的 API

---

## 🚀 下一步建议

### 立即行动（高优先级）

1. **修正已知错误的代码**
   - 移除 `listCopilotPrompts` 的参数
   - 修正 `createCopilotSession` 的调用方式
   - 修正返回值处理

2. **探索剩余 API**
   - 使用 introspection 查询完整的 API 定义
   - 创建测试用例验证每个 API

3. **实现认证流程**
   - 在前端集成登录功能
   - 管理 Cookie/Token

### 短期计划

1. **完善 AI Chat 功能**
   - 验证完整的会话创建和消息发送流程
   - 实现流式响应（如果支持）

2. **完善文档管理功能**
   - 确认文档列表的正确查询方式
   - 实现文档搜索

3. **实现数据库视图替代方案**
   - 使用 Dexie.js 实现真正的数据库表
   - 参考 `database-view-alternative.md`

---

## 📚 相关文档

- [手工验证指南](./manual-verification-guide.md)
- [数据库视图替代方案](./database-view-alternative.md)
- [实现修正报告](./implementation-corrections.md)

---

**测试完成时间**: 2025-01-16
**验证状态**: ✅ 认证成功，⚠️ 部分 API 待修正
