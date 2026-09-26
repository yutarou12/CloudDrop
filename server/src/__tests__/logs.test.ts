process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../index.js';
import { CONFIG } from '../config.js';
import { initDatabase, getLogs, clearAllLogs } from '../db/database.js';
import { initStorage } from '../services/storage.js';
import { parseUserAgent } from '../services/device.js';

describe('Logs and Device Tracking Tests', () => {
  let server: any;
  const testDir = path.join(os.tmpdir(), `fts_logs_test_${Date.now()}`);

  before(async () => {
    CONFIG.STORAGE_DIR = path.join(testDir, 'files');
    CONFIG.DB_PATH = path.join(testDir, 'metadata.db');

    await fs.mkdir(CONFIG.STORAGE_DIR, { recursive: true });
    initDatabase();
    initStorage();

    server = await createServer();
    await server.ready();
  });

  after(async () => {
    if (server) {
      await server.close();
    }
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  it('parseUserAgent が各種デバイスとブラウザを正しく判定すること', () => {
    const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    assert.equal(parseUserAgent(iphoneUA), 'iPhone (Safari)');

    const winChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    assert.equal(parseUserAgent(winChromeUA), 'Windows PC (Chrome)');

    const macSafariUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15';
    assert.equal(parseUserAgent(macSafariUA), 'Mac (Safari)');

    const winEdgeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0';
    assert.equal(parseUserAgent(winEdgeUA), 'Windows PC (Edge)');

    assert.equal(parseUserAgent(undefined), '不明な端末');
  });

  it('ファイル操作（アップロード・DL・削除）の履歴が logs テーブルおよび GET /api/logs に記録されること', async () => {
    clearAllLogs();

    const boundary = '----WebKitFormBoundaryLoggingTest';
    const fileContent = 'Log Test Content';
    const body = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="log_target.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--\r\n`;

    const userAgentHeader = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    // 1. アップロード
    const uploadRes = await server.inject({
      method: 'POST',
      url: '/api/files',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'user-agent': userAgentHeader,
        'x-forwarded-for': '192.168.1.50',
      },
      payload: body,
    });
    assert.equal(uploadRes.statusCode, 201);
    const uploadedFile = JSON.parse(uploadRes.body);

    // 2. ダウンロード
    const dlRes = await server.inject({
      method: 'GET',
      url: `/api/files/${uploadedFile.id}/download`,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'x-forwarded-for': '192.168.1.100',
      },
    });
    assert.equal(dlRes.statusCode, 200);

    // 3. 削除
    const delRes = await server.inject({
      method: 'DELETE',
      url: `/api/files/${uploadedFile.id}`,
      headers: {
        'user-agent': userAgentHeader,
        'x-forwarded-for': '192.168.1.50',
      },
    });
    assert.equal(delRes.statusCode, 204);

    // 4. GET /api/logs で検証
    const logsRes = await server.inject({
      method: 'GET',
      url: '/api/logs',
    });
    assert.equal(logsRes.statusCode, 200);
    const { logs } = JSON.parse(logsRes.body);

    assert.equal(logs.length, 3);

    // 新しい順: delete -> download -> upload
    assert.equal(logs[0].action, 'delete');
    assert.equal(logs[0].fileName, 'log_target.txt');
    assert.equal(logs[0].clientIp, '192.168.1.50');
    assert.equal(logs[0].deviceInfo, 'iPhone (Safari)');

    assert.equal(logs[1].action, 'download');
    assert.equal(logs[1].fileName, 'log_target.txt');
    assert.equal(logs[1].clientIp, '192.168.1.100');
    assert.equal(logs[1].deviceInfo, 'Windows PC (Chrome)');

    assert.equal(logs[2].action, 'upload');
    assert.equal(logs[2].fileName, 'log_target.txt');
    assert.equal(logs[2].clientIp, '192.168.1.50');
    assert.equal(logs[2].deviceInfo, 'iPhone (Safari)');
  });

  it('DELETE /api/logs で履歴をクリアできること', async () => {
    const clearRes = await server.inject({
      method: 'DELETE',
      url: '/api/logs',
    });
    assert.equal(clearRes.statusCode, 204);

    const getRes = await server.inject({
      method: 'GET',
      url: '/api/logs',
    });
    const { logs } = JSON.parse(getRes.body);
    assert.equal(logs.length, 0);
  });
});
