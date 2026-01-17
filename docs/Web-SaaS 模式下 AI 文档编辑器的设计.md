# Web-SaaS 模式下 AI 文档编辑器的最小文件提取

### 需求复述

你希望基于AFFiNE项目定制**仅Web端、SaaS模式**的AI文档编辑器，核心能力为「AI编写完整文档 + AI Chat局部修改文档」，需要从现有代码库中提取满足该需求的**最小文件集合**，剔除多端（Electron/iOS/Android）、白板/画布、本地优先存储、自托管等非核心功能相关文件。

### 核心原则

提取的文件需满足：**文档编辑核心（Blocksuite） + AI能力核心（Copilot/Prompt） + Web端适配 + SaaS基础（用户/权限/计费）**，仅保留Web端运行必需的最小依赖，剔除所有冗余模块。

## 一、核心文件/目录清单（按模块分类）

以下是满足需求的最小文件集合，路径基于AFFiNE官方代码库结构：

### 1. 基础依赖与工程配置（Web端构建/编译）

| 路径                                | 作用          | 说明                                                                 |
| ----------------------------------- | ------------- | -------------------------------------------------------------------- |
| `package.json`/`yarn.lock`          | 依赖管理      | 保留Web端/React/AI相关依赖，删除electron/ios/android/tauri等多端依赖 |
| `tsconfig.json`/`tsconfig.web.json` | TS配置        | 仅保留Web端TS编译配置，删除多端tsconfig（如tsconfig.electron.json）  |
| `.eslintrc.js`/`.prettierrc`        | 代码规范      | 通用规范，无需大幅修改                                               |
| `vite.config.ts`/`vite.plugin.ts`   | Web构建       | 仅保留Web端Vite配置，删除electron/ios打包插件                        |
| `index.html`（web根目录）           | Web入口       | Web端HTML入口，关联React根组件                                       |
| `packages/frontend/apps/web/`       | Web端工程入口 | 核心Web端应用目录，包含路由、根组件、Web适配逻辑                     |

### 2. 文档编辑核心（Blocksuite - 仅保留文档编辑）

Blocksuite是AFFiNE的核心编辑器框架，仅保留「文档（page）模式」相关，剔除「白板（edgeless）」相关：

| 路径                                     | 作用           | 说明                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/blocksuite/`                   | 核心编辑器     | 仅保留子目录：<br>- `blocks/text`: 文本块（核心）<br>- `blocks/code`: 代码块（AI修改代码用）<br>- `components/editor`: 文档编辑器核心组件<br>- `framework/core`: 编辑器核心API<br>- `framework/store`: 文档数据存储（仅保留云端）<br>- `framework/sync`: 云端同步（剔除本地IndexedDB同步）<br>- `packages/blocksuite/apis/`: 编辑器对外API（插入/修改文本） |
| `packages/frontend/core/src/blocksuite/` | 前端编辑器封装 | 仅保留：<br>- `editor/`: 文档编辑器初始化/配置<br>- `page/`: 文档（page）模式适配<br>- `ai/`: AI与编辑器联动（核心）                                                                                                                                                                                                                                        |
| `packages/common/nbstore/src/`           | 数据存储       | 仅保留云端存储适配（`impls/remote/`），删除本地存储（`impls/idb/`/`impls/sqlite/`）                                                                                                                                                                                                                                                                         |

### 3. AI能力核心（Copilot/Prompt/AI Chat）

这是AI文档编辑的核心，仅保留Web端AI交互、Prompt模板、AI Chat、局部修改能力：

| 路径                                           | 作用       | 说明                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/backend/server/src/plugins/copilot/` | AI后端核心 | 仅保留子目录：<br>- `prompt/`: Prompt模板（AI编写文档的Prompt管理）<br>- `providers/`: AI模型提供商（OpenAI/Gemini等）<br>- `chat/`: AI Chat核心逻辑<br>- `tools/`: AI工具（文档局部修改/生成）<br>- `api/`: AI接口（GraphQL/Rest）<br>删除：`embedding/`（本地向量检索，SaaS用云端） |
| `packages/frontend/core/src/blocksuite/ai/`    | 前端AI封装 | 核心目录，包含：<br>- `ai-provider.ts`: AI能力调度<br>- `chat-panel/`: AI Chat面板（局部修改用）<br>- `text-renderer.ts`: AI输出渲染<br>- `setup-provider.tsx`: AI能力注册<br>- `ask-ai-button/`: AI触发按钮（文档内调用AI）                                                          |
| `packages/frontend/core/src/api/copilot.ts`    | AI前端API  | Web端调用AI后端的封装                                                                                                                                                                                                                                                                 |
| `packages/common/ai/src/`                      | 通用AI类型 | AI相关TypeScript类型定义（Prompt/Agent/模型参数）                                                                                                                                                                                                                                     |

### 4. Web端核心适配（仅保留Web）

| 路径                                  | 作用          | 说明                                                                                                                                                                                               |
| ------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/frontend/apps/web/src/`     | Web端业务代码 | 仅保留：<br>- `app.tsx`: Web端根组件<br>- `routes/`: 文档编辑/AI Chat路由（剔除白板/设置路由）<br>- `components/`: Web端通用组件（导航/编辑器容器）<br>- `pages/`: 核心页面（文档编辑页、登录页）  |
| `packages/frontend/core/src/modules/` | 前端核心模块  | 仅保留：<br>- `auth/`: 用户认证（SaaS必需）<br>- `workspace/`: 工作区（文档归属）<br>- `editor/`: 编辑器初始化<br>- `ai/`: AI功能入口<br>删除：`userspace/`（本地用户空间）、`electron/`（桌面端） |

### 5. SaaS基础（Web端SaaS必需）

| 路径                                             | 作用         | 说明                               |
| ------------------------------------------------ | ------------ | ---------------------------------- |
| `packages/backend/server/src/modules/auth/`      | 用户认证     | 登录/注册/JWT（SaaS核心）          |
| `packages/backend/server/src/modules/billing/`   | 计费/订阅    | SaaS收费（可选，基础版可先简化）   |
| `packages/backend/server/src/modules/workspace/` | 工作区管理   | 文档所属的工作区（SaaS多租户基础） |
| `packages/backend/server/src/modules/doc/`       | 文档CRUD     | 云端文档存储/读写（SaaS核心）      |
| `packages/frontend/core/src/hooks/use-auth.ts`   | 前端认证Hook | Web端登录状态管理                  |

## 二、需彻底排除的文件/目录（冗余模块）

为了最小化代码体积，需删除以下与需求无关的文件：

1. **多端相关**：`packages/frontend/apps/electron/`、`packages/frontend/apps/ios/`、`packages/mobile/`、`tauri/`；

2. **白板/画布相关**：`packages/blocksuite/blocks/edgeless/`、`packages/frontend/core/src/blocksuite/edgeless/`；

3. **本地存储相关**：`packages/common/nbstore/src/impls/idb/`、`packages/common/nbstore/src/impls/sqlite/`；

4. **自托管/本地优先相关**：`packages/backend/server/src/modules/self-host/`、`packages/frontend/core/src/modules/self-host/`；

5. **其他非核心功能**：`packages/backend/server/src/plugins/embedding/`（本地向量检索）、`packages/frontend/core/src/modules/share/`（分享，可选保留）、`packages/frontend/core/src/modules/backup/`（本地备份）。

## 三、关键精简改造点（提取后需调整）

提取文件后，需做少量改造以适配「仅Web+SaaS+AI文档编辑」：

1. **删除多端条件判断**：在Blocksuite/前端代码中，删除`isElectron`/`isIOS`等多端判断，仅保留`isWeb`；

2. **简化存储层**：仅保留云端同步（OctoBase/后端API），删除本地IndexedDB/SQLite相关代码；

3. **精简编辑器功能**：在Blocksuite初始化时，仅注册「文本/代码/标题」等核心块，删除白板/形状/思维导图等块；

4. **AI能力聚焦**：移除AI生成思维导图/幻灯片等非文档编辑能力，仅保留「文本生成/局部修改/代码解释」；

5. **工程配置精简**：在`vite.config.ts`中删除多端打包插件，仅保留Web端构建；在`package.json`中删除多端依赖（如`electron`/`@capacitor/*`）。

## 总结（核心文件摘要）

满足你需求的最小文件集合可总结为：

1. **工程基础**：`package.json`/`tsconfig.web.json`/`vite.config.ts` + `packages/frontend/apps/web/`（Web端入口）；

2. **编辑器核心**：`packages/blocksuite/`（仅文档编辑块） + `packages/frontend/core/src/blocksuite/editor/`；

3. **AI核心**：`packages/backend/server/src/plugins/copilot/`（Prompt/Chat/模型） + `packages/frontend/core/src/blocksuite/ai/`；

4. **SaaS基础**：`packages/backend/server/src/modules/auth/`/`doc/`/`workspace/` + 前端认证Hook；

5. **数据层**：`packages/common/nbstore/src/impls/remote/`（仅云端存储）。

以上文件覆盖「Web端AI文档编辑」的核心能力，剔除所有冗余模块后，可作为定制化开发的基础，且仅保留Web端、SaaS模式必需的代码，大幅降低维护成本。

> （注：文档部分内容可能由 AI 生成）
