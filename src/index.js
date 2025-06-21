import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { execSync } from 'child_process';
import fetch from 'node-fetch';
import https from 'https';
import winston from 'winston';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { contentTemplates, folderStructure, generateFrontmatter } from './content-tools.js';

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

// Create HTTPS agent that ignores self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
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
const server = new McpServer({
  name: 'obsidian-server',
  vendor: 'engineers-hub',
  version: '1.0.0',
  description: 'MCP server for Obsidian integration with Local REST API and Git sync'
}, {
  capabilities: {
    tools: {}
  }
});

// Tool: Create Note
server.tool(
  'createNote',
  'Create a new note in Obsidian',
  {
    title: z.string().describe('Note title (without .md extension)'),
    content: z.string().describe('Note content in Markdown format'),
    folder: z.string().optional().default('Notes').describe('Folder path (default: Notes)')
  },
  async ({ title, content, folder }) => {
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
);

// Tool: Append to Daily Note
server.tool(
  'appendToDaily',
  'Append content to today\'s daily note',
  {
    content: z.string().describe('Content to append'),
    timestamp: z.boolean().optional().default(true).describe('Add timestamp before content')
  },
  async ({ content, timestamp }) => {
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
);

// Tool: Search Notes
server.tool(
  'searchNotes',
  'Search notes by query',
  {
    query: z.string().describe('Search query'),
    limit: z.number().optional().default(10).describe('Maximum results')
  },
  async ({ query, limit }) => {
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
);

// Tool: Read Note
server.tool(
  'readNote',
  'Read a note\'s content',
  {
    path: z.string().describe('Note path (e.g., Notes/MyNote.md)')
  },
  async ({ path }) => {
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
);

// Tool: Update Note
server.tool(
  'updateNote',
  'Update an existing note',
  {
    path: z.string().describe('Note path'),
    content: z.string().describe('New content')
  },
  async ({ path, content }) => {
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
);

// Tool: Delete Note
server.tool(
  'deleteNote',
  'Delete a note',
  {
    path: z.string().describe('Note path')
  },
  async ({ path }) => {
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
);

// Tool: List Notes
server.tool(
  'listNotes',
  'List notes in a folder',
  {
    folder: z.string().optional().default('/').describe('Folder path')
  },
  async ({ folder }) => {
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
);

// Tool: Create Article
server.tool(
  'createArticle',
  'Create a structured article with metadata',
  {
    title: z.string().describe('Article title'),
    category: z.string().describe('Article category (e.g., Tech, Tutorial, Review)'),
    content: z.string().describe('Article content'),
    tags: z.array(z.string()).optional().default([]).describe('Article tags'),
    draft: z.boolean().optional().default(true).describe('Is this a draft?')
  },
  async ({ title, category, content, tags, draft }) => {
    const date = new Date().toISOString().split('T')[0];
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
    const path = `${folderStructure.articles}/${category}/${date}-${filename}`;
    
    // Generate frontmatter
    const frontmatter = generateFrontmatter({
      title,
      date: new Date().toISOString(),
      category,
      tags,
      draft,
      author: 'AI Assistant'
    });
    
    const fullContent = frontmatter + content;
    
    logger.info(`Creating article: ${path}`);

    try {
      await obsidianRequest(`/vault/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/markdown'
        },
        body: fullContent
      });

      await gitSync(`Add article: ${title}`);

      return {
        content: [{
          type: 'text',
          text: `Article created successfully: ${path}`
        }]
      };
    } catch (error) {
      logger.error('Failed to create article:', error);
      throw error;
    }
  }
);

// Tool: Create from Template
server.tool(
  'createFromTemplate',
  'Create a note from a predefined template',
  {
    templateType: z.enum(['article', 'weeklyReport', 'projectDoc']).describe('Template type'),
    title: z.string().describe('Title or name'),
    category: z.string().optional().describe('Category (for articles)')
  },
  async ({ templateType, title, category }) => {
    let content;
    let path;
    
    switch (templateType) {
      case 'article':
        content = contentTemplates.article(title, category || 'General');
        path = `${folderStructure.articles}/${category || 'General'}/${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
        break;
      case 'weeklyReport':
        const weekNumber = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000);
        content = contentTemplates.weeklyReport(weekNumber);
        path = `${folderStructure.weeklyReports}/${new Date().getFullYear()}-W${weekNumber}.md`;
        break;
      case 'projectDoc':
        content = contentTemplates.projectDoc(title);
        path = `${folderStructure.projects}/${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}/README.md`;
        break;
    }
    
    logger.info(`Creating from template: ${path}`);

    try {
      await obsidianRequest(`/vault/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/markdown'
        },
        body: content
      });

      await gitSync(`Add ${templateType}: ${title}`);

      return {
        content: [{
          type: 'text',
          text: `Created from template: ${path}`
        }]
      };
    } catch (error) {
      logger.error('Failed to create from template:', error);
      throw error;
    }
  }
);

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