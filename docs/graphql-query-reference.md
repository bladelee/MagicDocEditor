# AFFiNE GraphQL Query Reference

Quick reference for common AFFiNE GraphQL queries and mutations.

**Endpoint**: `http://localhost:3010/graphql` (or `http://localhost:10003/graphql` via SSH tunnel)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Public Queries](#public-queries)
3. [Authenticated Queries](#authenticated-queries)
4. [Mutations](#mutations)
5. [Error Handling](#error-handling)
6. [Testing with cURL](#testing-with-curl)

---

## Authentication

### Sign In

```graphql
mutation signIn($password: String!, $email: String!) {
  signIn(email: $email, password: $password) {
    token
    user {
      id
      name
      email
      avatarUrl
    }
  }
}
```

**Variables**:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

### Sign Up

```graphql
mutation signUp($email: String!, $password: String!, $name: String!) {
  signUp(name: $name, email: $email, password: $password) {
    token
    user {
      id
      name
      email
    }
  }
}
```

---

## Public Queries

These queries work without authentication.

### Get App Configuration

```graphql
{
  appConfig {
    name
    version
    features
    baseURL
  }
}
```

### Get Pricing Information

```graphql
{
  prices {
    monthly
    yearly
    currency
    plans {
      name
      price
      features
    }
  }
}
```

### Get Public User Profile

```graphql
{
  publicUserById(id: "user-id") {
    id
    name
    avatarUrl
  }
}
```

---

## Authenticated Queries

These queries require an authentication token.

### Get Current User

```graphql
{
  currentUser {
    id
    name
    email
    avatarUrl
    emailVerified
    createdAt
  }
}
```

### List Workspaces

```graphql
{
  workspaces {
    id
    name
    avatar
    isOwner
    isActivated
    createdAt
    updatedAT
  }
}
```

### Get Workspace Details

```graphql
{
  workspace(id: "workspace-id") {
    id
    name
    avatar
    owner {
      id
      name
      email
    }
    members {
      id
      name
      email
      role
      createdAt
    }
  }
}
```

### Get Document List

```graphql
{
  workspace(id: "workspace-id") {
    id
    docs {
      id
      title
      createdDate
      updatedDate
      isFavorite
      isTrash
    }
  }
}
```

### Get Document Content

```graphql
{
  doc(id: "doc-id") {
    id
    title
    content
    blocks {
      id
      type
      text
      props
    }
    metadata {
      createdAt
      updatedAt
      creator
    }
  }
}
```

---

## Mutations

### Create Workspace

```graphql
mutation {
  createWorkspace {
    id
    name
    createdAt
  }
}
```

### Update Workspace

```graphql
mutation updateWorkspace($id: ID!, $name: String!) {
  updateWorkspace(id: $id, name: $name) {
    id
    name
    updatedAt
  }
}
```

### Create Document

```graphql
mutation createDoc($workspaceId: ID!, $title: String!) {
  createDoc(workspaceId: $workspaceId, title: $title) {
    id
    title
  }
}
```

### Update Document

```graphql
mutation updateDoc($id: ID!, $title: String!, $content: String!) {
  updateDoc(id: $id, title: $title, content: $content) {
    id
    title
    updatedAt
  }
}
```

### Delete Document

```graphql
mutation deleteDoc($id: ID!) {
  deleteDoc(id: $id) {
    id
    title
  }
}
```

### Invite User to Workspace

```graphql
mutation inviteUser($workspaceId: ID!, $email: String!) {
  inviteUser(workspaceId: $workspaceId, email: $email) {
    id
    email
    role
  }
}
```

---

## Error Handling

### Authentication Error Response

```json
{
  "errors": [
    {
      "message": "You must sign in first to access this resource.",
      "extensions": {
        "status": 401,
        "code": "Unauthorized",
        "type": "AUTHENTICATION_REQUIRED"
      }
    }
  ],
  "data": null
}
```

### Validation Error Response

```json
{
  "errors": [
    {
      "message": "Variable '$email' has coerced Null value for 'NonNullType'",
      "extensions": {
        "status": 400,
        "code": "Bad Request",
        "type": "BAD_REQUEST"
      }
    }
  ]
}
```

---

## Testing with cURL

### Basic Query (No Auth)

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

### Authenticated Query

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "query { currentUser { id name email } }"
  }'
```

### Mutation with Variables

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "query": "mutation createDoc($workspaceId: ID!, $title: String!) { createDoc(workspaceId: $workspaceId, title: $title) { id title } }",
    "variables": {
      "workspaceId": "workspace-id",
      "title": "My New Document"
    }
  }'
```

### Pretty Print Response

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ currentUser { id name } }"}' | jq '.'
```

---

## Common Query Patterns

### Pagination

```graphql
{
  workspace(id: "workspace-id") {
    id
    docs(pageSize: 20, offset: 0) {
      id
      title
      totalCount
    }
  }
}
```

### Filtering

```graphql
{
  workspace(id: "workspace-id") {
    id
    docs(filter: { isTrash: false, isFavorite: true }) {
      id
      title
    }
  }
}
```

### Sorting

```graphql
{
  workspace(id: "workspace-id") {
    id
    docs(sort: { updatedAt: DESC }) {
      id
      title
      updatedAt
    }
  }
}
```

### Nested Queries

```graphql
{
  workspace(id: "workspace-id") {
    id
    name
    members {
      id
      name
      email
      user {
        id
        avatarUrl
      }
    }
    docs {
      id
      title
      blocks {
        id
        type
      }
    }
  }
}
```

---

## Introspection Queries

### List All Query Types

```graphql
{
  __type(name: "Query") {
    fields {
      name
      description
      type {
        name
        kind
      }
    }
  }
}
```

### List All Mutation Types

```graphql
{
  __type(name: "Mutation") {
    fields {
      name
      description
      type {
        name
      }
    }
  }
}
```

### Get Type Schema

```graphql
{
  __type(name: "WorkspaceType") {
    name
    description
    fields {
      name
      type {
        name
        kind
      }
    }
  }
}
```

---

## Testing Script

Run the comprehensive test script:

```bash
# Test direct connection
bash scripts/test-graphql-queries.sh

# Test via SSH tunnel
GRAPHQL_URL=http://localhost:10003/graphql bash scripts/test-graphql-queries.sh
```

---

## Tips and Best Practices

### 1. Query Only What You Need

```graphql
# ❌ Bad: Fetching everything
{
  currentUser {
    id
    name
    email
    avatarUrl
    createdAt
    updatedAt
  }
}

# ✅ Good: Fetch only needed fields
{
  currentUser {
    id
    name
  }
}
```

### 2. Use Aliases for Clarity

```graphql
{
  workspace(id: "ws1") {
    name
  }
  workspace2: workspace(id: "ws2") {
    name
  }
}
```

### 3. Handle Errors Gracefully

```graphql
{
  currentUser {
    id
    name
    ... on UserError {
      message
      code
    }
  }
}
```

### 4. Use Fragments for Reusability

```graphql
fragment UserInfo on UserType {
  id
  name
  email
  avatarUrl
}

{
  currentUser {
    ...UserInfo
  }
}
```

### 5. Batch Queries

```graphql
{
  currentUser {
    id
    name
  }
  workspaces {
    id
    name
  }
  appConfig {
    version
  }
}
```

---

## Useful Tools

### GraphiQL / Apollo Sandbox

- Explore the schema interactively
- Test queries with autocomplete
- View query documentation

### Browser DevTools

- Monitor GraphQL requests
- Inspect headers and tokens
- Debug query responses

### cURL + jq

- Quick command-line testing
- Pretty-print JSON responses
- Automate tests

---

## Related Documentation

- [Backend Integration Configuration](./backend-integration-configuration.md)
- [GraphQL Test Results](./graphql-test-results.md)
- [AFFiNE Official Documentation](https://github.com/toeverything/affine)

---

**Last Updated**: 2025-01-16
**API Version**: stable
**Status**: Active
