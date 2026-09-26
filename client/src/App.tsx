import React, { useState } from 'react';
import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { ListView } from './components/ListView';
import { DeskView } from './components/DeskView';
import { LogView } from './components/LogView';
import { FileDetailModal } from './components/FileDetailModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { useFiles } from './hooks/useFiles';
import { useUploader } from './hooks/useUploader';
import { FileSummary, ViewMode, PageTab } from './types/file';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export const App: React.FC = () => {
  // 現在のページタブ（'transfer' | 'logs'）
  const [currentTab, setCurrentTab] = useState<PageTab>('transfer');

  // 表示モード（一覧 / 机上）
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 詳細モーダル表示中のファイル
  const [selectedFile, setSelectedFile] = useState<FileSummary | null>(null);

  // 削除確認ダイアログ対象ファイル
  const [deletingFile, setDeletingFile] = useState<FileSummary | null>(null);

  // 通知スナックバー
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const { files, serverInfo, loading, error, addUploadedFile, removeFile } = useFiles();

  const handleUploadSuccess = (newFile: FileSummary) => {
    addUploadedFile(newFile);
    setSnackbar({
      open: true,
      message: 'ファイルをアップロードしました',
      severity: 'success',
    });
  };

  const {
    tasks,
    warningMessage,
    setWarningMessage,
    addFiles,
    retryTask,
    removeTask,
    clearCompleted,
  } = useUploader(serverInfo, handleUploadSuccess);

  // 削除リクエストハンドラ
  const handleRequestDelete = (file: FileSummary) => {
    setDeletingFile(file);
  };

  // 削除実行
  const handleConfirmDelete = async () => {
    if (!deletingFile) return;
    const fileId = deletingFile.id;
    const filename = deletingFile.originalName;
    setDeletingFile(null);

    // 詳細ダイアログを開いているファイルが削除対象なら閉じる
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }

    try {
      await removeFile(fileId);
      setSnackbar({
        open: true,
        message: `「${filename}」を削除しました`,
        severity: 'info',
      });
    } catch {
      setSnackbar({
        open: true,
        message: '削除中にエラーが発生しました',
        severity: 'error',
      });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        {/* ヘッダー */}
        <Header
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          serverInfo={serverInfo}
        />

        {/* メインコンテンツ */}
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, flexGrow: 1 }}>
          {currentTab === 'transfer' ? (
            <>
              {/* アップロードゾーン */}
              <UploadZone
                tasks={tasks}
                warningMessage={warningMessage}
                onClearWarning={() => setWarningMessage(null)}
                onAddFiles={addFiles}
                onRetryTask={retryTask}
                onRemoveTask={removeTask}
                onClearCompleted={clearCompleted}
              />

              {/* ローディング・エラー表示 */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* 表示モードごとのビュー */}
                  {viewMode === 'list' ? (
                    <ListView
                      files={files}
                      onSelectFile={setSelectedFile}
                      onRequestDelete={handleRequestDelete}
                    />
                  ) : (
                    <DeskView
                      files={files}
                      onSelectFile={setSelectedFile}
                    />
                  )}
                </>
              )}
            </>
          ) : (
            /* 操作履歴ログビュー */
            <LogView
              onNotify={(message, severity) =>
                setSnackbar({ open: true, message, severity })
              }
            />
          )}
        </Container>

        {/* 詳細モーダル */}
        <FileDetailModal
          file={selectedFile}
          open={selectedFile !== null}
          onClose={() => setSelectedFile(null)}
          onRequestDelete={handleRequestDelete}
        />

        {/* 削除確認ダイアログ */}
        <ConfirmDialog
          open={deletingFile !== null}
          filename={deletingFile?.originalName || ''}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingFile(null)}
        />

        {/* 通知スナックバー */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default App;
