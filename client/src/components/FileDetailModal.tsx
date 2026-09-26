import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StorageIcon from '@mui/icons-material/Storage';
import { FileSummary } from '../types/file';
import { formatBytes, formatDateTime, getRemainingTime } from '../utils/format';
import { getDownloadUrl, getPreviewUrl } from '../api/client';
import { FileIcon } from './FileIcon';

interface Props {
  file: FileSummary | null;
  open: boolean;
  onClose: () => void;
  onRequestDelete: (file: FileSummary) => void;
}

export const FileDetailModal: React.FC<Props> = ({
  file,
  open,
  onClose,
  onRequestDelete,
}) => {
  const [imgError, setImgError] = useState(false);

  if (!file) return null;

  const remaining = getRemainingTime(file.expiresAt);
  const showPreview = file.previewable && !imgError;

  const handleDownload = () => {
    // ダウンロードトリガー
    const link = document.createElement('a');
    link.href = getDownloadUrl(file.id);
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="file-detail-dialog-title"
    >
      <DialogTitle
        id="file-detail-dialog-title"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" component="span" noWrap sx={{ fontWeight: 'bold', pr: 2 }}>
          ファイル詳細
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="閉じる">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {/* プレビュー表示エリア */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200,
            maxHeight: 360,
            bgcolor: 'action.hover',
            borderRadius: 2,
            overflow: 'hidden',
            mb: 3,
          }}
        >
          {showPreview ? (
            <img
              src={getPreviewUrl(file.id)}
              alt={file.originalName}
              onError={() => setImgError(true)}
              style={{
                maxWidth: '100%',
                maxHeight: 350,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FileIcon
                filename={file.originalName}
                mimeType={file.mimeType}
                sx={{ fontSize: 80, mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary" display="block">
                プレビュー非対応
              </Typography>
            </Box>
          )}
        </Box>

        {/* ファイル名（全文表示） */}
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 'bold',
            wordBreak: 'break-word',
            mb: 2,
          }}
        >
          {file.originalName}
        </Typography>

        {/* メタデータリスト */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
              サイズ:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {formatBytes(file.sizeBytes)} ({file.sizeBytes.toLocaleString()} バイト)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
              送信日時:
            </Typography>
            <Typography variant="body2">
              {formatDateTime(file.uploadedAt)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon fontSize="small" color="error" />
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
              削除予定:
            </Typography>
            <Typography variant="body2">
              {formatDateTime(file.expiresAt)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip
              label={remaining.text}
              color={remaining.isExpired ? 'default' : 'warning'}
              size="small"
              variant="outlined"
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => {
            onClose();
            onRequestDelete(file);
          }}
        >
          削除
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit">
            閉じる
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={remaining.isExpired}
          >
            ダウンロード
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
