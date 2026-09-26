import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';

interface Props {
  open: boolean;
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<Props> = ({ open, filename, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>ファイルの削除</DialogTitle>
      <DialogContent>
        <DialogContentText>
          「<strong>{filename}</strong>」をサーバーから削除しますか？<br />
          この操作は元に戻せません。
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ pb: 2, px: 3 }}>
        <Button onClick={onCancel} color="inherit">
          キャンセル
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained">
          削除する
        </Button>
      </DialogActions>
    </Dialog>
  );
};
