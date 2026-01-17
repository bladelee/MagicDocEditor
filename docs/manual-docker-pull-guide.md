# AFFiNE Docker 镜像手动下载指南

## 📦 需要下载的镜像

### 1. AFFiNE 主服务 (最重要)

```bash
docker pull ghcr.io/toeverything/affine:stable
```

**大小**: ~500 MB
**用途**: 核心 AFFiNE 服务，包含 GraphQL API、Web UI、AI Chat

### 2. PostgreSQL 数据库

```bash
docker pull pgvector/pgvector:pg16
```

**大小**: ~400 MB
**用途**: 数据库，带 pgvector 扩展（用于向量搜索）

### 3. Redis 缓存

```bash
docker pull redis:latest
```

**大小**: ~40 MB
**用途**: 缓存和会话管理

---

## 🚀 快速下载脚本

你可以逐个运行：

```bash
# 下载 AFFiNE (最大，先下载)
docker pull ghcr.io/toeverything/affine:stable

# 下载 PostgreSQL
docker pull pgvector/pgvector:pg16

# 下载 Redis
docker pull redis:latest
```

或者一次性下载：

```bash
docker pull ghcr.io/toeverything/affine:stable \
  && docker pull pgvector/pgvector:pg16 \
  && docker pull redis:latest
```

---

## ✅ 验证镜像下载

下载完成后，运行：

```bash
docker images | grep -E "affine|pgvector|redis"
```

应该看到：

```
ghcr.io/toeverything/affine         stable    xxxxx
pgvector/pgvector                   pg16      xxxxx
redis                                latest    xxxxx
```

---

## 🎯 下载完成后的启动步骤

### 1. 确保 `.env` 文件已创建

```bash
cat .docker/selfhost/.env
```

应该包含：

```
AFFINE_REVISION=stable
PORT=3010
DB_USERNAME=affine
DB_PASSWORD=affine_password_123
DB_DATABASE=affine
AFFINE_INDEXER_ENABLED=false
```

### 2. 启动服务

```bash
cd /home/ubuntu/proj/AFFiNE
docker compose -f .docker/selfhost/compose.yml up -d
```

### 3. 查看状态

```bash
docker compose -f .docker/selfhost/compose.yml ps
```

### 4. 查看日志

```bash
docker compose -f .docker/selfhost/compose.yml logs -f affine
```

### 5. 访问服务

```
Web UI:      http://localhost:3010
GraphQL API: http://localhost:3010/graphql
```

---

## ⚠️ 如果下载失败

### 方案 A: 使用国内镜像加速

```bash
# 配置 Docker 镜像加速
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
EOF

# 重启 Docker
sudo systemctl restart docker
```

### 方案 B: 从 GitHub 下载预构建版本

访问: https://github.com/toeverything/AFFiNE/releases
下载: `affine-self-host-vX.X.X.tgz`

### 方案 C: 使用官方 Demo 代替

访问: https://app.affine.pro

---

## 📝 下载完成后告诉我

当你下载完镜像后，告诉我：

- ✅ 所有镜像都下载成功
- ⚠️ 某个镜像下载失败

我会继续帮你启动服务！
