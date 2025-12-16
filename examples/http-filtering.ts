/**
 * Example: HTTP transport with filtering and meta-tools
 */

import { OpenAPIServer } from '../src/index';

async function httpExample() {
  console.log('=== HTTP Transport with Filtering Example ===');
  
  // Create server with comprehensive OpenAPI spec and filtering
  const server = new OpenAPIServer({
    name: 'petstore-api',
    version: '1.0.0',
    apiBaseUrl: 'https://petstore.swagger.io/v2',
    openApiSpec: 'https://petstore.swagger.io/v2/swagger.json', // Load from URL
    specInputMethod: 'url',
    transportType: 'http',
    httpPort: 3003,
    httpHost: '127.0.0.1',
    endpointPath: '/mcp',
    
    // Filtering configuration
    toolsMode: 'all',
    includeTags: ['pet', 'store'], // Only include pet and store operations
    includeOperations: ['GET', 'POST'], // Only GET and POST methods
    
    // Static headers for the Petstore API
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'OpenAPI-MCP-Server-Example/1.0.0'
    },
    
    debug: true
  });

  console.log('\\nConfiguration:');
  console.log('- API: Swagger Petstore (https://petstore.swagger.io/v2)');
  console.log('- Spec Loading: URL (https://petstore.swagger.io/v2/swagger.json)');
  console.log('- Transport: HTTP on http://127.0.0.1:3003/mcp');
  console.log('- Filtering: Only "pet" and "store" tags, only GET/POST methods');
  console.log('- Headers: Accept and User-Agent headers');

  try {
    console.log('\\nStarting server...');
    await server.start();
    
    const stats = server.getStats();
    console.log('\\nServer started successfully! 🚀');
    console.log('\\nServer Statistics:');
    console.log(`- Total tools: ${stats.tools.total}`);
    console.log(`- Endpoint tools: ${stats.tools.endpointTools}`);
    console.log(`- Meta tools: ${stats.tools.metaTools}`);
    
    if (stats.tools.byMethod && Object.keys(stats.tools.byMethod).length > 0) {
      console.log('\\nTools by HTTP method:');
      Object.entries(stats.tools.byMethod).forEach(([method, count]) => {
        console.log(`  - ${method}: ${count} tools`);
      });
    }
    
    if (stats.tools.byTag && Object.keys(stats.tools.byTag).length > 0) {
      console.log('\\nTools by tag:');
      Object.entries(stats.tools.byTag).forEach(([tag, count]) => {
        console.log(`  - ${tag}: ${count} tools`);
      });
    }

    console.log('\\n🌐 HTTP Endpoints:');
    console.log(`- Server Status: GET http://127.0.0.1:3003/mcp`);
    console.log(`- MCP Protocol: POST http://127.0.0.1:3003/mcp (with JSON-RPC)`);
    
    console.log('\\n📡 Testing HTTP endpoint...');
    
    // Test the HTTP endpoint
    try {
      const response = await fetch('http://127.0.0.1:3003/mcp');
      const data = await response.json();
      console.log('✅ HTTP endpoint test successful:');
      console.log(JSON.stringify(data, null, 2));
    } catch (fetchError) {
      console.log('⚠️  HTTP endpoint test failed (this is expected if fetch is not available)');
    }

    console.log('\\n🔧 Available Meta-Tools:');
    console.log('- list-api-endpoints: List all available API endpoints');
    console.log('- get-api-endpoint-schema: Get schema for specific endpoints');
    console.log('- invoke-api-endpoint: Directly invoke any endpoint');

    console.log('\\n📋 Example Claude Desktop Configuration:');
    console.log(JSON.stringify({
      mcpServers: {
        "petstore-api": {
          command: "npx",
          args: [
            "ts-node", 
            "examples/http-filtering.ts"
          ]
        }
      }
    }, null, 2));

    console.log('\\n🔍 Example curl commands to test HTTP transport:');
    console.log('# Get server status:');
    console.log('curl http://127.0.0.1:3003/mcp');
    console.log('\\n# Initialize MCP session:');
    console.log('curl -X POST http://127.0.0.1:3003/mcp \\\\');
    console.log('  -H "Content-Type: application/json" \\\\');
    console.log('  -d \'{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl-client","version":"1.0.0"}}}\'');

    // Keep the server running
    console.log('\\n⏳ Server is running... Press Ctrl+C to stop');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Shutting down server...');
      await server.stop();
      console.log('✅ Server stopped');
      process.exit(0);
    });

    // Keep process alive
    await new Promise(() => {}); // Keep running indefinitely

  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  httpExample().catch(console.error);
}