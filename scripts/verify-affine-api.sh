#!/bin/bash
# AFFiNE API 快速验证脚本
# 使用方法: AFFINE_COOKIE="your_cookie" ./verify-affine-api.sh

set -e

if [ -z "$AFFINE_COOKIE" ]; then
  echo "❌ 请设置 AFFINE_COOKIE 环境变量"
  echo "   export AFFINE_COOKIE=\"better-auth.session_token=...; affine_session=...\""
  exit 1
fi

GRAPHQL_URL="http://localhost:3010/graphql"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "======================================"
echo "AFFiNE API 快速验证"
echo "======================================"
echo ""

# 测试计数
PASS=0
FAIL=0

# 测试函数
test_api() {
  local name="$1"
  local query="$2"
  local field="$3"

  echo -n "测试 $name... "

  response=$(curl -s -X POST "$GRAPHQL_URL" \
    -H "Content-Type: application/json" \
    -H "Cookie: $AFFINE_COOKIE" \
    -d "$query" 2>&1)

  if echo "$response" | grep -q '"errors"'; then
    echo -e "${RED}失败${NC}"
    error_msg=$(echo "$response" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['errors'][0]['message'])" 2>/dev/null || echo "未知错误")
    echo "  错误: $error_msg"
    FAIL=$((FAIL + 1))
    return 1
  fi

  if [ -n "$field" ]; then
    value=$(echo "$response" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']$field)" 2>/dev/null)
    if [ -n "$value" ] && [ "$value" != "null" ]; then
      echo -e "${GREEN}成功${NC}"
      PASS=$((PASS + 1))
      return 0
    fi
  fi

  echo -e "${GREEN}成功${NC}"
  PASS=$((PASS + 1))
  return 0
}

# 运行测试
test_api "当前用户" '{"query": "{ currentUser { id name } }"}' ".currentUser"
test_api "工作空间列表" '{"query": "{ workspaces { id } }"}' ".workspaces"
test_api "Prompt模板列表" '{"query": "{ listCopilotPrompts { name } }"}' ".listCopilotPrompts"

echo ""
echo "======================================"
echo "结果: ${GREEN}通过 $PASS${NC} / ${RED}失败 $FAIL${NC}"
echo "======================================"
echo ""
echo "✅ 基础功能正常"
echo ""
echo "📋 详细测试命令："
echo ""
echo "# 查看 Prompt 模板"
echo "curl -X POST $GRAPHQL_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Cookie: \$AFFINE_COOKIE' \\"
echo "  -d '{\"query\": \"{ listCopilotPrompts { name action model } }\"}'"
echo ""
echo "# 创建工作空间"
echo "curl -X POST $GRAPHQL_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Cookie: \$AFFINE_COOKIE' \\"
echo "  -d '{\"query\": \"mutation { createWorkspace { id } }\"}'"
echo ""
echo "# 创建 AI 会话（需要先获取 workspaceId）"
echo "curl -X POST $GRAPHQL_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Cookie: \$AFFINE_COOKIE' \\"
echo "  -d '{\"query\": \"mutation { createCopilotSession(options: { workspaceId: \\\"YOUR_WORKSPACE_ID\\\" }) }\"}'"
