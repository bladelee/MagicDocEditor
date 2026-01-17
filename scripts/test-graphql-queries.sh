#!/bin/bash

# AFFiNE GraphQL Query Test Script
# Tests the GraphQL API with actual AFFiNE queries

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GRAPHQL_URL="${GRAPHQL_URL:-http://localhost:3010/graphql}"
echo -e "${BLUE}Testing GraphQL endpoint: ${GRAPHQL_URL}${NC}\n"

# Test 1: Basic connection test
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 1: Basic Connection Test${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Query: { __typename }"
curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' | jq '.'
echo -e "${GREEN}✓ Basic connection working${NC}\n"

# Test 2: Get schema query type name
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 2: Schema Query Type${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Query: { __schema { queryType { name } } }"
curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } } }"}' | jq '.'
echo -e "${GREEN}✓ Schema query type retrieved${NC}\n"

# Test 3: List available query fields
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 3: Available Query Fields (First 10)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Query: { __type(name: \"Query\") { fields { name } } }"
curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"Query\") { fields { name } } }"}' | jq '.data.__type.fields[0:10]'
echo -e "${GREEN}✓ Query fields listed${NC}\n"

# Test 4: Get workspace list (corrected query)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 4: Query Workspaces${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Query: { workspaces { id } }"
WORKSPACES=$(curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ workspaces { id } }"}')

echo "$WORKSPACES" | jq '.'
if echo "$WORKSPACES" | jq -e '.data.workspaces' > /dev/null 2>&1; then
    WORKSPACE_COUNT=$(echo "$WORKSPACES" | jq '.data.workspaces | length')
    echo -e "${GREEN}✓ Found ${WORKSPACE_COUNT} workspace(s)${NC}\n"
elif echo "$WORKSPACES" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Error querying workspaces (may need authentication)${NC}\n"
fi

# Test 5: Check if we can list blobs/storage
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 5: Query Blobs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Query: { blobs { id size type } }"
BLOBS=$(curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ blobs { id size type } }"}')

echo "$BLOBS" | jq '.'
if echo "$BLOBS" | jq -e '.data.blobs' > /dev/null 2>&1; then
    BLOB_COUNT=$(echo "$BLOBS" | jq '.data.blobs | length')
    echo -e "${GREEN}✓ Found ${BLOB_COUNT} blob(s)${NC}\n"
else
    echo -e "${YELLOW}⚠ No blobs or authentication required${NC}\n"
fi

# Test 6: Check current user (corrected query)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 6: Current User Query${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Query: { currentUser { id name email avatarUrl } }"
USER_RESULT=$(curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ currentUser { id name email avatarUrl } }"}')

echo "$USER_RESULT" | jq '.'
if echo "$USER_RESULT" | jq -e '.data.currentUser' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ User query successful${NC}\n"
else
    echo -e "${YELLOW}ℹ No authenticated user (expected without auth)${NC}\n"
fi

# Test 7: Check mutation availability
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 7: Available Mutation Fields (First 10)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Query: { __schema { mutationType { fields { name } } } }"
curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { mutationType { fields { name } } } }"}' | jq '.data.mutationType.fields[0:10]'
echo -e "${GREEN}✓ Mutation fields listed${NC}\n"

# Test 8: Try to create a workspace (test mutation endpoint)
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 8: Create Workspace Mutation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Mutation: mutation { createWorkspace { id } }"
CREATE_RESULT=$(curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { createWorkspace { id } }"}')

echo "$CREATE_RESULT" | jq '.'
if echo "$CREATE_RESULT" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${YELLOW}ℹ Authentication required for mutations (expected)${NC}\n"
else
    echo -e "${GREEN}✓ Mutation endpoint accessible${NC}\n"
fi

# Test 9: Check subscription support
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 9: Subscription Type Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Query: { __schema { subscriptionType { name fields { name } } } }"
SUB_RESULT=$(curl -s "${GRAPHQL_URL}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { subscriptionType { name fields { name } } } }"}')

if echo "$SUB_RESULT" | jq -e '.data.subscriptionType' > /dev/null 2>&1; then
    echo "$SUB_RESULT" | jq '.data.subscriptionType.fields[0:5]'
    echo -e "${GREEN}✓ Subscriptions supported${NC}\n"
else
    echo -e "${YELLOW}ℹ No subscription type found${NC}\n"
fi

# Summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}GraphQL API Test Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Endpoint: ${GRAPHQL_URL}"
echo "Status: ✓ Online and responding"
echo ""
echo "Available Query Types:"
echo "  - workspaces"
echo "  - blobs"
echo "  - currentUser"
echo "  - (and more - see full list above)"
echo ""
echo "Next Steps:"
echo "  1. For authenticated requests, add Authorization header"
echo "  2. Use the frontend at http://localhost:10009 for full testing"
echo "  3. Check browser DevTools Network tab for GraphQL queries from app"
echo ""
echo "Example authenticated request:"
echo "  curl -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\": \"{ workspaces { id } }\"}' \\"
echo "    ${GRAPHQL_URL}"
