import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG } from './config.js';
import { initDatabase } from './db/database.js';
import { initStorage } from './services/storage.js';
import { cleanupOrphanedFiles, cleanupExpiredFiles, startCleanupSchedule, stopCleanupSchedule } from './services/cleanup.js';
import { filesRoutes } from './routes/files.js';
import { healthRoutes, getLocalIpAddress } from './routes/health.js';
import { logsRoutes } from './routes/logs.js';

export async function createServer() {
  const server = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
    // ファイルアップロードのタイムアウトやボディ制限
    bodyLimit: CONFIG.MAX_FILE_SIZE + 1024 * 1024,
  });

  // CORS登録
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  });

  // マルチパートアップロード登録
  await server.register(multipart, {
    limits: {
      fileSize: CONFIG.MAX_FILE_SIZE,
      files: 1, // 1リクエストにつき1ファイル（複数ファイルはフロントエンドが順次または並列リクエスト）
    },
  });

  // APIルート登録
  await server.register(filesRoutes, { prefix: '/api' });
  await server.register(healthRoutes, { prefix: '/api' });
  await server.register(logsRoutes, { prefix: '/api' });

  // 本番環境用：クライアント静的ファイル配信
  if (fs.existsSync(CONFIG.CLIENT_DIST_DIR)) {
    await server.register(fastifyStatic, {
      root: CONFIG.CLIENT_DIST_DIR,
      prefix: '/',
    });

    // SPAフォールバック：未一致のGETリクエストには index.html を返す
    server.setNotFoundHandler((request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        return reply.status(404).send({
          code: 'NOT_FOUND',
          message: '指定されたAPIエンドポイントは存在しません。',
        });
      }
      return reply.sendFile('index.html');
    });
  }

  return server;
}

export async function main() {
  console.log('--- ローカルファイル転送サービス起動中 ---');

  // 1. DB & ストレージ初期化
  initDatabase();
  initStorage();

  // 2. 起動時クリーンアップ
  console.log('起動時クリーンアップを実行中...');
  await cleanupOrphanedFiles();
  const cleaned = await cleanupExpiredFiles();
  if (cleaned > 0) {
    console.log(`期限切れファイル ${cleaned} 件を削除しました。`);
  }

  // 3. 定期クリーンアップスケジューラ開始
  startCleanupSchedule();

  // 4. サーバー起動
  const server = await createServer();

  try {
    await server.listen({ port: CONFIG.PORT, host: CONFIG.HOST });
    const localIp = getLocalIpAddress();

    console.log('====================================================');
    console.log(` サーバーが正常に起動しました！`);
    console.log(` ローカル利用:     http://localhost:${CONFIG.PORT}`);
    console.log(` 同一LAN内の端末:  http://${localIp}:${CONFIG.PORT}`);
    console.log(` 保存期間:         ${CONFIG.EXPIRE_SECONDS / 60} 分`);
    console.log(` 1ファイル上限:    ${CONFIG.MAX_FILE_SIZE / (1024 * 1024)} MiB`);
    console.log(` 全体保存上限:     ${CONFIG.MAX_TOTAL_SIZE / (1024 * 1024 * 1024)} GiB`);
    console.log('====================================================');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }

  // グレースフルシャットダウン
  const shutdown = async () => {
    console.log('\nシャットダウン処理を実行中...');
    stopCleanupSchedule();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// 直接実行された場合のみ起動（テスト等でのimport時は起動しない）
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (entryFilePath && (entryFilePath === currentFilePath || entryFilePath.endsWith('index.ts') || entryFilePath.endsWith('index.js'))) {
  if (process.env.NODE_ENV !== 'test') {
    main().catch(console.error);
  }
}

