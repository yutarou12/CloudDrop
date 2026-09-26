export interface FileRecord {
  id: string;
  original_name: string;
  stored_name: string;
  size_bytes: number;
  mime_type: string;
  previewable: number; // 0 or 1
  uploaded_at: string; // ISO 8601 UTC
  expires_at: string;  // ISO 8601 UTC
  status: string;      // 'ready' | 'deleting'
}

export interface FileSummary {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  previewable: boolean;
  uploadedAt: string;
  expiresAt: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export function toFileSummary(record: FileRecord): FileSummary {
  return {
    id: record.id,
    originalName: record.original_name,
    sizeBytes: record.size_bytes,
    mimeType: record.mime_type,
    previewable: record.previewable === 1,
    uploadedAt: record.uploaded_at,
    expiresAt: record.expires_at,
  };
}

export interface LogRecord {
  id: number;
  action: 'upload' | 'download' | 'delete' | 'expire';
  file_id: string | null;
  file_name: string;
  file_size: number | null;
  client_ip: string;
  user_agent: string;
  device_info: string;
  created_at: string; // ISO 8601 UTC
}

export interface LogSummary {
  id: number;
  action: 'upload' | 'download' | 'delete' | 'expire';
  fileId: string | null;
  fileName: string;
  fileSize: number | null;
  clientIp: string;
  deviceInfo: string;
  createdAt: string;
}

export function toLogSummary(record: LogRecord): LogSummary {
  return {
    id: record.id,
    action: record.action,
    fileId: record.file_id,
    fileName: record.file_name,
    fileSize: record.file_size,
    clientIp: record.client_ip,
    deviceInfo: record.device_info,
    createdAt: record.created_at,
  };
}

