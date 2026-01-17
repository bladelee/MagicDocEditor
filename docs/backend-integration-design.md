# AI 文档编辑器后端集成设计方案（使用了现成设计，暂时不需要）

## 📋 目录

1. [系统架构概览](#系统架构概览)
2. [后端技术栈选型](#后端技术栈选型)
3. [数据库设计](#数据库设计)
4. [GraphQL API 设计](#graphql-api-设计)
5. [AI 服务集成](#ai-服务集成)
6. [认证授权系统](#认证授权系统)
7. [实时协作支持](#实时协作支持)
8. [部署架构](#部署架构)
9. [实施路线图](#实施路线图)

---

## 系统架构概览

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Vite)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Block Editor │  │  AI Chat     │  │  UI Components   │  │
│  │              │  │  Panel       │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────┘  │
│         │                  │                                  │
└─────────┼──────────────────┼──────────────────────────────────┘
          │                  │
          │ GraphQL          │ Fetch
          │                  │
┌─────────┼──────────────────┼──────────────────────────────────┐
│         ↓                  ↓                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              API Gateway / GraphQL Server             │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │ Query Layer  │  │Mutation Layer│  │Subscription│  │    │
│  │  │              │  │              │  │   (WebSocket)│ │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘  │    │
│  └─────────┼──────────────────┼──────────────────┼────────┘    │
│            ↓                  ↓                  ↓              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Business Logic Layer                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │ Document     │  │  AI Service  │  │  Auth        │  │  │
│  │  │ Service      │  │              │  │  Service     │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │  │
│  └─────────┼──────────────────┼──────────────────┼──────────┘  │
└────────────┼──────────────────┼──────────────────┼─────────────┘
             ↓                  ↓                  ↓
┌────────────┴──────────────────┴──────────────────┴────────────┐
│                         Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ PostgreSQL   │  │    Redis     │  │  Vector DB (Qdrant)│ │
│  │ (Documents)  │  │   (Cache)    │  │  (AI Embeddings)   │  │
│  └──────────────┘  └──────────────┘  └────────────────────┘  │
└───────────────────────────────────────────────────────────────┘

                        External Services
┌───────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   OpenAI     │  │  Anthropic   │  │   Ollama         │    │
│  │   API        │  │   Claude     │  │   (Self-hosted)  │    │
│  └──────────────┘  └──────────────┘  └──────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

### 数据流

#### 1. 文档保存流程

```
用户编辑 → 本地状态更新 → localStorage(即时) → GraphQL Mutation
                                                    ↓
                                            PostgreSQL (持久化)
                                                    ↓
                                            WebSocket 推送给其他用户
```

#### 2. AI Chat 流程

```
用户提问 → GraphQL Mutation → AI Service 处理
                                         ↓
                                 选择 LLM Provider
                                         ↓
                                 调用 AI API (流式)
                                         ↓
                                 返回结果 → 更新文档
                                         ↓
                                 保存到 Vector DB (用于语义搜索)
```

---

## 后端技术栈选型

### 推荐方案

| 层级               | 技术选择             | 理由                         |
| ------------------ | -------------------- | ---------------------------- |
| **Runtime**        | Node.js + TypeScript | 与前端技术栈统一，生态丰富   |
| **GraphQL Server** | Apollo Server        | 成熟稳定，支持 Subscriptions |
| **Web Framework**  | Express.js           | 轻量级，与 Apollo 集成良好   |
| **Database**       | PostgreSQL 15+       | 支持 JSON 类型，适合文档存储 |
| **Cache Layer**    | Redis 7+             | 会话管理、实时协作锁         |
| **ORM**            | Prisma               | 类型安全，迁移管理简单       |
| **Vector DB**      | Qdrant               | AI 语义搜索，轻量级部署      |
| **Authentication** | JWT + OAuth2         | 无状态认证，支持第三方登录   |
| **File Storage**   | MinIO / S3           | 对象存储，支持图片附件       |
| **Message Queue**  | Redis Bull Queue     | 异步任务处理                 |
| **WebSocket**      | Socket.io / ws       | 实时协作支持                 |

### 替代方案

**轻量级部署（适合小型团队）:**

- Backend: Bun + Hono (更快的运行时)
- Database: SQLite (开发阶段)
- Vector DB: 本地文件系统

**企业级部署（大规模）:**

- API Gateway: Kong / NGINX
- Message Queue: RabbitMQ / Kafka
- Cache: Redis Cluster
- Database: PostgreSQL Patroni (高可用)

---

## 数据库设计

### PostgreSQL Schema

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 工作区表
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文档表
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content JSONB NOT NULL DEFAULT '[]', -- Block 数组
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1
);

-- 文档历史版本
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  version INTEGER NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  comment TEXT
);

-- AI 会话表
CREATE TABLE ai_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 消息表
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI 上下文嵌入（用于语义搜索）
CREATE TABLE ai_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  block_id VARCHAR(255) NOT NULL,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX idx_ai_messages_session ON ai_messages(session_id);
CREATE INDEX idx_ai_embeddings_document ON ai_embeddings(document_id);

-- 全文搜索索引
CREATE INDEX idx_documents_content ON documents USING GIN(to_tsvector('english', content::text));
```

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String   @unique
  passwordHash String?  @map("password_hash")
  avatarUrl    String?  @map("avatar_url")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  ownedWorkspaces Workspace[] @relation("WorkspaceOwner")
  documents      Document[]
  aiSessions     AISession[]

  @@map("users")
}

model Workspace {
  id        String   @id @default(uuid())
  name      String
  ownerId   String   @map("owner_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  owner     User       @relation("WorkspaceOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  documents Document[]

  @@map("workspaces")
}

model Document {
  id          String   @id @default(uuid())
  workspaceId String   @map("workspace_id")
  title       String
  content     Json     @default("[]")
  createdById String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  isDeleted   Boolean  @default(false) @map("is_deleted")
  version     Int      @default(1)

  workspace     Workspace           @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdBy     User                @relation(fields: [createdById], references: [id])
  versions      DocumentVersion[]
  aiSessions    AISession[]
  aiEmbeddings  AIEmbedding[]

  @@map("documents")
}

model DocumentVersion {
  id         String   @id @default(uuid())
  documentId String   @map("document_id")
  content    Json
  version    Int
  createdById String  @map("created_by")
  createdAt  DateTime @default(now()) @map("created_at")
  comment    String?

  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, version])
  @@map("document_versions")
}

model AISession {
  id         String   @id @default(uuid())
  documentId String   @map("document_id")
  userId     String   @map("user_id")
  model      String
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  AIMessage[]

  @@map("ai_sessions")
}

model AIMessage {
  id        String   @id @default(uuid())
  sessionId String   @map("session_id")
  role      String   // 'user' | 'assistant' | 'system'
  content   String   @db.Text
  tokens    Int?
  metadata  Json?
  createdAt DateTime @default(now()) @map("created_at")

  session AISession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("ai_messages")
}

model AIEmbedding {
  id        String   @id @default(uuid())
  documentId String  @map("document_id")
  blockId   String
  content   String   @db.Text
  embedding Unsupported("VECTOR(1536)")?
  createdAt DateTime @default(now()) @map("created_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, blockId])
  @@map("ai_embeddings")
}
```

---

## GraphQL API 设计

### 完整 Schema Definition

```graphql
# schema.graphql

directive @auth on FIELD_DEFINITION
directive @rateLimit(limit: Int!, window: Int!) on FIELD_DEFINITION

# ============================================
# Scalar Types
# ============================================

scalar Date
scalar DateTime
scalar JSON
scalar UUID

# ============================================
# Query Types
# ============================================

type Query {
  # 获取单个文档
  document(id: UUID!): Document @auth

  # 列出工作区文档
  documents(workspaceId: UUID!, first: Int = 20, after: String, orderBy: DocumentOrder = UPDATED_AT): DocumentConnection! @auth

  # 搜索文档
  searchDocuments(workspaceId: UUID!, query: String!, first: Int = 20): DocumentSearchResult! @auth

  # 获取 AI 会话
  aiSession(id: UUID!): AISession @auth

  # 列出文档的 AI 会话
  aiSessions(documentId: UUID!): [AISession!]! @auth

  # 当前用户
  me: User @auth
}

# ============================================
# Mutation Types
# ============================================

type Mutation {
  # 文档操作
  createDocument(input: CreateDocumentInput!): CreateDocumentPayload! @auth
  updateDocument(input: UpdateDocumentInput!): UpdateDocumentPayload! @auth
  deleteDocument(id: UUID!): DeleteDocumentPayload! @auth

  # AI 操作
  createAISession(input: CreateAISessionInput!): CreateAISessionPayload! @auth
  sendAIMessage(input: SendAIMessageInput!): SendAIMessagePayload! @rateLimit(limit: 60, window: 60)

  # 用户认证
  signIn(input: SignInInput!): SignInPayload!
  signUp(input: SignUpInput!): SignUpPayload!
  signOut: SignOutPayload!
}

# ============================================
# Subscription Types
# ============================================

type Subscription {
  # 文档更新通知
  documentUpdated(documentId: UUID!): DocumentUpdatePayload!

  # AI 流式响应
  aiMessageStream(sessionId: UUID!): AIMessageChunk!
}

# ============================================
# Object Types
# ============================================

type Document {
  id: UUID!
  workspaceId: UUID!
  title: String!
  content: JSON! # Block array
  createdBy: User!
  createdAt: DateTime!
  updatedAt: DateTime!
  version: Int!
}

type DocumentConnection {
  edges: [DocumentEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type DocumentEdge {
  node: Document!
  cursor: String!
}

type DocumentSearchResult {
  documents: [Document!]!
  totalCount: Int!
}

type User {
  id: UUID!
  email: String!
  username: String!
  avatarUrl: String
  createdAt: DateTime!
}

type AISession {
  id: UUID!
  document: Document!
  user: User!
  model: String!
  messages: [AIMessage!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type AIMessage {
  id: UUID!
  session: AISession!
  role: String! # 'user' | 'assistant' | 'system'
  content: String!
  tokens: Int
  metadata: JSON
  createdAt: DateTime!
}

# ============================================
# Input Types
# ============================================

input CreateDocumentInput {
  workspaceId: UUID!
  title: String!
  content: JSON
}

input UpdateDocumentInput {
  id: UUID!
  title: String
  content: JSON
  expectedVersion: Int # 乐观锁
}

input CreateAISessionInput {
  documentId: UUID!
  model: AIModel = GPT4
}

input SendAIMessageInput {
  sessionId: UUID!
  content: String!
  options: AIOptions
}

input AIOptions {
  temperature: Float = 0.7
  maxTokens: Int = 2000
  systemPrompt: String
}

input SignInInput {
  email: String!
  password: String!
}

input SignUpInput {
  email: String!
  username: String!
  password: String!
}

# ============================================
# Payload Types
# ============================================

type CreateDocumentPayload {
  document: Document!
}

type UpdateDocumentPayload {
  document: Document!
}

type DeleteDocumentPayload {
  deletedId: UUID!
}

type CreateAISessionPayload {
  session: AISession!
}

type SendAIMessagePayload {
  message: AIMessage!
  streamId: String # 用于订阅流式响应
}

type SignInPayload {
  user: User!
  token: String!
}

type SignUpPayload {
  user: User!
  token: String!
}

type SignOutPayload {
  success: Boolean!
}

# ============================================
# Helper Types
# ============================================

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

enum DocumentOrder {
  CREATED_AT
  UPDATED_AT
  TITLE
}

enum AIModel {
  GPT4
  GPT35_TURBO
  CLAUDE_3_OPUS
  CLAUDE_3_SONNET
  OLLAMA_LLAMA3
}

type DocumentUpdatePayload {
  documentId: UUID!
  content: JSON!
  updatedAt: DateTime!
}

type AIMessageChunk {
  delta: String! # 流式内容片段
  done: Boolean!
}
```

### API Implementation Examples

#### 1. Document Resolvers

```typescript
// src/resolvers/document.resolver.ts

import { Argon2id } from 'oslo/password';
import { prisma } from '../lib/prisma';

export const documentResolvers = {
  Query: {
    // 获取单个文档
    document: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new Error('Unauthorized');
      }

      const document = await prisma.document.findFirst({
        where: {
          id,
          workspace: {
            members: {
              some: { userId: context.user.id },
            },
          },
        },
        include: {
          createdBy: true,
        },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      return document;
    },

    // 列出文档（分页）
    documents: async (_: any, args: any, context: any) => {
      const { workspaceId, first = 20, after, orderBy = 'UPDATED_AT' } = args;

      const documents = await prisma.document.findMany({
        where: {
          workspaceId,
          isDeleted: false,
          workspace: {
            members: {
              some: { userId: context.user.id },
            },
          },
        },
        take: first + 1, // +1 to check if there's a next page
        cursor: after ? { id: after } : undefined,
        orderBy: { [orderBy.toLowerCase()]: 'desc' },
        include: {
          createdBy: true,
        },
      });

      const hasNextPage = documents.length > first;
      const edges = documents.slice(0, first).map(doc => ({
        node: doc,
        cursor: doc.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
        totalCount: await prisma.document.count({
          where: { workspaceId, isDeleted: false },
        }),
      };
    },

    // 全文搜索
    searchDocuments: async (_: any, { workspaceId, query, first = 20 }: any) => {
      const documents = await prisma.$queryRaw`
        SELECT
          id,
          workspace_id as "workspaceId",
          title,
          content,
          created_by as "createdById",
          created_at as "createdAt",
          updated_at as "updatedAt",
          version,
          ts_rank(to_tsvector('english', content::text), plainto_tsquery('english', ${query})) as rank
        FROM documents
        WHERE
          workspace_id = ${workspaceId}
          AND is_deleted = false
          AND to_tsvector('english', content::text) @@ plainto_tsquery('english', ${query})
        ORDER BY rank DESC
        LIMIT ${first}
      `;

      return {
        documents,
        totalCount: documents.length,
      };
    },
  },

  Mutation: {
    // 创建文档
    createDocument: async (_: any, { input }: any, context: any) => {
      const document = await prisma.document.create({
        data: {
          workspaceId: input.workspaceId,
          title: input.title,
          content: input.content || [],
          createdById: context.user.id,
        },
        include: {
          createdBy: true,
        },
      });

      // 发布更新事件
      await publishDocumentUpdate(document.id, document);

      return { document };
    },

    // 更新文档（带乐观锁）
    updateDocument: async (_: any, { input }: any, context: any) => {
      const { id, title, content, expectedVersion } = input;

      // 检查版本冲突
      const current = await prisma.document.findUnique({ where: { id } });
      if (!current) {
        throw new Error('Document not found');
      }
      if (current.version !== expectedVersion) {
        throw new Error('Version conflict: Document was modified by another user');
      }

      // 保存历史版本
      await prisma.documentVersion.create({
        data: {
          documentId: id,
          content: current.content,
          version: current.version,
          createdById: context.user.id,
        },
      });

      // 更新文档
      const document = await prisma.document.update({
        where: { id },
        data: {
          title: title ?? current.title,
          content: content ?? current.content,
          version: { increment: 1 },
        },
        include: {
          createdBy: true,
        },
      });

      // 发布更新事件
      await publishDocumentUpdate(id, document);

      return { document };
    },

    // 删除文档（软删除）
    deleteDocument: async (_: any, { id }: { id: string }, context: any) => {
      await prisma.document.update({
        where: { id },
        data: { isDeleted: true },
      });

      return { deletedId: id };
    },
  },
};

// 发布文档更新到 WebSocket
async function publishDocumentUpdate(documentId: string, document: any) {
  // 使用 Redis Pub/Sub 或 WebSocket 推送
  await redis.publish(
    `document:${documentId}`,
    JSON.stringify({
      type: 'DOCUMENT_UPDATED',
      documentId,
      document,
    })
  );
}
```

#### 2. AI Service Resolvers

```typescript
// src/resolvers/ai.resolver.ts

import { prisma } from '../lib/prisma';
import { aiService } from '../services/ai.service';

export const aiResolvers = {
  Query: {
    aiSession: async (_: any, { id }: { id: string }, context: any) => {
      return await prisma.aISession.findUnique({
        where: { id },
        include: {
          document: true,
          user: true,
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    },

    aiSessions: async (_: any, { documentId }: { documentId: string }, context: any) => {
      return await prisma.aISession.findMany({
        where: { documentId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    // 创建 AI 会话
    createAISession: async (_: any, { input }: any, context: any) => {
      const session = await prisma.aISession.create({
        data: {
          documentId: input.documentId,
          userId: context.user.id,
          model: input.model || 'GPT4',
        },
        include: {
          document: true,
          user: true,
          messages: true,
        },
      });

      return { session };
    },

    // 发送 AI 消息
    sendAIMessage: async (_: any, { input }: any, context: any) => {
      const { sessionId, content, options = {} } = input;

      // 保存用户消息
      const userMessage = await prisma.aIMessage.create({
        data: {
          sessionId,
          role: 'user',
          content,
        },
      });

      // 获取会话历史
      const session = await prisma.aISession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          document: true,
        },
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // 调用 AI 服务（流式）
      const streamId = generateStreamId();
      const assistantMessage = await prisma.aIMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: '', // 将通过流式更新填充
          metadata: {
            streamId,
            model: session.model,
          },
        },
      });

      // 异步处理 AI 响应
      processAIResponse(session, assistantMessage.id, streamId, options);

      return {
        message: assistantMessage,
        streamId,
      };
    },
  },

  Subscription: {
    // 流式 AI 响应
    aiMessageStream: {
      subscribe: async (_: any, { sessionId }: { sessionId: string }, context: any) => {
        // 使用 Redis Pub/Sub 实现流式推送
        const stream = redisAsyncIterator(`ai:stream:${sessionId}`);

        return stream;
      },
    },
  },
};

// 异步处理 AI 响应
async function processAIResponse(session: any, messageId: string, streamId: string, options: any) {
  try {
    // 构建消息历史
    const messages = session.messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // 添加文档上下文
    const documentContext = buildDocumentContext(session.document);

    // 调用 AI 服务（流式）
    const stream = await aiService.streamChat({
      model: session.model,
      messages: [{ role: 'system', content: documentContext }, ...messages],
      options,
    });

    let fullResponse = '';

    // 流式处理
    for await (const chunk of stream) {
      fullResponse += chunk.delta;

      // 推送到 WebSocket
      await redis.publish(
        `ai:stream:${streamId}`,
        JSON.stringify({
          type: 'chunk',
          delta: chunk.delta,
          done: chunk.done,
        })
      );
    }

    // 保存完整响应
    await prisma.aIMessage.update({
      where: { id: messageId },
      data: {
        content: fullResponse,
        tokens: fullResponse.length, // 粗略估算
      },
    });

    // 发送完成信号
    await redis.publish(
      `ai:stream:${streamId}`,
      JSON.stringify({
        type: 'done',
        content: fullResponse,
      })
    );

    // 生成文档嵌入（用于语义搜索）
    await generateEmbeddings(session.document.id, fullResponse);
  } catch (error) {
    console.error('AI processing error:', error);

    // 发送错误信号
    await redis.publish(
      `ai:stream:${streamId}`,
      JSON.stringify({
        type: 'error',
        error: error.message,
      })
    );
  }
}

// 构建文档上下文
function buildDocumentContext(document: any): string {
  const blocks = document.content;
  const text = blocks.map((b: any) => b.content).join('\n');

  return `你是一个专业的文档编辑助手。当前文档内容如下：

${text}

请根据用户的需求，提供有针对性的帮助。`;
}

// 生成文档嵌入
async function generateEmbeddings(documentId: string, content: string) {
  // TODO: 调用 OpenAI Embeddings API
  // 保存到 ai_embeddings 表
}
```

---

## AI 服务集成

### 多 LLM Provider 支持

```typescript
// src/services/ai.service.ts

interface AIProvider {
  name: string;
  streamChat(params: ChatParams): AsyncGenerator<ChatChunk>;
  generateEmbedding(text: string): Promise<number[]>;
}

interface ChatParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  options?: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

interface ChatChunk {
  delta: string;
  done: boolean;
}

// ============================================
// OpenAI Provider
// ============================================

class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *streamChat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const { model, messages, options = {} } = params;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { delta: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content || '';
              if (delta) {
                yield { delta, done: false };
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }
}

// ============================================
// Anthropic Claude Provider
// ============================================

class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private apiKey: string;
  private baseURL = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *streamChat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const { model, messages, options = {} } = params;

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-3-sonnet-20240229',
        messages: messages.filter(m => m.role !== 'system'),
        system: options.systemPrompt || messages.find(m => m.role === 'system')?.content,
        max_tokens: options.maxTokens ?? 2000,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text || '';
                if (delta) {
                  yield { delta, done: false };
                }
              } else if (parsed.type === 'message_stop') {
                yield { delta: '', done: true };
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Claude 不提供 Embeddings API，使用第三方或 OpenAI
    throw new Error('Claude does not provide embeddings API');
  }
}

// ============================================
// Ollama Provider (Self-hosted)
// ============================================

class OllamaProvider implements AIProvider {
  name = 'ollama';
  private baseURL = 'http://localhost:11434';

  constructor(baseURL?: string) {
    if (baseURL) {
      this.baseURL = baseURL;
    }
  }

  async *streamChat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const { model, messages, options = {} } = params;

    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llama3',
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        try {
          const parsed = JSON.parse(chunk);
          if (parsed.done) {
            yield { delta: '', done: true };
            return;
          }
          if (parsed.message?.content) {
            yield { delta: parsed.message.content, done: false };
          }
        } catch (e) {
          // Ollama 可能返回多个 JSON 对象在一行
          const parts = chunk.split('\n').filter(line => line.trim());
          for (const part of parts) {
            try {
              const parsed = JSON.parse(part);
              if (parsed.message?.content) {
                yield { delta: parsed.message.content, done: false };
              }
            } catch {}
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseURL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: text,
      }),
    });

    const data = await response.json();
    return data.embedding;
  }
}

// ============================================
// AI Service Manager
// ============================================

class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private defaultProvider: string;

  constructor() {
    // 初始化 providers
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('GPT4', new OpenAIProvider(process.env.OPENAI_API_KEY));
      this.providers.set('GPT35_TURBO', new OpenAIProvider(process.env.OPENAI_API_KEY));
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('CLAUDE_3_OPUS', new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
      this.providers.set('CLAUDE_3_SONNET', new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
    }

    if (process.env.OLLAMA_BASE_URL || process.env.NODE_ENV === 'development') {
      this.providers.set('OLLAMA_LLAMA3', new OllamaProvider(process.env.OLLAMA_BASE_URL));
    }

    this.defaultProvider = 'GPT4';
  }

  async streamChat(params: ChatParams): AsyncGenerator<ChatChunk> {
    const provider = this.providers.get(params.model) || this.providers.get(this.defaultProvider);

    if (!provider) {
      throw new Error(`No provider found for model: ${params.model}`);
    }

    return provider.streamChat(params);
  }

  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    const provider = this.providers.get(model || this.defaultProvider);

    if (!provider) {
      throw new Error(`No provider found for model: ${model}`);
    }

    return provider.generateEmbedding(text);
  }

  getAvailableModels(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const aiService = new AIService();
```

### 成本管理和速率限制

```typescript
// src/services/ai-rate-limiter.ts

import Redis from 'ioredis';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class AIRateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async checkLimit(userId: string, model: string): Promise<boolean> {
    const key = `rate_limit:${userId}:${model}`;

    const current = await this.redis.incr(key);

    if (current === 1) {
      // 第一次请求，设置过期时间
      await this.redis.expire(key, 60); // 60秒窗口
    }

    const limits = this.getLimitsForModel(model);
    return current <= limits.maxRequests;
  }

  private getLimitsForModel(model: string): RateLimitConfig {
    const limits: Record<string, RateLimitConfig> = {
      GPT4: { maxRequests: 10, windowMs: 60000 },
      GPT35_TURBO: { maxRequests: 60, windowMs: 60000 },
      CLAUDE_3_OPUS: { maxRequests: 5, windowMs: 60000 },
      CLAUDE_3_SONNET: { maxRequests: 20, windowMs: 60000 },
      OLLAMA_LLAMA3: { maxRequests: 100, windowMs: 60000 },
    };

    return limits[model] || { maxRequests: 60, windowMs: 60000 };
  }

  async getRemainingQuota(userId: string, model: string): Promise<number> {
    const key = `rate_limit:${userId}:${model}`;
    const current = parseInt((await this.redis.get(key)) || '0', 10);
    const limits = this.getLimitsForModel(model);
    return Math.max(0, limits.maxRequests - current);
  }
}

export const aiRateLimiter = new AIRateLimiter();
```

---

## 认证授权系统

### JWT 认证实现

```typescript
// src/services/auth.service.ts

import jwt from 'jsonwebtoken';
import { Argon2id } from 'oslo/password';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

interface JWTPayload {
  userId: string;
  email: string;
}

class AuthService {
  private argon2 = new Argon2id();

  // 注册
  async signUp(input: { email: string; username: string; password: string }) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await this.argon2.hash(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
      },
    });

    const token = this.generateToken({ userId: user.id, email: user.email });

    return { user, token };
  }

  // 登录
  async signIn(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await this.argon2.verify(user.passwordHash, input.password);

    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken({ userId: user.id, email: user.email });

    return { user, token };
  }

  // 验证 Token
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return payload;
    } catch (error) {
      return null;
    }
  }

  // 生成 Token
  private generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }
}

export const authService = new AuthService();
```

### GraphQL Auth Middleware

```typescript
// src/lib/graphql-server.ts

import { ApolloServer } from '@apollo/server';
import { context } from '@opentelemetry/api';
import { authService } from '../services/auth.service';

export async function createContext({ req }: any) {
  // 从 header 获取 token
  const token = req.headers.authorization?.replace('Bearer ', '');

  let user = null;

  if (token) {
    const payload = await authService.verifyToken(token);
    if (payload) {
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
    }
  }

  return { user, req };
}

export const graphqlServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: createContext,
});
```

---

## 实时协作支持

### WebSocket 实时更新

```typescript
// src/services/websocket.service.ts

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from '../lib/prisma';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const documentId = url.searchParams.get('documentId');
      const token = url.searchParams.get('token');

      if (!documentId || !token) {
        ws.close(1008, 'Missing documentId or token');
        return;
      }

      // 验证 token
      authService.verifyToken(token).then(async payload => {
        if (!payload) {
          ws.close(1008, 'Invalid token');
          return;
        }

        // 检查用户是否有权限访问文档
        const document = await prisma.document.findFirst({
          where: {
            id: documentId,
            workspace: {
              members: {
                some: { userId: payload.userId },
              },
            },
          },
        });

        if (!document) {
          ws.close(1008, 'Unauthorized');
          return;
        }

        // 添加到客户端集合
        if (!this.clients.has(documentId)) {
          this.clients.set(documentId, new Set());
        }
        this.clients.get(documentId)!.add(ws);

        // 订阅 Redis 频道
        const channel = `document:${documentId}`;
        const subscriber = redis.duplicate();
        subscriber.subscribe(channel);

        subscriber.on('message', (_channel, message) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });

        ws.on('close', () => {
          this.clients.get(documentId)!.delete(ws);
          subscriber.disconnect();
        });

        ws.send(
          JSON.stringify({
            type: 'connected',
            documentId,
          })
        );
      });
    });
  }

  // 广播消息到所有订阅者
  async broadcast(documentId: string, message: any) {
    // 发布到 Redis
    await redis.publish(`document:${documentId}`, JSON.stringify(message));

    // 同时发送到本地 WebSocket 客户端
    const clients = this.clients.get(documentId);
    if (clients) {
      const data = JSON.stringify(message);
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  }
}

export { WebSocketService };
```

---

## 部署架构

### Docker Compose 配置

```yaml
# docker-compose.yml

version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-ai_editor}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  # Qdrant Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - '6333:6333'
      - '6334:6334'

  # GraphQL API Server
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@postgres:5432/${DB_NAME:-ai_editor}
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      QDRANT_URL: http://qdrant:6333
    ports:
      - '4000:4000'
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: ['node', 'dist/index.js']

  # Frontend (Vite Dev Server)
  web:
    build:
      context: ./src/web
      dockerfile: Dockerfile.dev
    environment:
      VITE_GRAPHQL_URL: http://localhost:4000/graphql
      VITE_WS_URL: ws://localhost:4000/graphql
    ports:
      - '3000:3000'
    volumes:
      - ./src/web:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
  qdrant_data:
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

### 环境变量配置

```bash
# .env.example

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_editor

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# AI Providers
OPENAI_API_KEY=sk-openai-api-key
ANTHROPIC_API_KEY=sk-ant-api-key
OLLAMA_BASE_URL=http://localhost:11434

# Vector Database
QDRANT_URL=http://localhost:6333

# Server
PORT=4000
NODE_ENV=development
```

---

## 实施路线图

### 阶段 1: 基础后端搭建 (1-2 周)

**目标**: 搭建基础 API 和数据库

**任务**:

- [x] 设计数据库 Schema (Prisma)
- [ ] 设置 GraphQL Server (Apollo Server)
- [ ] 实现 Document CRUD API
- [ ] 实现 JWT 认证系统
- [ ] 编写基础单元测试

**验收标准**:

- 可以通过 GraphQL 创建/读取/更新/删除文档
- 用户可以注册/登录
- 测试覆盖率达到 70%

### 阶段 2: AI 服务集成 (1-2 周)

**目标**: 集成真实 LLM providers

**任务**:

- [ ] 实现 AI Service 抽象层
- [ ] 集成 OpenAI API
- [ ] 集成 Anthropic Claude API
- [ ] 实现流式响应
- [ ] 添加速率限制和成本管理

**验收标准**:

- AI Chat 可以连接真实 LLM
- 支持流式响应
- 速率限制生效

### 阶段 3: 实时协作支持 (1 周)

**目标**: 实现文档实时同步

**任务**:

- [ ] 实现 WebSocket 服务
- [ ] 集成 Redis Pub/Sub
- [ ] 前端集成 WebSocket 客户端
- [ ] 处理冲突解决

**验收标准**:

- 多个用户可以同时编辑文档
- 更新实时推送给所有用户
- 冲突可以正确解决

### 阶段 4: 高级功能 (1-2 周)

**目标**: 实现语义搜索和版本控制

**任务**:

- [ ] 集成 Qdrant 向量数据库
- [ ] 实现文档嵌入生成
- [ ] 实现语义搜索 API
- [ ] 实现文档版本历史
- [ ] 实现版本对比和回滚

**验收标准**:

- 可以通过语义搜索文档内容
- 文档有完整的版本历史
- 可以回滚到任意历史版本

### 阶段 5: 部署和优化 (1 周)

**目标**: 生产环境部署

**任务**:

- [ ] Docker 容器化
- [ ] 编写部署文档
- [ ] 性能优化和压力测试
- [ ] 安全审计
- [ ] 配置监控和日志

**验收标准**:

- 可以通过 Docker Compose 一键部署
- 压力测试通过 (1000 并发用户)
- 安全扫描无高危漏洞

---

## 快速开始指南

### 1. 初始化项目

```bash
# 创建后端目录
mkdir -p backend/src/{resolvers,services,lib}
cd backend

# 初始化 Node.js 项目
npm init -y

# 安装依赖
npm install \
  @apollo/server \
  graphql \
  graphql-subscriptions \
  graphql-ws \
  @prisma/client \
  ioredis \
  jsonwebtoken \
  oslo \
  ws \
  @types/node \
  @types/ws \
  typescript \
  tsx \
  nodemon

# 安装开发依赖
npm install -D prisma
```

### 2. 初始化 Prisma

```bash
# 生成 Prisma Schema
npx prisma init

# 将上面的 Prisma Schema 复制到 prisma/schema.prisma

# 生成数据库迁移
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate
```

### 3. 创建 GraphQL Server

```typescript
// backend/src/index.ts

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { WebSocketService } from './services/websocket.service';
import { createContext } from './lib/context';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // 创建 Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await server.start();

  // 配置中间件
  app.use('/graphql', cors<cors.CorsRequest>(), json(), expressMiddleware(server, { context: createContext }));

  // 启动 WebSocket 服务
  new WebSocketService(httpServer);

  // 启动服务器
  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
}

startServer();
```

### 4. 配置前端环境变量

```bash
# src/web/.env.production

VITE_GRAPHQL_URL=https://your-api.com/graphql
VITE_WS_URL=wss://your-api.com/graphql
```

### 5. 部署

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 运行数据库迁移
docker-compose exec api npx prisma migrate deploy
```

---

## 总结

本设计方案提供了完整的 AI 文档编辑器后端集成路线图：

**核心特性**:

- ✅ 完整的 GraphQL API 设计
- ✅ PostgreSQL + Prisma 数据库层
- ✅ 多 LLM Provider 支持 (OpenAI, Claude, Ollama)
- ✅ JWT 认证授权
- ✅ 实时协作 (WebSocket + Redis)
- ✅ 语义搜索 (Qdrant Vector DB)
- ✅ 文档版本控制
- ✅ Docker 容器化部署

**预估开发时间**: 6-8 周

**技术难度**: 中等偏高

**建议团队规模**: 2-3 名后端工程师 + 1 名 DevOps 工程师
