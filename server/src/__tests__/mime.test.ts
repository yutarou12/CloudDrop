import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { inspectImageHeader } from '../services/mime.js';

describe('inspectImageHeader', () => {
  it('JPEG画像を正しく判定すること', async () => {
    const tempFile = path.join(os.tmpdir(), 'test_img.jpg');
    // JPEG header: FF D8 FF E0 ...
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
    await fs.writeFile(tempFile, jpegBuffer);

    const result = await inspectImageHeader(tempFile);
    await fs.unlink(tempFile);

    assert.equal(result.previewable, true);
    assert.equal(result.verifiedMime, 'image/jpeg');
  });

  it('PNG画像を正しく判定すること', async () => {
    const tempFile = path.join(os.tmpdir(), 'test_img.png');
    // PNG header: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
    await fs.writeFile(tempFile, pngBuffer);

    const result = await inspectImageHeader(tempFile);
    await fs.unlink(tempFile);

    assert.equal(result.previewable, true);
    assert.equal(result.verifiedMime, 'image/png');
  });

  it('WebP画像を正しく判定すること', async () => {
    const tempFile = path.join(os.tmpdir(), 'test_img.webp');
    // RIFF .... WEBP
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x20, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20
    ]);
    await fs.writeFile(tempFile, webpBuffer);

    const result = await inspectImageHeader(tempFile);
    await fs.unlink(tempFile);

    assert.equal(result.previewable, true);
    assert.equal(result.verifiedMime, 'image/webp');
  });

  it('SVGやテキストファイルはプレビュー対象外にすること', async () => {
    const tempFile = path.join(os.tmpdir(), 'test_vector.svg');
    await fs.writeFile(tempFile, '<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    const result = await inspectImageHeader(tempFile);
    await fs.unlink(tempFile);

    assert.equal(result.previewable, false);
    assert.equal(result.verifiedMime, null);
  });
});
