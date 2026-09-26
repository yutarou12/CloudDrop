import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { CONFIG } from '../config.js';
import { FileRecord } from '../types.js';
import { createFile, getTotalActiveSize, deleteFileById } from '../db/database.js';
import { inspectImageHeader } from './mime.js';

export class StorageLimitError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * ファイル名をサニタイズ（制御文字、ヌルバイト、パス区切り文字を除去）
 */
export function sanitizeFilename(filename: string): string {
  // パス区切り文字（/や\）をアンダースコアに置換、制御文字・NULL文字を除去
  const cleaned = filename
    .replace(/[/\\]/g, '_')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();

  return cleaned.length > 0 ? cleaned : 'unnamed_file';
}

/**
 * 保存先ディレクトリを初期化
 */
export function initStorage(): void {
  if (!fs.existsSync(CONFIG.STORAGE_DIR)) {
    fs.mkdirSync(CONFIG.STORAGE_DIR, { recursive: true });
  }
}

/**
 * 実ファイルのフルパスを取得
 */
export function getFilePath(storedName: string): string {
  return path.resolve(CONFIG.STORAGE_DIR, storedName);
}

/**
 * ファイルが存在するか確認
 */
export function fileExists(storedName: string): boolean {
  return fs.existsSync(getFilePath(storedName));
}

/**
 * ストリーミング形式でアップロードファイルを一時ファイルへ書き込み、制限検査後に本保存
 */
export async function saveUploadedStream(
  stream: NodeJS.ReadableStream,
  rawOriginalName: string,
  clientMimeType?: string
): Promise<FileRecord> {
  initStorage();

  const id = crypto.randomUUID();
  const originalName = sanitizeFilename(rawOriginalName);
  const tempStoredName = `temp_${id}.bin`;
  const tempFilePath = getFilePath(tempStoredName);
  const finalStoredName = `${id}.bin`;
  const finalFilePath = getFilePath(finalStoredName);

  let bytesWritten = 0;
  let hasError = false;

  // 全体容量の事前チェック
  const nowIso = new Date().toISOString();
  const currentTotalActiveSize = getTotalActiveSize(nowIso);
  if (currentTotalActiveSize >= CONFIG.MAX_TOTAL_SIZE) {
    throw new StorageLimitError('サーバーの合計保存容量（5 GiB）を超過しています', 507, 'STORAGE_FULL');
  }

  // サイズ計測および制限監視用のTransformストリーム
  const sizeMonitor = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytesWritten += chunk.length;
      if (bytesWritten > CONFIG.MAX_FILE_SIZE) {
        callback(
          new StorageLimitError(
            `ファイルサイズが制限（${CONFIG.MAX_FILE_SIZE / (1024 * 1024)} MiB）を超えています`,
            413,
            'FILE_TOO_LARGE'
          )
        );
        return;
      }

      if (currentTotalActiveSize + bytesWritten > CONFIG.MAX_TOTAL_SIZE) {
        callback(
          new StorageLimitError(
            'サーバーの合計保存容量（5 GiB）を超過しました',
            507,
            'STORAGE_FULL'
          )
        );
        return;
      }

      callback(null, chunk);
    },
  });

  const writeStream = fs.createWriteStream(tempFilePath, { flags: 'w' });

  try {
    await pipeline(stream, sizeMonitor, writeStream);

    // 画像マジックバイト検査
    const inspection = await inspectImageHeader(tempFilePath);

    // 一時ファイルから正規ファイル名へアトミックリネーム
    await fsp.rename(tempFilePath, finalFilePath);

    const uploadedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + CONFIG.EXPIRE_SECONDS * 1000).toISOString();

    const record: FileRecord = {
      id,
      original_name: originalName,
      stored_name: finalStoredName,
      size_bytes: bytesWritten,
      mime_type: inspection.verifiedMime || clientMimeType || 'application/octet-stream',
      previewable: inspection.previewable ? 1 : 0,
      uploaded_at: uploadedAt,
      expires_at: expiresAt,
      status: 'ready',
    };

    createFile(record);
    return record;
  } catch (err) {
    hasError = true;
    // 一時ファイル削除
    await fsp.unlink(tempFilePath).catch(() => {});
    await fsp.unlink(finalFilePath).catch(() => {});
    throw err;
  } finally {
    if (hasError) {
      await fsp.unlink(tempFilePath).catch(() => {});
    }
  }
}

/**
 * ファイル本体およびDBから削除
 */
export async function removeStoredFile(storedName: string, id: string): Promise<void> {
  const filePath = getFilePath(storedName);
  try {
    await fsp.unlink(filePath).catch((err: any) => {
      if (err.code !== 'ENOENT') {
        console.error(`ファイル削除エラー (${filePath}):`, err);
      }
    });
  } finally {
    deleteFileById(id);
  }
}
