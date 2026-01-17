#!/bin/bash
# AFFiNE 官方 Docker 镜像快速部署脚本
# 使用方法: ./scripts/deploy-affine-docker.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🐳 AFFiNE 官方 Docker 镜像部署                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 进入项目根目录
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 使用 docker compose 还是 docker-compose
DOCKER_COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
fi

echo "📂 项目目录: $PROJECT_ROOT"
echo "🐳 使用: $DOCKER_COMPOSE"
echo ""

# 停止并清理旧的容器（如果存在）
echo "🧹 清理旧容器..."
$DOCKER_COMPOSE -f .docker/selfhost/compose.yml down 2>/dev/null || true

# 清理旧的数据库（可选）
read -p "是否清理旧数据库？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  清理数据库数据..."
    rm -rf ~/.affine/self-host/postgres/pgdata
fi

# 创建 .env 文件
echo "📝 创建环境配置..."
cat > .docker/selfhost/.env << 'ENVEOF'
# AFFiNE 版本
AFFINE_REVISION=stable

# 服务端口
PORT=3010

# 数据持久化位置
DB_DATA_LOCATION=~/.affine/self-host/postgres/pgdata
UPLOAD_LOCATION=~/.affine/self-host/storage
CONFIG_LOCATION=~/.affine/self-host/config

# 数据库配置
DB_USERNAME=affine
DB_PASSWORD=affine_password_123
DB_DATABASE=affine

# 禁用索引器（简化部署）
AFFINE_INDEXER_ENABLED=false

# 如果你有 AI API Key，可以取消注释并填入
# COPILOT_OPENAI_API_KEY=sk-your-key-here
# COPILOT_ANTHROPIC_API_KEY=sk-ant-your-key-here
ENVEOF

echo "✅ 环境配置已创建"
echo ""

# 创建必要的目录
echo "📁 创建数据目录..."
mkdir -p ~/.affine/self-host/postgres/pgdata
mkdir -p ~/.affine/self-host/storage
mkdir -p ~/.affine/self-host/config
echo "✅ 数据目录已创建"
echo ""

# 拉取镜像
echo "📦 拉取 Docker 镜像（可能需要几分钟）..."
$DOCKER_COMPOSE -f .docker/selfhost/compose.yml pull
echo ""

# 启动服务
echo "🚀 启动 AFFiNE 服务..."
$DOCKER_COMPOSE -f .docker/selfhost/compose.yml up -d
echo ""

# 等待服务启动
echo "⏳ 等待服务启动（30 秒）..."
sleep 30

# 检查服务状态
echo ""
echo "📊 服务状态:"
$DOCKER_COMPOSE -f .docker/selfhost/compose.yml ps
echo ""

# 检查日志
echo "📝 查看服务日志:"
$DOCKER_COMPOSE -f .docker/selfhost/compose.yml logs --tail=20 affine
echo ""

# 显示访问信息
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   ✅ AFFiNE 已启动！                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 访问地址:"
echo "   Web UI:      http://localhost:3010"
echo "   GraphQL API: http://localhost:3010/graphql"
echo ""
echo "📊 数据库信息:"
echo "   Host:        localhost:5432"
echo "   Database:    affine"
echo "   Username:    affine"
echo "   Password:    affine_password_123"
echo ""
echo "🛠️  管理命令:"
echo "   查看日志:     $DOCKER_COMPOSE -f .docker/selfhost/compose.yml logs -f"
echo "   停止服务:     $DOCKER_COMPOSE -f .docker/selfhost/compose.yml down"
echo "   重启服务:     $DOCKER_COMPOSE -f .docker/selfhost/compose.yml restart"
echo ""
echo "📝 配置文件位置:"
echo "   环境变量:     .docker/selfhost/.env"
echo "   数据库:       ~/.affine/self-host/postgres/pgdata"
echo "   上传文件:     ~/.affine/self-host/storage"
echo "   配置文件:     ~/.affine/self-host/config"
echo ""
echo "🔧 故障排查:"
echo "   如果服务未启动，运行:"
echo "   $DOCKER_COMPOSE -f .docker/selfhost/compose.yml logs"
echo ""
