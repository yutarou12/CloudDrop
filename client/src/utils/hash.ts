/**
 * 文字列からシンプルな32bitハッシュ値を計算
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * ファイルIDから決定論的な机上表示用のスタイル（回転角、オフセット等）を算出する。
 * 再描画や再取得でも配置が飛ばない。
 */
export function getDeterministicDeskTransform(id: string): {
  rotateDeg: number;
  offsetX: number;
  offsetY: number;
} {
  const hash = hashString(id);

  // 回転角: -5.0deg 〜 +5.0deg （文字が読みやすい範囲に抑える）
  const rotateDeg = ((hash % 100) / 100) * 10 - 5;

  // オフセット: -4px 〜 +4px
  const offsetX = (((hash >> 4) % 100) / 100) * 8 - 4;
  const offsetY = (((hash >> 8) % 100) / 100) * 8 - 4;

  return {
    rotateDeg: Number(rotateDeg.toFixed(1)),
    offsetX: Number(offsetX.toFixed(1)),
    offsetY: Number(offsetY.toFixed(1)),
  };
}
