import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { getActiveFiles, getFileById, addLogRecord } from '../db/database.js';
import { toFileSummary } from '../types.js';
import { saveUploadedStream, removeStoredFile, getFilePath, fileExists, StorageLimitError } from '../services/storage.js';
import { registerSseClient, unregisterSseClient, broadcastFileChange } from '../services/events.js';
import { parseUserAgent } from '../services/device.js';

export function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || '127.0.0.1';
}

export function makeContentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"');
  const encodedName = encodeURIComponent(filename).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`;
}

export const filesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // GET /api/files - 有効なファイル一覧取得
  fastify.get('/files', async (_request, reply) => {
    const nowIso = new Date().toISOString();
    const records = getActiveFiles(nowIso);
    const files = records.map(toFileSummary);
    return reply.status(200).send({ files });
  });

  // POST /api/files - ファイル1件アップロード
  fastify.post('/files', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          code: 'BAD_REQUEST',
          message: 'アップロードするファイルが指定されていません。',
        });
      }

      const originalName = data.filename || 'unnamed';
      const clientMime = data.mimetype;

      const record = await saveUploadedStream(data.file, originalName, clientMime);

      // ログ記録
      const clientIp = getClientIp(request);
      const userAgent = request.headers['user-agent'] || '';
      const deviceInfo = parseUserAgent(userAgent);
      addLogRecord('upload', record.original_name, clientIp, userAgent, deviceInfo, record.id, record.size_bytes);

      // 全クライアントへリアルタイム更新通知
      broadcastFileChange('created');

      return reply.status(201).send(toFileSummary(record));
    } catch (err: any) {
      if (err instanceof StorageLimitError) {
        return reply.status(err.statusCode).send({
          code: err.code,
          message: err.message,
        });
      }
      request.log.error(err);
      return reply.status(500).send({
        code: 'INTERNAL_ERROR',
        message: 'ファイルの保存中にサーバーエラーが発生しました。',
      });
    }
  });

  // GET /api/files/:id/download - ファイルダウンロード
  fastify.get<{ Params: { id: string } }>('/files/:id/download', async (request, reply) => {
    const { id } = request.params;
    const record = getFileById(id);

    if (!record) {
      return reply.status(404).send({
        code: 'FILE_NOT_FOUND',
        message: 'ファイルが見つかりません。',
      });
    }

    const nowIso = new Date().toISOString();
    if (record.expires_at <= nowIso || record.status !== 'ready') {
      return reply.status(410).send({
        code: 'EXPIRED',
        message: 'ファイルの保存期限（1時間）が切れました。',
      });
    }

    if (!fileExists(record.stored_name)) {
      return reply.status(404).send({
        code: 'FILE_NOT_FOUND',
        message: '実ファイルが存在しません。',
      });
    }

    const filePath = getFilePath(record.stored_name);
    const disposition = makeContentDisposition(record.original_name);

    // ログ記録
    const clientIp = getClientIp(request);
    const userAgent = request.headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(userAgent);
    addLogRecord('download', record.original_name, clientIp, userAgent, deviceInfo, record.id, record.size_bytes);

    reply.raw.setHeader('Content-Disposition', disposition);
    reply.raw.setHeader('Content-Type', 'application/octet-stream');
    reply.raw.setHeader('X-Content-Type-Options', 'nosniff');
    reply.raw.setHeader('Content-Length', record.size_bytes.toString());

    const readStream = fs.createReadStream(filePath);
    return reply.send(readStream);
  });

  // GET /api/files/:id/preview - 画像プレビュー
  fastify.get<{ Params: { id: string } }>('/files/:id/preview', async (request, reply) => {
    const { id } = request.params;
    const record = getFileById(id);

    if (!record) {
      return reply.status(404).send({
        code: 'FILE_NOT_FOUND',
        message: 'ファイルが見つかりません。',
      });
    }

    const nowIso = new Date().toISOString();
    if (record.expires_at <= nowIso || record.status !== 'ready') {
      return reply.status(410).send({
        code: 'EXPIRED',
        message: 'ファイルの保存期限が切れました。',
      });
    }

    if (record.previewable !== 1) {
      return reply.status(415).send({
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'このファイル形式はプレビューに対応していません。',
      });
    }

    if (!fileExists(record.stored_name)) {
      return reply.status(404).send({
        code: 'FILE_NOT_FOUND',
        message: '実ファイルが存在しません。',
      });
    }

    const filePath = getFilePath(record.stored_name);

    reply.raw.setHeader('Content-Type', record.mime_type);
    reply.raw.setHeader('X-Content-Type-Options', 'nosniff');
    reply.raw.setHeader('Cache-Control', 'public, max-age=3600');

    const readStream = fs.createReadStream(filePath);
    return reply.send(readStream);
  });

  // DELETE /api/files/:id - 手動削除
  fastify.delete<{ Params: { id: string } }>('/files/:id', async (request, reply) => {
    const { id } = request.params;
    const record = getFileById(id);

    if (record) {
      await removeStoredFile(record.stored_name, id);

      // ログ記録
      const clientIp = getClientIp(request);
      const userAgent = request.headers['user-agent'] || '';
      const deviceInfo = parseUserAgent(userAgent);
      addLogRecord('delete', record.original_name, clientIp, userAgent, deviceInfo, record.id, record.size_bytes);

      // 全クライアントへリアルタイム削除通知
      broadcastFileChange('deleted');
    }

    return reply.status(204).send();
  });

  // GET /api/events - Server-Sent Events (SSE) によるリアルタイム更新通知
  fastify.get('/events', (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    reply.raw.flushHeaders();

    // 初回接続確認用イベント
    reply.raw.write('event: connected\ndata: {"status":"connected"}\n\n');

    const clientId = crypto.randomUUID();
    registerSseClient(clientId, reply);

    // キープアライブ用Ping (20秒ごと)
    const pingTimer = setInterval(() => {
      try {
        reply.raw.write(': ping\n\n');
      } catch {
        clearInterval(pingTimer);
        unregisterSseClient(clientId);
      }
    }, 20000);

    // クライアント切断時
    request.raw.on('close', () => {
      clearInterval(pingTimer);
      unregisterSseClient(clientId);
    });
  });
};
