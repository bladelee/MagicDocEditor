#!/bin/bash

# AFFiNE Integration Test Script
# Tests all Phase 1 integrations with AFFiNE backend

# Configuration
GRAPHQL_URL="${GRAPHQL_URL:-http://localhost:3010/graphql}"
WORKSPACE_ID="${WORKSPACE_ID:-}"
TEST_RESULTS=()
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result logging
log_test() {
    local test_name="$1"
    local result="$2"
    local details="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("PASS: $test_name")
    else
        echo -e "${RED}✗${NC} $test_name"
        echo -e "  ${RED}Error:${NC} $details"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("FAIL: $test_name - $details")
    fi
}

# GraphQL query helper
graphql_query() {
    local query="$1"
    curl -s -X POST "$GRAPHQL_URL" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$query" | jq -Rs .)}" \
        2>/dev/null
}

# Extract field from JSON response
extract_field() {
    local json="$1"
    local field="$2"
    echo "$json" | jq -r ".$field // empty" 2>/dev/null
}

echo "======================================"
echo "AFFiNE Integration Test Suite"
echo "======================================"
echo "GraphQL URL: $GRAPHQL_URL"
echo ""

# ============================================
# 1. AI Chat API Tests
# ============================================
echo -e "${BLUE}Testing AI Chat APIs...${NC}"

# Test 1.1: Create Copilot Session
echo ""
echo "Test 1.1: Create Copilot Session"
if [ -z "$WORKSPACE_ID" ]; then
    # Try to get a workspace first
    echo "  Getting workspace ID..."
    WS_QUERY='query { workspaces { id } }'
    WS_RESPONSE=$(graphql_query "$WS_QUERY")
    WORKSPACE_ID=$(extract_field "$WS_RESPONSE" "data.workspaces[0].id")
fi

if [ -n "$WORKSPACE_ID" ]; then
    echo "  Using workspace: $WORKSPACE_ID"

    SESSION_QUERY='mutation CreateSession($wsId: String!) {
        createCopilotSession(workspaceId: $wsId) { id }
    }'

    SESSION_RESPONSE=$(graphql_query "$SESSION_QUERY" | sed "s/\$wsId/$WORKSPACE_ID/g")

    if echo "$SESSION_RESPONSE" | jq -e '.data.createCopilotSession.id' >/dev/null 2>&1; then
        SESSION_ID=$(extract_field "$SESSION_RESPONSE" "data.createCopilotSession.id")
        log_test "Create Copilot Session" "PASS" "Session ID: $SESSION_ID"
    else
        ERR=$(extract_field "$SESSION_RESPONSE" "errors[0].message")
        log_test "Create Copilot Session" "FAIL" "$ERR"
    fi
else
    log_test "Create Copilot Session" "FAIL" "No workspace available"
fi

# Test 1.2: List Copilot Prompts
echo ""
echo "Test 1.2: List Copilot Prompts"
PROMPTS_QUERY='query ListPrompts($wsId: String) {
    listCopilotPrompts(workspaceId: $wsId) {
        id
        name
        description
    }
}'

PROMPTS_RESPONSE=$(graphql_query "$PROMPTS_QUERY" | sed "s/\$wsId/$WORKSPACE_ID/g")

if echo "$PROMPTS_RESPONSE" | jq -e '.data.listCopilotPrompts' >/dev/null 2>&1; then
    PROMPT_COUNT=$(extract_field "$PROMPTS_RESPONSE" "data.listCopilotPrompts | length")
    log_test "List Copilot Prompts" "PASS" "Found $PROMPT_COUNT prompts"
else
    ERR=$(extract_field "$PROMPTS_RESPONSE" "errors[0].message")
    log_test "List Copilot Prompts" "FAIL" "$ERR"
fi

# Test 1.3: Get Copilot Session (if we have a session ID)
if [ -n "$SESSION_ID" ]; then
    echo ""
    echo "Test 1.3: Get Copilot Session"
    GET_SESSION_QUERY='query GetSession($id: String!) {
        copilotSession(id: $id) { id workspaceId }
    }'

    SESSION_GET_RESPONSE=$(graphql_query "$GET_SESSION_QUERY" | sed "s/\$id/$SESSION_ID/g")

    if echo "$SESSION_GET_RESPONSE" | jq -e '.data.copilotSession.id' >/dev/null 2>&1; then
        log_test "Get Copilot Session" "PASS" ""
    else
        ERR=$(extract_field "$SESSION_GET_RESPONSE" "errors[0].message")
        log_test "Get Copilot Session" "FAIL" "$ERR"
    fi
fi

# ============================================
# 2. Document Management Tests
# ============================================
echo ""
echo -e "${BLUE}Testing Document Management APIs...${NC}"

# Test 2.1: List Workspaces
echo ""
echo "Test 2.1: List Workspaces"
WORKSPACES_QUERY='query { workspaces { id name } }'
WORKSPACES_RESPONSE=$(graphql_query "$WORKSPACES_QUERY")

if echo "$WORKSPACES_RESPONSE" | jq -e '.data.workspaces' >/dev/null 2>&1; then
    WS_COUNT=$(extract_field "$WORKSPACES_RESPONSE" "data.workspaces | length")
    log_test "List Workspaces" "PASS" "Found $WS_COUNT workspace(s)"
    # Save first workspace ID for later tests
    if [ -z "$WORKSPACE_ID" ] && [ "$WS_COUNT" -gt 0 ]; then
        WORKSPACE_ID=$(extract_field "$WORKSPACES_RESPONSE" "data.workspaces[0].id")
    fi
else
    ERR=$(extract_field "$WORKSPACES_RESPONSE" "errors[0].message")
    log_test "List Workspaces" "FAIL" "$ERR"
fi

# Test 2.2: Get Docs
echo ""
echo "Test 2.2: Get Docs from Workspace"
if [ -n "$WORKSPACE_ID" ]; then
    DOCS_QUERY='query GetDocs($wsId: ID!) {
        docs(workspaceId: $wsId) {
            id
            title
        }
    }'

    DOCS_RESPONSE=$(graphql_query "$DOCS_QUERY" | sed "s/\$wsId/$WORKSPACE_ID/g")

    if echo "$DOCS_RESPONSE" | jq -e '.data.docs' >/dev/null 2>&1; then
        DOC_COUNT=$(extract_field "$DOCS_RESPONSE" "data.docs | length")
        log_test "Get Docs" "PASS" "Found $DOC_COUNT document(s)"
        # Save first doc ID for later tests
        if [ "$DOC_COUNT" -gt 0 ]; then
            TEST_DOC_ID=$(extract_field "$DOCS_RESPONSE" "data.docs[0].id")
        fi
    else
        ERR=$(extract_field "$DOCS_RESPONSE" "errors[0].message")
        log_test "Get Docs" "FAIL" "$ERR"
    fi
else
    log_test "Get Docs" "SKIP" "No workspace available"
fi

# Test 2.3: Create Doc
echo ""
echo "Test 2.3: Create New Document"
if [ -n "$WORKSPACE_ID" ]; then
    NEW_DOC_ID="test-doc-$(date +%s)"
    CREATE_DOC_QUERY='mutation CreateDoc($wsId: ID!, $docId: ID!) {
        createDoc(workspaceId: $wsId, docId: $docId) {
            id
            title
        }
    }'

    CREATE_DOC_RESPONSE=$(graphql_query "$CREATE_DOC_QUERY" | \
        sed "s/\$wsId/$WORKSPACE_ID/g" | \
        sed "s/\$docId/$NEW_DOC_ID/g")

    if echo "$CREATE_DOC_RESPONSE" | jq -e '.data.createDoc.id' >/dev/null 2>&1; then
        log_test "Create Doc" "PASS" "Created doc: $NEW_DOC_ID"
        TEST_DOC_ID=$NEW_DOC_ID
    else
        ERR=$(extract_field "$CREATE_DOC_RESPONSE" "errors[0].message")
        log_test "Create Doc" "FAIL" "$ERR"
    fi
else
    log_test "Create Doc" "SKIP" "No workspace available"
fi

# Test 2.4: Update Doc
echo ""
echo "Test 2.4: Update Document"
if [ -n "$WORKSPACE_ID" ] && [ -n "$TEST_DOC_ID" ]; then
    UPDATE_DOC_QUERY='mutation UpdateDoc($wsId: ID!, $docId: ID!) {
        updateDoc(workspaceId: $wsId, docId: $docId, title: "Test Updated") {
            id
            title
        }
    }'

    UPDATE_DOC_RESPONSE=$(graphql_query "$UPDATE_DOC_QUERY" | \
        sed "s/\$wsId/$WORKSPACE_ID/g" | \
        sed "s/\$docId/$TEST_DOC_ID/g")

    if echo "$UPDATE_DOC_RESPONSE" | jq -e '.data.updateDoc.title' >/dev/null 2>&1; then
        UPDATED_TITLE=$(extract_field "$UPDATE_DOC_RESPONSE" "data.updateDoc.title")
        log_test "Update Doc" "PASS" "Updated title to: $UPDATED_TITLE"
    else
        ERR=$(extract_field "$UPDATE_DOC_RESPONSE" "errors[0].message")
        log_test "Update Doc" "FAIL" "$ERR"
    fi
else
    log_test "Update Doc" "SKIP" "No workspace or doc available"
fi

# Test 2.5: Search Docs
echo ""
echo "Test 2.5: Search Documents"
if [ -n "$WORKSPACE_ID" ]; then
    SEARCH_QUERY='query SearchDocs($wsId: ID!, $query: String!) {
        searchDocs(workspaceId: $wsId, query: $query) {
            id
            title
        }
    }'

    SEARCH_RESPONSE=$(graphql_query "$SEARCH_QUERY" | \
        sed "s/\$wsId/$WORKSPACE_ID/g" | \
        sed 's/\$query/test/g')

    if echo "$SEARCH_RESPONSE" | jq -e '.data.searchDocs' >/dev/null 2>&1; then
        SEARCH_COUNT=$(extract_field "$SEARCH_RESPONSE" "data.searchDocs | length")
        log_test "Search Docs" "PASS" "Found $SEARCH_COUNT results"
    else
        ERR=$(extract_field "$SEARCH_RESPONSE" "errors[0].message")
        # Check if it's a known error (field doesn't exist)
        if echo "$ERR" | grep -qi "Cannot query field"; then
            log_test "Search Docs" "FAIL" "API not supported - will use client-side search"
        else
            log_test "Search Docs" "FAIL" "$ERR"
        fi
    fi
else
    log_test "Search Docs" "SKIP" "No workspace available"
fi

# Test 2.6: Delete Doc
echo ""
echo "Test 2.6: Delete Document"
if [ -n "$WORKSPACE_ID" ] && [ -n "$TEST_DOC_ID" ]; then
    DELETE_DOC_QUERY='mutation DeleteDoc($wsId: ID!, $docId: ID!) {
        deleteDoc(workspaceId: $wsId, docId: $docId) {
            success
        }
    }'

    DELETE_DOC_RESPONSE=$(graphql_query "$DELETE_DOC_QUERY" | \
        sed "s/\$wsId/$WORKSPACE_ID/g" | \
        sed "s/\$docId/$TEST_DOC_ID/g")

    if echo "$DELETE_DOC_RESPONSE" | jq -e '.data.deleteDoc' >/dev/null 2>&1; then
        log_test "Delete Doc" "PASS" "Deleted doc: $TEST_DOC_ID"
    else
        ERR=$(extract_field "$DELETE_DOC_RESPONSE" "errors[0].message")
        log_test "Delete Doc" "FAIL" "$ERR"
    fi
else
    log_test "Delete Doc" "SKIP" "No workspace or doc available"
fi

# ============================================
# 3. Database/Block Tests
# ============================================
echo ""
echo -e "${BLUE}Testing Database/Block APIs...${NC}"

# Test 3.1: Get Blocks
echo ""
echo "Test 3.1: Get Document Blocks"
if [ -n "$WORKSPACE_ID" ]; then
    # Need a doc ID - either from earlier tests or create a new one
    if [ -z "$TEST_DOC_ID" ]; then
        TEST_DOC_ID="test-doc-blocks-$(date +%s)"
        CREATE_DOC_QUERY='mutation CreateDoc($wsId: ID!, $docId: ID!) {
            createDoc(workspaceId: $wsId, docId: $docId) { id }
        }'
        graphql_query "$CREATE_DOC_QUERY" | \
            sed "s/\$wsId/$WORKSPACE_ID/g" | \
            sed "s/\$docId/$TEST_DOC_ID/g" >/dev/null 2>&1
    fi

    BLOCKS_QUERY='query GetBlocks($wsId: ID!, $docId: ID!) {
        blocks(workspaceId: $wsId, docId: $docId) {
            id
            flavour
            type
        }
    }'

    BLOCKS_RESPONSE=$(graphql_query "$BLOCKS_QUERY" | \
        sed "s/\$wsId/$WORKSPACE_ID/g" | \
        sed "s/\$docId/$TEST_DOC_ID/g")

    if echo "$BLOCKS_RESPONSE" | jq -e '.data.blocks' >/dev/null 2>&1; then
        BLOCK_COUNT=$(extract_field "$BLOCKS_RESPONSE" "data.blocks | length")
        log_test "Get Blocks" "PASS" "Found $BLOCK_COUNT block(s)"
    else
        ERR=$(extract_field "$BLOCKS_RESPONSE" "errors[0].message")
        log_test "Get Blocks" "FAIL" "$ERR"
    fi
else
    log_test "Get Blocks" "SKIP" "No workspace available"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}Some tests failed. See details above.${NC}"
    echo ""
    echo "Failed tests:"
    for result in "${TEST_RESULTS[@]}"; do
        if echo "$result" | grep -q "FAIL"; then
            echo "  - $result"
        fi
    done
    exit 1
fi
