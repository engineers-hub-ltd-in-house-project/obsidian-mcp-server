import { test } from 'node:test';
import assert from 'node:assert';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const OBSIDIAN_API_URL = process.env.OBSIDIAN_API_URL || 'http://localhost:27123';
const OBSIDIAN_API_KEY = process.env.OBSIDIAN_API_KEY;

test('Obsidian API connection', async () => {
  if (!OBSIDIAN_API_KEY) {
    console.log('Skipping test: OBSIDIAN_API_KEY not set');
    return;
  }

  const response = await fetch(`${OBSIDIAN_API_URL}/`, {
    headers: {
      'Authorization': `Bearer ${OBSIDIAN_API_KEY}`
    }
  });

  assert.strictEqual(response.ok, true, 'API should respond successfully');
});

test('Create and read test note', async () => {
  if (!OBSIDIAN_API_KEY) {
    console.log('Skipping test: OBSIDIAN_API_KEY not set');
    return;
  }

  const testPath = 'Test/test-note.md';
  const testContent = '# Test Note\n\nThis is a test note created by the test suite.';

  // Create note
  const createResponse = await fetch(`${OBSIDIAN_API_URL}/vault/${encodeURIComponent(testPath)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${OBSIDIAN_API_KEY}`,
      'Content-Type': 'text/markdown'
    },
    body: testContent
  });

  assert.strictEqual(createResponse.ok, true, 'Note creation should succeed');

  // Read note
  const readResponse = await fetch(`${OBSIDIAN_API_URL}/vault/${encodeURIComponent(testPath)}`, {
    headers: {
      'Authorization': `Bearer ${OBSIDIAN_API_KEY}`
    }
  });

  assert.strictEqual(readResponse.ok, true, 'Note reading should succeed');
  const content = await readResponse.text();
  assert.strictEqual(content, testContent, 'Note content should match');

  // Clean up
  await fetch(`${OBSIDIAN_API_URL}/vault/${encodeURIComponent(testPath)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${OBSIDIAN_API_KEY}`
    }
  });
});