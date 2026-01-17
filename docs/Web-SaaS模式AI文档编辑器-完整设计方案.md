# Web-SaaS 模式 AI 文档编辑器完整设计方案

## 项目概述

基于 AFFiNE 项目定制 **仅 Web 端、SaaS 模式**的 AI 文档编辑器，核心能力为「AI 编写完整文档 + AI Chat 局部修改文档」。

**设计原则**：通过配置裁剪实现最小化部署，在 `src/` 目录中构建独立应用，最大限度复用现有代码。

---

## 一、技术架构修正

### 1.1 核心依赖关系

```
┌─────────────────────────────────────────────────┐
│              Web Application (src/)              │
│  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ Frontend   │  │ AI Chat    │  │ Editor    │  │
│  │ (React)    │  │ Panel      │  │ (Blocks)  │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘  │
│        │               │                │         │
│        └───────────────┴────────────────┘         │
│                        │                           │
└────────────────────────┼───────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐   ┌─────▼─────┐   ┌────▼────┐
    │Blocksuite│   │  GraphQL  │   │ Backend │
    │ (引用)    │   │  API      │   │ (引用)   │
    └─────────┘   └───────────┘   └─────────┘
```

### 1.2 关键路径修正

**原设计错误 → 修正后：**

| 模块              | 原文档路径                     | 实际路径                       | 说明         |
| ----------------- | ------------------------------ | ------------------------------ | ------------ |
| Blocksuite        | `packages/blocksuite/`         | `blocksuite/` (根目录)         | 独立的子模块 |
| Blocksuite Blocks | `packages/blocksuite/blocks/`  | `blocksuite/affine/blocks/`    | 块定义       |
| nbstore           | `packages/common/nbstore/src/` | `packages/common/nbstore/src/` | ✓ 正确       |
| 前端核心          | `packages/frontend/core/src/`  | `packages/frontend/core/src/`  | ✓ 正确       |
| 后端核心          | `packages/backend/server/src/` | `packages/backend/server/src/` | ✓ 正确       |

---

## 二、目录结构设计

### 2.1 新建 src 目录结构

```
AFFiNE/
├── src/                              # 新建的独立应用目录
│   ├── web/                          # Web 前端应用
│   │   ├── index.html                # HTML 入口
│   │   ├── main.tsx                  # React 入口
│   │   ├── App.tsx                   # 根组件
│   │   ├── routes/                   # 路由配置
│   │   │   ├── editor.tsx            # 文档编辑页
│   │   │   ├── auth.tsx              # 认证页
│   │   │   └── index.ts
│   │   ├── components/               # 自定义组件
│   │   │   ├── EditorContainer.tsx   # 编辑器容器
│   │   │   ├── AIChatPanel.tsx       # AI 聊天面板
│   │   │   └── Navigation.tsx        # 导航栏
│   │   ├── hooks/                    # 自定义 Hooks
│   │   │   ├── useAIChat.ts          # AI 聊天 Hook
│   │   │   ├── useAuth.ts            # 认证 Hook
│   │   │   └── useEditor.ts          # 编辑器 Hook
│   │   ├── services/                 # 服务层（API 调用）
│   │   │   ├── ai.ts                 # AI 服务
│   │   │   ├── auth.ts               # 认证服务
│   │   │   └── document.ts           # 文档服务
│   │   ├── utils/                    # 工具函数
│   │   └── styles/                   # 样式文件
│   │
│   ├── server/                       # 后端服务（如需独立后端）
│   │   ├── index.ts                  # 服务器入口
│   │   ├── modules/                  # 业务模块
│   │   │   ├── auth/                 # 认证模块
│   │   │   ├── document/             # 文档模块
│   │   │   └── ai/                   # AI 模块
│   │   ├── config.ts                 # 配置
│   │   └── plugins/                  # 插件（引用现有）
│   │
│   ├── shared/                       # 前后端共享代码
│   │   ├── types/                    # TypeScript 类型
│   │   ├── constants/                # 常量
│   │   └── utils/                    # 共享工具
│   │
│   └── config/                       # 配置文件
│       ├── vite.config.ts            # Vite 配置
│       ├── tsconfig.json             # TypeScript 配置
│       └── env.ts                    # 环境变量
│
├── blocksuite/                       # 引用：编辑器框架
├── packages/
│   ├── frontend/core/                # 引用：前端核心
│   ├── common/                       # 引用：通用模块
│   └── backend/server/               # 引用：后端服务
│
└── package.json                      # 根依赖配置
```

### 2.2 引用策略

**直接引用（无需复制）：**

```typescript
// package.json 中的 workspace 依赖
{
  "dependencies": {
    "@blocksuite/affine": "workspace:*",
    "@blocksuite/std": "workspace:*",
    "@affine/core": "workspace:*",  // 选择性引用
    "@affine/component": "workspace:*",
    "@affine/nbstore": "workspace:*",
    "@toeverything/infra": "workspace:*"
  }
}
```

**需要复制到 src/ 的代码：**

| 来源                                           | 目标                     | 原因             |
| ---------------------------------------------- | ------------------------ | ---------------- |
| `packages/frontend/apps/web/src/`              | `src/web/`               | Web 应用入口     |
| `packages/frontend/core/src/modules/editor/`   | `src/web/services/`      | 编辑器初始化逻辑 |
| `packages/frontend/core/src/blocksuite/ai/`    | `src/web/components/`    | AI UI 组件       |
| `packages/backend/server/src/plugins/copilot/` | `src/server/modules/ai/` | AI 后端逻辑      |

---

## 三、核心模块清单

### 3.1 编辑器核心（Blocksuite）

**引用位置：** `blocksuite/`（根目录）

**保留的块（Blocks）：**

| 块名       | 路径                                   | 用途         |
| ---------- | -------------------------------------- | ------------ |
| Paragraph  | `blocksuite/affine/blocks/paragraph/`  | 段落文本     |
| Code       | `blocksuite/affine/blocks/code/`       | 代码块       |
| List       | `blocksuite/affine/blocks/list/`       | 列表         |
| Divider    | `blocksuite/affine/blocks/divider/`    | 分割线       |
| Attachment | `blocksuite/affine/blocks/attachment/` | 附件（图片） |

**移除的块：**

- `surface/` - 白板画布
- `database/` - 数据库视图
- `frame/` - 画布框架

**核心框架：**

| 模块   | 路径                           | 用途         |
| ------ | ------------------------------ | ------------ |
| Store  | `blocksuite/framework/store/`  | 文档数据存储 |
| Sync   | `blocksuite/framework/sync/`   | 云端同步     |
| Global | `blocksuite/framework/global/` | 全局配置     |

### 3.2 AI 能力核心

**后端 AI（引用）：** `packages/backend/server/src/plugins/copilot/`

| 子模块       | 保留 | 说明                    |
| ------------ | ---- | ----------------------- |
| `prompt/`    | ✓    | Prompt 模板管理         |
| `providers/` | ✓    | OpenAI/Anthropic 集成   |
| `chat/`      | ✓    | AI Chat 核心逻辑        |
| `tools/`     | ✓    | 文档局部修改工具        |
| `embedding/` | ✗    | 向量检索（SaaS 用云端） |
| `mcp/`       | ✗    | MCP 协议（非必需）      |

**前端 AI（复制/引用）：** `packages/frontend/core/src/blocksuite/ai/`

| 组件               | 操作                         | 说明        |
| ------------------ | ---------------------------- | ----------- |
| `chat-panel/`      | 复制到 `src/web/components/` | AI 聊天面板 |
| `ai-provider.ts`   | 引用                         | AI 能力调度 |
| `text-renderer.ts` | 复制到 `src/web/utils/`      | AI 输出渲染 |

### 3.3 Web 端核心

**前端应用（复制到 `src/web/`）：**

| 来源                                     | 目标                 | 说明      |
| ---------------------------------------- | -------------------- | --------- |
| `packages/frontend/apps/web/src/app.tsx` | `src/web/App.tsx`    | 根组件    |
| `packages/frontend/apps/web/src/routes/` | `src/web/routes/`    | 路由配置  |
| `packages/frontend/apps/web/index.html`  | `src/web/index.html` | HTML 入口 |

**前端模块（选择性引用）：**

| 模块         | 操作                                  | 说明         |
| ------------ | ------------------------------------- | ------------ |
| `auth/`      | 引用 `@affine/core/modules/auth`      | 认证模块     |
| `workspace/` | 引用 `@affine/core/modules/workspace` | 工作区       |
| `editor/`    | 复制并简化                            | 编辑器初始化 |
| `ai/`        | 引用 `@affine/core/modules/ai`        | AI 功能入口  |

### 3.4 SaaS 基础设施

**后端模块（引用）：**

| 模块   | 路径                                             | 说明      |
| ------ | ------------------------------------------------ | --------- |
| 认证   | `packages/backend/server/src/modules/auth/`      | JWT/OAuth |
| 工作区 | `packages/backend/server/src/modules/workspace/` | 多租户    |
| 文档   | `packages/backend/server/src/modules/doc/`       | 文档 CRUD |
| 用户   | `packages/backend/server/src/core/user/`         | 用户管理  |

**数据层（引用）：**

| 模块    | 路径                                  | 说明       |
| ------- | ------------------------------------- | ---------- |
| Prisma  | `packages/backend/server/src/models/` | 数据库模型 |
| nbstore | `packages/common/nbstore/src/`        | 存储抽象层 |
| GraphQL | `packages/common/graphql/`            | API 层     |

---

## 四、配置裁剪策略

### 4.1 功能开关设计

创建 `src/config/features.ts`：

```typescript
export const features = {
  // 端能力
  platforms: {
    web: true,
    electron: false,
    mobile: false,
  },

  // 编辑器功能
  editor: {
    page: true, // 文档模式
    edgeless: false, // 白板模式
  },

  // AI 功能
  ai: {
    chat: true, // AI 聊天
    generateDoc: true, // 生成完整文档
    局部修改: true, // 局部修改
    mindMap: false, // 思维导图
    presentation: false, // 幻灯片
  },

  // 存储策略
  storage: {
    cloud: true, // 云端存储
    local: false, // 本地存储
    indexedDB: false, // IndexedDB
  },
} as const;
```

### 4.2 Vite 配置裁剪

`src/config/vite.config.ts`：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@blocksuite/affine': resolve(__dirname, '../../blocksuite/affine'),
      '@blocksuite/std': resolve(__dirname, '../../blocksuite/framework/std'),
      '@affine/core': resolve(__dirname, '../../packages/frontend/core/src'),
    },
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          blocksuite: ['@blocksuite/affine', '@blocksuite/std'],
          vendor: ['react', 'react-dom'],
          editor: ['@affine/core'],
        },
      },
    },
  },

  server: {
    port: 3000,
    proxy: {
      '/graphql': 'http://localhost:3001',
    },
  },
});
```

### 4.3 TypeScript 配置

`src/config/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"],
      "@blocksuite/*": ["../blocksuite/*"],
      "@affine/*": ["../packages/frontend/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 五、核心文件依赖图

### 5.1 前端依赖

```
src/web/main.tsx
  ↓
src/web/App.tsx
  ↓
┌─────────────────────────────────┐
│                                 │
src/web/routes/editor.tsx    src/web/routes/auth.tsx
│                               │
├─────────────────────────────┐ │
│                             │ │
EditorContainer          AuthForm
│                             │
├─────────────┬──────────────┤ │
│             │              │ │
引用          引用           引用
│             │              │
blocksuite/  @affine/core  @affine/core
affine/       modules/      modules/
blocks/       editor/       auth/
```

### 5.2 AI 功能依赖

```
src/web/components/AIChatPanel.tsx
  ↓
src/web/hooks/useAIChat.ts
  ↓
src/web/services/ai.ts (GraphQL Client)
  ↓
packages/backend/server/src/plugins/copilot/
  ├─ providers/     (OpenAI/Anthropic)
  ├─ prompt/        (Prompt 模板)
  └─ tools/         (文档修改工具)
```

---

## 六、部署架构

### 6.1 开发环境

```
┌─────────────────┐
│  Browser        │
│  localhost:3000 │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         │
┌────────▼────────┐
│  Vite Dev Server│
│  (src/web/)     │
└────────┬────────┘
         │
         │ GraphQL
         │
┌────────▼────────┐
│  Backend Server │
│  :3001          │
│  (引用现有)      │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
┌───▼──┐  ┌───▼────┐
│ PG   │  │  AI    │
│ DB   │  │  APIs  │
└──────┘  └────────┘
```

### 6.2 生产环境（Docker）

```yaml
# docker-compose.yml
services:
  web:
    build: ./src/web
    ports: ['3000:3000']
    depends_on: [api]

  api:
    image: affine/server:latest
    ports: ['3001:3001']
    environment:
      - DATABASE_URL=postgresql://...
      - AI_API_KEY=sk-...
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16
    volumes: ['pgdata:/var/lib/postgresql/data']

  redis:
    image: redis:7
```

---

## 七、实施步骤

### Phase 1: 项目初始化

```bash
# 1. 创建 src 目录结构
mkdir -p src/{web,server,shared,config}

# 2. 复制 Web 入口文件
cp -r packages/frontend/apps/web/src/* src/web/

# 3. 创建配置文件
touch src/config/{vite.config.ts,tsconfig.json,features.ts}
```

### Phase 2: 依赖配置

```bash
# 4. 创建 src/web/package.json
cat > src/web/package.json <<EOF
{
  "name": "@affine/web-minimal",
  "dependencies": {
    "@blocksuite/affine": "workspace:*",
    "@blocksuite/std": "workspace:*",
    "@affine/core": "workspace:*",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "react-router-dom": "^6.30.2"
  }
}
EOF

# 5. 安装依赖
yarn install
```

### Phase 3: 功能裁剪

```typescript
// 6. 创建功能开关
// src/config/features.ts（见上文）

// 7. 修改 Blocksuite 初始化，仅注册需要的块
// src/web/services/editor.ts
```

### Phase 4: 构建测试

```bash
# 8. 测试构建
cd src/web
yarn build

# 9. 启动开发服务器
yarn dev
```

---

## 八、风险评估与缓解

| 风险                | 影响       | 概率 | 缓解措施                      |
| ------------------- | ---------- | ---- | ----------------------------- |
| 模块高度耦合        | 提取困难   | 高   | 采用引用而非复制              |
| 依赖包体积大        | 构建缓慢   | 中   | Tree-shaking + Code Splitting |
| 配置复杂度高        | 学习曲线陡 | 中   | 提供详细文档和示例            |
| Blocksuite API 变化 | 维护成本   | 中   | 锁定版本 + 密切关注更新       |

---

## 九、总结

本设计方案通过以下策略实现最小化 AI 文档编辑器：

1. **目录隔离**：新建 `src/` 目录，不影响原有代码
2. **智能引用**：能引用的模块直接引用，避免代码重复
3. **配置裁剪**：通过功能开关控制启用的功能
4. **渐进式实施**：分阶段实施，降低风险

**核心优势：**

- ✓ 不破坏原有代码结构
- ✓ 最大化代码复用
- ✓ 易于维护和升级
- ✓ 支持独立部署

**文件清单：**

- Web 前端：`src/web/`
- 后端服务：引用 `packages/backend/server/`
- 编辑器：引用 `blocksuite/`
- 配置文件：`src/config/`

---

**文档版本：** v2.0
**创建时间：** 2026-01-14T11:50:10Z
**最后更新：** 2026-01-14T11:50:10Z
