import React, { useState, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemButton,
  Chip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { FileSummary } from '../types/file';
import { formatBytes, formatDateTime, getRemainingTime } from '../utils/format';
import { getDownloadUrl } from '../api/client';
import { FileIcon } from './FileIcon';

interface Props {
  files: FileSummary[];
  onSelectFile: (file: FileSummary) => void;
  onRequestDelete: (file: FileSummary) => void;
}

export const ListView: React.FC<Props> = ({ files, onSelectFile, onRequestDelete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // メニューの状態
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [activeFile, setActiveFile] = useState<FileSummary | null>(null);

  // 長押し判定用ref
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);

  const handlePointerDown = (file: FileSummary, e: React.PointerEvent) => {
    isLongPressedRef.current = false;
    const clientX = e.clientX;
    const clientY = e.clientY;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      setActiveFile(file);
      setMenuAnchor({ x: clientX, y: clientY });
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleContextMenu = (file: FileSummary, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveFile(file);
    setMenuAnchor({ x: e.clientX, y: e.clientY });
  };

  const handleMoreButtonClick = (file: FileSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveFile(file);
    setMenuAnchor({ x: e.clientX, y: e.clientY });
  };

  const handleRowClick = (file: FileSummary) => {
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return;
    }
    onSelectFile(file);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setActiveFile(null);
  };

  const handleDownload = () => {
    if (activeFile) {
      const link = document.createElement('a');
      link.href = getDownloadUrl(activeFile.id);
      link.download = activeFile.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    handleCloseMenu();
  };

  const handleDelete = () => {
    if (activeFile) {
      onRequestDelete(activeFile);
    }
    handleCloseMenu();
  };

  const handleShowDetail = () => {
    if (activeFile) {
      onSelectFile(activeFile);
    }
    handleCloseMenu();
  };

  if (files.length === 0) {
    return (
      <Paper
        sx={{
          p: 6,
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          ファイルはありません。ここにアップロードしてください
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
        {isMobile ? (
          /* モバイル表示: リスト形式（2段組） */
          <List disablePadding>
            {files.map((file, index) => {
              const remaining = getRemainingTime(file.expiresAt);
              return (
                <ListItem
                  key={file.id}
                  divider={index < files.length - 1}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="その他操作"
                      onClick={(e) => handleMoreButtonClick(file, e)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    onClick={() => handleRowClick(file)}
                    onPointerDown={(e) => handlePointerDown(file, e)}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerMove={handlePointerMove}
                    onContextMenu={(e) => handleContextMenu(file, e)}
                    sx={{ py: 1.5, px: 2, userSelect: 'none' }}
                  >
                    <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
                      <FileIcon filename={file.originalName} mimeType={file.mimeType} fontSize="medium" />
                    </Box>
                    <Box sx={{ overflow: 'hidden', pr: 4 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '75vw',
                        }}
                      >
                        {file.originalName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatBytes(file.sizeBytes)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(file.uploadedAt)}
                        </Typography>
                        <Chip
                          label={remaining.text}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        ) : (
          /* デスクトップ表示: テーブル形式 */
          <Table aria-label="ファイル一覧">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell width={50} align="center">種別</TableCell>
                <TableCell>ファイル名</TableCell>
                <TableCell width={160}>アップロード日時</TableCell>
                <TableCell width={160}>削除予定日時</TableCell>
                <TableCell width={110} align="right">サイズ</TableCell>
                <TableCell width={60} align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((file) => {
                const remaining = getRemainingTime(file.expiresAt);
                return (
                  <TableRow
                    key={file.id}
                    hover
                    onClick={() => handleRowClick(file)}
                    onPointerDown={(e) => handlePointerDown(file, e)}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerMove={handlePointerMove}
                    onContextMenu={(e) => handleContextMenu(file, e)}
                    sx={{
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <TableCell align="center">
                      <FileIcon filename={file.originalName} mimeType={file.mimeType} fontSize="medium" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 350,
                          }}
                        >
                          {file.originalName}
                        </Typography>
                        <Chip
                          label={remaining.text}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(file.uploadedAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(file.expiresAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {formatBytes(file.sizeBytes)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        aria-label="その他操作"
                        onClick={(e) => handleMoreButtonClick(file, e)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* 右クリック/長押し/その他ボタン用共通メニュー */}
      <Menu
        open={menuAnchor !== null}
        onClose={handleCloseMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          menuAnchor !== null
            ? { top: menuAnchor.y, left: menuAnchor.x }
            : undefined
        }
      >
        <MenuItem onClick={handleShowDetail}>
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>詳細を表示</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDownload}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>ダウンロード</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
