import { useState, useCallback, useRef } from 'react';
import { UploadTask, ServerInfo, FileSummary } from '../types/file';
import { uploadFile } from '../api/client';

const MAX_CONCURRENT_UPLOADS = 2;

export function useUploader(serverInfo: ServerInfo | null, onUploadSuccess: (summary: FileSummary) => void) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const activeUploadsCountRef = useRef(0);
  const tasksRef = useRef<UploadTask[]>([]);
  tasksRef.current = tasks;

  // キュー実行ループ
  const processQueue = useCallback(async () => {
    if (activeUploadsCountRef.current >= MAX_CONCURRENT_UPLOADS) {
      return;
    }

    const currentTasks = tasksRef.current;
    const nextPending = currentTasks.find((t) => t.status === 'pending');
    if (!nextPending) {
      return;
    }

    activeUploadsCountRef.current += 1;

    // status: uploading
    setTasks((prev) =>
      prev.map((t) => (t.id === nextPending.id ? { ...t, status: 'uploading', progress: 0 } : t))
    );

    try {
      const summary = await uploadFile(nextPending.file, (percent) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === nextPending.id ? { ...t, progress: percent } : t))
        );
      });

      // 成功
      setTasks((prev) =>
        prev.map((t) =>
          t.id === nextPending.id ? { ...t, status: 'completed', progress: 100 } : t
        )
      );
      onUploadSuccess(summary);
    } catch (err: any) {
      // 失敗
      setTasks((prev) =>
        prev.map((t) =>
          t.id === nextPending.id
            ? { ...t, status: 'failed', errorMessage: err.message || 'アップロード失敗' }
            : t
        )
      );
    } finally {
      activeUploadsCountRef.current -= 1;
      // 次のタスクを処理
      setTimeout(() => {
        processQueue();
      }, 50);
    }
  }, [onUploadSuccess]);

  // 新規ファイルの追加
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setWarningMessage(null);
      const newTasks: UploadTask[] = [];
      const maxFileSize = serverInfo?.limits.maxFileSizeBytes || 500 * 1024 * 1024;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // フォルダ検出の簡易判定（webkitRelativePathやサイズが4096かつタイプ空など）
        // ブラウザによってフォルダが選択された場合の対策
        if ((file as any).isDirectory) {
          setWarningMessage('フォルダーのアップロードには対応していません。ファイルを指定してください。');
          continue;
        }

        const taskId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        if (file.size > maxFileSize) {
          newTasks.push({
            id: taskId,
            file,
            name: file.name,
            size: file.size,
            status: 'failed',
            progress: 0,
            errorMessage: `ファイルサイズ上限（${Math.round(maxFileSize / (1024 * 1024))} MiB）を超えています`,
          });
        } else {
          newTasks.push({
            id: taskId,
            file,
            name: file.name,
            size: file.size,
            status: 'pending',
            progress: 0,
          });
        }
      }

      if (newTasks.length > 0) {
        setTasks((prev) => [...prev, ...newTasks]);
        // キュー処理を開始
        setTimeout(() => {
          processQueue();
        }, 50);
      }
    },
    [serverInfo, processQueue]
  );

  // 失敗したタスクのリトライ
  const retryTask = useCallback(
    (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'pending', errorMessage: undefined } : t))
      );
      setTimeout(() => {
        processQueue();
      }, 50);
    },
    [processQueue]
  );

  // タスクのクリア（完了・失敗したものを除外）
  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
  }, []);

  return {
    tasks,
    warningMessage,
    setWarningMessage,
    addFiles,
    retryTask,
    removeTask,
    clearCompleted,
  };
}
