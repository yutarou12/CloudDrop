export interface FileSummary {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  previewable: boolean;
  uploadedAt: string;
  expiresAt: string;
}

export interface ServerInfo {
  status: string;
  timestamp: string;
  server: {
    host: string;
    localIp: string;
    port: number;
  };
  limits: {
    maxFileSizeBytes: number;
    maxTotalSizeBytes: number;
    usedBytes: number;
    expireSeconds: number;
  };
}

export type ViewMode = 'list' | 'desk';
export type PageTab = 'transfer' | 'logs';

export interface UploadTask {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0 - 100
  errorMessage?: string;
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

