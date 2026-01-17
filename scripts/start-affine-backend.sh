#!/bin/bash
# AFFiNE 后端一键启动脚本 (Docker)
# 使用方法: ./scripts/start-affine-backend.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🚀 AFFiNE Backend - Docker 快速启动              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker:"
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi

# 进入项目根目录
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
echo "📂 项目目录: $PROJECT_ROOT"
echo ""

# 1. 启动数据库和 Redis
echo "📦 [1/5] 启动 PostgreSQL 和 Redis..."
docker-compose -f .devcontainer/docker-compose.yml up -d postgres redis

# 2. 等待数据库就绪
echo "⏳ [2/5] 等待数据库启动..."
for i in {1..30}; do
    if docker exec affine-postgres pg_isready -U affine &> /dev/null; then
        echo "✅ 数据库已就绪"
        break
    fi
    sleep 1
done

# 3. 配置环境变量
echo "🔧 [3/5] 配置环境变量..."
cat > packages/backend/server/.env << 'ENVEOF'
# Database
DATABASE_URL=postgresql://affine:affine@localhost:5432/affine

# Redis
REDIS_SERVER_HOST=localhost

# Server
NODE_ENV=development
AFFINE_ENV=dev
AFFINE_SERVER_PORT=8080
AFFINE_SERVER_EXTERNAL_URL=http://localhost:8080

# Secret (开发环境使用固定值)
SECRET_KEY=dev-secret-key-change-in-production

# AI Providers (可选 - 用于测试)
# COPILOT_OPENAI_API_KEY=sk-your-key-here
# COPILOT_ANTHROPIC_API_KEY=sk-ant-your-key-here

# Features
AFFINE_INDEXER_ENABLED=false
ENVEOF

echo "✅ 环境变量已配置"
echo ""

# 4. 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 [4/5] 安装后端依赖..."
    cd packages/backend/server
    yarn install
    cd "$PROJECT_ROOT"
else
    echo "✅ [4/5] 依赖已存在，跳过安装"
fi
echo ""

# 5. 运行数据库迁移
echo "📊 [5/5] 运行数据库迁移..."
cd packages/backend/server

# 生成 Prisma Client
echo "   生成 Prisma Client..."
yarn prisma generate > /dev/null 2>&1

# 运行迁移
echo "   运行数据库迁移..."
DATABASE_URL="postgresql://affine:affine@localhost:5432/affine" \
yarn prisma migrate deploy || echo "⚠️  迁移失败（可能已运行过）"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✅ 准备完成！                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 现在可以启动后端服务:"
echo ""
echo "   cd packages/backend/server"
echo "   yarn dev"
echo ""
echo "📍 服务地址:"
echo "   GraphQL API:  http://localhost:8080/graphql"
echo "   WebSocket:    ws://localhost:8080"
echo "   Health Check: http://localhost:8080/health"
echo ""
echo "🛑 停止服务:"
echo "   docker-compose -f .devcontainer/docker-compose.yml down"
echo ""
echo "📝 查看日志:"
echo "   docker-compose -f .devcontainer/docker-compose.yml logs -f"
echo ""
