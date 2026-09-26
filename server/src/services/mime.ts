import fs from 'node:fs/promises';

export interface ImageInspectionResult {
  previewable: boolean;
  verifiedMime: string | null;
}

/**
 * ファイルの先頭バイトを読み取り、安全にプレビュー可能な画像形式（JPEG, PNG, GIF, WebP）であるかを厳格に検証する。
 * SVG, HTML, 実行可能ファイルなどは明示的に除外する。
 */
export async function inspectImageHeader(filePath: string): Promise<ImageInspectionResult> {
  let fileHandle: fs.FileHandle | null = null;
  try {
    fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await fileHandle.read(buffer, 0, 16, 0);

    if (bytesRead < 4) {
      return { previewable: false, verifiedMime: null };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return { previewable: true, verifiedMime: 'image/jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytesRead >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0D &&
      buffer[5] === 0x0A &&
      buffer[6] === 0x1A &&
      buffer[7] === 0x0A
    ) {
      return { previewable: true, verifiedMime: 'image/png' };
    }

    // GIF: GIF87a or GIF89a (47 49 46 38 37 61 or 47 49 46 38 39 61)
    if (
      bytesRead >= 6 &&
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      return { previewable: true, verifiedMime: 'image/gif' };
    }

    // WebP: RIFF (4 bytes) + file length (4 bytes) + WEBP (4 bytes)
    if (
      bytesRead >= 12 &&
      buffer[0] === 0x52 && // R
      buffer[1] === 0x49 && // I
      buffer[2] === 0x46 && // F
      buffer[3] === 0x46 && // F
      buffer[8] === 0x57 && // W
      buffer[9] === 0x45 && // E
      buffer[10] === 0x42 && // B
      buffer[11] === 0x50   // P
    ) {
      return { previewable: true, verifiedMime: 'image/webp' };
    }

    return { previewable: false, verifiedMime: null };
  } catch (err) {
    return { previewable: false, verifiedMime: null };
  } finally {
    if (fileHandle) {
      await fileHandle.close().catch(() => {});
    }
  }
}
