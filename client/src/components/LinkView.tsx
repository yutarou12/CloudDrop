import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Link, Paper, TextField, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { LinkSummary } from '../types/file';
import { deleteLink, fetchLinks, saveLink } from '../api/client';
import { formatDateTimeWithSeconds } from '../utils/format';

// LANのHTTP接続ではClipboard APIが利用できないため、選択コピーも使用する。
async function copyUrl(url: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(url); return; } catch { /* fallback */ }
  }
  const previous = document.activeElement as HTMLElement | null;
  const field = document.createElement('textarea');
  field.value = url;
  field.readOnly = true;
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  try {
    field.select();
    field.setSelectionRange(0, field.value.length);
    if (!document.execCommand('copy')) throw new Error('コピーできませんでした。URLを選択してコピーしてください');
  } finally {
    field.remove();
    previous?.focus();
  }
}

interface Props {
  onNotify: (message: string, severity: 'success' | 'info' | 'error') => void;
}

export const LinkView: React.FC<Props> = ({ onNotify }) => {
  const [links, setLinks] = useState<LinkSummary[]>([]);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetching = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const data = await fetchLinks();
      if (mounted.current) { setLinks(data); setError(null); }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'リンク一覧の取得に失敗しました');
    } finally {
      fetching.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => {
      setLinks((prev) => prev.filter((link) => Date.parse(link.expiresAt) > Date.now()));
      void refresh();
    }, 5000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, [refresh]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await saveLink(url);
      setUrl('');
      onNotify('リンクを保存しました（24時間保管）', 'success');
      await refresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'リンクの保存に失敗しました', 'error');
    } finally { setSaving(false); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <LinkIcon color="primary" />
        <Typography variant="h6" fontWeight="bold">リンク共有</Typography>
        <Typography variant="caption" color="text.secondary">({links.length} 件)</Typography>
      </Box>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
        URLを保存して、ほかの端末からコピーできます。登録から24時間後に自動削除されます。
      </Typography>
      <Paper component="form" onSubmit={submit} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField label="共有するURL" placeholder="https://example.com" type="url" required fullWidth
            value={url} onChange={(event) => setUrl(event.target.value)} disabled={saving}
            inputProps={{ maxLength: 8192 }} size="small" />
          <Button type="submit" variant="contained" disabled={saving || !url.trim()} sx={{ flexShrink: 0 }}>
            {saving ? '保存中…' : '保存する'}
          </Button>
        </Box>
      </Paper>
      {error && <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => void refresh()}>再試行</Button>}>{error}</Alert>}
      {loading ? <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box> : links.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}><Typography color="text.secondary">保存されたリンクはありません。</Typography></Paper>
      ) : links.map((link) => (
        <Paper key={link.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
          <Link href={link.url} target="_blank" rel="noopener noreferrer" sx={{ overflowWrap: 'anywhere' }}>{link.url}</Link>
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
              登録: {formatDateTimeWithSeconds(link.createdAt)}<br />
              保管期限: {formatDateTimeWithSeconds(link.expiresAt)}
            </Typography>
            <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={async () => {
              try { await copyUrl(link.url); onNotify('リンクをコピーしました', 'success'); }
              catch (err) { onNotify(err instanceof Error ? err.message : 'コピーに失敗しました', 'error'); }
            }}>コピー</Button>
            <Button size="small" color="error" onClick={async () => {
              try {
                await deleteLink(link.id);
                setLinks((prev) => prev.filter((item) => item.id !== link.id));
                onNotify('リンクを削除しました', 'info');
                await refresh();
              } catch { onNotify('リンクの削除に失敗しました', 'error'); }
            }}>削除</Button>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};
