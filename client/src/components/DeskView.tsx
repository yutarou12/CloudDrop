import React, { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Typography,
  Chip,
  Paper,
  useMediaQuery,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { FileSummary } from '../types/file';
import { getRemainingTime, formatBytes } from '../utils/format';
import { getDeterministicDeskTransform } from '../utils/hash';
import { getPreviewUrl } from '../api/client';
import { FileIcon } from './FileIcon';

interface Props {
  files: FileSummary[];
  onSelectFile: (file: FileSummary) => void;
}

export const DeskView: React.FC<Props> = ({ files, onSelectFile }) => {
  // ユーザーがOSで動き軽減を設定しているか判定
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

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
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },
        borderRadius: 3,
        // 淡い木目・デスク調の温かみのある背景
        background: 'linear-gradient(135deg, #eaddd3 0%, #ecdcd1 50%, #e2d1c3 100%)',
        boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.08)',
        minHeight: 450,
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(auto-fill, minmax(140px, 1fr))',
          sm: 'repeat(auto-fill, minmax(180px, 1fr))',
          md: 'repeat(auto-fill, minmax(200px, 1fr))',
        },
        gap: { xs: 2.5, sm: 3, md: 3.5 },
        alignItems: 'start',
      }}
    >
      {files.map((file) => {
        const remaining = getRemainingTime(file.expiresAt);
        const transform = getDeterministicDeskTransform(file.id);

        const rotate = prefersReducedMotion ? 0 : transform.rotateDeg;
        const offsetX = prefersReducedMotion ? 0 : transform.offsetX;
        const offsetY = prefersReducedMotion ? 0 : transform.offsetY;

        return (
          <DeskCardItem
            key={file.id}
            file={file}
            remaining={remaining}
            rotate={rotate}
            offsetX={offsetX}
            offsetY={offsetY}
            prefersReducedMotion={prefersReducedMotion}
            onSelectFile={onSelectFile}
          />
        );
      })}
    </Box>
  );
};

interface CardItemProps {
  file: FileSummary;
  remaining: { text: string; isExpired: boolean };
  rotate: number;
  offsetX: number;
  offsetY: number;
  prefersReducedMotion: boolean;
  onSelectFile: (file: FileSummary) => void;
}

const DeskCardItem: React.FC<CardItemProps> = ({
  file,
  remaining,
  rotate,
  offsetX,
  offsetY,
  prefersReducedMotion,
  onSelectFile,
}) => {
  const [imgLoadError, setImgLoadError] = useState(false);
  const showThumbnail = file.previewable && !imgLoadError;

  return (
    <Card
      elevation={2}
      sx={{
        backgroundColor: '#fffdfa', // 紙のようなアイボリーホワイト
        borderRadius: 1.5,
        transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)`,
        transition: prefersReducedMotion
          ? 'none'
          : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease',
        boxShadow: '0 4px 10px rgba(70, 50, 40, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
        position: 'relative',
        '&:hover, &:focus-within': {
          transform: prefersReducedMotion
            ? 'none'
            : `translate(${offsetX}px, ${offsetY - 4}px) rotate(0deg) scale(1.03)`,
          boxShadow: '0 12px 24px rgba(70, 50, 40, 0.2), 0 3px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 10,
        },
      }}
    >
      {/* 紙の上部のクリップ・テープ風装飾ライン */}
      <Box
        sx={{
          height: 3,
          backgroundColor: file.previewable ? '#4caf50' : '#2196f3',
          opacity: 0.8,
        }}
      />

      <CardActionArea
        onClick={() => onSelectFile(file)}
        sx={{
          p: { xs: 1.5, sm: 2 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          height: '100%',
        }}
      >
        {/* サムネイルまたは大型アイコン */}
        <Box
          sx={{
            height: { xs: 100, sm: 120 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f7f5f0',
            borderRadius: 1,
            overflow: 'hidden',
            mb: 1.5,
          }}
        >
          {showThumbnail ? (
            <img
              src={getPreviewUrl(file.id)}
              alt={file.originalName}
              onError={() => setImgLoadError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              loading="lazy"
            />
          ) : (
            <FileIcon
              filename={file.originalName}
              mimeType={file.mimeType}
              fontSize="large"
              sx={{ fontSize: { xs: 44, sm: 54 } }}
            />
          )}
        </Box>

        {/* ファイル名 */}
        <Typography
          variant="body2"
          component="div"
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.3,
            minHeight: '2.6em',
            wordBreak: 'break-all',
            mb: 0.5,
          }}
          title={file.originalName}
        >
          {file.originalName}
        </Typography>

        {/* サイズ */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {formatBytes(file.sizeBytes)}
        </Typography>

        {/* 残り時間バッジ */}
        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
          <Chip
            icon={<AccessTimeIcon sx={{ fontSize: '0.9rem !important' }} />}
            label={remaining.text}
            size="small"
            color={remaining.isExpired ? 'default' : 'warning'}
            variant="outlined"
            sx={{
              height: 22,
              fontSize: '0.68rem',
              fontWeight: 500,
              maxWidth: '100%',
            }}
          />
        </Box>
      </CardActionArea>
    </Card>
  );
};
