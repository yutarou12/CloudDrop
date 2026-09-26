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
  const lastFetchTimeRef = useRef(0);
  const filesRef = useRef<FileSummary[]>([]);
  filesRef.current = files;

  // ファイル一覧＆サーバー情報取得（最低1.5秒のスロットリングで連続多重実行を防止）
  const refresh = useCallback(async () => {
    const now = Date.now();
    // 1.5秒以内の連続フェッチはスキップ（iOS Safari等での暴走防止）
    if (now - lastFetchTimeRef.current < 1500) {
      return;
    }

    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

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
    }
  }, []);

  // 初回取得
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Server-Sent Events (SSE) によるリアルタイム同期
  // ※ iOS Safari等で自己署名証明書時にEventSourceがクラッシュするのを防ぐ安全装置付き
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let sseErrorCount = 0;
    let fallbackToPollingOnly = false;

    // 接続試行関数
    const connectSSE = () => {
      if (fallbackToPollingOnly || typeof EventSource === 'undefined') return;

      try {
        eventSource = new EventSource('/api/events');

        eventSource.addEventListener('file-change', () => {
          refresh();
        });

        eventSource.onerror = () => {
          sseErrorCount++;
          // エラーが連続した場合はSafariのクラッシュを防ぐためSSEを切断し、定期ポーリングのみに移行
          if (sseErrorCount >= 3) {
            console.warn('[SSE] エラーが連続したためSSEを切断し、安全な定期ポーリングに切り替えます。');
            fallbackToPollingOnly = true;
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          }
        };

        eventSource.onopen = () => {
          sseErrorCount = 0; // 接続成功でカウンターリセット
        };
      } catch (err) {
        console.warn('SSE接続初期化スキップ:', err);
        fallbackToPollingOnly = true;
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }, [refresh]);

  // 定期ポーリング（5秒間隔で安全に更新）
  useEffect(() => {
    const timer = setInterval(() => {
      refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  // 画面復帰時（タブ切り替えやSafari復帰）の安全な再取得（focusイベントはSafari暴走の原因になるため使用しない）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);

  // 残り時間表示の定期更新（期限到来判定）
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      const now = Date.now();
      const hasExpired = filesRef.current.some(
        (f) => new Date(f.expiresAt).getTime() <= now
      );
      if (hasExpired) {
        refresh();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  // アップロード成功時の即時（楽観的）追加
  const addUploadedFile = useCallback((newFile: FileSummary) => {
    setFiles((prev) => {
      if (prev.some((f) => f.id === newFile.id)) return prev;
      return [newFile, ...prev];
    });
    // 少し待ってから確実に同期
    setTimeout(() => {
      refresh();
    }, 500);
  }, [refresh]);

  // ファイル削除
  const removeFile = useCallback(
    async (id: string) => {
      setFiles((prev) => prev.filter((f) => f.id !== id));
      try {
        await apiDeleteFile(id);
      } catch (err) {
        console.error('削除失敗:', err);
      } finally {
        setTimeout(() => {
          refresh();
        }, 500);
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
