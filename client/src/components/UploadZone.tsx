import React, { useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
  Tooltip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ReplayIcon from '@mui/icons-material/Replay';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { UploadTask } from '../types/file';
import { formatBytes } from '../utils/format';
import { FileIcon } from './FileIcon';

interface Props {
  tasks: UploadTask[];
  warningMessage: string | null;
  onClearWarning: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRetryTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onClearCompleted: () => void;
}

export const UploadZone: React.FC<Props> = ({
  tasks,
  warningMessage,
  onClearWarning,
  onAddFiles,
  onRetryTask,
  onRemoveTask,
  onClearCompleted,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      // 同じファイルを再選択できるようにリセット
      e.target.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <Box sx={{ mb: 3 }}>
      {/* 警告・通知メッセージ */}
      {warningMessage && (
        <Alert severity="warning" onClose={onClearWarning} sx={{ mb: 2 }}>
          {warningMessage}
        </Alert>
      )}

      {/* ドロップ＆ファイル選択領域 */}
      <Paper
        variant="outlined"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          p: { xs: 2.5, sm: 4 },
          textAlign: 'center',
          backgroundColor: isDragOver ? 'action.hover' : 'background.paper',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: isDragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        <CloudUploadIcon color={isDragOver ? 'primary' : 'action'} sx={{ fontSize: { xs: 40, sm: 50 } }} />

        <Box>
          <Typography variant="body1" sx={{ fontWeight: 500, display: { xs: 'none', sm: 'block' } }}>
            ここにファイルをドロップ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            複数ファイル選択可（最大500 MiB / ファイル）
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="medium"
          onClick={handleButtonClick}
          startIcon={<CloudUploadIcon />}
          sx={{ mt: 0.5, px: 3, py: 1, borderRadius: 2 }}
        >
          ファイルを選択
        </Button>
      </Paper>

      {/* アップロード中・完了・失敗タスク一覧 */}
      {tasks.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              アップロード進行状況 ({tasks.filter(t => t.status === 'uploading').length} 件転送中 / 全 {tasks.length} 件)
            </Typography>
            {completedCount > 0 && (
              <Button size="small" onClick={onClearCompleted}>
                完了項目をクリア
              </Button>
            )}
          </Box>

          <List dense disablePadding>
            {tasks.map((task) => (
              <ListItem
                key={task.id}
                sx={{
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  mb: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  p: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <FileIcon filename={task.name} fontSize="small" />
                  </ListItemIcon>

                  <ListItemText
                    primary={task.name}
                    secondary={`${formatBytes(task.size)}${
                      task.errorMessage ? ` - ${task.errorMessage}` : ''
                    }`}
                    primaryTypographyProps={{
                      noWrap: true,
                      variant: 'body2',
                      fontWeight: 500,
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      color: task.status === 'failed' ? 'error' : 'text.secondary',
                    }}
                    sx={{ my: 0 }}
                  />

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {task.status === 'uploading' && (
                      <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'right' }}>
                        {task.progress}%
                      </Typography>
                    )}

                    {task.status === 'completed' && (
                      <CheckCircleIcon color="success" fontSize="small" />
                    )}

                    {task.status === 'failed' && (
                      <>
                        <Tooltip title="再試行">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => onRetryTask(task.id)}
                          >
                            <ReplayIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <ErrorOutlineIcon color="error" fontSize="small" />
                      </>
                    )}

                    <IconButton
                      size="small"
                      onClick={() => onRemoveTask(task.id)}
                      aria-label="削除"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {task.status === 'uploading' && (
                  <LinearProgress
                    variant="determinate"
                    value={task.progress}
                    sx={{ mt: 1, borderRadius: 1, height: 6 }}
                  />
                )}
                {task.status === 'pending' && (
                  <LinearProgress
                    variant="indeterminate"
                    sx={{ mt: 1, borderRadius: 1, height: 4, opacity: 0.6 }}
                  />
                )}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};
