# AI 编辑器嵌入集成设计文档

**项目名称**: AI Document Editor - Embedded Integration
**版本**: 1.0.0
**最后更新**: 2025-01-16
**设计目标**: 将 AI 编辑器作为可嵌入模块集成到第三方应用

---

## 📋 目录

1. [设计概述](#设计概述)
2. [集成方案](#集成方案)
3. [认证对接设计](#认证对接设计)
4. [配置系统](#配置系统)
5. [通信协议](#通信协议)
6. [样式隔离](#样式隔离)
7. [生命周期管理](#生命周期管理)
8. [安全性设计](#安全性设计)
9. [API 开关设计](#api-开关设计)
10. [集成示例](#集成示例)

---

## 设计概述

### 核心目标

将 AI Document Editor 设计为可嵌入的独立模块，支持：

1. **无缝集成**: 第三方应用可以轻松嵌入编辑器
2. **认证共享**: 复用宿主应用的认证系统
3. **配置灵活**: 支持多种集成场景和配置
4. **样式隔离**: 不影响宿主应用样式
5. **事件通信**: 宿主应用与编辑器双向通信
6. **独立部署**: 编辑器可独立部署和版本管理

### 集成场景

#### 场景 1: iframe 嵌入

```html
<iframe src="https://editor.example.com" />
```

- 适用场景: 完全隔离、独立部署
- 优点: 完全隔离、安全性高
- 缺点: 通信复杂、加载慢

#### 场景 2: Web Components

```html
<ai-editor config="..."></ai-editor>
```

- 适用场景: 同源集成、轻量嵌入
- 优点: 原生支持、通信简单
- 缺点: 样式隔离需要额外处理

#### 场景 3: React/NPM 包

```javascript
import { AIEditor } from '@ai-doc-editor/sdk';
<AIEditor config={...} />
```

- 适用场景: React 应用集成
- 优点: 类型安全、深度集成
- 缺点: 绑定技术栈

#### 场景 4: UMD 通用包

```html
<script src="ai-editor.js"></script>
<script>
  new AIEditor('#container', config);
</script>
```

- 适用场景: 传统应用、多框架
- 优点: 框架无关
- 缺点: 包体积大

### 推荐方案

**主推**: Web Components + iframe 双模式

- Web Components 用于轻量集成
- iframe 用于完全隔离场景

---

## 集成方案

### 方案 1: Web Components (推荐)

#### 实现架构

```typescript
// AI Editor Web Component
@customElement('ai-doc-editor')
class AIDocEditor extends HTMLElement {
  // 配置接口
  config: EditorConfig;

  // 生命周期
  connectedCallback() {
    /* 初始化 */
  }
  disconnectedCallback() {
    /* 清理 */
  }

  // 公共 API
  getContent(): string {
    /* ... */
  }
  setContent(content: string): void {
    /* ... */
  }
  save(): Promise<void> {
    /* ... */
  }

  // 事件系统
  emit(event: EditorEvent): void {
    /* ... */
  }
  on(event: string, handler: Function): void {
    /* ... */
  }
}
```

#### 使用示例

```html
<!-- 简单使用 -->
<ai-doc-editor api-url="https://api.example.com" auth-token="user-token" doc-id="doc-123"> </ai-doc-editor>

<!-- 带配置 -->
<ai-doc-editor
  config='{
    "apiUrl": "https://api.example.com",
    "authToken": "user-token",
    "docId": "doc-123",
    "features": {
      "ai": true,
      "collaboration": true
    }
  }'
>
</ai-doc-editor>

<!-- JavaScript 控制 -->
<script>
  const editor = document.querySelector('ai-doc-editor');

  // 监听事件
  editor.addEventListener('ready', () => console.log('Editor ready'));
  editor.addEventListener('save', e => console.log('Saved:', e.detail.content));

  // 调用 API
  const content = editor.getContent();
  editor.setContent('New content');
  editor.save();
</script>
```

#### 实现文件结构

```
src/
├── web/
│   ├── components/
│   │   └── ai-doc-editor.ts          # Web Component 主文件
│   ├── sdk/
│   │   ├── types.ts                   # SDK 类型定义
│   │   ├── config.ts                  # 配置解析
│   │   ├── events.ts                  # 事件系统
│   │   ├── api.ts                     # 公共 API
│   │   └── index.ts                   # SDK 入口
│   └── styles/
│       └── editor-shadow.css         # Shadow DOM 样式
```

#### 核心实现

**`ai-doc-editor.ts`**:

```typescript
import { createRoot, Root } from 'react-dom/client';
import { EditorApp } from '../app';
import { EditorConfig, parseConfig } from '../sdk/config';
import { EventEmitter } from '../sdk/events';

export class AIDocEditor extends HTMLElement {
  private root: Root | null = null;
  private eventBus = new EventEmitter();
  private config: EditorConfig;

  static get observedAttributes() {
    return ['config', 'api-url', 'auth-token', 'doc-id'];
  }

  async connectedCallback() {
    // 解析配置
    this.config = parseConfig(
      this.getAttribute('config') || '',
      {
        apiUrl: this.getAttribute('api-url'),
        authToken: this.getAttribute('auth-token'),
        docId: this.getAttribute('doc-id'),
      }
    );

    // 创建 Shadow DOM
    this.attachShadow({ mode: 'open' });

    // 渲染 React 应用
    this.root = createRoot(this.shadowRoot!);
    this.root.render(
      <EditorApp
        config={this.config}
        eventBus={this.eventBus}
        onReady={() => this.emit('ready')}
      />
    );

    // 暴露 API 到全局
    this.exposeAPI();
  }

  disconnectedCallback() {
    this.root?.unmount();
  }

  // 公共 API
  getContent() {
    return this.eventBus.emit('get-content');
  }

  setContent(content: string) {
    this.eventBus.emit('set-content', content);
  }

  async save() {
    return this.eventBus.emit('save');
  }

  // 事件系统
  on(event: string, handler: Function) {
    this.eventBus.on(event, handler);
  }

  off(event: string, handler: Function) {
    this.eventBus.off(event, handler);
  }

  private emit(event: string, data?: any) {
    this.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  private exposeAPI() {
    // 暴露到 window（用于非框架环境）
    (this as any).getContent = this.getContent.bind(this);
    (this as any).setContent = this.setContent.bind(this);
    (this as any).save = this.save.bind(this);
    (this as any).on = this.on.bind(this);
  }
}

// 注册自定义元素
if (!customElements.get('ai-doc-editor')) {
  customElements.define('ai-doc-editor', AIDocEditor);
}
```

### 方案 2: iframe 集成

#### 消息通信协议

**宿主应用 → 编辑器**:

```typescript
// 发送消息到 iframe
const iframe = document.querySelector('iframe');

// 初始化编辑器
iframe.contentWindow.postMessage(
  {
    type: 'INIT',
    payload: {
      authToken: 'user-token',
      docId: 'doc-123',
      apiUrl: 'https://api.example.com',
    },
  },
  '*'
);

// 设置内容
iframe.contentWindow.postMessage(
  {
    type: 'SET_CONTENT',
    payload: { content: 'New content' },
  },
  '*'
);

// 保存文档
iframe.contentWindow.postMessage(
  {
    type: 'SAVE',
    payload: {},
  },
  '*'
);
```

**编辑器 → 宿主应用**:

```typescript
// 监听编辑器消息
window.addEventListener('message', event => {
  const { type, payload } = event.data;

  switch (type) {
    case 'READY':
      console.log('Editor ready');
      break;
    case 'CONTENT_CHANGE':
      console.log('Content changed:', payload.content);
      break;
    case 'SAVE':
      console.log('Document saved:', payload.docId);
      break;
    case 'ERROR':
      console.error('Editor error:', payload.error);
      break;
  }
});
```

#### PostMessage API 规范

```typescript
// 消息类型定义
type PostMessage = { type: 'INIT'; payload: InitConfig } | { type: 'SET_CONTENT'; payload: { content: string } } | { type: 'GET_CONTENT'; payload: {} } | { type: 'SAVE'; payload: {} } | { type: 'READY'; payload: {} } | { type: 'CONTENT_CHANGE'; payload: { content: string } } | { type: 'SAVE_COMPLETE'; payload: { docId: string } } | { type: 'ERROR'; payload: { error: string } };
```

### 方案 3: React/NPM SDK

#### 包结构

```
@ai-doc-editor/sdk/
├── dist/
│   ├── index.esm.js        # ES Module
│   ├── index.umd.js        # UMD
│   └── types.d.ts          # TypeScript 类型
├── src/
│   ├── index.ts            # 主入口
│   ├── components/         # React 组件
│   ├── hooks/              # React Hooks
│   └── types/              # 类型定义
└── package.json
```

#### 使用示例

```typescript
// 安装
// npm install @ai-doc-editor/sdk

import { AIEditor, EditorConfig } from '@ai-doc-editor/sdk';

function App() {
  const config: EditorConfig = {
    apiUrl: 'https://api.example.com',
    authToken: getUserToken(),
    docId: 'doc-123',
    features: {
      ai: true,
      collaboration: true,
    },
  };

  const handleSave = (content: string) => {
    console.log('Saved:', content);
  };

  const handleReady = () => {
    console.log('Editor ready');
  };

  return (
    <AIEditor
      config={config}
      onSave={handleSave}
      onReady={handleReady}
      style={{ height: '600px' }}
    />
  );
}
```

---

## 认证对接设计

### 认证架构

```
┌─────────────────┐
│  宿主应用       │
│  (已有认证)     │
└────────┬────────┘
         │ 1. 获取 Token
         ↓
┌─────────────────┐
│  认证适配层     │
│  (Token 传递)   │
└────────┬────────┘
         │ 2. 转换 Token
         ↓
┌─────────────────┐
│  AI 编辑器      │
│  (使用 Token)   │
└────────┬────────┘
         │ 3. 调用 API
         ↓
┌─────────────────┐
│  AFFiNE 后端    │
│  (验证 Token)   │
└─────────────────┘
```

### 认证模式

#### 模式 1: JWT Token 传递 (推荐)

**流程**:

1. 宿主应用已有 JWT Token
2. 将 Token 传递给编辑器
3. 编辑器使用 Token 调用后端 API

**实现**:

```typescript
// 宿主应用
const token = localStorage.getItem('auth_token'); // 或从其他地方获取

<ai-doc-editor
  auth-token={token}
  auth-type="bearer"
/>
```

```typescript
// 编辑器内部
// src/web/services/auth.ts

class AuthService {
  private token: string;
  private tokenType: 'bearer' | 'basic' | 'custom';

  constructor(config: AuthConfig) {
    this.token = config.token;
    this.tokenType = config.tokenType || 'bearer';
  }

  // 为请求添加认证头
  addAuthHeaders(headers: Headers): Headers {
    if (this.tokenType === 'bearer') {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    return headers;
  }

  // 获取当前 Token
  getToken(): string {
    return this.token;
  }

  // 验证 Token
  async validateToken(): Promise<boolean> {
    const response = await fetch(`${this.apiUrl}/auth/validate`, {
      headers: this.addAuthHeaders(new Headers()),
    });
    return response.ok;
  }
}
```

#### 模式 2: OAuth 2.0 Token 交换

**流程**:

1. 宿主应用使用 OAuth 获取 access_token
2. 将 access_token 传递给编辑器
3. 编辑器使用 access_token 调用 API

**实现**:

```typescript
// 宿主应用
const oauthToken = await getOAuthToken();

<ai-doc-editor
  auth-token={oauthToken.access_token}
  auth-type="oauth"
  token-refresh-url={oauthToken.refresh_url}
/>
```

```typescript
// 编辑器内部
// Token 自动刷新
class OAuthTokenManager {
  private accessToken: string;
  private refreshTokenUrl: string;

  async refreshAccessToken(): Promise<string> {
    const response = await fetch(this.refreshTokenUrl, {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      }),
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  // 拦截请求，Token 过期自动刷新
  async fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    // Token 过期，刷新后重试
    if (response.status === 401) {
      await this.refreshAccessToken();
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    }

    return response;
  }
}
```

#### 模式 3: Session Cookie (同域场景)

**流程**:

1. 宿主应用设置 Cookie
2. 编辑器通过 iframe 嵌入（同域）
3. 后端自动验证 Cookie

**实现**:

```typescript
// 宿主应用（同域）
fetch('https://editor.example.com/auth/session', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ token: userToken }),
});

// 编辑器（iframe）
// 自动携带 Cookie，无需额外配置
<iframe src="https://editor.example.com/editor/doc-123" />
```

#### 模式 4: 自定义认证适配器

**流程**:

1. 宿主应用实现认证适配器
2. 编辑器调用适配器获取 Token
3. 支持任意认证方式

**实现**:

```typescript
// 宿主应用定义认证适配器
window.AIEditorAuthAdapter = {
  async getToken() {
    // 自定义获取 Token 逻辑
    return await customAuthFlow();
  },

  async refreshToken() {
    // 自定义刷新逻辑
    return await refreshAuthFlow();
  },

  formatToken(token) {
    // 自定义 Token 格式
    return `Custom ${token}`;
  },
};

// 编辑器使用适配器
const token = await window.AIEditorAuthAdapter.getToken();
```

### 认证配置接口

```typescript
// src/sdk/types/auth.ts

export interface AuthConfig {
  // 认证类型
  type: 'bearer' | 'basic' | 'oauth' | 'custom' | 'cookie';

  // Token（bearer/basic/oauth）
  token?: string;

  // OAuth 配置
  oauth?: {
    accessToken: string;
    refreshToken?: string;
    tokenRefreshUrl?: string;
    expiresIn?: number;
  };

  // Cookie 配置
  cookie?: {
    name: string;
    domain?: string;
    path?: string;
  };

  // 自定义适配器
  customAdapter?: string; // window.AIEditorAuthAdapter 的 key

  // Token 刷新回调
  onTokenExpired?: () => Promise<string>;

  // Token 验证
  validateOnLoad?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  expiresAt?: number;
  user?: UserInfo;
}
```

### Apollo Client 认证集成

```typescript
// src/web/lib/apollo-client.ts

import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { AuthService } from '../services/auth';

class AuthenticatedApolloClient {
  private auth: AuthService;
  private client: ApolloClient;

  constructor(auth: AuthService) {
    this.auth = auth;

    // 认证中间件
    const authLink = new ApolloLink((operation, forward) => {
      // 添加认证头
      const token = this.auth.getToken();
      operation.setContext({
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      return forward(operation);
    });

    // HTTP 链接
    const httpLink = new HttpLink({
      uri: config.apiUrl,
    });

    // 创建客户端
    this.client = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    });
  }

  getClient(): ApolloClient {
    return this.client;
  }
}
```

---

## 配置系统

### 配置接口

```typescript
// src/sdk/types/config.ts

export interface EditorConfig {
  // ============ 认证配置 ============
  auth: AuthConfig;

  // ============ API 配置 ============
  api: {
    url: string; // GraphQL 端点
    wsUrl?: string; // WebSocket 端点
    timeout?: number; // 请求超时
    mockEnabled?: boolean; // Mock 模式开关
  };

  // ============ 文档配置 ============
  doc: {
    id: string; // 文档 ID
    initialContent?: string; // 初始内容
    autoSave?: boolean; // 自动保存
    autoSaveInterval?: number; // 自动保存间隔（ms）
  };

  // ============ 功能开关 ============
  features: {
    // AI 功能
    ai: {
      enabled: boolean;
      chat: boolean;
      generateDoc: boolean;
      localEdit: boolean;
      summarize: boolean; // 使用 Mock 或真实 API
      improve: boolean;
      translate: boolean;
    };

    // 编辑器功能
    editor: {
      toolbar: boolean;
      shortcuts: boolean;
      collaboration: boolean;
    };

    // UI 功能
    ui: {
      fullscreen: boolean;
      export: boolean;
      print: boolean;
    };
  };

  // ============ 样式配置 ============
  style?: {
    theme?: 'light' | 'dark' | 'auto';
    customCSS?: string;
    height?: string | number;
    width?: string | number;
    maxHeight?: string | number;
  };

  // ============ 事件回调 ============
  events?: {
    onReady?: () => void;
    onContentChange?: (content: string) => void;
    onSave?: (docId: string, content: string) => void;
    onError?: (error: Error) => void;
    onAuthError?: (error: AuthError) => void;
  };

  // ============ 国际化 ============
  i18n?: {
    locale?: string;
    messages?: Record<string, string>;
  };

  // ============ 调试 ============
  debug?: boolean;
}
```

### 配置解析

```typescript
// src/sdk/config/parser.ts

export function parseConfig(configString: string, attributes: Record<string, string>): EditorConfig {
  // 合并配置
  const config = {
    ...JSON.parse(configString || '{}'),
    ...attributes,
  };

  // 验证必需字段
  if (!config.api?.url) {
    throw new Error('API URL is required');
  }

  if (!config.auth?.token && !config.auth?.customAdapter) {
    throw new Error('Auth token or custom adapter is required');
  }

  if (!config.doc?.id) {
    throw new Error('Document ID is required');
  }

  // 应用默认值
  return {
    ...config,
    api: {
      timeout: 30000,
      mockEnabled: false,
      ...config.api,
    },
    doc: {
      autoSave: true,
      autoSaveInterval: 5000,
      ...config.doc,
    },
    features: {
      ai: {
        enabled: true,
        chat: true,
        generateDoc: true,
        localEdit: true,
        summarize: true,
        improve: true,
        translate: true,
        ...config.features?.ai,
      },
      editor: {
        toolbar: true,
        shortcuts: true,
        collaboration: false,
        ...config.features?.editor,
      },
      ui: {
        fullscreen: true,
        export: true,
        print: true,
        ...config.features?.ui,
      },
    },
  };
}
```

### 环境变量配置

```typescript
// src/config/env.ts

export const env = {
  // API 配置
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:10003/graphql',
  VITE_WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:10003/graphql',

  // 功能开关
  VITE_MOCK_ENABLED: import.meta.env.VITE_MOCK_ENABLED === 'true',
  VITE_AI_ENABLED: import.meta.env.VITE_AI_ENABLED !== 'false',

  // AFFiNE 后端配置
  VITE_AFFINE_URL: import.meta.env.VITE_AFFINE_URL || 'http://localhost:10003',

  // 认证配置
  VITE_AUTH_TYPE: import.meta.env.VITE_AUTH_TYPE || 'bearer',
  VITE_AUTH_TOKEN_REFRESH_URL: import.meta.env.VITE_AUTH_TOKEN_REFRESH_URL,

  // 开发配置
  VITE_DEBUG: import.meta.env.VITE_DEBUG === 'true',
  VITE_DEV_TOOLS: import.meta.env.VITE_DEV_TOOLS === 'true',
};
```

---

## 通信协议

### 事件系统

#### 编辑器发出的事件

```typescript
// src/sdk/types/events.ts

export type EditorEventType =
  | 'ready' // 编辑器初始化完成
  | 'content-change' // 内容变更
  | 'save' // 保存完成
  | 'save-error' // 保存失败
  | 'auth-error' // 认证失败
  | 'error' // 其他错误
  | 'ai-response' // AI 响应
  | 'ai-error'; // AI 错误

export interface EditorEvent {
  type: EditorEventType;
  payload: any;
  timestamp: number;
}

// 事件详情
interface ReadyEvent {
  version: string;
  config: EditorConfig;
}

interface ContentChangeEvent {
  content: string;
  delta: Delta; // 变更差异
}

interface SaveEvent {
  docId: string;
  content: string;
  timestamp: number;
}

interface AuthErrorEvent {
  code: number;
  message: string;
  shouldRefresh: boolean;
}
```

#### 事件监听

```typescript
// Web Component 方式
const editor = document.querySelector('ai-doc-editor');

editor.addEventListener('ready', (e) => {
  console.log('Editor ready:', e.detail);
});

editor.addEventListener('content-change', (e) => {
  console.log('Content changed:', e.detail.content);
});

// React 方式
<AIEditor
  onReady={(detail) => console.log('Ready:', detail)}
  onContentChange={(detail) => console.log('Changed:', detail)}
/>
```

### 远程调用 API

#### 宿主应用调用编辑器

```typescript
// Web Component API
const editor = document.querySelector('ai-doc-editor');

// 获取内容
const content = await editor.getContent();

// 设置内容
await editor.setContent('New content');

// 保存
await editor.save();

// 获取选中文本
const selection = await editor.getSelection();

// 插入内容
await editor.insertText('text', { at: position });

// 执行 AI 操作
await editor.aiAction('summarize', { content: '...' });
```

#### iframe PostMessage API

```typescript
// 宿主应用
const iframe = document.querySelector('iframe');

// 调用 API
iframe.contentWindow.postMessage(
  {
    type: 'GET_CONTENT',
    requestId: '1',
  },
  '*'
);

// 监听响应
window.addEventListener('message', event => {
  if (event.data.requestId === '1') {
    console.log('Content:', event.data.payload.content);
  }
});
```

---

## 样式隔离

### Shadow DOM 样式隔离

```css
/* src/web/styles/editor-shadow.css */
:host {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

:host([hidden]) {
  display: none;
}

/* 编辑器容器 */
.editor-container {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 确保样式不被外部覆盖 */
.editor-container * {
  box-sizing: border-box;
}
```

### CSS 变量自定义

```css
/* 宿主应用可以覆盖这些变量 */
:host {
  --editor-primary-color: #1a1a1a;
  --editor-border-color: #e0e0e0;
  --editor-bg-color: #ffffff;
  --editor-text-color: #333333;
  --editor-font-size: 14px;
}

.ai-editor {
  color: var(--editor-text-color);
  font-size: var(--editor-font-size);
}
```

### 主题配置

```typescript
// 宿主应用设置主题
<ai-doc-editor
  theme='{
    "colors": {
      "primary": "#007AFF",
      "background": "#FFFFFF"
    },
    "fonts": {
      "body": "14px system-ui"
    }
  }'
/>
```

---

## 生命周期管理

### 初始化流程

```
1. 组件挂载 (connectedCallback)
   ↓
2. 解析配置 (parseConfig)
   ↓
3. 验证认证 (validateAuth)
   ↓
4. 创建 Shadow DOM
   ↓
5. 渲染 React 应用
   ↓
6. 初始化 Apollo Client
   ↓
7. 加载文档内容
   ↓
8. 发送 ready 事件
```

### 销毁流程

```
1. 组件卸载 (disconnectedCallback)
   ↓
2. 保存文档（如果有未保存的更改）
   ↓
3. 关闭 WebSocket 连接
   ↓
4. 取消所有订阅
   ↓
5. 清理定时器
   ↓
6. 卸载 React 应用
   ↓
7. 发送 destroy 事件
```

### 错误处理

```typescript
// src/sdk/error-handler.ts

export class EditorErrorHandler {
  handle(error: Error, context: string) {
    console.error(`[AI Editor Error] ${context}:`, error);

    // 发送错误事件
    this.emit('error', {
      message: error.message,
      stack: error.stack,
      context,
    });

    // 认证错误特殊处理
    if (this.isAuthError(error)) {
      this.emit('auth-error', {
        code: error.code,
        message: error.message,
        shouldRefresh: error.code === 401,
      });
    }
  }

  private isAuthError(error: any): boolean {
    return error.code === 401 || error.code === 403 || error.message?.includes('auth');
  }
}
```

---

## 安全性设计

### 内容安全策略 (CSP)

```html
<!-- 宿主应用 CSP -->
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self';
               script-src 'self' 'unsafe-inline' https://editor.example.com;
               style-src 'self' 'unsafe-inline';
               frame-src https://editor.example.com;"
/>
```

### 跨域隔离

```typescript
// src/web/utils/security.ts

export function validateOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some(allowed => {
    // 精确匹配
    if (allowed === origin) return true;

    // 通配符匹配
    if (allowed.includes('*')) {
      const domain = allowed.replace('*', '');
      return origin.endsWith(domain);
    }

    return false;
  });
}

// iframe 消息验证
window.addEventListener('message', event => {
  if (!validateOrigin(event.origin, config.allowedOrigins)) {
    console.warn('Invalid origin:', event.origin);
    return;
  }

  // 处理消息
});
```

### Token 安全

```typescript
// Token 存储（不使用 localStorage）
class TokenManager {
  private token: string | null = null;

  setToken(token: string) {
    // 内存存储，页面刷新后需要重新获取
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken() {
    this.token = null;
  }
}
```

---

## API 开关设计

### Mock 模式实现

```typescript
// src/web/services/ai.ts

export class AIService {
  private mockEnabled: boolean;

  constructor(config: { mockEnabled: boolean }) {
    this.mockEnabled = config.mockEnabled;
  }

  async chat(message: string): Promise<string> {
    if (this.mockEnabled) {
      return this.mockChat(message);
    }

    // 真实 API 调用
    return this.realChat(message);
  }

  private mockChat(message: string): string {
    // Mock 响应
    const responses = ['这是一个测试响应（Mock 模式）', '我理解你的问题，这是模拟的回答', '[Mock] AI 正在处理你的请求...'];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private async realChat(message: string): Promise<string> {
    // 调用 AFFiNE GraphQL API
    const response = await apolloClient.mutate({
      mutation: CHAT_MUTATION,
      variables: { message },
    });

    return response.data.chat.content;
  }
}
```

### 功能开关

```typescript
// src/config/features.ts

export const features = {
  // API 开关
  api: {
    useMock: import.meta.env.VITE_MOCK_ENABLED === 'true',
    useAffine: true, // 使用 AFFiNE 后端
  },

  // AI 功能开关
  ai: {
    chat: true,
    summarize: {
      enabled: true,
      useMock: import.meta.env.VITE_MOCK_SUMMARIZE === 'true',
    },
    improve: {
      enabled: true,
      useMock: import.meta.env.VITE_MOCK_IMPROVE === 'true',
    },
  },

  // 开发工具
  dev: {
    debug: import.meta.env.VITE_DEBUG === 'true',
    devTools: import.meta.env.VITE_DEV_TOOLS === 'true',
  },
};
```

### 环境变量配置

```bash
# .env.development
VITE_MOCK_ENABLED=true              # 启用 Mock 模式
VITE_MOCK_SUMMARIZE=true            # 总结功能使用 Mock
VITE_MOCK_IMPROVE=true              # 改进功能使用 Mock
VITE_AFFINE_URL=http://localhost:10003
VITE_DEBUG=true

# .env.production
VITE_MOCK_ENABLED=false             # 使用真实 API
VITE_AFFINE_URL=https://api.example.com
VITE_DEBUG=false
```

### 运行时切换

```typescript
// 运行时切换 Mock 模式
const editor = document.querySelector('ai-doc-editor');

// 切换到 Mock 模式
editor.setConfig({
  api: {
    ...editor.config.api,
    mockEnabled: true,
  },
});

// 切换到真实 API
editor.setConfig({
  api: {
    ...editor.config.api,
    mockEnabled: false,
  },
});
```

---

## 集成示例

### 示例 1: React 应用集成

```typescript
// App.tsx
import { AIEditor } from '@ai-doc-editor/sdk';

function App() {
  const config = {
    api: {
      url: 'https://api.example.com/graphql',
      mockEnabled: false,
    },
    auth: {
      type: 'bearer',
      token: getUserToken(),
    },
    doc: {
      id: 'doc-123',
      autoSave: true,
    },
    features: {
      ai: {
        enabled: true,
        chat: true,
      },
    },
  };

  return (
    <div style={{ height: '100vh' }}>
      <AIEditor
        config={config}
        onReady={() => console.log('Ready')}
        onSave={(docId, content) => saveToBackend(docId, content)}
        onError={(error) => reportError(error)}
      />
    </div>
  );
}
```

### 示例 2: Vue 应用集成

```vue
<!-- Editor.vue -->
<template>
  <ai-doc-editor ref="editor" :config="editorConfig" @ready="onReady" @save="onSave" @error="onError" />
</template>

<script>
export default {
  data() {
    return {
      editorConfig: {
        api: {
          url: process.env.VITE_API_URL,
          mockEnabled: false,
        },
        auth: {
          type: 'bearer',
          token: this.$store.state.auth.token,
        },
        doc: {
          id: this.$route.params.docId,
        },
      },
    };
  },
  methods: {
    onReady() {
      console.log('Editor ready');
    },
    onSave(detail) {
      console.log('Saved:', detail);
    },
    onError(error) {
      this.$notify.error(error.message);
    },
  },
};
</script>
```

### 示例 3: 纯 HTML/JS 集成

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.example.com/ai-editor.js"></script>
  </head>
  <body>
    <ai-doc-editor
      id="editor"
      config='{
      "api": {
        "url": "https://api.example.com/graphql"
      },
      "auth": {
        "type": "bearer",
        "token": "USER_TOKEN_HERE"
      },
      "doc": {
        "id": "doc-123"
      }
    }'
      style="height: 600px;"
    >
    </ai-doc-editor>

    <script>
      const editor = document.getElementById('editor');

      editor.addEventListener('ready', () => {
        console.log('Editor ready');

        // 设置内容
        editor.setContent('Initial content...');
      });

      editor.addEventListener('save', e => {
        console.log('Saved:', e.detail);
      });

      // 外部控制
      document.getElementById('save-btn').addEventListener('click', () => {
        editor.save();
      });
    </script>
  </body>
</html>
```

### 示例 4: WordPress/PHP 集成

```php
<?php
// WordPress 插件示例

function ai_editor_shortcode($atts) {
  $atts = shortcode_atts(array(
    'doc_id' => '',
    'token' => wp_get_current_user()->user_token,
  ), $atts);

  $config = json_encode(array(
    'api' => array(
      'url' => get_option('ai_editor_api_url'),
    ),
    'auth' => array(
      'type' => 'bearer',
      'token' => $atts['token'],
    ),
    'doc' => array(
      'id' => $atts['doc_id'],
    ),
  ));

  return '<ai-doc-editor config="' . htmlspecialchars($config) . '"></ai-doc-editor>';
}

add_shortcode('ai_editor', 'ai_editor_shortcode');
?>
```

使用：

```html
[ai_editor doc_id="post-123"]
```

---

## 部署方案

### 独立部署

```bash
# 构建生产版本
npm run build

# 输出
# dist/
#   ├── ai-editor.js          # UMD 版本
#   ├── ai-editor.esm.js      # ES Module 版本
#   ├── ai-editor.css         # 样式文件
#   └── assets/               # 静态资源
```

### CDN 部署

```html
<!-- 使用 CDN -->
<script src="https://cdn.example.com/ai-editor@1.0.0/ai-editor.js"></script>
```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 版本管理

```bash
# 语义化版本
ai-editor@1.0.0  # 稳定版本
ai-editor@1.1.0-beta.1  # 测试版本
ai-editor@latest  # 最新版本
```

---

## 测试策略

### 单元测试

```typescript
// __tests__/ai-doc-editor.test.ts
import { AIDocEditor } from '../src/sdk';

describe('AIDocEditor', () => {
  it('should initialize with config', () => {
    const editor = new AIDocEditor();
    editor.setAttribute(
      'config',
      JSON.stringify({
        api: { url: 'http://test.com' },
        auth: { type: 'bearer', token: 'test' },
        doc: { id: 'test-doc' },
      })
    );

    expect(editor.config.apiUrl).toBe('http://test.com');
  });

  it('should emit ready event', async () => {
    const editor = new AIDocEditor();
    const readyPromise = new Promise(resolve => {
      editor.addEventListener('ready', resolve);
    });

    document.body.appendChild(editor);

    await readyPromise;
    // 验证事件触发
  });
});
```

### 集成测试

```typescript
// __tests__/integration/auth.test.ts
describe('Auth Integration', () => {
  it('should authenticate with bearer token', async () => {
    const editor = new AIDocEditor();
    editor.setAttribute('auth-token', 'test-token');

    await editor.connectedCallback();

    // 验证 Apollo Client 认证头
    const client = editor.getApolloClient();
    expect(client.link).toContainAuthToken('test-token');
  });
});
```

---

## 附录

### A. 配置校验

```typescript
// src/sdk/config/validator.ts

export function validateConfig(config: EditorConfig): ValidationResult {
  const errors: string[] = [];

  // 必需字段
  if (!config.api?.url) errors.push('API URL is required');
  if (!config.auth) errors.push('Auth config is required');
  if (!config.doc?.id) errors.push('Document ID is required');

  // 格式验证
  if (config.api?.url && !isValidUrl(config.api.url)) {
    errors.push('Invalid API URL format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### B. TypeScript 类型定义

```typescript
// src/sdk/types/index.ts

export * from './config';
export * from './auth';
export * from './events';
export * from './api';

// 全局类型扩展
declare global {
  interface Window {
    AIEditorAuthAdapter?: AuthAdapter;
  }

  interface HTMLElement {
    getContent(): string;
    setContent(content: string): void;
    save(): Promise<void>;
  }
}
```

---

**文档版本**: 1.0
**最后更新**: 2025-01-16
**维护者**: Development Team
