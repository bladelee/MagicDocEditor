#!/usr/bin/env python3
"""AFFiNE Schema Explorer - Explores AFFiNE GraphQL Schema"""
import json
import requests
import sys

GRAPHQL_URL = "http://localhost:3010/graphql"

def query_graphql(query):
    """Execute GraphQL query"""
    response = requests.post(
        GRAPHQL_URL,
        json={"query": query},
        headers={"Content-Type": "application/json"}
    )
    response.raise_for_status()
    return response.json()

def get_input_type_fields(type_name):
    """Get fields for an input type"""
    query = f'''
    {{
      __type(name: "{type_name}") {{
        inputFields {{
          name
          type {{ name ofType {{ name }} }}
        }}
      }}
    }}
    '''
    result = query_graphql(query)
    fields = result.get('data', {}).get('__type', {}).get('inputFields', [])
    return fields

def print_type_fields(type_name):
    """Print input type fields"""
    print(f"\n=== {type_name} Fields ===")
    try:
        fields = get_input_type_fields(type_name)
        for f in fields:
            name = f.get('name')
            type_obj = f.get('type', {})
            type_name = type_obj.get('ofType', {}).get('ofType', {}).get('name') or \
                       type_obj.get('ofType', {}).get('name') or \
                       type_obj.get('name')
            required = "!" if type_obj.get('ofType', {}).get('ofType', {}).get('kind') == "NON_NULL" else ""
            print(f"  {name}: {type_name}{required}")
    except Exception as e:
        print(f"  Error: {e}")

def main():
    print("AFFiNE Schema Explorer")
    print("=" * 50)

    # Check CreateChatSessionInput
    print_type_fields("CreateChatSessionInput")

    # Check CreateChatMessageInput
    print_type_fields("CreateChatMessageInput")

    # Check WorkspaceType
    print("\n=== WorkspaceType Fields ===")
    query = '{ __type(name: "WorkspaceType") { fields { name type { name } } } }'
    result = query_graphql(query)
    fields = result.get('data', {}).get('__type', {}).get('fields', [])
    for f in fields:
        print(f"  {f['name']}: {f.get('type', {}).get('name')}")

    # Check listCopilotPrompts return type
    print("\n=== listCopilotPrompts Return Type ===")
    query = '{ __type(name: "Query") { fields(name: "listCopilotPrompts") { type { name ofType { name kind } } } } }'
    result = query_graphql(query)
    field = result.get('data', {}).get('__type', {}).get('fields', [{}])[0]
    type_info = field.get('type', {})
    print(f"  Returns: {type_info.get('name')}")

    # Check CopilotPromptType
    print("\n=== CopilotPromptType Fields ===")
    query = '{ __type(name: "CopilotPromptType") { fields { name type { name } } } }'
    result = query_graphql(query)
    fields = result.get('data', {}).get('__type', {}).get('fields', [])
    for f in fields:
        print(f"  {f['name']}: {f.get('type', {}).get('name')}")

    # Check createCopilotPrompt input
    print_type_fields("CreateCopilotPromptInput")

    # Try to list workspaces
    print("\n=== Testing listWorkspaces ===")
    query = '{ workspaces { id } }'
    result = query_graphql(query)
    print(f"  Result: {json.dumps(result, indent=2)}")

    # Try to get current user
    print("\n=== Testing currentUser ===")
    query = '{ currentUser { id name email } }'
    result = query_graphql(query)
    print(f"  Result: {json.dumps(result, indent=2)}")

if __name__ == "__main__":
    main()
