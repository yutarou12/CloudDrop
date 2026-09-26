import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useTheme,
  useMediaQuery,
  List,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import ComputerIcon from '@mui/icons-material/Computer';
import DevicesIcon from '@mui/icons-material/Devices';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HistoryIcon from '@mui/icons-material/History';
import { LogSummary } from '../types/file';
import { fetchLogs, clearLogs } from '../api/client';
import { formatBytes, formatDateTimeWithSeconds } from '../utils/format';
import { FileIcon } from './FileIcon';

interface Props {
  onNotify?: (message: string, severity: 'success' | 'info' | 'error') => void;
}

export const LogView: React.FC<Props> = ({ onNotify }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [logs, setLogs] = useState<LogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [openClearDialog, setOpenClearDialog] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchLogs();
      setLogs(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'ログの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClear = async () => {
    setOpenClearDialog(false);
    try {
      await clearLogs();
      setLogs([]);
      onNotify?.('操作ログを消去しました', 'info');
    } catch {
      onNotify?.('ログの消去に失敗しました', 'error');
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction === 'all') return true;
    return log.action === filterAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'upload':
        return (
          <Chip
            icon={<ArrowUpwardIcon fontSize="small" />}
            label="アップロード"
            size="small"
            color="success"
            sx={{ fontWeight: 500 }}
          />
        );
      case 'download':
        return (
          <Chip
            icon={<ArrowDownwardIcon fontSize="small" />}
            label="ダウンロード"
            size="small"
            color="primary"
            sx={{ fontWeight: 500 }}
          />
        );
      case 'delete':
        return (
          <Chip
            icon={<DeleteOutlineIcon fontSize="small" />}
            label="削除"
            size="small"
            color="error"
            sx={{ fontWeight: 500 }}
          />
        );
      default:
        return <Chip label={action} size="small" variant="outlined" />;
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    if (/iPhone|iPad|Android/i.test(deviceInfo)) {
      return <SmartphoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
    }
    if (/Mac|Windows|PC|Linux/i.test(deviceInfo)) {
      return <ComputerIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
    }
    return <DevicesIcon fontSize="small" sx={{ color: 'text.secondary' }} />;
  };

  return (
    <Box>
      {/* ツールバー */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            操作履歴ログ
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({filteredLogs.length} 件)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToggleButtonGroup
            value={filterAction}
            exclusive
            onChange={(_e, val) => val && setFilterAction(val)}
            size="small"
          >
            <ToggleButton value="all">すべて</ToggleButton>
            <ToggleButton value="upload">送信</ToggleButton>
            <ToggleButton value="download">受信</ToggleButton>
            <ToggleButton value="delete">削除</ToggleButton>
          </ToggleButtonGroup>

          <Tooltip title="再読み込み">
            <IconButton onClick={loadLogs} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {logs.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={() => setOpenClearDialog(true)}
            >
              クリア
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredLogs.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            操作履歴はありません。
          </Typography>
        </Paper>
      ) : isMobile ? (
        /* モバイル表示: カードリスト */
        <List disablePadding>
          {filteredLogs.map((log) => (
            <Paper key={log.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                {getActionBadge(log.action)}
                <Typography variant="caption" color="text.secondary">
                  {formatDateTimeWithSeconds(log.createdAt)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FileIcon filename={log.fileName} fontSize="small" />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '70vw',
                  }}
                >
                  {log.fileName}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {getDeviceIcon(log.deviceInfo)}
                  <Typography variant="caption" color="text.primary">
                    {log.deviceInfo}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  ({log.clientIp})
                </Typography>
                {log.fileSize !== null && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                    {formatBytes(log.fileSize)}
                  </Typography>
                )}
              </Box>
            </Paper>
          ))}
        </List>
      ) : (
        /* デスクトップ表示: テーブル */
        <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
          <Table aria-label="操作ログ一覧">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell width={120}>操作</TableCell>
                <TableCell>ファイル名</TableCell>
                <TableCell width={110} align="right">サイズ</TableCell>
                <TableCell width={220}>操作元端末 / IP</TableCell>
                <TableCell width={180}>実行日時</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileIcon filename={log.fileName} fontSize="small" />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 320,
                        }}
                        title={log.fileName}
                      >
                        {log.fileName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {log.fileSize !== null ? formatBytes(log.fileSize) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      {getDeviceIcon(log.deviceInfo)}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {log.deviceInfo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.clientIp}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTimeWithSeconds(log.createdAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ログ全消去確認ダイアログ */}
      <Dialog
        open={openClearDialog}
        onClose={() => setOpenClearDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>履歴の消去</DialogTitle>
        <DialogContent>
          <DialogContentText>
            すべての操作履歴ログを消去しますか？<br />
            この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button onClick={() => setOpenClearDialog(false)} color="inherit">
            キャンセル
          </Button>
          <Button onClick={handleClear} color="error" variant="contained">
            消去する
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
