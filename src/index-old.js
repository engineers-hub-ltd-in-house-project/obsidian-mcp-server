import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import https from 'https';
import winston from 'winston';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuration
const OBSIDIAN_API_URL = process.env.OBSIDIAN_API_URL || 'http://localhost:27123';
const OBSIDIAN_API_KEY = process.env.OBSIDIAN_API_KEY;
const VAULT_PATH = process.env.VAULT_PATH;
const GIT_AUTO_SYNC = process.env.GIT_AUTO_SYNC === 'true';

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Helper function for Git operations
async function gitSync(commitMessage) {
  if (!GIT_AUTO_SYNC || !VAULT_PATH) {
    logger.info('Git sync skipped (disabled or no vault path)');
    return;
  }

  try {
    execSync('git add .', { cwd: VAULT_PATH, encoding: 'utf-8' });
    execSync(`git commit -m "${commitMessage}"`, { cwd: VAULT_PATH, encoding: 'utf-8' });
    execSync('git push', { cwd: VAULT_PATH, encoding: 'utf-8' });
    logger.info(`Git sync completed: ${commitMessage}`);
  } catch (error) {
    if (error.message.includes('nothing to commit')) {
      logger.debug('No changes to commit');
    } else {
      logger.error('Git sync failed:', error.message);
      throw error;
    }
  }
}

// Create HTTPS agent that ignores self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Helper function for Obsidian API requests
async function obsidianRequest(path, options = {}) {
  const url = `${OBSIDIAN_API_URL}${path}`;
  const headers = {
    'Authorization': `Bearer ${OBSIDIAN_API_KEY}`,
    ...options.headers
  };

  logger.debug(`Obsidian API request: ${options.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers,
    agent: url.startsWith('https') ? httpsAgent : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Obsidian API error: ${response.status} - ${error}`);
  }

  return response;
}

// Create MCP server
const server = new Server(
  {
    name: 'obsidian-server',
    vendor: 'engineers-hub',
    version: '1.0.0',
    description: 'MCP server for Obsidian integration with Local REST API and Git sync'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Tool: Create Note
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'createNote': {
      const { title, content, folder = 'Notes' } = args;
      
      if (!title || !content) {
        throw new Error('Title and content are required');
      }

      const path = `${folder}/${title}.md`;
      logger.info(`Creating note: ${path}`);

      try {
        await obsidianRequest(`/vault/${encodeURIComponent(path)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/markdown'
          },
          body: content
        });

        await gitSync(`Add note: ${title}`);

        return {
          content: [{
            type: 'text',
            text: `Note created successfully: ${path}`
          }]
        };
      } catch (error) {
        logger.error('Failed to create note:', error);
        throw error;
      }
    }

    case 'appendToDaily': {
      const { content, timestamp = true } = args;
      
      if (!content) {
        throw new Error('Content is required');
      }

      const today = new Date().toISOString().split('T')[0];
      const path = `Daily Notes/${today}.md`;
      
      logger.info(`Appending to daily note: ${path}`);

      try {
        // Try to get existing daily note
        let currentContent = `# ${today}\n\n`;
        try {
          const response = await obsidianRequest(`/vault/${encodeURIComponent(path)}`);
          currentContent = await response.text();
        } catch (error) {
          logger.debug('Daily note does not exist yet, creating new one');
        }

        // Add timestamp if requested
        const timeStr = timestamp 
          ? `## ${new Date().toLocaleTimeString()}\n\n` 
          : '';
        
        const newContent = currentContent + '\n\n' + timeStr + content;

        await obsidianRequest(`/vault/${encodeURIComponent(path)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/markdown'
          },
          body: newContent
        });

        await gitSync(`Update daily note: ${today}`);

        return {
          content: [{
            type: 'text',
            text: `Daily note updated: ${path}`
          }]
        };
      } catch (error) {
        logger.error('Failed to update daily note:', error);
        throw error;
      }
    }

    case 'searchNotes': {
      const { query, limit = 10 } = args;
      
      if (!query) {
        throw new Error('Query is required');
      }

      logger.info(`Searching notes: ${query}`);

      try {
        const response = await obsidianRequest(`/search/simple?query=${encodeURIComponent(query)}`);
        const results = await response.json();
        
        // Limit results
        const limitedResults = results.slice(0, limit);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(limitedResults, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Failed to search notes:', error);
        throw error;
      }
    }

    case 'readNote': {
      const { path } = args;
      
      if (!path) {
        throw new Error('Path is required');
      }

      logger.info(`Reading note: ${path}`);

      try {
        const response = await obsidianRequest(`/vault/${encodeURIComponent(path)}`);
        const content = await response.text();

        return {
          content: [{
            type: 'text',
            text: content
          }]
        };
      } catch (error) {
        logger.error('Failed to read note:', error);
        throw error;
      }
    }

    case 'updateNote': {
      const { path, content } = args;
      
      if (!path || !content) {
        throw new Error('Path and content are required');
      }

      logger.info(`Updating note: ${path}`);

      try {
        await obsidianRequest(`/vault/${encodeURIComponent(path)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'text/markdown'
          },
          body: content
        });

        await gitSync(`Update note: ${path}`);

        return {
          content: [{
            type: 'text',
            text: `Note updated successfully: ${path}`
          }]
        };
      } catch (error) {
        logger.error('Failed to update note:', error);
        throw error;
      }
    }

    case 'deleteNote': {
      const { path } = args;
      
      if (!path) {
        throw new Error('Path is required');
      }

      logger.info(`Deleting note: ${path}`);

      try {
        await obsidianRequest(`/vault/${encodeURIComponent(path)}`, {
          method: 'DELETE'
        });

        await gitSync(`Delete note: ${path}`);

        return {
          content: [{
            type: 'text',
            text: `Note deleted successfully: ${path}`
          }]
        };
      } catch (error) {
        logger.error('Failed to delete note:', error);
        throw error;
      }
    }

    case 'listNotes': {
      const { folder = '/' } = args;

      logger.info(`Listing notes in: ${folder}`);

      try {
        const response = await obsidianRequest(`/vault/${encodeURIComponent(folder)}`);
        const files = await response.json();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(files, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Failed to list notes:', error);
        throw error;
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// List available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'createNote',
        description: 'Create a new note in Obsidian',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Note title (without .md extension)' },
            content: { type: 'string', description: 'Note content in Markdown format' },
            folder: { type: 'string', description: 'Folder path (default: Notes)' }
          },
          required: ['title', 'content']
        }
      },
      {
        name: 'appendToDaily',
        description: 'Append content to today\'s daily note',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Content to append' },
            timestamp: { type: 'boolean', description: 'Add timestamp before content (default: true)' }
          },
          required: ['content']
        }
      },
      {
        name: 'searchNotes',
        description: 'Search notes by query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum results (default: 10)' }
          },
          required: ['query']
        }
      },
      {
        name: 'readNote',
        description: 'Read a note\'s content',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Note path (e.g., Notes/MyNote.md)' }
          },
          required: ['path']
        }
      },
      {
        name: 'updateNote',
        description: 'Update an existing note',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Note path' },
            content: { type: 'string', description: 'New content' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'deleteNote',
        description: 'Delete a note',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Note path' }
          },
          required: ['path']
        }
      },
      {
        name: 'listNotes',
        description: 'List notes in a folder',
        inputSchema: {
          type: 'object',
          properties: {
            folder: { type: 'string', description: 'Folder path (default: /)' }
          }
        }
      }
    ]
  };
});

// Start server
async function main() {
  // Validate configuration
  if (!OBSIDIAN_API_KEY) {
    logger.error('OBSIDIAN_API_KEY is required');
    process.exit(1);
  }

  if (GIT_AUTO_SYNC && !VAULT_PATH) {
    logger.error('VAULT_PATH is required when GIT_AUTO_SYNC is enabled');
    process.exit(1);
  }

  // Test Obsidian connection
  try {
    await obsidianRequest('/');
    logger.info('Successfully connected to Obsidian Local REST API');
  } catch (error) {
    logger.error('Failed to connect to Obsidian:', error.message);
    logger.error('Make sure Obsidian is running and Local REST API plugin is enabled');
    process.exit(1);
  }

  // Test Git repository if auto-sync is enabled
  if (GIT_AUTO_SYNC) {
    try {
      execSync('git status', { cwd: VAULT_PATH, encoding: 'utf-8' });
      logger.info('Git repository verified');
    } catch (error) {
      logger.error('Git repository not found or not initialized:', error.message);
      process.exit(1);
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('Obsidian MCP server started');
}

main().catch((error) => {
  logger.error('Server error:', error);
  process.exit(1);
});