# AFFiNE 后端启动方式 ROI 分析

## 🎯 决策目标

**寻找最快、最简单的方式验证 AFFiNE 后端是否适合我们的项目**

---

## 📊 方案对比

### 方案 A: Docker Compose (推荐) ⭐

#### 启动步骤

```bash
# 1. 使用现有的 devcontainer 配置
cd /home/ubuntu/proj/AFFiNE
docker-compose -f .devcontainer/docker-compose.yml up -d

# 2. 等待数据库启动
sleep 10

# 3. 运行数据库迁移
cd packages/backend/server
DATABASE_URL="postgresql://affine:affine@localhost:5432/affine" \
yarn prisma migrate deploy

# 4. 启动后端服务
yarn dev
```

#### 优势

- ✅ **环境隔离**: 不污染本地系统
- ✅ **一键启动**: 数据库、Redis 全自动
- ✅ **可重复**: 团队成员环境一致
- ✅ **快速销毁**: `docker-compose down` 清理干净

#### 劣势

- ⚠️ 需要 Docker (但大多数开发者已安装)
- ⚠️ 占用一定磁盘空间 (~2GB)

#### 时间成本

| 任务                   | 时间        |
| ---------------------- | ----------- |
| 安装 Docker (如果没有) | 10 分钟     |
| 启动容器               | 2 分钟      |
| 配置环境变量           | 5 分钟      |
| 运行迁移               | 3 分钟      |
| 启动后端               | 1 分钟      |
| **总计**               | **20 分钟** |

#### 财务成本

- **零成本** (本地开发)
- 服务器成本: $0 (本地机器)

#### ROI 评分: ⭐⭐⭐⭐⭐ (9/10)

---

### 方案 B: AFFiNE 官方 Demo/Cloud

#### 启动步骤

```bash
# 无需启动，直接使用官方服务
# GraphQL API: https://app.affine.pro/graphql
# 或者请求 Demo 账号: https://affine.pro
```

#### 优势

- ✅ **零配置**: 无需安装任何东西
- ✅ **立即可用**: 打开浏览器就能用
- ✅ **生产级**: 稳定可靠
- ✅ **完整功能**: 所有功能都可用

#### 劣势

- ❌ **无法定制**: 无法修改后端代码
- ❌ **网络依赖**: 需要互联网连接
- ❌ **数据隔离**: 测试数据在公共环境
- ❌ **API 限制**: 可能有速率限制

#### 时间成本

| 任务         | 时间        |
| ------------ | ----------- |
| 注册账号     | 2 分钟      |
| 获取 API Key | 1 分钟      |
| 测试 API     | 10 分钟     |
| **总计**     | **13 分钟** |

#### 财务成本

- **免费版**: 有限功能
- **付费版**: ~$10-20/月

#### ROI 评分: ⭐⭐⭐⭐ (7/10)

**适用场景**:

- ✅ 快速验证 API 设计
- ❌ 不适合深度定制开发

---

### 方案 C: 本地编译安装

#### 启动步骤

```bash
# 1. 安装系统依赖
sudo apt install postgresql redis-server nodejs

# 2. 配置数据库
sudo -u postgres createuser affine
sudo -u postgres createdb affine

# 3. 配置环境变量
cp .env.example .env
vim .env  # 配置 DATABASE_URL, REDIS_URL

# 4. 安装依赖
yarn install

# 5. 运行迁移
yarn prisma migrate deploy

# 6. 启动服务
yarn dev
```

#### 优势

- ✅ **完全控制**: 可以修改任何代码
- ✅ **性能最优**: 无容器开销
- ✅ **调试方便**: 直接 attach 进程

#### 劣势

- ❌ **配置复杂**: 需要手动配置多个服务
- ❌ **环境依赖**: 污染本地系统
- ❌ **难以重现**: 团队成员环境可能不一致
- ❌ **卸载麻烦**: 需要手动清理

#### 时间成本

| 任务            | 时间                    |
| --------------- | ----------------------- |
| 安装 PostgreSQL | 15 分钟                 |
| 安装 Redis      | 5 分钟                  |
| 配置数据库      | 10 分钟                 |
| 配置环境变量    | 10 分钟                 |
| 安装 Node 依赖  | 20 分钟 (首次)          |
| 运行迁移        | 5 分钟                  |
| 启动服务        | 2 分钟                  |
| 排查问题        | 30 分钟 (预估)          |
| **总计**        | **97 分钟 (~1.5 小时)** |

#### 财务成本

- **零成本** (本地开发)
- 但需要占用本地资源

#### ROI 评分: ⭐⭐⭐ (5/10)

---

### 方案 D: Mock API (最轻量) 🚀

#### 实现方式

```typescript
// 创建一个简化的 Mock Server
// tools/mock-affine-server.ts

import { createServer } from 'http';
import { parse } from 'url';
import { ApolloServer } from '@apollo/server';
import { prisma } from '../packages/backend/server/src/core';

const server = createServer(async (req, res) => {
  // Mock GraphQL responses
  if (url.pathname === '/graphql') {
    // 返回 AFFiNE 兼容的响应
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        data: {
          // Mock 数据
        },
      })
    );
  }
});

server.listen(4000, () => {
  console.log('Mock AFFiNE Server running on http://localhost:4000');
});
```

#### 优势

- ✅ **极速启动**: 1 分钟即可运行
- ✅ **零依赖**: 不需要数据库、Redis
- ✅ **完全可控**: Mock 任何需要的响应
- ✅ **测试友好**: 可以注入错误场景

#### 劣势

- ❌ **非真实环境**: 不是真正的 AFFiNE 后端
- ❌ **功能有限**: 只能 Mock 已知的 API
- ❌ **维护成本**: 需要手动更新 Mock 数据

#### 时间成本

| 任务             | 时间                  |
| ---------------- | --------------------- |
| 创建 Mock Server | 30 分钟               |
| 编写 Mock 数据   | 30 分钟               |
| 测试             | 10 分钟               |
| **总计**         | **70 分钟 (~1 小时)** |

#### 财务成本

- **零成本**

#### ROI 评分: ⭐⭐⭐⭐ (8/10)

**适用场景**:

- ✅ 快速原型开发
- ✅ 前端独立开发
- ❌ 不适合验证后端功能

---

## 🎯 推荐方案 (基于验证阶段)

### 🥇 第一选择: **Docker Compose + AFFiNE 官方 Demo 混合**

**策略**: 使用 AFFiNE 官方 Demo 验证 API 设计 + 本地 Docker 运行后端验证功能

**实施计划**:

#### Day 1: 快速 API 验证 (2 小时)

```bash
# 1. 使用 AFFiNE 官方 Demo
# 访问 https://app.affine.pro
# 注册账号，测试功能

# 2. 查看 GraphQL Playground
# https://app.affine.pro/graphql
# 尝试以下查询:
```

```graphql
# 查询文档列表
query {
  workspace(id: "YOUR_WORKSPACE_ID") {
    id
    name
    docs {
      id
      title
    }
  }
}

# 创建 AI Chat Session
mutation {
  createCopilotSession(options: { workspaceId: "YOUR_WORKSPACE_ID", promptName: "default" })
}
```

#### Day 2: 本地环境搭建 (1 小时)

```bash
# 启动 Docker 环境
cd /home/ubuntu/proj/AFFiNE
docker-compose -f .devcontainer/docker-compose.yml up -d postgres redis

# 配置环境变量
cat > packages/backend/server/.env << EOF
DATABASE_URL=postgresql://affine:affine@localhost:5432/affine
REDIS_SERVER_HOST=localhost
COPILOT_OPENAI_API_KEY=sk-test-key  # 使用测试 key
EOF

# 运行迁移
cd packages/backend/server
yarn prisma migrate deploy

# 启动后端
yarn dev
```

#### Day 3-4: 功能测试 (2 天)

- 测试 GraphQL API
- 测试 AI Chat
- 测试 WebSocket
- 记录 API 差异

**总时间**: 3 天
**成本**: $0 (本地 Docker)
**ROI**: ⭐⭐⭐⭐⭐

---

## 📋 决策矩阵

| 方案               | 启动时间 | 复杂度 | 灵活性 | 真实性 | 推荐指数   |
| ------------------ | -------- | ------ | ------ | ------ | ---------- |
| **Docker Compose** | 20 分钟  | 低     | 高     | 高     | ⭐⭐⭐⭐⭐ |
| **官方 Demo**      | 13 分钟  | 极低   | 低     | 高     | ⭐⭐⭐⭐   |
| **本地安装**       | 97 分钟  | 高     | 高     | 高     | ⭐⭐⭐     |
| **Mock Server**    | 70 分钟  | 中     | 高     | 低     | ⭐⭐⭐⭐   |

---

## 💡 最终建议

### 阶段 1: 今天 (2 小时) - 快速验证

**使用**: AFFiNE 官方 Demo

- 注册账号: https://app.affine.pro
- 测试 GraphQL Playground
- 体验 AI Chat 功能
- **决策点**: API 设计是否满足需求？

### 阶段 2: 明天 (1 小时) - 本地搭建

**使用**: Docker Compose

```bash
# 一键启动数据库和 Redis
docker-compose -f .devcontainer/docker-compose.yml up -d

# 启动后端
yarn dev
```

**决策点**: 本地后端是否可以稳定运行？

### 阶段 3: 本周 (3 天) - 功能测试

**任务**:

- 测试 GraphQL API
- 测试 AI Chat 流式响应
- 测试 WebSocket 实时通信
- 记录 API 适配难度

**决策点**: 是否采用 AFFiNE 后端？

---

## 🚀 立即行动

### 今天就可以做的 3 件事 (15 分钟):

#### 1. 访问 AFFiNE 官方 Demo (5 分钟)

```bash
# 打开浏览器
https://app.affine.pro

# 体验功能
- 创建文档
- 测试 AI Chat
- 查看 GraphQL Playground
```

#### 2. 启动 Docker 环境 (5 分钟)

```bash
cd /home/ubuntu/proj/AFFiNE
docker-compose -f .devcontainer/docker-compose.yml up -d postgres redis

# 验证容器运行
docker ps
```

#### 3. 查看 GraphQL Schema (5 分钟)

```bash
# 查看 AFFiNE GraphQL Schema
cat packages/backend/server/src/schema.gql | less

# 搜索关键类型
grep "type.*ChatSession" packages/backend/server/src/schema.gql
grep "type.*Snapshot" packages/backend/server/src/schema.gql
```

---

## 📊 预期结果

### 如果验证通过 (最可能):

- ✅ API 设计满足 80% 需求
- ✅ 可以通过适配层解决差异
- ✅ 节省 $40k-$70k 开发成本
- ✅ 缩短 4 个月开发时间

### 如果验证失败 (不太可能):

- ❌ API 差异太大
- ❌ 性能不满足要求
- ❌ 无法定制核心功能
- → 考虑重新实现后端

---

## 🎓 总结

**从 ROI 角度，最优方案是**:

1. **先用官方 Demo** (13 分钟) - 快速验证 API
2. **再用 Docker Compose** (20 分钟) - 本地测试功能
3. **最后决策** - 是否采用 AFFiNE 后端

**总时间投入**: 33 分钟 + 3 天测试
**预期收益**: 节省 $40k+ 和 4 个月时间

**这是最高 ROI 的验证路径！**

---

## 附录: 快速启动脚本

我为你准备了一个一键启动脚本:

```bash
#!/bin/bash
# scripts/start-affine-backend.sh

set -e

echo "🚀 Starting AFFiNE Backend (Docker)..."

# 1. 启动数据库和 Redis
echo "📦 Starting PostgreSQL and Redis..."
docker-compose -f .devcontainer/docker-compose.yml up -d postgres redis

# 2. 等待数据库就绪
echo "⏳ Waiting for database..."
sleep 10

# 3. 配置环境变量
echo "🔧 Configuring environment..."
cat > packages/backend/server/.env << EOF
DATABASE_URL=postgresql://affine:affine@localhost:5432/affine
REDIS_SERVER_HOST=localhost
NODE_ENV=development
AFFINE_ENV=dev
EOF

# 4. 运行数据库迁移
echo "📊 Running database migrations..."
cd packages/backend/server
yarn prisma migrate deploy

# 5. 启动后端
echo "✅ Starting backend server..."
yarn dev

echo "🎉 AFFiNE Backend is running!"
echo "📍 GraphQL API: http://localhost:8080/graphql"
echo "📍 WebSocket: ws://localhost:8080"
```

**使用方法**:

```bash
chmod +x scripts/start-affine-backend.sh
./scripts/start-affine-backend.sh
```

---

**准备好开始了吗？我建议先从 AFFiNE 官方 Demo 开始验证！**
