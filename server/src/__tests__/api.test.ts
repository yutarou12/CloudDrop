process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../index.js';
import { CONFIG } from '../config.js';
import { initDatabase, getFileById } from '../db/database.js';
import { initStorage } from '../services/storage.js';
import { cleanupExpiredFiles } from '../services/cleanup.js';

describe('File Transfer Service API Integration Tests', () => {
  let server: any;
  const testDir = path.join(os.tmpdir(), `fts_test_${Date.now()}`);

  before(async () => {
    // テスト用の一時保存先を設定
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

  it('GET /api/health が正常に200を返すこと', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.status, 'ok');
    assert.ok(json.server.host);
    assert.ok(json.limits.maxFileSizeBytes);
  });

  it('GET /api/files ファイル0件の時に空配列を返すこと', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/files',
    });

    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.deepEqual(json.files, []);
  });

  it('POST /api/files テキストファイルをアップロードできること', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const fileContent = 'Hello World from File Transfer Service! 日本語テスト';
    const body = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="テスト文書.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--\r\n`;

    const res = await server.inject({
      method: 'POST',
      url: '/api/files',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(res.statusCode, 201);
    const json = JSON.parse(res.body);
    assert.ok(json.id);
    assert.equal(json.originalName, 'テスト文書.txt');
    assert.equal(json.sizeBytes, Buffer.byteLength(fileContent));
    assert.equal(json.previewable, false);

    // 一覧に含まれるか確認
    const listRes = await server.inject({
      method: 'GET',
      url: '/api/files',
    });
    const listJson = JSON.parse(listRes.body);
    assert.equal(listJson.files.length, 1);
    assert.equal(listJson.files[0].id, json.id);

    // ダウンロード確認
    const dlRes = await server.inject({
      method: 'GET',
      url: `/api/files/${json.id}/download`,
    });
    assert.equal(dlRes.statusCode, 200);
    assert.ok(dlRes.headers['content-disposition'].includes('filename*=UTF-8'));
    assert.equal(dlRes.body, fileContent);

    // テキストファイルに対するプレビュー要求は 415 になること
    const prevRes = await server.inject({
      method: 'GET',
      url: `/api/files/${json.id}/preview`,
    });
    assert.equal(prevRes.statusCode, 415);

    // 削除確認
    const delRes = await server.inject({
      method: 'DELETE',
      url: `/api/files/${json.id}`,
    });
    assert.equal(delRes.statusCode, 204);

    // 削除後にアクセスすると 404 になること
    const dlAfterRes = await server.inject({
      method: 'GET',
      url: `/api/files/${json.id}/download`,
    });
    assert.equal(dlAfterRes.statusCode, 404);
  });

  it('POST /api/files PNG画像をアップロードすると previewable: true になりプレビューできること', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    // 有効な最小PNGバイナリ
    const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082';
    const pngBuffer = Buffer.from(pngHex, 'hex');

    const prefix = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="sample.png"\r\n` +
      `Content-Type: image/png\r\n\r\n`
    );
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const payload = Buffer.concat([prefix, pngBuffer, suffix]);

    const res = await server.inject({
      method: 'POST',
      url: '/api/files',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: payload,
    });

    assert.equal(res.statusCode, 201);
    const json = JSON.parse(res.body);
    assert.equal(json.previewable, true);
    assert.equal(json.mimeType, 'image/png');

    // プレビュー取得
    const prevRes = await server.inject({
      method: 'GET',
      url: `/api/files/${json.id}/preview`,
    });
    assert.equal(prevRes.statusCode, 200);
    assert.equal(prevRes.headers['content-type'], 'image/png');
    assert.equal(prevRes.rawPayload.length, pngBuffer.length);
  });

  it('期限切れのファイルはAPIで410になり、自動クリーンアップで削除されること', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const body = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="expired.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `Expires soon\r\n` +
      `--${boundary}--\r\n`;

    const res = await server.inject({
      method: 'POST',
      url: '/api/files',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    assert.equal(res.statusCode, 201);
    const json = JSON.parse(res.body);

    // DBを直接操作して期限を過去にする
    const db = initDatabase();
    const pastDate = new Date(Date.now() - 10000).toISOString();
    db.prepare(`UPDATE files SET expires_at = ? WHERE id = ?`).run(pastDate, json.id);

    // 一覧に含まれないことの確認
    const listRes = await server.inject({
      method: 'GET',
      url: '/api/files',
    });
    const listJson = JSON.parse(listRes.body);
    assert.ok(!listJson.files.some((f: any) => f.id === json.id));

    // ダウンロードしようとすると 410 になること
    const dlRes = await server.inject({
      method: 'GET',
      url: `/api/files/${json.id}/download`,
    });
    assert.equal(dlRes.statusCode, 410);

    // クリーンアップ実行
    const cleaned = await cleanupExpiredFiles();
    assert.equal(cleaned, 1);

    // クリーンアップ後はレコード自体が消えていること
    const record = getFileById(json.id);
    assert.equal(record, null);
  });
});
