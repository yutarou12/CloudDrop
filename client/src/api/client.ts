import { FileSummary, ServerInfo, LogSummary } from '../types/file';

const API_BASE = '/api';

export async function fetchFiles(): Promise<FileSummary[]> {
  const res = await fetch(`${API_BASE}/files`);
  if (!res.ok) {
    throw new Error(`ファイル一覧の取得に失敗しました (${res.status})`);
  }
  const data = await res.json();
  return data.files || [];
}

export async function fetchServerInfo(): Promise<ServerInfo> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`サーバー情報の取得に失敗しました (${res.status})`);
  }
  return res.json();
}

export function uploadFile(
  file: File,
  onProgress: (percent: number) => void
): Promise<FileSummary> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file, file.name);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res);
        } catch {
          reject(new Error('サーバーの応答解析に失敗しました。'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.message || `アップロード失敗 (${xhr.status})`));
        } catch {
          reject(new Error(`アップロード失敗 (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('ネットワークエラーによりアップロードできませんでした。'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('アップロードが中断されました。'));
    });

    xhr.open('POST', `${API_BASE}/files`);
    xhr.send(formData);
  });
}

export async function deleteFile(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/files/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`削除に失敗しました (${res.status})`);
  }
}

export function getDownloadUrl(id: string): string {
  return `${API_BASE}/files/${id}/download`;
}

export function getPreviewUrl(id: string): string {
  return `${API_BASE}/files/${id}/preview`;
}

export async function fetchLogs(): Promise<LogSummary[]> {
  const res = await fetch(`${API_BASE}/logs`);
  if (!res.ok) {
    throw new Error(`ログ一覧の取得に失敗しました (${res.status})`);
  }
  const data = await res.json();
  return data.logs || [];
}

export async function clearLogs(): Promise<void> {
  const res = await fetch(`${API_BASE}/logs`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`ログの削除に失敗しました (${res.status})`);
  }
}

