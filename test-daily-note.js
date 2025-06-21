#!/usr/bin/env node

import fetch from 'node-fetch';
import https from 'https';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const OBSIDIAN_API_URL = process.env.OBSIDIAN_API_URL;
const OBSIDIAN_API_KEY = process.env.OBSIDIAN_API_KEY;

// HTTPS agent that ignores self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

console.log('📅 Daily Note Test');
console.log('==================');

async function testDailyNote() {
  const today = new Date().toISOString().split('T')[0];
  const dailyPath = `Daily Notes/${today}.md`;
  
  console.log(`Testing daily note: ${dailyPath}`);
  
  // First, try to read existing daily note
  let existingContent = '';
  try {
    const readResponse = await fetch(`${OBSIDIAN_API_URL}/vault/${encodeURIComponent(dailyPath)}`, {
      headers: {
        'Authorization': `Bearer ${OBSIDIAN_API_KEY}`
      },
      agent: httpsAgent
    });
    
    if (readResponse.ok) {
      existingContent = await readResponse.text();
      console.log('✅ Found existing daily note');
    } else {
      existingContent = `# ${today}\n\n## Notes\n\n`;
      console.log('📝 Creating new daily note');
    }
  } catch (error) {
    existingContent = `# ${today}\n\n## Notes\n\n`;
    console.log('📝 Creating new daily note');
  }
  
  // Add new content with timestamp
  const timestamp = new Date().toLocaleTimeString();
  const newEntry = `## ${timestamp} - MCP Test Entry

This entry was added by the Obsidian MCP Server test script.

- ✅ Daily note integration working
- 🔄 Automatic timestamp added
- 📝 Ready for AI-powered note taking!

---
`;
  
  const updatedContent = existingContent + '\n' + newEntry;
  
  // Write updated content
  try {
    const writeResponse = await fetch(`${OBSIDIAN_API_URL}/vault/${encodeURIComponent(dailyPath)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${OBSIDIAN_API_KEY}`,
        'Content-Type': 'text/markdown'
      },
      body: updatedContent,
      agent: httpsAgent
    });
    
    if (writeResponse.ok) {
      console.log('✅ Successfully updated daily note!');
      console.log(`📍 Location: ${dailyPath}`);
      console.log(`⏰ Timestamp: ${timestamp}`);
    } else {
      console.log('❌ Failed to update daily note');
    }
  } catch (error) {
    console.log('❌ Error updating daily note:', error.message);
  }
}

testDailyNote().catch(console.error);