# AFFiNE AI 编辑器完整实现说明

## 架构概述

本实现通过引用 AFFiNE 的基础设施（`@toeverything/infra`）和核心服务，实现了完整的 Blocksuite 编辑器集成。

## 核心组件

### 1. AIEditorProvider (src/web/providers/AIEditorProvider.tsx)

**作用**: 初始化 AFFiNE 基础设施框架

```typescript
// 创建并注册核心服务
const framework = new Framework();

framework
  .impl(FeatureFlagService)
  .impl(EditorSettingService)
  .impl(ServerService)
  .scope('workspace', impl => impl.impl(WorkspaceService))
  .scope('doc', impl => impl.impl(DocService))
  .scope('editor', impl => impl.impl(EditorService));
```

**关键功能**:

- 使用 `Framework` 和 `FrameworkRoot` 建立依赖注入系统
- 注册 Workspace、Doc、Editor 等核心服务
- 通过 `AIEditorProvider` 包裹整个应用

### 2. EditorContainer (src/web/components/EditorContainer.tsx)

**作用**: 完整的 Blocksuite 编辑器集成

```typescript
// 使用 AFFiNE 的服务
const workspaceService = useService(WorkspaceService);
const docService = useService(DocService);
const editorService = useService(EditorService);

// 获取 Blocksuite store
const page = docService.doc.blockSuiteDoc;

// 渲染编辑器
<BlocksuiteDocEditor page={page} readonly={false} />
```

**关键功能**:

- 通过 `useService()` hook 获取 AFFiNE 服务
- 使用 `BlocksuiteDocEditor` 组件渲染真正的编辑器
- 支持保存、加载、错误处理等功能

### 3. EditorPage (src/web/routes/editor.tsx)

**作用**: 编辑器页面布局

```typescript
// 获取文档服务
const docService = useService(DocService);

// 布局：导航 + 编辑器 + AI 面板
<Navigation />
<EditorContainer />
<AIChatPanel />
```

### 4. useEditor Hook (src/web/hooks/useEditor.ts)

**作用**: 访问编辑器状态

```typescript
const docService = useService(DocService);
const store = docService.doc?.blockSuiteDoc;
```

## 依赖关系

```
AIEditorProvider (框架初始化)
    ↓
FrameworkRoot (依赖注入上下文)
    ↓
┌─────────────────────────────────┐
│                                 │
WorkspaceService    DocService    EditorService
│                 │               │
↓                 ↓               ↓
Blocksuite Store  文档管理       编辑器配置
```

## 服务说明

### WorkspaceService

- **位置**: `@affine/core/modules/workspace`
- **功能**: 管理工作区和文档集合
- **关键方法**: `workspace` (获取当前工作区)

### DocService

- **位置**: `@affine/core/modules/doc`
- **功能**: 管理文档实体和 Blocksuite store
- **关键方法**: `doc.blockSuiteDoc` (获取 Blocksuite store)

### EditorService

- **位置**: `@affine/core/modules/editor`
- **功能**: 编辑器配置和设置
- **依赖**: WorkspaceService, DocService

### FeatureFlagService

- **位置**: `@affine/core/modules/feature-flag`
- **功能**: 控制功能开关
- **用途**: RTL 支持、实验性功能等

## 关键导入

```typescript
// 基础设施
import { Framework } from '@toeverything/infra';
import { FrameworkRoot, useService } from '@toeverything/infra/react';

// 核心服务
import { WorkspaceService } from '@affine/core/modules/workspace';
import { DocService } from '@affine/core/modules/doc';
import { EditorService } from '@affine/core/modules/editor';

// 编辑器组件
import { BlocksuiteDocEditor, BlocksuiteEdgelessEditor } from '@affine/core/blocksuite/block-suite-editor';

// Blocksuite 类型
import type { Store } from '@blocksuite/store';
import type { DocMode } from '@blocksuite/affine/model';
```

## 与之前 Placeholder 实现的区别

| 方面     | Placeholder         | 完整实现                 |
| -------- | ------------------- | ------------------------ |
| 编辑器   | contentEditable div | 真正的 Blocksuite 编辑器 |
| 服务     | 独立的 service 类   | AFFiNE 框架服务          |
| 状态管理 | React useState      | Framework 实体           |
| 文档存储 | 模拟                | Workspace + Doc 实体     |
| 依赖注入 | 无                  | 完整的 DI 系统           |

## 使用示例

```typescript
// 1. 包裹应用
<AIEditorProvider>
  <App />
</AIEditorProvider>

// 2. 在组件中使用服务
function MyComponent() {
  const docService = useService(DocService);
  const store = docService.doc.blockSuiteDoc;

  // 使用 store...
}

// 3. 渲染编辑器
<EditorContainer
  docId="doc-123"
  workspaceId="workspace-456"
  mode="page"
  onSave={(content) => console.log('Saved!')}
  onReady={(store) => console.log('Ready!', store)}
/>
```

## 下一步

1. **文档加载**: 实现从服务器加载文档快照
2. **实时同步**: 配置 WebSocket 同步
3. **AI 功能**: 集成 AI Chat 面板与编辑器
4. **权限控制**: 添加只读/编辑权限
5. **持久化**: 配置自动保存到服务器

## 文件清单

```
src/web/
├── providers/
│   └── AIEditorProvider.tsx    # 框架初始化
├── components/
│   ├── EditorContainer.tsx     # 完整编辑器
│   ├── AIChatPanel.tsx         # AI 面板
│   └── Navigation.tsx          # 导航栏
├── hooks/
│   ├── useEditor.ts            # 编辑器 hook
│   ├── useAIChat.ts            # AI 聊天 hook
│   └── useAuth.ts              # 认证 hook
├── routes/
│   └── editor.tsx              # 编辑器页面
├── services/
│   ├── ai.ts                   # AI 服务
│   ├── auth.ts                 # 认证服务
│   └── document.ts             # 文档服务
└── App.tsx                     # 应用入口 (使用 AIEditorProvider)
```

## 注意事项

1. **框架依赖**: 必须先启动 AIEditorProvider 才能使用 useService
2. **服务生命周期**: 服务由框架管理，无需手动创建
3. **异步初始化**: Workspace 和 Doc 初始化是异步的
4. **错误处理**: 每个服务调用都应包含错误处理

---

**创建时间**: 2026-01-15T20:10:00Z
**版本**: 1.0.0 - 完整 AFFiNE 集成实现
