/**
 * バイト数を読みやすい単位（B, KB, MB, GB）に変換
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${i === 0 ? val : val.toFixed(1)} ${units[i]}`;
}

/**
 * ISO日時文字列を閲覧端末のローカル日時（YYYY/MM/DD HH:mm）にフォーマット
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    return `${y}/${m}/${day} ${h}:${min}`;
  } catch {
    return '-';
  }
}

/**
 * ISO日時文字列を秒付きローカル日時（YYYY/MM/DD HH:mm:ss）にフォーマット
 */
export function formatDateTimeWithSeconds(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');

    return `${y}/${m}/${day} ${h}:${min}:${sec}`;
  } catch {
    return '-';
  }
}

/**
 * 残り時間のフォーマット
 */
export function getRemainingTime(expiresAtIso: string): {
  text: string;
  isExpired: boolean;
  remainingSeconds: number;
} {
  const expiresAt = new Date(expiresAtIso).getTime();
  const now = Date.now();
  const diffMs = expiresAt - now;

  if (diffMs <= 0) {
    return { text: '期限切れ', isExpired: true, remainingSeconds: 0 };
  }

  const remainingSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const m = minutes % 60;
    return { text: `残り${hours}時間${m}分`, isExpired: false, remainingSeconds };
  }

  if (minutes > 0) {
    return { text: `残り${minutes}分`, isExpired: false, remainingSeconds };
  }

  return { text: `残り${seconds}秒`, isExpired: false, remainingSeconds };
}

/**
 * ファイル名から拡張子を取得
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}
