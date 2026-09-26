import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import ViewListIcon from '@mui/icons-material/ViewList';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WifiIcon from '@mui/icons-material/Wifi';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import HistoryIcon from '@mui/icons-material/History';
import { ViewMode, PageTab, ServerInfo } from '../types/file';

interface Props {
  currentTab: PageTab;
  onTabChange: (tab: PageTab) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  serverInfo: ServerInfo | null;
}

export const Header: React.FC<Props> = ({
  currentTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  serverInfo,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: ViewMode | null
  ) => {
    if (newMode !== null) {
      onViewModeChange(newMode);
    }
  };

  const hostDisplay = serverInfo
    ? `${serverInfo.server.localIp}:${serverInfo.server.port}`
    : window.location.host;

  return (
    <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1.5, sm: 3 } }}>
        {/* 左側: サービスタイトル & 接続先 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon color="primary" sx={{ fontSize: { xs: 26, sm: 32 } }} />
          <Box>
            <Typography
              variant={isMobile ? 'subtitle1' : 'h6'}
              component="h1"
              sx={{ fontWeight: 'bold', lineHeight: 1.2 }}
            >
              CloudDrop
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.2 }}>
              <WifiIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                接続先: {hostDisplay}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* 中央〜右側: ページタブ & 表示切替 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
          <Tabs
            value={currentTab}
            onChange={(_e, val) => onTabChange(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                py: 0.5,
                px: { xs: 1, sm: 2 },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                fontWeight: 600,
              },
            }}
          >
            <Tab
              value="transfer"
              icon={<FolderSharedIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="共有"
            />
            <Tab
              value="logs"
              icon={<HistoryIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="ログ"
            />
          </Tabs>

          {/* 共有タブ選択時のみ表示切替トグルを表示 */}
          {currentTab === 'transfer' && (
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleModeChange}
              size="small"
              aria-label="表示モード切替"
            >
              <ToggleButton value="list" aria-label="一覧表示">
                <ViewListIcon fontSize="small" sx={{ mr: { xs: 0, sm: 0.5 } }} />
                {!isMobile && <span>一覧</span>}
              </ToggleButton>
              <ToggleButton value="desk" aria-label="机上表示">
                <DashboardCustomizeIcon fontSize="small" sx={{ mr: { xs: 0, sm: 0.5 } }} />
                {!isMobile && <span>机上</span>}
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};
