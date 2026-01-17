# AFFiNE AI 编辑器架构文档

## 📋 项目概述

### 项目名称

AFFiNE AI Editor - 混合存储模式 AI 文档编辑器

### 项目定位

一个轻量级的 AI 驱动文档编辑器，支持本地存储和 AFFiNE 云端同步，提供完整的块编辑器和轻量级编辑器两种模式。

### 核心特性

- ✅ **双编辑器模式**：完整块编辑器 + 轻量级编辑器
- ✅ **混合存储**：本地 IndexedDB + AFFiNE 云端
- ✅ **AI 功能集成**：AI 聊天助手和内容生成
- ✅ **实时同步**：基于 WebSocket + Yjs 的增量同步
- ✅ **离线优先**：本地存储为主，云端同步为辅

---

## 🏗️ 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户界面层 (UI Layer)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────┐    │
│  │Blocksuite编辑器│  │轻量级编辑器  │  │  AI 聊天面板 │    │
│  │(完整功能)     │  │(简化功能)   │  │  (AI Chat)   │    │
│  └───────────────┘  └──────────────┘  └───────────────┘    │
│         ↓                   ↓                   ↓             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   业务逻辑层 (Service Layer)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │DocumentService│  │ SyncManager │  │AuthService  │     │
│  │              │  │             │  │              │     │
│  │- CRUD 操作   │  │- 队列管理   │  │- Token 管理  │     │
│  │- 存储模式切换│  │- WebSocket  │  │- 用户认证   │     │
│  │- 自动保存    │  │- 重试机制   │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ↓                   ↓                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   数据访问层 (Storage Layer)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │LocalStorageAdapter│         │AFFiNE WebSocket  │         │
│  │                  │         │Client            │         │
│  │- IndexedDB      │         │                  │         │
│  │- 本地优先       │         │- Socket.IO       │         │
│  │- 离线可用       │         │- Yjs 协议        │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    转换层 (Converter Layer)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           YjsConverter (JSON ↔ Yjs)                  │  │
│  │                                                      │  │
│  │ • jsonToYjsUpdate()   - JSON → Yjs 二进制           │  │
│  │ • yjsUpdateToJson()    - Yjs → JSON                  │  │
│  │ • createYjsDoc()       - 创建新文档                 │  │
│  │ • applyBlocksToYjs()   - 更新文档                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 核心组件详解

### 1. 编辑器组件 (Editor Components)

#### 1.1 BlocksuiteEditor（完整块编辑器）

**文件位置：** `src/web/components/blocksuite-editor.tsx`

**功能特性：**

- 完整的块编辑功能（段落、标题、列表、代码、分割线）
- 支持块的 CRUD 操作
- AI 内容插入
- 自动保存到 DocumentService
- 与 AFFiNE 后端完全兼容

**数据结构：**

```typescript
interface EditorBlock {
  id: string;
  type: BlockType; // 'paragraph' | 'heading' | 'list' | 'code' | 'divider'
  content: string;
  props?: Record<string, any>;
  children?: EditorBlock[];
}

interface DocumentData {
  id: string;
  title: string;
  blocks: EditorBlock[];
  createdAt: number;
  updatedAt: number;
}
```

**核心方法：**

```typescript
// 获取文档内容
getDocument(): DocumentData

// 插入块
insertBlock(index: number, block: EditorBlock): void

// 更新块内容
updateBlock(blockId: string, content: string): void

// 删除块
deleteBlock(blockId: string): void

// 插入 AI 生成的内容
insertAIContent(content: string): void

// 替换选中内容
replaceSelection(content: string): void
```

#### 1.2 AIEditor（轻量级编辑器）

**文件位置：** `src/web/components/ai-editor/AIEditor.tsx`

**功能特性：**

- 简化的 contentEditable 编辑器
- 轻量级 UI
- 适合快速编辑
- AI 聊天面板集成

**使用场景：**

- 快速笔记
- 简单文档编辑
- 资源受限环境

---

### 2. 存储服务 (Storage Services)

#### 2.1 DocumentService（文档服务）

**文件位置：** `src/web/services/document/DocumentService.ts`

**职责：**

- 统一的文档 CRUD 接口
- 存储模式切换（本地 ↔ AFFiNE）
- 自动保存机制
- 同步队列管理

**核心 API：**

```typescript
class DocumentService {
  // 创建文档
  createDoc(title: string, options?: CreateDocOptions): Promise<string>;

  // 获取文档
  getDoc(docId: string): Promise<Document | null>;

  // 更新文档
  updateDoc(docId: string, updates: DocUpdates): Promise<void>;

  // 删除文档
  deleteDoc(docId: string): Promise<void>;

  // 列出文档
  listDocs(filter?: DocFilter): Promise<Document[]>;

  // 搜索文档
  searchDocs(query: string): Promise<Document[]>;

  // 切换存储模式
  switchStorageMode(mode: StorageMode, config?: AFFineConfig): Promise<void>;

  // 同步到 AFFiNE
  syncToAFFine(): Promise<void>;

  // 获取同步状态
  getSyncStats(): any;
}
```

#### 2.2 LocalStorageAdapter（本地存储适配器）

**文件位置：** `src/web/services/storage/LocalStorageAdapter.ts`

**技术实现：**

- 使用 IndexedDB 存储文档
- 数据库名称：`ai-editor-local`
- 版本：1
- 存储对象：
  - `docs` - 文档存储
  - `yjs-updates` - Yjs 更新历史（用于增量同步）

**数据结构：**

```typescript
interface DBDocument extends Document {
  id: string;
  workspaceId?: string;
  updatedAt: number;
  createdAt: number;
}
```

**核心特性：**

- 自动创建文档（如果不存在）
- 增量更新支持
- 历史版本管理
- 离线优先设计

---

### 3. 同步服务 (Sync Services)

#### 3.1 SyncManager（同步管理器）

**文件位置：** `src/web/services/sync/SyncManager.ts`

**设计模式：**

- 队列模式：异步处理同步操作
- 重试机制：最多重试 3 次
- 错误恢复：失败操作保留在队列中

**同步流程：**

```
1. 用户编辑文档
   ↓
2. DocumentService 更新本地存储 (LocalStorageAdapter)
   ↓
3. 添加操作到同步队列 (SyncManager.enqueue)
   ↓
4. 转换为 Yjs 格式 (YjsConverter)
   ↓
5. 通过 WebSocket 发送到 AFFiNE (AFFiNEWebSocketClient)
   ↓
6. 接收确认并更新同步状态
```

**核心方法：**

```typescript
class SyncManager {
  // 配置 AFFiNE 连接
  async setConfig(config: AFFineConfig): Promise<void>;

  // 添加到同步队列
  enqueue(operation: SyncOperation): void;

  // 处理同步队列
  async process(docId?: string): Promise<void>;

  // 获取同步状态
  getStatus(docId: string): SyncStatus;

  // 获取统计信息
  getStats(): SyncStats;

  // 清空队列
  clearQueue(): void;

  // 断开连接
  async disconnect(): Promise<void>;
}
```

#### 3.2 AFFiNEWebSocketClient（WebSocket 客户端）

**文件位置：** `src/web/services/sync/AFFiNEWebSocketClient.ts`

**技术栈：**

- Socket.IO Client
- 端点：`http://localhost:10003`（通过 SSH tunnel）
- 传输协议：WebSocket（优先）/ Polling（备选）

**WebSocket 事件：**

**客户端发送事件：**

```typescript
// 加入工作空间
'space:join': {
  spaceType: 'workspace',
  spaceId: string,
  clientVersion: string
}

// 推送文档更新
'space:push-doc-update': {
  spaceType: 'workspace',
  spaceId: string,
  docId: string,
  update: string  // Base64 编码的 Yjs 二进制
}

// 加载文档
'space:load-doc': {
  spaceType: 'workspace',
  spaceId: string,
  docId: string,
  stateVector?: string  // 可选，用于增量同步
}

// 删除文档
'space:delete-doc': {
  spaceType: 'workspace',
  spaceId: string,
  docId: string
}

// 离开工作空间
'space:leave': {
  spaceType: 'workspace',
  spaceId: string
}
```

**服务器广播事件：**

```typescript
'space:broadcast-doc-update': {
  spaceType: string,
  spaceId: string,
  docId: string,
  update: string,      // Base64 编码的 Yjs 更新
  timestamp: number,
  editor: string
}
```

**认证机制：**

```typescript
auth: cb => {
  cb({ token: config.token });
};
```

#### 3.3 YjsConverter（格式转换器）

**文件位置：** `src/web/services/sync/YjsConverter.ts`

**技术实现：**

- Yjs：CRDT（Conflict-free Replicated Data Type）库
- 用于处理多用户协作和冲突解决

**数据转换流程：**

```typescript
// JSON → Yjs 二进制
const { update } = YjsConverter.createYjsDoc(docId, doc.title, doc.blocks);
// update: Uint8Array

// Yjs → JSON
const jsonDoc = YjsConverter.yjsUpdateToJson(update);
// jsonDoc: JSONDocument
```

**Yjs 文档结构：**

```typescript
{
  meta: YMap {
    id: string,
    title: string,
    createdAt: number,
    updatedAt: number
  },
  blocks: YArray [
    Block { id, flavour, type, text, props, children },
    ...
  ]
}
```

**核心方法：**

```typescript
class YjsConverter {
  // JSON → Yjs Update
  static jsonToYjsUpdate(doc: JSONDocument): Uint8Array;

  // Yjs Update → JSON
  static yjsUpdateToJson(update: Uint8Array): JSONDocument | null;

  // 创建新文档
  static createYjsDoc(docId: string, title: string, blocks: Block[]): { ydoc: Y.Doc; update: Uint8Array };

  // 更新现有文档
  static applyBlocksToYjs(ydoc: Y.Doc, docId: string, title: string, blocks: Block[]): Uint8Array;

  // 计算状态向量（用于增量同步）
  static getStateVector(ydoc: Y.Doc): Uint8Array;

  // 计算差异
  static getDiff(ydoc: Y.Doc, stateVector: Uint8Array): Uint8Array;
}
```

---

### 4. 认证服务 (Authentication Services)

#### 4.1 AuthService（认证服务）

**文件位置：** `src/web/services/auth.ts`

**功能：**

- Token 管理
- 用户认证状态
- Workspace ID 管理

**核心方法：**

```typescript
class AuthService {
  // 保存 token
  saveToken(token: string, workspaceId?: string): void;

  // 获取 token
  getToken(): string | null;

  // 检查是否已认证
  isAuthenticated(): boolean;

  // 获取用户信息
  getUser(): AuthUser | null;

  // 登出
  async signOut(): Promise<void>;

  // 获取 workspace IDs
  getWorkspaces(): string[];
}
```

---

## 🔄 数据流详解

### 创建文档流程

```
用户点击"新建文档"
   ↓
AllPagesPage.handleCreate()
   ↓
DocumentService.createDoc(title, options)
   ↓
LocalStorageAdapter.createDoc(doc)  // 保存到 IndexedDB
   ↓
SyncManager.enqueue({ type: 'create', doc })
   ↓
SyncManager.process()
   ↓
YjsConverter.createYjsDoc()  // 转换为 Yjs 格式
   ↓
AFFiNEWebSocketClient.pushDocUpdate()  // WebSocket 发送
   ↓
AFFiNE 后端接收并保存
   ↓
返回 timestamp
   ↓
标记同步完成
```

### 编辑文档流程

```
用户在编辑器中输入内容
   ↓
BlocksuiteEditor.updateBlockContent()
   ↓
setDocument() 更新本地状态
   ↓
自动保存触发（1秒延迟）
   ↓
DocumentService.updateDoc(docId, updates)
   ↓
LocalStorageAdapter.updateDoc()  // 更新 IndexedDB
   ↓
SyncManager.enqueue({ type: 'update', docId, updates })
   ↓
后台异步处理：
   YjsConverter.applyBlocksToYjs()
   ↓
AFFiNEWebSocketClient.pushDocUpdate()
   ↓
AFFiNE 后端广播更新
   ↓
其他客户端接收并合并
```

### 同步接收流程

```
AFFiNE 后端广播更新
   ↓
AFFiNEWebSocketClient.on('space:broadcast-doc-update')
   ↓
SyncManager.handleServerUpdate()
   ↓
YjsConverter.yjsUpdateToJson()  // 转回 JSON
   ↓
LocalStorageAdapter.updateDoc()  // 更新本地存储
   ↓
触发 UI 刷新
```

---

## 🔌 存储模式详解

### 本地模式（Local Mode）

**特点：**

- ✅ 完全离线可用
- ✅ 无需 AFFiNE 账号
- ✅ 快速响应
- ❌ 无云端备份
- ❌ 无法跨设备同步

**存储位置：**

- 浏览器 IndexedDB
- 数据库名：`ai-editor-local`

**数据流：**

```
用户操作 → LocalStorageAdapter → IndexedDB
```

### AFFiNE 同步模式（AFFiNE Sync Mode）

**特点：**

- ✅ 本地 + 云端双重存储
- ✅ 跨设备同步
- ✅ 支持协作编辑
- ✅ AI 功能增强
- ⚠️ 需要 AFFiNE 账号
- ⚠️ 需要网络连接

**存储位置：**

- 本地：IndexedDB
- 云端：AFFiNE 后端（通过 WebSocket）

**数据流：**

```
用户操作 → LocalStorageAdapter → IndexedDB
                    ↓
              SyncManager → WebSocket → AFFiNE 云端
```

### 模式切换

**从本地切换到 AFFiNE：**

```typescript
DocumentService.switchStorageMode('affine', {
  workspaceId: 'xxx',
  token: 'yyy',
});
```

**从 AFFiNE 切换到本地：**

```typescript
DocumentService.switchStorageMode('local');
```

---

## 🧪 功能验收测试指南

### 测试环境准备

#### 1.1 后端环境

**AFFiNE 后端（通过 SSH tunnel）：**

```bash
# 检查 SSH tunnel 是否运行
lsof -i:10003

# 应该看到类似输出：
# COMMAND   PID   USER   FD   TYPE   DEVICE SIZE/OFF NODE NAME
# ssh     12345  user   3u   IPv4  0x0      0t0  TCP *:10003 (LISTEN)
```

#### 1.2 前端环境

**开发服务器：**

```bash
# 前端应该运行在 3004 端口
# 访问：http://localhost:3004

# 检查运行状态
lsof -i:3004

# 应该看到：
# COMMAND    PID USER   FD   TYPE   DEVICE SIZE/OFF NODE NAME
# MainThrea 1311 user   22u  IPv6  121017  0t0  TCP *:3004 (LISTEN)
```

---

### 测试用例

#### 测试 1：本地模式基本功能

**目标：** 验证本地模式下的文档 CRUD 功能

**步骤：**

```
1. 访问：http://localhost:3004/#/workspace/demo/all

2. 点击"+ 新建文档"按钮

3. 输入标题："本地测试文档"

4. 点击"创建"

5. 点击文档卡片的"完整"按钮打开编辑器

6. 在编辑器中添加内容：
   - 添加标题："测试标题"
   - 添加段落："这是测试内容"
   - 添加列表项："列表项 1"

7. 返回所有文档页面
```

**预期结果：**

- ✅ 文档创建成功
- ✅ 文档在列表中显示
- ✅ 编辑器正常工作
- ✅ 内容保存成功
- ✅ 控制台无错误

**控制台日志：**

```javascript
📝 Document [doc-id] not found, creating...
✅ Document created: [doc-id]
💾 Document auto-saved: [doc-id]
```

---

#### 测试 2：AFFiNE 认证配置

**目标：** 验证 AFFiNE 认证功能

**前置条件：**

- AFFiNE 后端正常运行
- 拥有有效的 AFFiNE 账号

**步骤：**

```
1. 打开浏览器开发者工具（F12）

2. 在 AFFiNE 网站登录

3. 在开发者工具中：
   - 切换到 Application 标签
   - 左侧菜单选择 Cookies
   - 找到并复制 affine-session 或 better-auth.session_token 的值

4. 访问：http://localhost:3004/#/workspace/demo/settings

5. 在"认证 Token"输入框粘贴 token

6. 输入邮箱（可选）

7. 点击"保存 Token"按钮
```

**预期结果：**

- ✅ 弹出确认消息："✅ 认证 token 已保存！"
- ✅ 显示已认证用户邮箱
- ✅ 下方显示 Workspace 列表
- ✅ 控制台显示成功的 GraphQL 请求

**控制台日志：**

```javascript
AuthLink: token = [token前20个字符]...
=== GraphQL Request ===
URI: http://localhost:10003/graphql
...
=== GraphQL Response ===
Status: 200
...
✅ Workspaces saved to localStorage: [workspace-id-1, workspace-id-2]
```

---

#### 测试 3：AFFiNE 同步模式 - 文档创建

**目标：** 验证文档创建和同步到 AFFiNE

**前置条件：**

- 已完成测试 2（认证配置）
- 已获取 Workspace ID

**步骤：**

```
1. 在设置页面复制 Workspace ID

2. 返回所有文档页面

3. 点击"⚙️ 设置"按钮

4. 在存储模式部分，点击"☁️ AFFiNE 同步模式"

5. 输入 Workspace ID
   - Token 应该自动填充

6. 创建新文档：
   - 标题："同步测试文档"
   - 点击"创建"

7. 观察控制台输出
```

**预期结果：**

- ✅ WebSocket 连接成功
- ✅ 加入 workspace 成功
- ✅ 文档创建到本地
- ✅ 文档同步到 AFFiNE
- ✅ 显示同步状态：待同步: 0 • 已完成: 1

**控制台日志：**

```javascript
🔌 Connecting to AFFiNE WebSocket: http://localhost:10003
✅ WebSocket connected
✅ Joined workspace: [workspace-id]
✅ Connected to AFFiNE WebSocket
✅ SyncManager configured for workspace: [workspace-id]
📝 Document [doc-id] not found, creating...
✅ Document created: [doc-id]
📤 Added to sync queue: create [uuid]
🔄 Processing 1 sync items...
✅ Doc update pushed to AFFiNE: [doc-id] timestamp: [timestamp]
✅ Document created in AFFiNE: [doc-id]
✅ Sync completed: [uuid]
```

**验收点：**

- [ ] WebSocket 连接成功
- [ ] 文档在本地 IndexedDB 中
- [ ] 文档在 AFFiNE 后端可查看

---

#### 测试 4：AFFiNE 同步模式 - 文档编辑

**目标：** 验证编辑内容实时同步

**步骤：**

````
1. 打开"同步测试文档"

2. 在完整编辑器中添加内容：
   - 添加标题："章节一"
   - 添加段落："这是第一章的内容"
   - 添加代码块：
     ```javascript
     console.log('Hello, AFFiNE!');
     ```

3. 等待自动保存（1秒）

4. 观察控制台输出

5. 返回文档列表，查看同步状态
````

**预期结果：**

- ✅ 内容自动保存到本地
- ✅ 更新同步到 AFFiNE
- ✅ 控制台显示同步日志
- ✅ 同步计数增加

**控制台日志：**

```javascript
💾 Document auto-saved: [doc-id]
📤 Added to sync queue: update [uuid]
🔄 Processing 1 sync items...
✅ Doc update pushed to AFFiNE: [doc-id] timestamp: [timestamp]
✅ Document updated in AFFiNE: [doc-id]
✅ Sync completed: [uuid]
```

---

#### 测试 5：双向同步验证

**目标：** 验证从 AFFiNE 到本地的同步

**步骤：**

```
1. 在 AFFiNE 官方界面打开同步的文档

2. 在 AFFiNE 中编辑文档

3. 返回 AI 编辑器

4. 打开同一文档

5. 观察内容是否更新
```

**预期结果：**

- ✅ 本地文档自动更新
- ✅ 控制台显示接收更新日志
- ✅ 编辑器显示最新内容

**控制台日志：**

```javascript
📥 Received update from AFFiNE: [doc-id]
✅ Local document updated from AFFiNE: [doc-id]
```

---

#### 测试 6：离线功能

**目标：** 验证离线状态下的功能

**步骤：**

```
1. 断开网络或关闭 SSH tunnel

2. 尝试创建新文档

3. 编辑现有文档

4. 观察是否正常工作

5. 恢复网络

6. 观察自动同步
```

**预期结果：**

- ✅ 离线状态下可以创建文档
- ✅ 离线状态下可以编辑文档
- ✅ 恢复网络后自动同步
- ✅ 同步队列正常处理

**控制台日志：**

```javascript
// 离线时
📝 Document [doc-id] not found, creating...
✅ Document created: [doc-id]
📤 Added to sync queue: create [uuid]
⏸️ Sync already processing or not configured

// 恢复网络后
✅ Connected to AFFiNE WebSocket
🔄 Processing 1 sync items...
✅ Sync completed: [uuid]
```

---

#### 测试 7：轻量级编辑器

**目标：** 验证轻量级编辑器功能

**步骤：**

```
1. 在文档列表，点击文档的"轻量"按钮

2. 测试编辑功能

3. 测试 AI 聊天面板（如果有配置）
```

**预期结果：**

- ✅ 编辑器正常加载
- ✅ 可以编辑内容
- ✅ AI 面板正常显示

---

#### 测试 8：错误处理和恢复

**目标：** 验证错误场景的处理

**测试场景：**

**8.1 无效 Token**

```
1. 使用错误的 Token

2. 尝试同步

预期：显示错误信息，不影响本地功能
```

**8.2 无效 Workspace ID**

```
1. 使用不存在的 Workspace ID

2. 尝试同步

预期：显示"Workspace not found"错误
```

**8.3 网络中断**

```
1. 编辑文档时中断网络

2. 恢复网络

预期：操作保存在本地，恢复后自动同步
```

**8.4 并发编辑**

```
1. 在 AI 编辑器和 AFFiNE 官方界面同时打开文档

2. 同时编辑

预期：两个客户端的内容都保留（Yjs CRDT 合并）
```

---

### 性能测试

#### 测试 9：大文档处理

**目标：** 验证大文档的性能

**步骤：**

```
1. 创建包含大量块的文档（例如 100+ 个段落）

2. 编辑文档

3. 观察性能
```

**预期指标：**

- ✅ 编辑响应时间 < 100ms
- ✅ 自动保存不阻塞 UI
- ✅ 同步延迟 < 1s

---

#### 测试 10：并发操作

**目标：** 验证多个文档同时同步

**步骤：**

```
1. 创建 5 个文档

2. 快速编辑所有文档

3. 观察同步队列
```

**预期结果：**

- ✅ 所有文档正常同步
- ✅ 同步队列正常工作
- ✅ 无数据丢失

---

## 🐛 故障排查指南

### 常见问题

#### 问题 1：WebSocket 连接失败

**错误信息：**

```
❌ WebSocket connection error: Error: socket hang up
```

**原因：**

- SSH tunnel (10003端口) 未运行

**解决方案：**

```bash
# 检查 SSH tunnel
lsof -i:10003

# 如果没有输出，重新建立 SSH tunnel
ssh -L 10003:localhost:3000 user@remote-server
```

---

#### 问题 2：认证失败

**错误信息：**

```
❌ Failed to join workspace: Authentication failed
```

**原因：**

- Token 无效或过期

**解决方案：**

1. 重新从 AFFiNE 网站获取 token
2. 确保复制完整的 token 值
3. 在设置页面重新保存 token

---

#### 问题 3：文档未找到

**错误信息：**

```
❌ Sync failed: Document [doc-id] not found in local storage
```

**原因：**

- 尝试同步尚未在本地创建的文档

**解决方案：**

- 确保先在本地创建文档
- 检查 docId 是否正确

---

#### 问题 4：同步队列堆积

**现象：**

- 同步状态一直显示"待同步"
- 文档未同步到 AFFiNE

**原因：**

- WebSocket 连接断开
- AFFiNE 后端不可用

**解决方案：**

```javascript
// 在浏览器控制台执行
localStorage.removeItem('sync-queue');
// 刷新页面重新同步
```

---

### 调试技巧

#### 1. 检查 IndexedDB

```javascript
// 在浏览器控制台执行
const request = indexedDB.open('ai-editor-local', 1);
request.onsuccess = () => {
  const db = request.result;
  const tx = db.transaction('docs', 'readonly');
  const store = tx.objectStore('docs');
  const getAll = store.getAll();
  getAll.onsuccess = () => {
    console.log('本地文档:', getAll.result);
  };
};
```

#### 2. 检查同步队列

```javascript
// 在浏览器控制台执行
const queue = localStorage.getItem('sync-queue');
console.log('同步队列:', JSON.parse(queue));
```

#### 3. 检查 WebSocket 连接

```javascript
// 在浏览器控制台执行
console.log('WebSocket 状态:', window.socket?.connected);
```

#### 4. 清空所有数据

```javascript
// 在浏览器控制台执行
localStorage.clear();
indexedDB.deleteDatabase('ai-editor-local');
location.reload();
```

---

## 📊 API 参考

### DocumentService API

```typescript
class DocumentService {
  // 创建文档
  createDoc(
    title: string,
    options?: {
      workspaceId?: string;
      ownerId?: string;
      initialBlocks?: Block[];
    }
  ): Promise<string>;

  // 获取文档
  getDoc(docId: string): Promise<Document | null>;

  // 更新文档
  updateDoc(
    docId: string,
    updates: {
      title?: string;
      blocks?: Block[];
      yjsState?: Uint8Array;
    }
  ): Promise<void>;

  // 删除文档
  deleteDoc(docId: string): Promise<void>;

  // 列出文档
  listDocs(filter?: { workspaceId?: string; ownerId?: string; searchQuery?: string; updatedAfter?: number }): Promise<Document[]>;

  // 搜索文档
  searchDocs(query: string): Promise<Document[]>;

  // 切换存储模式
  switchStorageMode(
    mode: 'local' | 'affine',
    config?: {
      workspaceId: string;
      token: string;
      serverUrl?: string;
    }
  ): Promise<void>;

  // 同步到 AFFiNE
  syncToAFFine(): Promise<void>;

  // 获取同步统计
  getSyncStats(): {
    pending: number;
    completed: number;
    failed: number;
  };
}
```

### AuthService API

```typescript
class AuthService {
  // 保存 token
  saveToken(token: string, workspaceId?: string): void;

  // 获取 token
  getToken(): string | null;

  // 检查是否已认证
  isAuthenticated(): boolean;

  // 获取用户信息
  getUser(): {
    email: string;
    token: string;
  } | null;

  // 登出
  signOut(): Promise<void>;

  // 获取 workspace IDs
  getWorkspaces(): string[];
}
```

### SyncManager API

```typescript
class SyncManager {
  // 配置 AFFiNE
  async setConfig(config: { workspaceId: string; token: string; serverUrl?: string }): Promise<void>;

  // 添加到同步队列
  enqueue(operation: { type: 'create' | 'update' | 'delete'; doc?: Document; docId?: string; updates?: any }): void;

  // 处理同步队列
  async process(docId?: string): Promise<void>;

  // 获取文档同步状态
  getStatus(docId: string): 'idle' | 'pending' | 'synced' | 'error';

  // 获取同步统计
  getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };

  // 清空队列
  clearQueue(): void;

  // 断开连接
  async disconnect(): Promise<void>;
}
```

---

## 🚀 部署说明

### 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 访问应用
# http://localhost:3004
```

### 生产环境构建

```bash
# 1. 构建
npm run build

# 2. 输出目录
# dist/

# 3. 部署到静态服务器
# 例如：nginx, apache, vercel, netlify
```

### 环境变量

创建 `.env` 文件：

```env
# AFFiNE 后端配置
VITE_AFFINE_SERVER_URL=http://localhost:10003
VITE_AFFINE_GRAPHQL_URL=http://localhost:10003/graphql
VITE_AFFINE_WS_URL=ws://localhost:10003/graphql

# 应用配置
VITE_APP_NAME=AFFiNE AI Editor
VITE_APP_VERSION=1.0.0
```

---

## 📝 配置说明

### AFFiNE 后端配置

**本地开发（推荐）：**

```
通过 SSH tunnel 转发 AFFiNE 后端
本地端口：10003
远程端口：3000（AFFiNE 默认端口）
```

**SSH tunnel 命令：**

```bash
ssh -L 10003:localhost:3000 user@affine-server
```

### 存储配置

**本地模式：**

- 无需配置
- 自动使用 IndexedDB

**AFFiNE 同步模式：**

```javascript
{
  workspaceId: '8ebdecc7-227f-4415-85b5-9630bc2c7bda',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  serverUrl: 'http://localhost:10003'
}
```

---

## 🔐 安全注意事项

### Token 管理

- ✅ Token 保存在 localStorage（可配置为更安全的方式）
- ✅ Token 只在本地使用，不会发送到第三方服务器
- ⚠️ 建议定期更新 Token
- ⚠️ 不要在公共设备上保存 Token

### 数据隐私

- ✅ 本地数据完全在浏览器中
- ✅ 云端数据使用加密传输（WSS）
- ⚠️ 建议在 AFFiNE 后端启用 HTTPS

---

## 📈 性能优化

### 已实现的优化

1. **自动保存延迟**
   - 1秒延迟，避免频繁保存
   - 减少本地存储写入

2. **同步队列**
   - 异步处理，不阻塞 UI
   - 批量处理同步操作

3. **增量同步**
   - 使用 Yjs 的 diff 机制
   - 只传输变化部分

4. **本地优先**
   - 操作立即反映到本地
   - 云端同步在后台进行

### 可选优化

1. **批量同步**

   ```typescript
   // 将多个更新合并为一个同步操作
   batchSync(docIds: string[]): Promise<void>
   ```

2. **压缩传输**

   ```typescript
   // 压缩 Yjs 二进制数据
   compress(update: Uint8Array): Uint8Array
   ```

3. **懒加载**
   ```typescript
   // 只在需要时加载文档
   lazyLoad(docId: string): Promise<Document>
   ```

---

## 🧩 扩展指南

### 添加新的存储适配器

```typescript
// 1. 实现 IStorageAdapter 接口
class MySQLStorageAdapter implements IStorageAdapter {
  async getDoc(docId: string): Promise<Document | null> {
    // 实现
  }

  async createDoc(doc: Document): Promise<void> {
    // 实现
  }

  // ... 其他方法
}

// 2. 在 DocumentService 中注册
documentService.registerAdapter('mysql', new MySQLStorageAdapter());
```

### 添加新的同步协议

```typescript
// 1. 实现 SyncProtocol 接口
class WebRTCSyncProtocol implements SyncProtocol {
  async send(update: Uint8Array): Promise<void> {
    // WebRTC 实现
  }

  async receive(): Promise<Uint8Array> {
    // 实现
  }
}

// 2. 在 SyncManager 中使用
syncManager.setProtocol(new WebRTCSyncProtocol());
```

---

## 📚 技术栈总结

### 核心技术

| 技术             | 版本   | 用途             |
| ---------------- | ------ | ---------------- |
| React            | 18.x   | UI 框架          |
| TypeScript       | 5.x    | 类型系统         |
| Socket.IO Client | 4.8.x  | WebSocket 客户端 |
| Yjs              | 13.6.x | CRDT 数据结构    |
| IndexedDB        | -      | 本地存储         |

### 依赖的 AFFiNE 组件

| 组件                 | 用途           |
| -------------------- | -------------- |
| AFFiNE Backend       | 云端存储和同步 |
| AFFiNE WebSocket API | 实时通信       |
| AFFiNE GraphQL API   | 元数据查询     |

### 数据格式

| 格式       | 用途           |
| ---------- | -------------- |
| JSON       | 本地存储格式   |
| Yjs Binary | 云端传输格式   |
| Base64     | WebSocket 编码 |

---

## 🎯 功能特性总结

### 已实现 ✅

- [x] 双编辑器模式（完整 + 轻量）
- [x] 本地存储（IndexedDB）
- [x] 文档 CRUD 操作
- [x] 自动保存
- [x] AFFiNE 认证
- [x] WebSocket 连接
- [x] Yjs 格式转换
- [x] 双向同步
- [x] 同步队列管理
- [x] 错误重试机制
- [x] 离线编辑
- [x] 搜索功能
- [x] 设置面板

### 计划中 🚧

- [ ] 实时协作感知
- [ ] 历史版本查看
- [ ] 文档导出（Markdown, PDF）
- [ ] 文档导入
- [ ] 批量操作
- [ ] 回收站功能
- [ ] 标签系统

---

## 📞 支持和反馈

### 问题反馈

如果遇到问题或需要帮助：

1. **检查日志**：查看浏览器控制台输出
2. **查看文档**：参考本文档的故障排查部分
3. **提供信息**：
   - 浏览器类型和版本
   - 错误信息（控制台截图）
   - 复现步骤
   - 配置信息（隐藏敏感信息）

---

## 📄 版本历史

### v1.0.0 (当前版本)

**新增功能：**

- ✅ 完整的块编辑器
- ✅ 轻量级编辑器
- ✅ 本地存储支持
- ✅ AFFiNE WebSocket 同步
- ✅ Yjs 格式转换
- ✅ 双向同步机制
- ✅ 认证系统
- ✅ 设置面板

**修复问题：**

- 修复文档自动创建逻辑
- 修复 React key 警告
- 修复类型定义
- 优化错误处理

**已知限制：**

- 不支持实时协作感知（光标位置等）
- Yjs 文档在 AFFiNE 中可能需要格式化显示
- 同步失败时需要手动重试

---

## 🎓 技术亮点

### 1. 混合存储架构

**设计理念：**

- 本地优先：快速响应，离线可用
- 云端同步：数据安全，跨设备访问
- 透明切换：用户无感知的存储模式切换

**技术实现：**

```typescript
interface IStorageAdapter {
  getDoc(docId: string): Promise<Document | null>;
  createDoc(doc: Document): Promise<void>;
  updateDoc(docId: string, updates: DocUpdates): Promise<void>;
  deleteDoc(docId: string): Promise<void>;
  listDocs(filter?: DocFilter): Promise<Document[]>;
}
```

### 2. Yjs CRDT 集成

**核心优势：**

- 自动冲突解决
- 增量更新传输
- 支持离线编辑后合并

**数据流：**

```
用户编辑 → JSON 格式
    ↓
YjsConverter → Yjs Doc
    ↓
encodeStateAsUpdate() → Uint8Array
    ↓
Base64 编码 → WebSocket → AFFiNE
```

### 3. 队列化同步

**设计模式：**

- 异步队列：不阻塞 UI
- 重试机制：最多 3 次
- 优先级处理：文档级别

**实现：**

```typescript
class SyncManager {
  private queue: SyncQueueItem[] = [];

  async process(): Promise<void> {
    for (const item of this.queue) {
      try {
        await this.executeOperation(item.operation);
        item.status = 'completed';
      } catch (error) {
        if (item.retries < 3) {
          item.retries++;
          item.status = 'pending';
        } else {
          item.status = 'failed';
        }
      }
    }
  }
}
```

---

## 🏆 总结

### 项目成就

1. **完整的双编辑器系统**：提供完整和轻量两种选择
2. **可靠的存储方案**：本地 IndexedDB + 云端双重保障
3. **智能同步机制**：基于 Yjs 的 CRDT 同步，自动冲突解决
4. **离线优先设计**：无需网络即可使用
5. **良好的用户体验**：自动保存、实时同步、错误恢复

### 适用场景

- ✅ 个人笔记和文档管理
- ✅ 需要云端备份的离线编辑器
- ✅ AFFiNE 生态的轻量级客户端
- ✅ 多设备文档同步
- ✅ AI 辅助写作和编辑

### 技术特色

- 🎯 **混合架构**：结合本地和云端优势
- 🚀 **性能优化**：异步处理、增量更新
- 🔒 **数据安全**：加密传输、本地备份
- 🔧 **易于扩展**：模块化设计、接口清晰
- 📱 **响应式设计**：适配各种设备

---

**文档版本：** 1.0.0
**最后更新：** 2025-01-17
**维护者：** AI Editor Team
