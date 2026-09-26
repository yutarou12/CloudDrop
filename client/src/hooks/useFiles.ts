import { useState, useEffect, useCallback, useRef } from 'react';
import { FileSummary, ServerInfo } from '../types/file';
import { fetchFiles, fetchServerInfo, deleteFile as apiDeleteFile } from '../api/client';

export function useFiles() {
  const [files, setFiles] = useState<FileSummary[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState<number>(0);

  const isFetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  // ファイル一覧＆サーバー情報取得
  const refresh = useCallback(async () => {
    if (isFetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }
    isFetchingRef.current = true;
    try {
      const [fileList, info] = await Promise.all([
        fetchFiles(),
        fetchServerInfo().catch(() => null),
      ]);
      setFiles(fileList);
      if (info) setServerInfo(info);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'ファイル一覧の取得に失敗しました');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        refresh();
      }
    }
  }, []);

  // 初回取得
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Server-Sent Events (SSE) によるリアルタイム同期
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('file-change', () => {
        // ファイル追加・削除・期限切れ通知を受け取ったら即座に更新
        refresh();
      });

      eventSource.onerror = () => {
        // 切断時はブラウザが自動再接続する
      };
    } catch (err) {
      console.warn('SSE接続エラー:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [refresh]);

  // フォールバック用の定期ポーリング (5秒毎)
  useEffect(() => {
    const timer = setInterval(() => {
      refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  // 画面復帰時（タブ切り替えや復帰）の即時再取得
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    const handleFocus = () => {
      refresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  // 残り時間表示の定期更新（期限到来時の即時反映）
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      const now = Date.now();
      const hasExpired = files.some(
        (f) => new Date(f.expiresAt).getTime() <= now
      );
      if (hasExpired) {
        refresh();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [files, refresh]);

  // アップロード成功時の即時（楽観的）追加
  const addUploadedFile = useCallback((newFile: FileSummary) => {
    setFiles((prev) => {
      // 既に存在していなければ先頭に追加
      if (prev.some((f) => f.id === newFile.id)) return prev;
      return [newFile, ...prev];
    });
    // その上でバックグラウンドでも確実に同期
    refresh();
  }, [refresh]);

  // ファイル削除
  const removeFile = useCallback(
    async (id: string) => {
      // 楽観的更新で即座に非表示
      setFiles((prev) => prev.filter((f) => f.id !== id));
      try {
        await apiDeleteFile(id);
      } catch (err) {
        console.error('削除失敗:', err);
      } finally {
        refresh();
      }
    },
    [refresh]
  );

  return {
    files,
    serverInfo,
    loading,
    error,
    refresh,
    addUploadedFile,
    removeFile,
  };
}
