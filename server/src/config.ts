import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートディレクトリ
const projectRoot = path.resolve(__dirname, '../../');

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  
  // 保存先ディレクトリ
  STORAGE_DIR: process.env.STORAGE_DIR 
    ? path.resolve(process.env.STORAGE_DIR) 
    : path.resolve(projectRoot, 'data/files'),
    
  DB_PATH: process.env.DB_PATH 
    ? path.resolve(process.env.DB_PATH) 
    : path.resolve(projectRoot, 'data/metadata.db'),

  // クライアントビルド先
  CLIENT_DIST_DIR: path.resolve(projectRoot, 'client/dist'),

  // ファイル容量制限
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || `${500 * 1024 * 1024}`, 10), // 500 MiB
  MAX_TOTAL_SIZE: parseInt(process.env.MAX_TOTAL_SIZE || `${5 * 1024 * 1024 * 1024}`, 10), // 5 GiB

  // 保存期間（秒）
  EXPIRE_SECONDS: parseInt(process.env.EXPIRE_SECONDS || '3600', 10), // 1時間

  // 定期クリーンアップ周期（ミリ秒）
  CLEANUP_INTERVAL_MS: parseInt(process.env.CLEANUP_INTERVAL_MS || '60000', 10), // 1分
};
