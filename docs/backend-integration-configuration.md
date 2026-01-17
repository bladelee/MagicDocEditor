# AFFiNE 后端集成配置文档（CORS等对接配置）

## 项目概述

本文档记录了 AFFiNE 后端服务部署配置以及与前端的集成方案，用于支持 AI 文档编辑器的开发和调试。

**部署日期**: 2025-01-16
**AFFiNE 版本**: stable
**前端**: React + Vite + Apollo Client
**后端**: AFFiNE Self-Hosted (Docker Compose)

---

## 架构概述

### 网络拓扑

```
本地开发机器                    远程服务器
┌─────────────────┐           ┌─────────────────┐
│                 │           │                 │
│  前端 (localhost:10009)      │                 │
│  React + Vite   │           │                 │
│       ↓         │           │                 │
│  SSH Tunnel     │◄──────────┤  SSH Server     │
│  (Port 10009)   │           │                 │
│                 │           │                 │
│  后端 (localhost:10003)      │                 │
│  AFFiNE Docker  │           │                 │
│  (Port 3010)    │           │                 │
│                 │           │                 │
└─────────────────┘           └─────────────────┘
```

### 关键特性

- **SSH 隧道机制**: 前端通过 SSH 隧道访问后端服务
- **CORS 兼容**: Apollo Client 配置为不使用 credentials 模式
- **容器化部署**: 后端服务完全容器化，依赖 PostgreSQL 和 Redis

---

## 网络配置

### 端口映射

| 服务                | 容器内端口 | 本地端口  | 访问地址                          |
| ------------------- | ---------- | --------- | --------------------------------- |
| AFFiNE Backend      | 3010       | 3010      | http://localhost:10003 (SSH 隧道) |
| Frontend Dev Server | -          | 3000/3001 | http://localhost:10009 (SSH 隧道) |
| PostgreSQL          | 5432       | -         | 容器内部访问                      |
| Redis               | 6379       | -         | 容器内部访问                      |

### SSH 隧道设置

```bash
# 前端隧道 (示例)
ssh -L 10009:localhost:3000 user@remote-server

# 后端隧道 (示例)
ssh -L 10003:localhost:3010 user@remote-server
```

---

## 后端配置

### Docker Compose 配置

**文件**: `.docker/selfhost/compose.yml`

```yaml
name: affine
services:
  affine:
    image: ghcr.io/toeverything/affine:${AFFINE_REVISION:-stable}
    container_name: affine_server
    ports:
      - '${PORT:-3010}:3010'
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
      affine_migration:
        condition: service_completed_successfully
    volumes:
      - ${UPLOAD_LOCATION}:/root/.affine/storage
      - ${CONFIG_LOCATION}:/root/.affine/config
    env_file:
      - .env
    environment:
      - REDIS_SERVER_HOST=redis
      - DATABASE_URL=postgresql://${DB_USERNAME}:${DB_PASSWORD}@postgres:5432/${DB_DATABASE:-affine}
      - AFFINE_INDEXER_ENABLED=false
      - AFFINE_SERVER_HOST=${AFFINE_SERVER_HOST:-0.0.0.0}
      - AFFINE_SERVER_EXTERNAL_URL=${AFFINE_SERVER_EXTERNAL_URL:-http://localhost:10003}
    restart: unless-stopped

  postgres:
    image: pgvector/pgvector:pg16
    container_name: affine_postgres
    volumes:
      - ${DB_DATA_LOCATION}:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_DATABASE:-affine}
    restart: unless-stopped

  redis:
    image: redis
    container_name: affine_redis
    restart: unless-stopped
```

### 环境变量配置

**文件**: `.docker/selfhost/.env`

```bash
# AFFiNE 版本
AFFINE_REVISION=stable

# 端口配置
PORT=3010

# 数据存储路径
DB_DATA_LOCATION=~/.affine/self-host/postgres/pgdata
UPLOAD_LOCATION=~/.affine/self-host/storage
CONFIG_LOCATION=~/.affine/self-host/config

# 数据库配置
DB_USERNAME=affine
DB_PASSWORD=affine_password_123
DB_DATABASE=affine

# 服务器配置
AFFINE_SERVER_HOST=0.0.0.0
AFFINE_SERVER_EXTERNAL_URL=http://localhost:10003
AFFINE_INDEXER_ENABLED=false
```

### AFFiNE 配置文件

**文件**: `.docker/selfhost/config.json`

```json
{
  "$schema": "https://github.com/toeverything/affine/releases/latest/download/config.schema.json",
  "server": {
    "name": "AFFiNE Self Hosted Server",
    "https": false,
    "host": "0.0.0.0",
    "port": 3010,
    "externalUrl": "http://localhost:10003"
  },
  "auth": {
    "sessionSalt": "affine-session-salt-change-in-production"
  },
  "metrics": {
    "enabled": false
  }
}
```

---

## 前端配置

### 环境变量配置

**文件**: `src/web/.env`

```bash
# 应用配置
VITE_APP_NAME=AI Document Editor
VITE_APP_VERSION=0.1.0

# API 配置 - 通过 SSH 隧道访问后端
VITE_GRAPHQL_URL=http://localhost:10003/graphql
VITE_API_URL=http://localhost:10003/api
VITE_WS_URL=ws://localhost:10003/graphql

# AFFiNE 后端配置
AFFINE_SERVER_URL=http://localhost:10003

# AI 功能配置
VITE_AI_ENABLED=true
VITE_AI_PROVIDER=affine
VITE_AI_MODEL=gpt-4

# 开发模式
VITE_DEV_MODE=true
```

### Vite 配置

**文件**: `src/web/vite.config.ts`

```typescript
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // 路径别名配置
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@src': resolve(__dirname, '.'),
      '@web': resolve(__dirname, '.'),
      '@lib': resolve(__dirname, '.'),
      '@shared': resolve(__dirname, '../shared'),
      '@config': resolve(__dirname, '../config'),
    },
  },

  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    // 不配置代理，前端通过 SSH 隧道直接访问后端
  },

  // 环境变量前缀
  envPrefix: ['VITE_', 'AFFINE_'],

  // 优化配置
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@apollo/client', 'graphql'],
  },
}));
```

### Apollo Client 配置

**文件**: `src/web/lib/apollo-client.ts`

```typescript
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// HTTP connection to the API
const httpLink = new HttpLink({
  uri: 'http://localhost:10003/graphql',
  // 注意: 移除了 credentials: 'include' 以兼容 AFFiNE 后端的 wildcard CORS
  // 认证将通过 Authorization headers 处理
});

// WebSocket connection for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: import.meta.env.VITE_WS_URL || 'ws://localhost:10003/graphql',
    connectionParams: {
      // 如需认证，添加 Authorization token
      // Authorization: `Bearer ${token}`,
    },
    on: {
      connected: () => console.log('GraphQL WebSocket connected'),
      error: error => console.error('GraphQL WebSocket error:', error),
    },
  })
);

// Split based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  httpLink
);

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          documents: {
            merge(existing = [], incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

export { httpLink };
```

---

## CORS 配置解决方案

### 问题背景

**错误信息**:

```
The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'.
```

**根本原因**:

- AFFiNE 后端返回 `Access-Control-Allow-Origin: *` (wildcard CORS)
- Apollo Client 默认使用 `credentials: 'include'` 模式
- Wildcard CORS 与 credentials 模式不兼容

### 解决方案

**移除 Apollo Client 的 credentials 配置**:

```typescript
// ❌ 错误配置 (导致 CORS 错误)
const httpLink = new HttpLink({
  uri: 'http://localhost:10003/graphql',
  credentials: 'include', // 与 wildcard CORS 不兼容
});

// ✅ 正确配置
const httpLink = new HttpLink({
  uri: 'http://localhost:10003/graphql',
  // 不设置 credentials，使用 token-based 认证
});
```

### 为什么这个方案有效

1. **兼容 Wildcard CORS**: 不使用 credentials 模式可以接受 wildcard CORS 响应
2. **SSH 隧道环境**: 在 SSH 隧道环境下，cookie-based 认证不是必需的
3. **Token 认证**: AFFiNE 支持通过 Authorization header 进行认证

---

## 快速启动指南

### 启动后端服务

```bash
# 1. 进入 Docker Compose 目录
cd .docker/selfhost

# 2. 启动所有服务
docker compose up -d

# 3. 检查服务状态
docker compose ps

# 4. 查看日志
docker compose logs -f affine
```

### 启动前端开发服务器

```bash
# 1. 进入前端目录
cd src/web

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

### 验证部署

```bash
# 1. 测试后端健康检查
curl http://localhost:10003

# 2. 测试 GraphQL 端点
curl http://localhost:10003/graphql

# 3. 在浏览器中访问前端
# http://localhost:10009 (通过 SSH 隧道)
```

---

## 常见问题排查

### 问题 1: CORS 错误

**症状**: 浏览器控制台显示 CORS policy 错误

**解决方案**:

1. 确认 Apollo Client 配置中没有 `credentials: 'include'`
2. 检查后端服务是否正常运行
3. 验证 SSH 隧道是否已建立

### 问题 2: GraphQL 连接失败

**症状**: GraphQL 查询返回网络错误

**排查步骤**:

```bash
# 1. 检查后端服务
docker compose ps
docker compose logs affine

# 2. 测试直接连接
curl http://localhost:3010/graphql

# 3. 检查 SSH 隧道
netstat -an | grep 10003
```

### 问题 3: WebSocket 订阅失败

**症状**: 实时订阅功能不工作

**解决方案**:

1. 确认 WebSocket URL 配置正确 (`ws://localhost:10003/graphql`)
2. 检查防火墙是否允许 WebSocket 连接
3. 验证 Apollo Client 的 WebSocket link 配置

### 问题 4: 数据库连接错误

**症状**: 容器日志显示数据库连接失败

**解决方案**:

```bash
# 1. 检查 PostgreSQL 容器
docker compose logs postgres

# 2. 重置数据库
docker compose down -v
docker compose up -d

# 3. 检查数据库卷
ls -la ~/.affine/self-host/postgres/pgdata
```

---

## 维护命令

### 日志查看

```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f affine
docker compose logs -f postgres
docker compose logs -f redis

# 查看最近 100 行日志
docker compose logs --tail=100 affine
```

### 数据备份

```bash
# 备份数据库
docker exec affine_postgres pg_dump -U affine affine > backup.sql

# 备份用户数据
cp -r ~/.affine/self-host/storage ~/.affine/backup/storage-$(date +%Y%m%d)
```

### 服务重启

```bash
# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart affine
docker compose restart postgres
docker compose restart redis
```

### 清理和重建

```bash
# 停止并删除容器
docker compose down

# 停止并删除容器和数据卷（⚠️ 会删除数据）
docker compose down -v

# 重新构建并启动
docker compose up -d --build
```

---

## 配置文件清单

| 文件路径                       | 用途                    |
| ------------------------------ | ----------------------- |
| `.docker/selfhost/compose.yml` | Docker Compose 服务定义 |
| `.docker/selfhost/.env`        | 后端环境变量            |
| `.docker/selfhost/config.json` | AFFiNE 服务器配置       |
| `src/web/.env`                 | 前端环境变量            |
| `src/web/vite.config.ts`       | Vite 构建配置           |
| `src/web/lib/apollo-client.ts` | Apollo Client 配置      |
| `src/web/package.json`         | 前端依赖管理            |

---

## 安全建议

### 生产环境配置

1. **修改默认密码**:

   ```bash
   # 更改数据库密码
   DB_PASSWORD=your_secure_password
   ```

2. **启用 HTTPS**:

   ```json
   // config.json
   {
     "server": {
       "https": true,
       "externalUrl": "https://your-domain.com"
     }
   }
   ```

3. **更新 Session Salt**:

   ```json
   {
     "auth": {
       "sessionSalt": "generate-random-salt-here"
     }
   }
   ```

4. **限制网络访问**:
   - 不要暴露数据库端口到公网
   - 使用防火墙限制访问
   - 配置反向代理 (Nginx/Apache)

---

## 参考资源

- [AFFiNE 官方文档](https://github.com/toeverything/affine)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Apollo Client 文档](https://www.apollographql.com/docs/react/)
- [Vite 配置指南](https://vitejs.dev/config/)

---

**文档版本**: 1.0
**最后更新**: 2025-01-16
**维护者**: Development Team
