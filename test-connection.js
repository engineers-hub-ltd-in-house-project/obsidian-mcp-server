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

console.log('🔧 Obsidian MCP Server Connection Test');
console.log('=====================================');
console.log(`API URL: ${OBSIDIAN_API_URL}`);
console.log(`API Key: ${OBSIDIAN_API_KEY ? '✓ Set' : '✗ Not set'}`);
console.log('');

async function testConnection() {
  console.log('1️⃣ Testing basic connection...');
  try {
    const response = await fetch(`${OBSIDIAN_API_URL}/`, {
      headers: {
        'Authorization': `Bearer ${OBSIDIAN_API_KEY}`
      },
      agent: OBSIDIAN_API_URL.startsWith('https') ? httpsAgent : undefined
    });
    
    if (response.ok) {
      console.log('✅ Successfully connected to Obsidian!');
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log(`❌ Connection failed: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log('Error:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure Obsidian is running on Windows');
    console.log('2. Check that Local REST API plugin is enabled');
    console.log('3. In Local REST API settings, enable "Listen on all interfaces"');
    console.log('4. Check Windows Firewall settings for port 27124');
    console.log('5. Try using Windows IP directly (ipconfig on Windows to check)');
    return false;
  }
}

async function testNoteCreation() {
  console.log('\n2️⃣ Testing note creation...');
  const testPath = 'Test/mcp-test-note.md';
  const testContent = `# MCP Test Note

This note was created by the Obsidian MCP Server test script.

Created at: ${new Date().toISOString()}

## Test Content

- ✅ Connection successful
- ✅ Note creation working
- 🎉 Ready to use!

## System Info

- Running from: WSL2 Ubuntu
- Connected to: Windows 11 Obsidian
- API URL: ${OBSIDIAN_API_URL}
`;

  try {
    const response = await fetch(`${OBSIDIAN_API_URL}/vault/${encodeURIComponent(testPath)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${OBSIDIAN_API_KEY}`,
        'Content-Type': 'text/markdown'
      },
      body: testContent,
      agent: OBSIDIAN_API_URL.startsWith('https') ? httpsAgent : undefined
    });

    if (response.ok) {
      console.log('✅ Successfully created test note!');
      console.log(`Path: ${testPath}`);
      return true;
    } else {
      console.log(`❌ Note creation failed: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log('Error:', error);
      return false;
    }
  } catch (error) {
    console.log('❌ Note creation failed:', error.message);
    return false;
  }
}

async function testNoteReading() {
  console.log('\n3️⃣ Testing note reading...');
  const testPath = 'Test/mcp-test-note.md';
  
  try {
    const response = await fetch(`${OBSIDIAN_API_URL}/vault/${encodeURIComponent(testPath)}`, {
      headers: {
        'Authorization': `Bearer ${OBSIDIAN_API_KEY}`
      },
      agent: OBSIDIAN_API_URL.startsWith('https') ? httpsAgent : undefined
    });

    if (response.ok) {
      console.log('✅ Successfully read test note!');
      const content = await response.text();
      console.log('First 100 chars:', content.substring(0, 100) + '...');
      return true;
    } else {
      console.log(`❌ Note reading failed: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Note reading failed:', error.message);
    return false;
  }
}

async function main() {
  const connected = await testConnection();
  
  if (connected) {
    await testNoteCreation();
    await testNoteReading();
    console.log('\n🎉 All tests completed!');
  } else {
    console.log('\n❌ Cannot proceed without connection');
  }
}

main().catch(console.error);