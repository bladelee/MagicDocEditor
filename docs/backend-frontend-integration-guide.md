# AFFiNE 后端服务部署与前端联调指南

## 当前状态

### 后端服务 ✅

AFFiNE 后端服务已成功部署并运行：

- **服务地址**: http://localhost:3010
- **GraphQL API**: http://localhost:3010/graphql
- **WebSocket**: ws://localhost:3010/graphql
- **数据库**: PostgreSQL (运行在 Docker 容器)
- **缓存**: Redis (运行在 Docker 容器)

### Docker 服务状态

```bash
# 查看服务状态
docker-compose -f .docker/selfhost/compose.yml ps

# 查看日志
docker logs affine_server -f

# 停止服务
docker-compose -f .docker/selfhost/compose.yml down

# 重启服务
docker-compose -f .docker/selfhost/compose.yml restart
```

### 前端配置 ✅

前端已配置为连接到 AFFiNE 后端：

1. **Vite 代理配置** (`src/web/vite.config.ts`):
   - 代理目标: `http://localhost:3010`
   - 支持 WebSocket

2. **环境变量** (`src/web/.env`):
   - `VITE_GRAPHQL_URL=http://localhost:3010/graphql`
   - `VITE_WS_URL=ws://localhost:3010/graphql`

3. **Apollo Client** (`src/web/lib/apollo-client.ts`):
   - 已配置 GraphQL 客户端
   - 支持 HTTP 和 WebSocket 连接

4. **后端服务** (`src/web/services/affine-backend.ts`):
   - 封装了常用的 GraphQL 查询和变更
   - 提供了工作区和文档的操作方法

## 启动前端开发服务器

```bash
# 进入前端目录
cd src/web

# 安装依赖（如果还没有安装）
yarn install

# 启动开发服务器
yarn dev
```

前端将运行在 http://localhost:3000

## 测试后端连接

访问 http://localhost:3000 并查看 AFFiNE 连接状态。

也可以使用以下方法测试：

### 方法 1: 使用浏览器开发者工具

1. 打开 http://localhost:3000
2. 打开浏览器开发者工具 (F12)
3. 在控制台中执行：

```javascript
// 测试 GraphQL 查询
fetch('http://localhost:3010/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query {
        __typename
      }
    `,
  }),
})
  .then(res => res.json())
  .then(data => console.log('GraphQL OK:', data))
  .catch(err => console.error('GraphQL Error:', err));
```

### 方法 2: 使用 curl

```bash
# 测试后端服务
curl http://localhost:3010/

# 测试 GraphQL API
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## 后端 API 端点

### GraphQL 端点

- **HTTP**: http://localhost:3010/graphql
- **WebSocket**: ws://localhost:3010/graphql

### 常用 API

1. **工作区查询**:

```graphql
query {
  workspaces {
    id
    name
    avatar
    publicMode
  }
}
```

2. **创建文档**:

```graphql
mutation {
  createDoc(workspaceId: "YOUR_WORKSPACE_ID", docId: "new-doc-id") {
    id
    title
    blocks
  }
}
```

3. **更新文档**:

```graphql
mutation {
  updateDoc(workspaceId: "YOUR_WORKSPACE_ID", docId: "DOC_ID", title: "New Title", blocks: []) {
    id
    title
    updatedAt
  }
}
```

## 初始化 AFFiNE

首次访问后端时，需要初始化 AFFiNE：

1. 打开浏览器访问: http://localhost:3010
2. 你将被重定向到 `/admin/setup` 页面
3. 按照提示创建管理员账户和工作区
4. 完成后，你就可以使用 API 进行操作了

## 在前端使用 AFFiNE 服务

### 示例 1: 获取工作区列表

```typescript
import { affineBackend } from '@web/services/affine-backend';

// 获取所有工作区
const workspaces = await affineBackend.listWorkspaces();
console.log('Workspaces:', workspaces);
```

### 示例 2: 创建文档

```typescript
import { affineBackend } from '@web/services/affine-backend';

// 创建新文档
const doc = await affineBackend.createDoc('workspace-id');
console.log('Created doc:', doc);
```

### 示例 3: 使用 GraphQL 直接查询

```typescript
import { useQuery } from '@apollo/client';
import { GET_WORKSPACE } from '@web/services/affine-backend';

function Workspace({ id }: { id: string }) {
  const { data, loading, error } = useQuery(GET_WORKSPACE, {
    variables: { id },
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.workspace.name}</h1>
      <p>ID: {data.workspace.id}</p>
    </div>
  );
}
```

## 故障排查

### 问题 1: 前端无法连接到后端

**症状**: 前端显示连接失败

**解决方案**:

1. 确认后端服务正在运行:

   ```bash
   docker ps | grep affine
   ```

2. 检查后端日志:

   ```bash
   docker logs affine_server
   ```

3. 确认端口 3010 没有被占用:
   ```bash
   lsof -i :3010
   ```

### 问题 2: WebSocket 连接失败

**症状**: GraphQL 订阅不工作

**解决方案**:

1. 检查 Vite 配置中的代理设置是否包含 `ws: true`
2. 确认环境变量 `VITE_WS_URL` 正确设置

### 问题 3: CORS 错误

**症状**: 浏览器控制台显示 CORS 错误

**解决方案**:

1. 确认 Vite 代理配置正确
2. 不要直接从前端访问后端 URL，而是通过代理

### 问题 4: 后端迁移失败

**症状**: `affine_migration_job` 容器退出

**解决方案**:

1. 检查迁移日志:

   ```bash
   docker logs affine_migration_job
   ```

2. 重新启动服务:
   ```bash
   docker-compose -f .docker/selfhost/compose.yml down
   docker-compose -f .docker/selfhost/compose.yml up -d
   ```

## 下一步工作

1. **集成 Blocksuite 编辑器**:
   - 连接到 AFFiNE 的文档数据
   - 实现实时编辑

2. **实现认证**:
   - 使用 AFFiNE 的认证系统
   - 支持 OAuth 登录

3. **AI 功能集成**:
   - 连接到 AFFiNE 的 AI 服务
   - 实现智能写作助手

4. **实时协作**:
   - 使用 WebSocket 订阅
   - 实现多用户编辑

## 相关文档

- [AFFiNE 官方文档](https://docs.affine.pro)
- [完整设计方案](../docs/Web-SaaS模式AI文档编辑器-完整设计方案.md)
- [后端集成设计](../docs/backend-integration-design.md)

## 管理命令

```bash
# 查看所有容器
docker-compose -f .docker/selfhost/compose.yml ps

# 查看服务日志
docker-compose -f .docker/selfhost/compose.yml logs -f

# 重启特定服务
docker-compose -f .docker/selfhost/compose.yml restart affine

# 停止所有服务
docker-compose -f .docker/selfhost/compose.yml down

# 停止并删除数据（警告：会删除所有数据）
docker-compose -f .docker/selfhost/compose.yml down -v
rm -rf ~/.affine/self-host/
```

## 端口说明

| 服务       | 端口 | 说明               |
| ---------- | ---- | ------------------ |
| 前端       | 3000 | Vite 开发服务器    |
| 后端       | 3010 | AFFiNE 服务器      |
| PostgreSQL | 5432 | 数据库（容器内部） |
| Redis      | 6379 | 缓存（容器内部）   |

## 数据持久化

所有数据存储在 `~/.affine/self-host/` 目录：

```
~/.affine/self-host/
├── config/          # 配置文件
├── postgres/        # 数据库数据
└── storage/         # 上传文件
```

备份时只需备份这个目录即可。
