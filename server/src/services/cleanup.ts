import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG } from '../config.js';
import { getExpiredFiles, getAllFileRecords, deleteFileById, cleanupExpiredLinks } from '../db/database.js';
import { getFilePath, removeStoredFile } from './storage.js';
import { broadcastFileChange } from './events.js';

let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * 期限切れファイルを走査して削除
 */
export async function cleanupExpiredFiles(): Promise<number> {
  const nowIso = new Date().toISOString();
  cleanupExpiredLinks(nowIso);
  const expired = getExpiredFiles(nowIso);
  let cleanedCount = 0;

  for (const record of expired) {
    try {
      await removeStoredFile(record.stored_name, record.id);
      cleanedCount++;
    } catch (err) {
      console.error(`期限切れファイル削除失敗 (${record.id}, ${record.stored_name}):`, err);
      // 次回走査で再試行
    }
  }

  if (cleanedCount > 0) {
    broadcastFileChange('expired');
  }

  return cleanedCount;
}

/**
 * サーバー起動時の孤立ファイル・一時ファイルの掃除とDB整合性回復
 */
export async function cleanupOrphanedFiles(): Promise<void> {
  try {
    const filesInDir = await fs.readdir(CONFIG.STORAGE_DIR);
    const dbRecords = getAllFileRecords();
    const dbStoredNames = new Set(dbRecords.map((r) => r.stored_name));

    // 1. 一時ファイル (temp_*) の削除、およびDBに存在しない孤立ファイルの削除
    for (const file of filesInDir) {
      if (file === '.gitkeep') continue;

      if (file.startsWith('temp_') || !dbStoredNames.has(file)) {
        const orphanPath = path.resolve(CONFIG.STORAGE_DIR, file);
        await fs.unlink(orphanPath).catch((e) => {
          console.warn(`孤立ファイル削除スキップ (${file}):`, e.message);
        });
      }
    }

    // 2. 実ファイルが存在しないDBレコードの掃除
    for (const record of dbRecords) {
      const filePath = getFilePath(record.stored_name);
      try {
        await fs.access(filePath);
      } catch {
        // 実ファイルが存在しないのでDBレコードを削除
        deleteFileById(record.id);
      }
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.error('起動時孤立ファイル走査エラー:', err);
    }
  }
}

/**
 * 定期クリーンアップタイマーの開始
 */
export function startCleanupSchedule(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }

  cleanupTimer = setInterval(async () => {
    try {
      const count = await cleanupExpiredFiles();
      if (count > 0) {
        console.log(`[定期削除] 期限切れファイル ${count} 件を削除しました。`);
      }
    } catch (err) {
      console.error('[定期削除] エラーが発生しました:', err);
    }
  }, CONFIG.CLEANUP_INTERVAL_MS);
}

/**
 * クリーンアップタイマーの停止
 */
export function stopCleanupSchedule(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
