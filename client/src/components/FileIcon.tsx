import React from 'react';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import { getFileExtension } from '../utils/format';

interface Props {
  filename: string;
  mimeType?: string;
  fontSize?: 'small' | 'inherit' | 'medium' | 'large';
  sx?: any;
}

export const FileIcon: React.FC<Props> = ({ filename, mimeType = '', fontSize = 'medium', sx }) => {
  const ext = getFileExtension(filename);

  // 画像
  if (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)
  ) {
    return <ImageIcon fontSize={fontSize} sx={{ color: '#2e7d32', ...sx }} />;
  }

  // PDF
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return <PictureAsPdfIcon fontSize={fontSize} sx={{ color: '#d32f2f', ...sx }} />;
  }

  // 動画
  if (
    mimeType.startsWith('video/') ||
    ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)
  ) {
    return <VideoFileIcon fontSize={fontSize} sx={{ color: '#ed6c02', ...sx }} />;
  }

  // 音声
  if (
    mimeType.startsWith('audio/') ||
    ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(ext)
  ) {
    return <AudioFileIcon fontSize={fontSize} sx={{ color: '#9c27b0', ...sx }} />;
  }

  // 圧縮ファイル
  if (
    ['zip', 'tar', 'gz', '7z', 'rar'].includes(ext) ||
    mimeType.includes('zip') ||
    mimeType.includes('compressed')
  ) {
    return <FolderZipIcon fontSize={fontSize} sx={{ color: '#f57c00', ...sx }} />;
  }

  // 表計算
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <TableChartIcon fontSize={fontSize} sx={{ color: '#388e3c', ...sx }} />;
  }

  // プレゼン
  if (['ppt', 'pptx', 'key'].includes(ext)) {
    return <SlideshowIcon fontSize={fontSize} sx={{ color: '#e64a19', ...sx }} />;
  }

  // ソースコード
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'py', 'sh', 'rs', 'go', 'java', 'c', 'cpp'].includes(ext)) {
    return <CodeIcon fontSize={fontSize} sx={{ color: '#0288d1', ...sx }} />;
  }

  // テキスト・文書
  if (['txt', 'md', 'doc', 'docx', 'log'].includes(ext)) {
    return <DescriptionIcon fontSize={fontSize} sx={{ color: '#0288d1', ...sx }} />;
  }

  // その他汎用
  return <InsertDriveFileIcon fontSize={fontSize} sx={{ color: '#757575', ...sx }} />;
};
