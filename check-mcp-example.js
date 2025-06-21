// Quick test to understand MCP SDK structure
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server(
  {
    name: 'test-server',
    vendor: 'test',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Check available methods
console.log('Server methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(server)));
console.log('Server object:', server);