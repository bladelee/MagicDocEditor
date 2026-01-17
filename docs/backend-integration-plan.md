# AI 编辑器后端对接设计文档

**项目名称**: AI Document Editor - Backend Integration
**版本**: 1.0.0
**最后更新**: 2025-01-16
**后端服务**: AFFiNE Self-Hosted (Docker)

---

## 📋 目录

1. [对接概述](#对接概述)
2. [AFFiNE 后端架构](#affine-后端架构)
3. [API 对接设计](#api-对接设计)
4. [Mock 模式实现](#mock-模式实现)
5. [认证集成](#认证集成)
6. [数据持久化](#数据持久化)
7. [WebSocket 实时通信](#websocket-实时通信)
8. [错误处理与降级](#错误处理与降级)
9. [环境配置](#环境配置)
10. [对接实现步骤](#对接实现步骤)

---

## 对接概述

### AFFiNE 后端现状

#### 已部署服务

```
AFFiNE Server (Docker Compose)
├── affine_server (端口 3010 → 10003 via SSH tunnel)
├── postgres (pgvector/pgvector:pg16)
├── redis (最新版本)
└── affine_migration (数据库迁移)
```

#### API 能力

- ✅ GraphQL API (查询、变更)
- ✅ WebSocket 订阅
- ✅ 用户认证 (JWT)
- ✅ 文档 CRUD
- ✅ 协作编辑
- ✅ AI 功能 (Copilot)

#### 测试状态

- ✅ 基础连接测试通过
- ✅ Schema introspection 正常
- ✅ 认证系统正常
- ⚠️ 部分 AI 功能需要对接

### 对接目标

1. **保留 Mock 模式**: 作为测试和降级方案
2. **实现真实 API**: 对接 AFFiNE GraphQL API
3. **灵活切换**: 支持运行时切换 Mock/Real
4. **渐进迁移**: 逐步从 Mock 迁移到真实 API
5. **容错降级**: API 失败时自动降级到 Mock

### 对接策略

```
┌─────────────────────────────────────┐
│     应用层 (React Components)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│    服务层 (Service Layer)           │
│  ┌──────────────────────────────┐  │
│  │  API 开关 (Mock/Real)        │  │
│  └────────┬──────────────┬──────┘  │
└───────────┼──────────────┼─────────┘
            │              │
   ┌────────▼─────┐  ┌────▼──────────┐
   │  Mock Service│  │ Real Service  │
   │  (本地)      │  │ (AFFiNE API)  │
   └──────────────┘  └───────────────┘
```

---

## AFFiNE 后端架构

### GraphQL Schema

#### 查询 (Queries)

```graphql
# 用户相关
type Query {
  # 当前用户
  currentUser: User

  # 工作区列表
  workspaces: [Workspace!]!

  # 文档查询
  workspace(id: ID!): Workspace
  doc(id: ID!): Doc

  # AI 相关
  listCopilotPrompts: [CopilotPrompt!]
}
```

#### 变更 (Mutations)

```graphql
type Mutation {
  # 文档操作
  createDoc(workspaceId: ID!, title: String!): Doc!
  updateDoc(id: ID!, title: String, content: String): Doc!
  deleteDoc(id: ID!): Boolean!

  # AI 操作
  chat(message: String!): ChatResponse!
  summarize(content: String!): String!
  improve(content: String!): String!
  translate(content: String!, targetLang: String!): String!

  # 认证
  signIn(email: String!, password: String!): AuthResponse!
  signUp(name: String!, email: String!, password: String!): AuthResponse!
}
```

#### 订阅 (Subscriptions)

```graphql
type Subscription {
  # 文档变更
  docUpdated(docId: ID!): DocUpdate

  # 协作光标
  cursorMoved(docId: ID!): Cursor

  # AI 流式响应
  chatStream(message: String!): ChatChunk!
}
```

### 数据模型

#### User

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
  emailVerified: Boolean
  createdAt: DateTime!
}
```

#### Workspace

```graphql
type Workspace {
  id: ID!
  name: String!
  avatar: String
  isOwner: Boolean!
  isActivated: Boolean!
  members: [WorkspaceMember!]!
  docs: [Doc!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### Doc

```graphql
type Doc {
  id: ID!
  workspace: Workspace!
  title: String!
  content: String!
  blocks: [Block!]!
  createdDate: DateTime!
  updatedDate: DateTime!
  isFavorite: Boolean!
  isTrash: Boolean!
}
```

#### Block

```graphql
type Block {
  id: ID!
  type: BlockType!
  content: String!
  props: JSON
  children: [Block!]!
}
```

### API 端点

#### 开发环境

```
GraphQL HTTP:  http://localhost:3010/graphql
GraphQL WS:    ws://localhost:3010/graphql
Via SSH:       http://localhost:10003/graphql
Via SSH WS:    ws://localhost:10003/graphql
```

#### 生产环境

```
GraphQL HTTP:  https://api.example.com/graphql
GraphQL WS:    wss://api.example.com/graphql
```

---

## API 对接设计

### 服务层架构

```typescript
// src/web/services/base.ts

export abstract class BaseService {
  protected apiEnabled: boolean;
  protected mockEnabled: boolean;

  constructor(config: { apiEnabled: boolean; mockEnabled: boolean }) {
    this.apiEnabled = config.apiEnabled;
    this.mockEnabled = config.mockEnabled;
  }

  // 路由到真实 API 或 Mock
  protected async exec<T>(realFn: () => Promise<T>, mockFn: () => Promise<T>): Promise<T> {
    if (this.apiEnabled && !this.mockEnabled) {
      try {
        return await realFn();
      } catch (error) {
        console.error('API call failed, falling back to mock:', error);
        // 可选：降级到 Mock
        if (config.fallbackToMock) {
          return await mockFn();
        }
        throw error;
      }
    } else {
      return await mockFn();
    }
  }
}
```

### AI 服务对接

```typescript
// src/web/services/ai.service.ts

import { gql, ApolloClient } from '@apollo/client';
import { BaseService } from './base';

// GraphQL 查询定义
const CHAT_MUTATION = gql`
  mutation Chat($message: String!) {
    chat(message: $message) {
      content
      timestamp
    }
  }
`;

const SUMMARIZE_MUTATION = gql`
  mutation Summarize($content: String!) {
    summarize(content: $content) {
      summary
    }
  }
`;

const IMPROVE_MUTATION = gql`
  mutation Improve($content: String!) {
    improve(content: $content) {
      improved
    }
  }
`;

const TRANSLATE_MUTATION = gql`
  mutation Translate($content: String!, $targetLang: String!) {
    translate(content: $content, targetLang: $targetLang) {
      translated
    }
  }
`;

// Mock 响应生成器
class MockAIGenerator {
  private summaryTemplates = ['这段内容主要讲述了{topic}，重点包括{keyPoints}。', '总结：{summary}', '核心要点：{keyPoints}'];

  private improvementTemplates = ['{improved} (已改进)', '建议修改为：{improved}'];

  generateSummary(content: string): string {
    const preview = content.slice(0, 50);
    return `[Mock] 文档总结：本文档主要讨论了"${preview}..."等相关内容。`;
  }

  generateImprovement(content: string): string {
    return `[Mock] 改进建议：对"${content.slice(0, 30)}..."的表达可以更加精炼和专业。建议使用更具体的词汇和更清晰的结构。`;
  }

  generateTranslation(content: string, targetLang: string): string {
    return `[Mock] 翻译到${targetLang}：${content}`;
  }

  generateChatResponse(message: string): string {
    const responses = [`我理解你的问题"${message}"。这是一个模拟的回答（Mock 模式）。`, `[Mock] AI 正在处理："${message}"`, `这是一个测试响应。真实 API 对接后，这里将显示真实的 AI 回复。`];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

export class AIService extends BaseService {
  private apollo: ApolloClient;
  private mock: MockAIGenerator;

  constructor(apollo: ApolloClient, config: { apiEnabled: boolean; mockEnabled: boolean }) {
    super(config);
    this.apollo = apollo;
    this.mock = new MockAIGenerator();
  }

  // AI 聊天
  async chat(message: string): Promise<string> {
    return this.exec(
      // 真实 API
      async () => {
        const response = await this.apollo.mutate({
          mutation: CHAT_MUTATION,
          variables: { message },
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.chat.content;
      },
      // Mock
      () => Promise.resolve(this.mock.generateChatResponse(message))
    );
  }

  // 文档总结
  async summarize(content: string): Promise<string> {
    return this.exec(
      async () => {
        const response = await this.apollo.mutate({
          mutation: SUMMARIZE_MUTATION,
          variables: { content },
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.summarize.summary;
      },
      () => Promise.resolve(this.mock.generateSummary(content))
    );
  }

  // 写作改进
  async improve(content: string): Promise<string> {
    return this.exec(
      async () => {
        const response = await this.apollo.mutate({
          mutation: IMPROVE_MUTATION,
          variables: { content },
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.improve.improved;
      },
      () => Promise.resolve(this.mock.generateImprovement(content))
    );
  }

  // 翻译
  async translate(content: string, targetLang: string): Promise<string> {
    return this.exec(
      async () => {
        const response = await this.apollo.mutate({
          mutation: TRANSLATE_MUTATION,
          variables: { content, targetLang },
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.translate.translated;
      },
      () => Promise.resolve(this.mock.generateTranslation(content, targetLang))
    );
  }

  // 生成文档（完整实现，不需要 Mock）
  async generateDoc(prompt: string): Promise<string> {
    const response = await this.apollo.mutate({
      mutation: gql`
        mutation GenerateDoc($prompt: String!) {
          generateDoc(prompt: $prompt) {
            id
            content
          }
        }
      `,
      variables: { prompt },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data.generateDoc.content;
  }
}
```

### 文档服务对接

```typescript
// src/web/services/document.service.ts

import { gql, ApolloClient } from '@apollo/client';
import { BaseService } from './base';

// GraphQL 查询
const GET_DOC_QUERY = gql`
  query GetDoc($id: ID!) {
    doc(id: $id) {
      id
      title
      content
      blocks {
        id
        type
        content
        props
      }
      createdDate
      updatedDate
    }
  }
`;

const CREATE_DOC_MUTATION = gql`
  mutation CreateDoc($workspaceId: ID!, $title: String!) {
    createDoc(workspaceId: $workspaceId, title: $title) {
      id
      title
      content
    }
  }
`;

const UPDATE_DOC_MUTATION = gql`
  mutation UpdateDoc($id: ID!, $title: String, $content: String) {
    updateDoc(id: $id, title: $title, content: $content) {
      id
      title
      content
      updatedDate
    }
  }
`;

const DELETE_DOC_MUTATION = gql`
  mutation DeleteDoc($id: ID!) {
    deleteDoc(id: $id)
  }
`;

const LIST_DOCS_QUERY = gql`
  query ListDocs($workspaceId: ID!) {
    workspace(id: $workspaceId) {
      docs {
        id
        title
        updatedDate
        isFavorite
        isTrash
      }
    }
  }
`;

export class DocumentService extends BaseService {
  private apollo: ApolloClient;
  private localStorage: LocalStorageService;

  constructor(apollo: ApolloClient, config: { apiEnabled: boolean; mockEnabled: boolean }) {
    super(config);
    this.apollo = apollo;
    this.localStorage = new LocalStorageService();
  }

  // 获取文档
  async getDoc(id: string): Promise<Doc> {
    return this.exec(
      async () => {
        const response = await this.apollo.query({
          query: GET_DOC_QUERY,
          variables: { id },
          fetchPolicy: 'network-only',
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.doc;
      },
      // Mock: 从 localStorage 返回
      async () => {
        return this.localStorage.getDoc(id);
      }
    );
  }

  // 创建文档
  async createDoc(workspaceId: string, title: string): Promise<Doc> {
    return this.exec(
      async () => {
        const response = await this.apollo.mutate({
          mutation: CREATE_DOC_MUTATION,
          variables: { workspaceId, title },
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.createDoc;
      },
      async () => {
        const doc = {
          id: generateId(),
          title,
          content: '',
          blocks: [],
          createdDate: new Date().toISOString(),
          updatedDate: new Date().toISOString(),
        };
        this.localStorage.saveDoc(doc);
        return doc;
      }
    );
  }

  // 更新文档
  async updateDoc(id: string, updates: Partial<Doc>): Promise<Doc> {
    return this.exec(
      async () => {
        const response = await this.apollo.mutate({
          mutation: UPDATE_DOC_MUTATION,
          variables: { id, ...updates },
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.updateDoc;
      },
      async () => {
        const doc = this.localStorage.getDoc(id);
        const updated = { ...doc, ...updates, updatedDate: new Date().toISOString() };
        this.localStorage.saveDoc(updated);
        return updated;
      }
    );
  }

  // 删除文档
  async deleteDoc(id: string): Promise<boolean> {
    return this.exec(
      async () => {
        const response = await this.apollo.mutate({
          mutation: DELETE_DOC_MUTATION,
          variables: { id },
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.deleteDoc;
      },
      async () => {
        this.localStorage.deleteDoc(id);
        return true;
      }
    );
  }

  // 列出文档
  async listDocs(workspaceId: string): Promise<Doc[]> {
    return this.exec(
      async () => {
        const response = await this.apollo.query({
          query: LIST_DOCS_QUERY,
          variables: { workspaceId },
        });

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data.workspace.docs;
      },
      async () => {
        return this.localStorage.listDocs();
      }
    );
  }
}
```

---

## Mock 模式实现

### Mock 配置

```typescript
// src/config/mock.ts

export interface MockConfig {
  // 全局 Mock 开关
  enabled: boolean;

  // 各功能 Mock 开关
  ai: {
    chat: boolean;
    summarize: boolean;
    improve: boolean;
    translate: boolean;
    generateDoc: boolean;
  };

  document: {
    list: boolean;
    get: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };

  // 降级配置
  fallbackToMock: boolean; // API 失败时降级到 Mock

  // Mock 数据
  data: {
    responseTime: number; // 模拟响应时间（ms）
    errorRate: number; // 模拟错误率（0-1）
  };
}

export const defaultMockConfig: MockConfig = {
  enabled: import.meta.env.VITE_MOCK_ENABLED === 'true',

  ai: {
    chat: import.meta.env.VITE_MOCK_AI_CHAT !== 'false',
    summarize: import.meta.env.VITE_MOCK_SUMMARIZE === 'true',
    improve: import.meta.env.VITE_MOCK_IMPROVE === 'true',
    translate: import.meta.env.VITE_MOCK_TRANSLATE === 'true',
    generateDoc: false, // 文档生成通常使用真实 API
  },

  document: {
    list: false, // 文档列表使用真实 API
    get: false,
    create: false,
    update: false,
    delete: false,
  },

  fallbackToMock: true,
  data: {
    responseTime: 500,
    errorRate: 0,
  },
};
```

### Mock 响应生成器

```typescript
// src/web/mock/generator.ts

export class MockResponseGenerator {
  private config: MockConfig['data'];

  constructor(config: MockConfig['data']) {
    this.config = config;
  }

  // 模拟网络延迟
  async delay() {
    await new Promise(resolve => setTimeout(resolve, this.config.responseTime));
  }

  // 模拟随机错误
  maybeThrowError() {
    if (Math.random() < this.config.errorRate) {
      throw new Error('Mock API Error: Random failure');
    }
  }

  // 生成 AI 聊天响应
  async chatResponse(message: string): Promise<string> {
    await this.delay();
    this.maybeThrowError();

    const responses: Record<string, string> = {
      总结: '这是一个模拟的总结功能。要使用真实功能，请在配置中关闭 Mock 模式。',
      改进: '这是改进建议的模拟响应。',
      翻译: '这是翻译功能的模拟响应。',
    };

    // 关键词匹配
    for (const [keyword, response] of Object.entries(responses)) {
      if (message.includes(keyword)) {
        return response;
      }
    }

    // 默认响应
    return `[Mock] 收到消息："${message}"\n\n这是一个测试响应。要启用真实的 AI 功能，请：\n1. 关闭 Mock 模式：mockEnabled: false\n2. 确保后端服务正常运行\n3. 检查认证配置`;
  }

  // 生成总结响应
  async summarize(content: string): Promise<string> {
    await this.delay();

    const preview = content.slice(0, 100);
    const wordCount = content.split(/\s+/).length;

    return `[Mock] 文档总结

文档概览：
- 字数：${wordCount} 字
- 预览：${preview}...

核心内容：
本文档主要讨论了相关主题，包含多个关键要点。详细内容需要在真实 API 模式下才能获得准确总结。

💡 提示：关闭 Mock 模式（mockEnabled: false）以使用真实的 AI 总结功能。`;
  }

  // 生成改进建议
  async improve(content: string): Promise<string> {
    await this.delay();

    return `[Mock] 写作改进建议

原文：
${content.slice(0, 200)}...

建议改进：
1. 结构优化：建议使用更清晰的段落划分
2. 表达提升：部分词汇可以更加精准
3. 逻辑增强：增强段落之间的逻辑衔接

改进后的内容：
[此处将显示 AI 改进后的完整内容]

💡 要获得真实的改进建议，请在配置中设置：
mockEnabled: false`;
  }

  // 生成翻译
  async translate(content: string, targetLang: string): Promise<string> {
    await this.delay();

    return `[Mock] 翻译结果 (${targetLang})

${content}

（这是模拟的翻译结果。要使用真实翻译功能，请关闭 Mock 模式。）`;
  }
}
```

### Mock 存储服务

```typescript
// src/web/mock/storage.ts

interface MockDoc {
  id: string;
  title: string;
  content: string;
  blocks: Block[];
  createdDate: string;
  updatedDate: string;
}

export class MockStorage {
  private docs: Map<string, MockDoc> = new Map();

  constructor() {
    // 从 localStorage 加载
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const data = localStorage.getItem('mock_docs');
    if (data) {
      const docs = JSON.parse(data);
      Object.entries(docs).forEach(([id, doc]) => {
        this.docs.set(id, doc as MockDoc);
      });
    }
  }

  private saveToStorage() {
    const data = Object.fromEntries(this.docs);
    localStorage.setItem('mock_docs', JSON.stringify(data));
  }

  getDoc(id: string): MockDoc | null {
    return this.docs.get(id) || null;
  }

  saveDoc(doc: MockDoc) {
    this.docs.set(doc.id, { ...doc, updatedDate: new Date().toISOString() });
    this.saveToStorage();
  }

  deleteDoc(id: string) {
    this.docs.delete(id);
    this.saveToStorage();
  }

  listDocs(): MockDoc[] {
    return Array.from(this.docs.values());
  }
}
```

---

## 认证集成

### 认证服务

```typescript
// src/web/services/auth.service.ts

import { ApolloClient, gql } from '@apollo/client';

const SIGN_IN_MUTATION = gql`
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

const VALIDATE_TOKEN_QUERY = gql`
  query ValidateToken {
    currentUser {
      id
      name
      email
    }
  }
`;

export class AuthService {
  private apollo: ApolloClient;
  private token: string | null = null;
  private tokenRefreshUrl: string | null = null;

  constructor(apollo: ApolloClient, config: { token?: string; tokenRefreshUrl?: string }) {
    this.apollo = apollo;
    this.token = config.token || null;
    this.tokenRefreshUrl = config.tokenRefreshUrl || null;

    // 设置认证头
    this.setupAuthLink();
  }

  // 设置 Apollo Link 认证中间件
  private setupAuthLink() {
    const authLink = new ApolloLink((operation, forward) => {
      operation.setContext(({ headers = {} }) => ({
        headers: {
          ...headers,
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
      }));

      return forward(operation);
    });

    // 添加到客户端
    // (在 apollo-client.ts 中完成)
  }

  // 获取 Token
  getToken(): string | null {
    return this.token;
  }

  // 设置 Token
  setToken(token: string) {
    this.token = token;
    // 更新 Apollo Client 认证头
  }

  // 验证 Token
  async validateToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const response = await this.apollo.query({
        query: VALIDATE_TOKEN_QUERY,
        fetchPolicy: 'network-only',
      });

      return !!response.data.currentUser;
    } catch {
      return false;
    }
  }

  // 刷新 Token
  async refreshToken(): Promise<string> {
    if (!this.tokenRefreshUrl) {
      throw new Error('Token refresh URL not configured');
    }

    const response = await fetch(this.tokenRefreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.token = data.token;
    return this.token;
  }

  // 登录
  async signIn(email: string, password: string): Promise<User> {
    const response = await this.apollo.mutate({
      mutation: SIGN_IN_MUTATION,
      variables: { email, password },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    this.token = response.data.signIn.token;
    return response.data.signIn.user;
  }

  // 登出
  signOut() {
    this.token = null;
    // 清除本地状态
  }
}
```

### Token 传递集成

```typescript
// src/web/lib/apollo-client.ts

import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, from } from '@apollo/client';
import { AuthService } from '../services/auth';

export function createApolloClient(auth: AuthService): ApolloClient {
  // HTTP 链接
  const httpLink = new HttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:10003/graphql',
  });

  // 认证中间件
  const authMiddleware = new ApolloLink((operation, forward) => {
    const token = auth.getToken();

    if (token) {
      operation.setContext({
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return forward(operation);
  });

  // 错误处理中间件
  const errorLink = onError(({ graphQLErrors, operation, forward }) => {
    if (graphQLErrors) {
      for (const error of graphQLErrors) {
        // 401 错误：尝试刷新 Token
        if (error.extensions?.code === 401) {
          return from Promise.resolve(
            auth.refreshToken().then(() => {
              const oldHeaders = operation.getContext().headers;
              operation.setContext({
                headers: {
                  ...oldHeaders,
                  Authorization: `Bearer ${auth.getToken()}`,
                },
              });
              return forward(operation);
            })
          );
        }
      }
    }
  });

  // 组合链接
  const link = from([authMiddleware, errorLink, httpLink]);

  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });
}
```

---

## 数据持久化

### 混合存储策略

```typescript
// src/web/services/persistence.service.ts

export class DocumentPersistenceService {
  private apiService: DocumentService;
  private localStorage: LocalStorageService;

  constructor(api: DocumentService) {
    this.apiService = api;
    this.localStorage = new LocalStorageService();
  }

  // 保存文档（云端优先，本地备份）
  async saveDoc(doc: Doc): Promise<void> {
    try {
      // 1. 保存到云端
      await this.apiService.updateDoc(doc.id, {
        title: doc.title,
        content: doc.content,
      });

      // 2. 本地备份
      this.localStorage.saveDoc(doc);

      // 3. 清除未保存标记
      this.localStorage.setDirty(doc.id, false);
    } catch (error) {
      // 云端保存失败，仅保存到本地
      console.warn('Cloud save failed, saving locally:', error);
      this.localStorage.saveDoc(doc);
      this.localStorage.setDirty(doc.id, true);
      throw error; // 通知用户保存失败
    }
  }

  // 加载文档（本地优先，云端同步）
  async loadDoc(id: string): Promise<Doc> {
    // 1. 先从本地加载（快速显示）
    const localDoc = this.localStorage.getDoc(id);

    if (localDoc) {
      // 2. 异步从云端同步
      this.syncDocFromCloud(id).catch(err => {
        console.warn('Cloud sync failed:', err);
      });

      return localDoc;
    }

    // 3. 本地没有，从云端加载
    const cloudDoc = await this.apiService.getDoc(id);
    this.localStorage.saveDoc(cloudDoc);
    return cloudDoc;
  }

  // 从云端同步文档
  private async syncDocFromCloud(id: string): Promise<void> {
    const cloudDoc = await this.apiService.getDoc(id);

    // 检查版本
    const localDoc = this.localStorage.getDoc(id);

    if (!localDoc || new Date(cloudDoc.updatedDate) > new Date(localDoc.updatedDate)) {
      // 云端版本更新，更新本地
      this.localStorage.saveDoc(cloudDoc);
    }
  }

  // 获取未保存的文档
  getUnsavedDocs(): Doc[] {
    return this.localStorage.listDocs().filter(doc => this.localStorage.isDirty(doc.id));
  }

  // 批量保存未保存的文档
  async saveUnsavedDocs(): Promise<void> {
    const unsavedDocs = this.getUnsavedDocs();

    for (const doc of unsavedDocs) {
      try {
        await this.saveDoc(doc);
      } catch (error) {
        console.error(`Failed to save doc ${doc.id}:`, error);
      }
    }
  }
}
```

---

## WebSocket 实时通信

### WebSocket 集成

```typescript
// src/web/lib/websocket-client.ts

import { createClient, Client } from 'graphql-ws';
import { AuthService } from '../services/auth';

export class WebSocketClient {
  private client: Client;
  private auth: AuthService;

  constructor(auth: AuthService) {
    this.auth = auth;
    this.client = createClient({
      url: import.meta.env.VITE_WS_URL || 'ws://localhost:10003/graphql',

      connectionParams: async () => {
        const token = this.auth.getToken();
        return {
          Authorization: token ? `Bearer ${token}` : '',
        };
      },

      on: {
        connected: () => console.log('WebSocket connected'),
        error: err => console.error('WebSocket error:', err),
        disconnected: () => console.log('WebSocket disconnected'),
      },
    });
  }

  // 订阅文档更新
  subscribeToDocUpdates(docId: string, callback: (update: DocUpdate) => void) {
    return this.client.subscribe(
      {
        query: `
          subscription DocUpdated($docId: ID!) {
            docUpdated(docId: $docId) {
              docId
              content
              updatedBy {
                id
                name
              }
              timestamp
            }
          }
        `,
        variables: { docId },
      },
      {
        next: data => callback(data.data.docUpdated),
        error: err => console.error('Subscription error:', err),
        complete: () => console.log('Subscription complete'),
      }
    );
  }

  // 订阅协作光标
  subscribeToCursors(docId: string, callback: (cursor: Cursor) => void) {
    return this.client.subscribe(
      {
        query: `
          subscription CursorMoved($docId: ID!) {
            cursorMoved(docId: $docId) {
              userId
              position
              color
            }
          }
        `,
        variables: { docId },
      },
      {
        next: data => callback(data.data.cursorMoved),
        error: err => console.error('Cursor subscription error:', err),
      }
    );
  }

  // 订阅 AI 流式响应
  subscribeToChatStream(message: string, onChunk: (chunk: string) => void, onComplete: () => void, onError: (err: Error) => void) {
    return this.client.subscribe(
      {
        query: `
          subscription ChatStream($message: String!) {
            chatStream(message: $message) {
              chunk
              isComplete
              error
            }
          }
        `,
        variables: { message },
      },
      {
        next: data => {
          const { chunk, isComplete, error } = data.data.chatStream;

          if (error) {
            onError(new Error(error));
          } else if (isComplete) {
            onComplete();
          } else {
            onChunk(chunk);
          }
        },
        error: err => onError(err),
      }
    );
  }

  dispose() {
    this.client.dispose();
  }
}
```

---

## 错误处理与降级

### 错误分类处理

```typescript
// src/web/utils/error-handler.ts

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  GRAPHQL = 'GRAPHQL',
  UNKNOWN = 'UNKNOWN',
}

export class APIErrorHandler {
  static handleError(error: any): ErrorType {
    // 网络错误
    if (error.message?.includes('Network Error')) {
      return ErrorType.NETWORK;
    }

    // 认证错误
    if (error.extensions?.code === 401 || error.extensions?.code === 403) {
      return ErrorType.AUTH;
    }

    // GraphQL 错误
    if (error.graphQLErrors || error.extensions) {
      return ErrorType.GRAPHQL;
    }

    return ErrorType.UNKNOWN;
  }

  static getErrorMessage(error: any): string {
    const type = this.handleError(error);

    switch (type) {
      case ErrorType.NETWORK:
        return '网络连接失败，请检查网络设置';

      case ErrorType.AUTH:
        return '认证失败，请重新登录';

      case ErrorType.GRAPHQL:
        return error.message || '服务器错误';

      default:
        return '未知错误';
    }
  }

  static shouldFallbackToMock(error: any): boolean {
    const type = this.handleError(error);

    // 网络错误或 GraphQL 错误时降级
    return [ErrorType.NETWORK, ErrorType.GRAPHQL].includes(type);
  }
}
```

### 降级策略

```typescript
// src/web/services/fallback.service.ts

export class FallbackService {
  private config: { fallbackToMock: boolean };

  constructor(config: { fallbackToMock: boolean }) {
    this.config = config;
  }

  // 执行带降级的 API 调用
  async executeWithFallback<T>(apiCall: () => Promise<T>, mockCall: () => Promise<T>): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      console.error('API call failed:', error);

      // 检查是否应该降级
      if (this.config.fallbackToMock && APIErrorHandler.shouldFallbackToMock(error)) {
        console.warn('Falling back to mock mode');
        return await mockCall();
      }

      // 不降级，抛出错误
      throw error;
    }
  }

  // 检查 API 健康状态
  async checkHealth(apiUrl: string): Promise<boolean> {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ __typename }',
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## 环境配置

### 开发环境

```bash
# .env.development

# API 配置
VITE_GRAPHQL_URL=http://localhost:10003/graphql
VITE_WS_URL=ws://localhost:10003/graphql

# Mock 配置
VITE_MOCK_ENABLED=true                    # 启用 Mock
VITE_MOCK_AI_CHAT=true                   # AI 聊天使用 Mock
VITE_MOCK_SUMMARIZE=true                 # 总结使用 Mock
VITE_MOCK_IMPROVE=true                   # 改进使用 Mock
VITE_MOCK_TRANSLATE=true                 # 翻译使用 Mock

# 降级配置
VITE_FALLBACK_TO_MOCK=true               # API 失败时降级到 Mock

# 调试
VITE_DEBUG=true
VITE_DEV_TOOLS=true
```

### 生产环境

```bash
# .env.production

# API 配置
VITE_GRAPHQL_URL=https://api.example.com/graphql
VITE_WS_URL=wss://api.example.com/graphql

# Mock 配置
VITE_MOCK_ENABLED=false                  # 关闭 Mock
VITE_MOCK_AI_CHAT=false
VITE_MOCK_SUMMARIZE=false
VITE_MOCK_IMPROVE=false
VITE_MOCK_TRANSLATE=false

# 降级配置
VITE_FALLBACK_TO_MOCK=true               # 保留降级能力

# 调试
VITE_DEBUG=false
VITE_DEV_TOOLS=false
```

### 测试环境

```bash
# .env.test

# API 配置
VITE_GRAPHQL_URL=http://localhost:10003/graphql
VITE_WS_URL=ws://localhost:10003/graphql

# Mock 配置
VITE_MOCK_ENABLED=false                  # 使用真实 API 测试
VITE_FALLBACK_TO_MOCK=false              # 测试环境不降级

# 调试
VITE_DEBUG=true
```

---

## 对接实现步骤

### 阶段 1: 基础对接（1-2 天）

**目标**: 建立基础 API 连接

- [ ] 步骤 1.1: 实现服务层基类
  - 创建 `BaseService`
  - 实现 Mock/Real 切换逻辑
  - 添加错误处理

- [ ] 步骤 1.2: 对接认证服务
  - 实现 `AuthService`
  - 配置 Apollo Client 认证中间件
  - 添加 Token 刷新机制

- [ ] 步骤 1.3: 测试基础连接
  - 验证 GraphQL 连接
  - 测试认证流程
  - 验证查询/变更

### 阶段 2: AI 功能对接（2-3 天）

**目标**: 对接所有 AI 功能

- [ ] 步骤 2.1: 实现 AI 服务
  - 创建 `AIService`
  - 实现所有 AI 方法
  - 保留 Mock 实现

- [ ] 步骤 2.2: 测试 AI 功能
  - 聊天功能测试
  - 总结功能测试
  - 改进功能测试
  - 翻译功能测试

- [ ] 步骤 2.3: 优化用户体验
  - 添加加载状态
  - 优化错误提示
  - 实现流式响应

### 阶段 3: 文档功能对接（2 天）

**目标**: 对接文档 CRUD

- [ ] 步骤 3.1: 实现文档服务
  - 创建 `DocumentService`
  - 实现增删改查
  - 实现列表查询

- [ ] 步骤 3.2: 实现持久化
  - 创建混合存储策略
  - 实现自动保存
  - 实现离线支持

- [ ] 步骤 3.3: 测试文档功能
  - 创建文档测试
  - 编辑文档测试
  - 删除文档测试
  - 列表查询测试

### 阶段 4: 实时通信（1-2 天）

**目标**: 实现 WebSocket 订阅

- [ ] 步骤 4.1: 实现 WebSocket 客户端
  - 创建 `WebSocketClient`
  - 实现订阅方法
  - 处理断线重连

- [ ] 步骤 4.2: 实现实时功能
  - 文档更新订阅
  - 协作光标订阅
  - AI 流式响应

- [ ] 步骤 4.3: 测试实时功能
  - 多用户协作测试
  - 流式响应测试
  - 断线重连测试

### 阶段 5: 优化和测试（2-3 天）

**目标**: 优化性能和稳定性

- [ ] 步骤 5.1: 性能优化
  - 请求缓存
  - 批量查询
  - 响应压缩

- [ ] 步骤 5.2: 错误处理优化
  - 完善错误分类
  - 优化降级策略
  - 添加重试机制

- [ ] 步骤 5.3: 全面测试
  - 单元测试
  - 集成测试
  - E2E 测试

### 阶段 6: 文档和部署（1 天）

**目标**: 完善文档并准备部署

- [ ] 步骤 6.1: 编写文档
  - API 使用文档
  - 集成指南
  - 故障排查

- [ ] 步骤 6.2: 准备部署
  - 配置生产环境
  - 设置监控
  - 准备回滚方案

---

## 测试清单

### 单元测试

```typescript
// __tests__/services/ai.service.test.ts

describe('AIService', () => {
  describe('Mock mode', () => {
    it('should return mock response for chat', async () => {
      const service = new AIService(apollo, { mockEnabled: true });
      const response = await service.chat('test');
      expect(response).toContain('[Mock]');
    });
  });

  describe('Real mode', () => {
    it('should call GraphQL API', async () => {
      const service = new AIService(apollo, { mockEnabled: false });
      const response = await service.chat('test');
      expect(response).not.toContain('[Mock]');
    });
  });

  describe('Fallback', () => {
    it('should fallback to mock on API failure', async () => {
      const service = new AIService(apollo, {
        mockEnabled: false,
        fallbackToMock: true,
      });

      // Mock API failure
      jest.spyOn(apollo, 'mutate').mockRejectedValue(new Error('Network error'));

      const response = await service.chat('test');
      expect(response).toContain('[Mock]');
    });
  });
});
```

### 集成测试

```typescript
// __tests__/integration/api.test.ts

describe('API Integration', () => {
  it('should connect to AFFiNE backend', async () => {
    const client = createApolloClient(auth);
    const response = await client.query({
      query: gql`
        {
          __typename
        }
      `,
    });

    expect(response.data.__typename).toBe('Query');
  });

  it('should authenticate with token', async () => {
    const auth = new AuthService(apollo, { token: 'test-token' });
    const isValid = await auth.validateToken();

    expect(typeof isValid).toBe('boolean');
  });
});
```

---

## 监控和日志

### API 监控

```typescript
// src/web/utils/monitor.ts

export class APIMonitor {
  private metrics: {
    requests: number;
    errors: number;
    avgResponseTime: number;
  } = {
    requests: 0,
    errors: 0,
    avgResponseTime: 0,
  };

  recordRequest(duration: number, success: boolean) {
    this.metrics.requests++;
    if (!success) this.metrics.errors++;

    // 更新平均响应时间
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime * (this.metrics.requests - 1) + duration) / this.metrics.requests;
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.errors / this.metrics.requests,
    };
  }

  reportToConsole() {
    if (import.meta.env.VITE_DEBUG) {
      console.table({
        'Total Requests': this.metrics.requests,
        Errors: this.metrics.errors,
        'Error Rate': `${((this.metrics.errors / this.metrics.requests) * 100).toFixed(2)}%`,
        'Avg Response Time': `${this.metrics.avgResponseTime.toFixed(0)}ms`,
      });
    }
  }
}
```

---

## 附录

### A. GraphQL 查询参考

```graphql
# 完整的查询示例
query FullDocQuery($id: ID!) {
  doc(id: $id) {
    id
    title
    content
    blocks {
      id
      type
      content
      props
      children {
        id
        type
        content
      }
    }
    workspace {
      id
      name
    }
    createdDate
    updatedDate
  }
}
```

### B. 配置验证脚本

```bash
#!/bin/bash
# scripts/validate-config.sh

echo "Validating editor configuration..."

# 检查必需的环境变量
required_vars=(
  "VITE_GRAPHQL_URL"
  "VITE_WS_URL"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
    exit 1
  fi
done

# 检查 API 连接
echo "Testing API connection..."
curl -s -X POST "$VITE_GRAPHQL_URL" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ API connection successful"
else
  echo "❌ API connection failed"
  exit 1
fi

echo "✅ Configuration valid"
```

### C. 部署检查清单

```
部署前检查：
□ 环境变量配置正确
□ Mock 模式已关闭（生产环境）
□ 后端服务正常运行
□ 认证配置正确
□ WebSocket 配置正确
□ SSL/TLS 证书有效
□ CORS 配置正确
□ 监控已配置
□ 日志已配置
□ 回滚方案准备

部署后验证：
□ API 连接测试
□ 认证流程测试
□ 文档 CRUD 测试
□ AI 功能测试
□ WebSocket 测试
□ 性能测试
□ 错误处理测试
```

---

**文档版本**: 1.0
**最后更新**: 2025-01-16
**维护者**: Development Team
