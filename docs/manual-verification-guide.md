# 手工验证指南 - AFFiNE 对接测试

## 前置条件

1. AFFiNE 后端运行在 `http://localhost:3010`
2. 需要先登录 AFFiNE Web UI 获取 Cookie

---

## 一、获取认证信息

### 步骤 1: 登录 AFFiNE

1. 打开浏览器访问: `http://localhost:3010`
2. 登录或创建账号
3. 打开开发者工具 (F12)
4. 进入 Application/Storage → Cookies
5. 找到名为 `affine.session` 或类似的 Cookie
6. 复制 Cookie 值

### 步骤 2: 保存 Cookie 到环境变量

```bash
# 设置 Cookie 环境变量
export AFFINE_COOKIE="复制的Cookie值"
```

---

## 二、手工验证测试

### 测试 1: 列出工作空间

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{
    "query": "query { workspaces { id owner { id name } } }"
  }'
```

**预期结果**:

```json
{
  "data": {
    "workspaces": [{ "id": "workspace-xxx", "owner": { "id": "user-xxx", "name": "Your Name" } }]
  }
}
```

### 测试 2: 列出 Prompt 模板

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{
    "query": "query { listCopilotPrompts { id name action } }"
  }'
```

**预期结果**: 返回 Prompt 模板列表

### 测试 3: 搜索文档

```bash
# 替换 YOUR_WORKSPACE_ID
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{
    "query": "query { workspace(id: \"YOUR_WORKSPACE_ID\") { searchDocs(query: \"test\") { id title } } }"
  }'
```

**预期结果**: 返回匹配的文档列表

### 测试 4: 创建 AI 会话

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{
    "query": "mutation { createCopilotSession(options: {}) { id } }"
  }'
```

**预期结果**: 返回新创建的会话 ID

### 测试 5: 获取文档列表

```bash
# 替换 YOUR_WORKSPACE_ID
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: $AFFINE_COOKIE" \
  -d '{
    "query": "query { workspace(id: \"YOUR_WORKSPACE_ID\") { docs { id title } } }"
  }'
```

**预期结果**: 返回工作空间的文档列表

---

## 三、验证结果记录表

| 测试项           | 状态 | 错误信息 | 备注 |
| ---------------- | ---- | -------- | ---- |
| 列出工作空间     | ⬜   |          |      |
| 列出 Prompt 模板 | ⬜   |          |      |
| 搜索文档         | ⬜   |          |      |
| 创建 AI 会话     | ⬜   |          |      |
| 获取文档列表     | ⬜   |          |      |

---

## 四、常见问题排查

### 问题 1: 401 Unauthorized

**原因**: Cookie 无效或过期
**解决**: 重新登录获取新的 Cookie

### 问题 2: Cannot query field "xxx"

**原因**: 字段名错误或 API 不存在
**解决**: 使用 Schema Introspection 查看正确的字段

### 问题 3: Unknown argument "xxx"

**原因**: 参数名称错误
**解决**: 使用 Schema Introspection 查看正确的参数名

---

## 五、快速验证脚本

```bash
#!/bin/bash
COOKIE="YOUR_COOKIE_HERE"
GRAPHQL="http://localhost:3010/graphql"

echo "Test 1: Workspaces"
curl -X POST $GRAPHQL \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"query": "{ workspaces { id } }"}' | jq

echo -e "\nTest 2: Prompts"
curl -X POST $GRAPHQL \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE" \
  -d '{"query": "{ listCopilotPrompts { id name } }"}' | jq
```

保存为 `verify.sh`，运行: `bash verify.sh`
