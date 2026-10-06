process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../index.js';
import { CONFIG } from '../config.js';
import { initDatabase, createLink, getActiveLinks } from '../db/database.js';
import { cleanupExpiredFiles } from '../services/cleanup.js';

describe('Link sharing', () => {
  let server: Awaited<ReturnType<typeof createServer>>;
  let db: ReturnType<typeof initDatabase>;
  let testDir: string;
  before(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fts-links-'));
    CONFIG.DB_PATH = path.join(testDir, 'metadata.db');
    db = initDatabase();
    server = await createServer();
  });
  after(async () => {
    await server.close();
    db.close();
    await fs.rm(testDir, { recursive: true, force: true });
  });
  it('stores a URL for exactly 24 hours and supports listing and deletion', async () => {
    const response = await server.inject({ method: 'POST', url: '/api/links', payload: { url: '  https://example.com/a?b=1  ' } });
    assert.equal(response.statusCode, 201);
    const link = response.json();
    assert.equal(link.url, 'https://example.com/a?b=1');
    assert.equal(Date.parse(link.expiresAt) - Date.parse(link.createdAt), 86400000);
    const list = await server.inject({ method: 'GET', url: '/api/links' });
    assert.deepEqual(list.json().links, [link]);
    assert.equal((await server.inject({ method: 'DELETE', url: `/api/links/${link.id}` })).statusCode, 204);
    assert.equal((await server.inject({ method: 'GET', url: '/api/links' })).json().links.length, 0);
  });
  it('rejects malformed URLs, unsafe protocols, and invalid bodies', async () => {
    for (const payload of [{ url: 'javascript:alert(1)' }, { url: 'file:///etc/passwd' }, { url: 'not a url' }, { url: '' }, {}, { url: 5 }, { url: 'https://example.com/' + 'a'.repeat(8192) }]) {
      assert.equal((await server.inject({ method: 'POST', url: '/api/links', payload })).statusCode, 400);
    }
  });
  it('hides expired links immediately and deletes them during scheduled cleanup', async () => {
    const now = new Date().toISOString();
    createLink({ id: 'expired', url: 'https://example.com', createdAt: '2020-01-01T00:00:00.000Z', expiresAt: now });
    createLink({ id: 'active', url: 'https://example.com', createdAt: now, expiresAt: new Date(Date.now() + 86400000).toISOString() });
    assert.deepEqual(getActiveLinks(now).map((link) => link.id), ['active']);
    assert.deepEqual((await server.inject({ method: 'GET', url: '/api/links' })).json().links.map((link: { id: string }) => link.id), ['active']);
    await cleanupExpiredFiles();
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM links WHERE id = ?').get('expired').count, 0);
    assert.equal(getActiveLinks(now).length, 1);
  });
});
