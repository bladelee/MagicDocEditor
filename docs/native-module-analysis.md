# AFFiNE Native 模块分析报告

## 📊 核心发现

### ❌ 没有预构建的 Native 模块

经过检查发现：

```
packages/backend/native/
├── Cargo.toml          # Rust 源码配置
├── src/                # Rust 源码
├── build.rs           # 构建脚本
└── index.js           # JS 绑定（需要 .node 文件）

缺少的文件:
❌ server-native.x64.node       (Linux x86_64)
❌ server-native.arm64.node     (Linux ARM64)
❌ server-native.armv7.node     (Linux ARM)
```

### 🔧 Native 模块的关键功能

这个模块提供了 **不可替代** 的核心功能：

1. **AI Token 计算**

   ```typescript
   getTokenEncoder('gpt-4'); // 计算 AI 消费的 tokens
   ```

2. **Y.js 文档解析**

   ```typescript
   parseDocFromBinary(); // 解析 Y.js 二进制文档
   parseYDocToMarkdown(); // 导出 Markdown
   ```

3. **HTML 安全处理**

   ```typescript
   htmlSanitize(); // 清理不安全的 HTML
   ```

4. **加密验证**
   ```typescript
   verifyChallengeResponse(); // 安全验证
   ```

### 🏗️ AFFiNE 的官方构建流程

```
开发环境 (你在这里)
    ↓
源码 (TypeScript + Rust)
    ↓
CI/CD 构建
    ├─ Rust 编译 → server-native.x64.node
    ├─ TypeScript 编译 → dist/main.js
    └─ 前端构建 → static/
    ↓
Docker 镜像
    ↓
生产环境
```

**关键**: 官方 Dockerfile 使用 `./dist/main.js` (已构建版本)

---

## 🎯 三种启动方案对比

### 方案 1: 本地构建 Native 模块

**步骤**:

```bash
# 1. 安装 Rust (5-10 分钟)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 2. 安装系统依赖 (5 分钟)
sudo apt install build-essential pkg-config libssl-dev

# 3. 构建 native 模块 (5-10 分钟)
cd packages/backend/native
yarn build

# 4. 构建后端 (2-3 分钟)
cd ../server
yarn affine bundle -p @affine/server

# 5. 启动服务
NODE_ENV=development yarn dev
```

**时间成本**: 20-30 分钟
**风险**: 高 (可能失败)
**收益**: 本地完整开发环境

---

### 方案 2: 使用 AFFiNE 官方 Demo (推荐) ⭐

**步骤**:

```bash
# 无需任何安装
1. 打开浏览器: https://app.affine.pro
2. 注册账号
3. 测试功能
```

**时间成本**: 5 分钟
**风险**: 无
**收益**: 立即体验完整功能

**可测试的项目**:

- ✅ GraphQL API 设计
- ✅ AI Chat 功能
- ✅ 文档编辑体验
- ✅ 实时协作
- ✅ API 响应性能

---

### 方案 3: 使用 AFFiNE Self-hosted Docker

**步骤**:

```bash
# 使用官方 Docker 镜像 (包含预构建版本)
docker pull ghcr.io/toeverything/affine-self-host:latest

# 启动完整服务
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="..." \
  ghcr.io/toeverything/affine-self-host:latest
```

**时间成本**: 15 分钟
**风险**: 中 (需要配置数据库)
**收益**: 本地运行完整 AFFiNE

---

## 💡 ROI 分析与建议

### 验证阶段的目标

我们的目标是：**验证 AFFiNE 后端是否适合我们的项目**

关键问题：

1. ✅ GraphQL API 设计是否满足需求？
2. ✅ AI Chat 功能是否可用？
3. ✅ API 响应性能如何？
4. ✅ 前端适配难度如何？

**注意**: 这些都不需要本地构建后端！

### 最优路径

```
第一步 (5 分钟): 官方 Demo 验证
    ↓
满意？→ 第二步 (10 分钟): 分析 GraphQL Schema
    ↓
满意？→ 决策: 采用 AFFiNE 后端
    ↓
第三步 (如果需要本地开发):
  - 使用官方 Docker 镜像
  - 或者设置 CI/CD 自动构建
```

### 避免的陷阱

❌ **不要在本地构建 Native 模块**

- 耗时 20-30 分钟
- 可能失败
- 不是验证阶段必需的

❌ **不要试图绕过 Native 模块**

- 提供核心功能，不可替代
- 修改代码成本更高

✅ **应该做**

- 使用官方 Demo 快速验证
- 分析 GraphQL Schema 评估适配难度
- 如果采用，使用官方 Docker 镜像部署

---

## 📋 最终建议

### 立即行动 (5 分钟)

**访问 AFFiNE 官方 Demo**:

```
https://app.affine.pro
```

**测试项目**:

1. 创建文档
2. 测试 AI Chat (点击 Copilot 图标)
3. 查看 GraphQL Playground: `https://app.affine.pro/graphql`

### 如果满意 (10 分钟)

**分析 GraphQL Schema**:

```bash
# 我可以提取关键 API 定义
grep "type.*ChatSession" packages/backend/server/src/schema.gql
grep "mutation.*createDoc" packages/backend/server/src/schema.gql
```

### 决策点

**如果 Demo 满意** → 采用 AFFiNE 后端

- 节省 $40k-$70k 开发成本
- 缩短 4 个月开发时间
- 使用官方 Docker 镜像部署

**如果不满意** → 重新评估

- API 差异太大
- 性能不满足
- 考虑其他方案

---

## 🔗 快速链接

- **AFFiNE 官网**: https://affine.pro
- **在线 Demo**: https://app.affine.pro
- **GraphQL Playground**: https://app.affine.pro/graphql
- **文档**: https://docs.affine.pro
- **GitHub**: https://github.com/toeverything/AFFiNE

---

**总结**: 本地构建 Native 模块是"最后一公里"问题，但对于验证阶段来说，这不是必需的。建议先用官方 Demo 验证，满意后再考虑本地开发环境。
