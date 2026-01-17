# AI Document Editor - Minimal Web SaaS

基于 AFFiNE 项目定制的最小化 AI 文档编辑器，专注于 Web 端 SaaS 模式。

## 目录结构

```
src/
├── web/                    # Web 前端应用
│   ├── components/         # React 组件
│   ├── routes/            # 页面路由
│   ├── hooks/             # 自定义 Hooks
│   ├── services/          # 服务层（API 调用）
│   ├── utils/             # 工具函数
│   ├── styles/            # 样式文件
│   ├── index.html         # HTML 入口
│   ├── main.tsx           # React 入口
│   ├── App.tsx            # 根组件
│   └── package.json       # 依赖配置
│
├── server/                # 后端服务（可选）
│   └── modules/           # 业务模块
│
├── shared/                # 前后端共享代码
│   ├── types/             # TypeScript 类型定义
│   ├── constants/         # 常量定义
│   └── utils/             # 共享工具
│
└── config/                # 配置文件
    ├── features.ts        # 功能开关
    ├── env.ts             # 环境配置
    ├── vite.config.ts     # Vite 配置
    └── tsconfig.json      # TypeScript 配置
```

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录安装依赖
yarn install
```

### 2. 配置环境变量

```bash
cd src/web
cp .env.example .env
# 编辑 .env 文件，配置你的环境变量
```

### 3. 启动开发服务器

```bash
cd src/web
yarn dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
cd src/web
yarn build
```

构建产物将输出到 `dist/web/` 目录。

## 核心特性

### ✅ 已实现

- ✅ Web 端基础框架
- ✅ 路由系统（React Router）
- ✅ TypeScript 类型定义
- ✅ 功能开关系统
- ✅ 基础页面布局

### 🚧 待实现

- 🚧 Blocksuite 编辑器集成
- 🚧 AI Chat 面板
- 🚧 认证系统
- 🚧 文档 CRUD
- 🚧 AI 功能集成
- 🚧 后端 API 集成

## 开发指南

### 添加新页面

1. 在 `src/web/routes/` 创建页面组件
2. 在 `src/web/routes/index.ts` 注册路由

```typescript
// src/web/routes/my-page.tsx
import { FC } from 'react';

export const MyPage: FC = () => {
  return <div>My Page</div>;
};

// src/web/routes/index.ts
export const routes: RouteConfig[] = [
  // ...existing routes
  {
    path: '/my-page',
    component: lazy(() => import('./my-page').then(m => ({ default: m.MyPage }))),
  },
];
```

### 功能开关

在 `src/config/features.ts` 中配置功能开关：

```typescript
export const features = {
  ai: {
    enabled: true, // 启用/禁用 AI 功能
    chat: true,
    // ...
  },
  // ...
};
```

### 引用 AFFiNE 模块

通过路径别名引用：

```typescript
import { SomeModule } from '@affine/core/modules/...';
import { SomeComponent } from '@affine/component/...';
import { BlocksuiteEditor } from '@blocksuite/affine/...';
```

## 依赖说明

### 直接引用的模块

- `@affine/core` - AFFiNE 前端核心
- `@affine/component` - AFFiNE UI 组件
- `@blocksuite/affine` - Blocksuite 编辑器框架
- `@toeverything/infra` - 基础设施层

### 需要安装的依赖

- React 19.2.1
- React Router DOM 6.30.2
- Vite 6.0.11
- TypeScript 5.7.2
- Apollo Client (GraphQL)

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t ai-doc-editor .

# 运行容器
docker run -p 3000:3000 ai-doc-editor
```

### 手动部署

```bash
# 1. 构建
cd src/web && yarn build

# 2. 部署到静态服务器（如 Nginx）
# 将 dist/web 目录内容复制到 Nginx 静态文件目录
```

## 后续工作

1. **集成 Blocksuite 编辑器**
   - 初始化编辑器实例
   - 实现文档加载和保存
   - 实现协作编辑

2. **实现 AI 功能**
   - 集成 AI Chat 面板
   - 实现 AI 生成文档
   - 实现局部修改功能

3. **实现认证系统**
   - 登录/注册页面
   - JWT 管理
   - 权限控制

4. **后端 API 集成**
   - GraphQL API
   - WebSocket 连接
   - 文档同步

## 相关文档

- [完整设计方案](../../docs/Web-SaaS模式AI文档编辑器-完整设计方案.md)
- [AFFiNE 官方文档](https://docs.affine.pro)
- [Blocksuite 文档](https://blocksuite.toeverything.app)

## License

MIT
