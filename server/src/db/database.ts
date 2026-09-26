import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { CONFIG } from '../config.js';
import { FileRecord, LogRecord } from '../types.js';

let db: any = null;

export function initDatabase(): any {
  if (db) return db;

  // DBディレクトリの存在確認
  const dbDir = path.dirname(CONFIG.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new DatabaseSync(CONFIG.DB_PATH);

  // WALモード有効化で並行性能向上
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');

  // テーブル作成
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      previewable INTEGER NOT NULL DEFAULT 0,
      uploaded_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ready'
    );

    CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at);
    CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      file_id TEXT,
      file_name TEXT NOT NULL,
      file_size INTEGER,
      client_ip TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      device_info TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
  `);

  return db;
}

export function createFile(record: FileRecord): void {
  const statement = db.prepare(`
    INSERT INTO files (
      id, original_name, stored_name, size_bytes, mime_type, previewable, uploaded_at, expires_at, status
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  statement.run(
    record.id,
    record.original_name,
    record.stored_name,
    record.size_bytes,
    record.mime_type,
    record.previewable,
    record.uploaded_at,
    record.expires_at,
    record.status
  );
}

export function getFileById(id: string): FileRecord | null {
  const statement = db.prepare(`
    SELECT * FROM files WHERE id = ?
  `);
  const row = statement.get(id);
  return (row as FileRecord) || null;
}

export function getActiveFiles(nowIso: string): FileRecord[] {
  const statement = db.prepare(`
    SELECT * FROM files 
    WHERE expires_at > ? AND status = 'ready'
    ORDER BY uploaded_at DESC
  `);
  return statement.all(nowIso) as FileRecord[];
}

export function getTotalActiveSize(nowIso: string): number {
  const statement = db.prepare(`
    SELECT SUM(size_bytes) as total 
    FROM files 
    WHERE expires_at > ? AND status = 'ready'
  `);
  const row = statement.get(nowIso) as { total: number | null } | undefined;
  return row?.total ?? 0;
}

export function getExpiredFiles(nowIso: string): FileRecord[] {
  const statement = db.prepare(`
    SELECT * FROM files 
    WHERE expires_at <= ? OR status = 'deleting'
  `);
  return statement.all(nowIso) as FileRecord[];
}

export function deleteFileById(id: string): void {
  const statement = db.prepare(`
    DELETE FROM files WHERE id = ?
  `);
  statement.run(id);
}

export function getAllFileRecords(): FileRecord[] {
  const statement = db.prepare(`SELECT * FROM files`);
  return statement.all() as FileRecord[];
}

export function addLogRecord(
  action: 'upload' | 'download' | 'delete' | 'expire',
  fileName: string,
  clientIp: string,
  userAgent: string,
  deviceInfo: string,
  fileId?: string | null,
  fileSize?: number | null
): void {
  const createdAt = new Date().toISOString();
  const statement = db.prepare(`
    INSERT INTO logs (
      action, file_id, file_name, file_size, client_ip, user_agent, device_info, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  statement.run(
    action,
    fileId ?? null,
    fileName,
    fileSize ?? null,
    clientIp,
    userAgent,
    deviceInfo,
    createdAt
  );
}

export function getLogs(limit: number = 100, offset: number = 0): LogRecord[] {
  const statement = db.prepare(`
    SELECT * FROM logs 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `);
  return statement.all(limit, offset) as LogRecord[];
}

export function clearAllLogs(): void {
  const statement = db.prepare(`DELETE FROM logs`);
  statement.run();
}

