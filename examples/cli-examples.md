# OpenAPI MCP Server CLI Examples

These examples demonstrate various ways to use the OpenAPI MCP Server CLI.

## Basic Examples

### JSONPlaceholder API (Public API)

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://jsonplaceholder.typicode.com \
  --openapi-spec https://jsonplaceholder.typicode.com/openapi.json \
  --transport stdio \
  --port 3002
```

### Petstore API (Simple Demo)

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://petstore.swagger.io/v2/swagger.json \
  --headers "api_key:special-key,accept:application/json" \
  --transport stdio \
  --port 3002
```

### Crypto Market API

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://api.exchange.cryptomkt.com/api/3/ \
  --openapi-spec https://api.exchange.cryptomkt.com/api/3/explore/spec.yaml \
  --headers "accept:application/json" \
  --transport stdio \
  --port 3002
```

## API Examples with Authentication

### Bible API (with API Key)

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://api.scripture.api.bible \
  --openapi-spec https://api.scripture.api.bible/v1/swagger.json \
  --headers "API-Key:YOUR_API_KEY_HERE,Accept:application/json" \
  --transport stdio \
  --port 3002
```

### GitHub API (with Bearer Token)

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://api.github.com \
  --openapi-spec https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json \
  --headers "Authorization:Bearer YOUR_GITHUB_TOKEN,Accept:application/vnd.github.v3+json" \
  --transport stdio \
  --port 3002
```

## OpenAPI Spec Format Examples

### OpenAPI 2.0 (Swagger) JSON

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://raw.githubusercontent.com/readmeio/oas-examples/main/2.0/json/petstore.json \
  --headers "api_key:special-key,accept:application/json" \
  --transport stdio \
  --port 3002
```

### OpenAPI 2.0 (Swagger) YAML

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://raw.githubusercontent.com/readmeio/oas-examples/main/2.0/yaml/petstore.yaml \
  --headers "api_key:special-key,accept:application/json" \
  --transport stdio \
  --port 3002
```

### OpenAPI 3.0 JSON

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/json/petstore.json \
  --headers "api_key:special-key,accept:application/json" \
  --transport stdio \
  --port 3002
```

### OpenAPI 3.0 YAML

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://raw.githubusercontent.com/readmeio/oas-examples/main/3.0/yaml/petstore.yaml \
  --headers "api_key:special-key,accept:application/json" \
  --transport stdio \
  --port 3002
```

### OpenAPI 3.1 JSON

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://raw.githubusercontent.com/readmeio/oas-examples/main/3.1/json/petstore.json \
  --headers "api_key:special-key,accept:application/json" \
  --transport stdio \
  --port 3002
```

### OpenAPI 3.1 YAML

```sh
npx -y @modelcontextprotocol/inspector \
  npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://raw.githubusercontent.com/readmeio/oas-examples/main/3.1/yaml/petstore.yaml \
  --headers "api_key:special-key,accept:application/json" \
  --transport stdio \
  --port 3002
```

## Filtering Examples

### Tag-based Filtering

```sh
npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://petstore.swagger.io/v2/swagger.json \
  --tag pet \
  --tag store \
  --headers "api_key:special-key"
```

### Method Filtering

```sh
npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://petstore.swagger.io/v2/swagger.json \
  --operation GET \
  --operation POST \
  --headers "api_key:special-key"
```

### Dynamic Mode (Meta-tools Only)

```sh
npx ts-node src/cli.ts \
  --api-base-url https://api.github.com \
  --openapi-spec https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json \
  --tools dynamic \
  --headers "Authorization:Bearer YOUR_TOKEN"
```

### Explicit Tool Selection

```sh
npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://petstore.swagger.io/v2/swagger.json \
  --tools explicit \
  --tool GET::pet \
  --tool POST::pet \
  --headers "api_key:special-key"
```

## Transport Examples

### HTTP Transport

```sh
npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://petstore.swagger.io/v2/swagger.json \
  --transport http \
  --port 3000 \
  --host 0.0.0.0 \
  --headers "api_key:special-key"
```

### Stdio Transport (Default)

```sh
npx ts-node src/cli.ts \
  --api-base-url https://petstore.swagger.io/v2 \
  --openapi-spec https://petstore.swagger.io/v2/swagger.json \
  --transport stdio \
  --headers "api_key:special-key"
```

## Environment Variables

You can also use environment variables:

```sh
export API_BASE_URL="https://petstore.swagger.io/v2"
export OPENAPI_SPEC_PATH="https://petstore.swagger.io/v2/swagger.json"
export API_HEADERS="api_key:special-key,accept:application/json"
export TRANSPORT_TYPE="stdio"
export SERVER_NAME="petstore-mcp-server"
export NAMESPACE="petstore"

npx ts-node src/cli.ts
```

## Notes

- Replace `YOUR_API_KEY_HERE` and `YOUR_GITHUB_TOKEN` with actual tokens
- The MCP Inspector (`@modelcontextprotocol/inspector`) is useful for testing the tools
- Use `--debug` flag for detailed logging
- The `--port` parameter is for the MCP Inspector, not the server itself
