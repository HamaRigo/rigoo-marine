import { useState } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, List, ListItem, ListItemText,
  ListItemButton, Divider, Button, Tooltip, CircularProgress, Stack,
} from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUnreadCount, useUnreadList, useMarkRead, useMarkAllRead } from '../../hooks/notifications/useNotifications';

/**
 * Navbar bell with unread badge + dropdown. The badge polls every 30s
 * (see useUnreadCount); the dropdown list is fetched lazily — first render
 * happens only when the user opens the popover, so an idle session doesn't
 * pay the cost.
 *
 * Click a row → mark-read + close popover (the user has acknowledged it).
 * The full feed lives at /dashboard/notifications.
 */
export default function NotificationBell() {
  const { t } = useTranslation('notifications');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const { data: count = 0 } = useUnreadCount();
  const { data: items, isLoading: listLoading } = useUnreadList(open);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleRowClick = (item) => {
    markRead.mutate(item.id);
    handleClose();
  };

  return (
    <>
      <Tooltip title={t('bell.tooltip')}>
        <IconButton
          color="inherit"
          onClick={handleOpen}
          aria-label={t('bell.tooltip')}
          sx={{ position: 'relative' }}
        >
          <Badge
            badgeContent={count > 99 ? '99+' : count}
            color="error"
            invisible={count === 0}
            overlap="circular"
          >
            <NotificationsOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480 } } }}
      >
        <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {t('bell.title')}
          </Typography>
          <Tooltip title={t('bell.markAll')}>
            <span>
              <IconButton
                size="small"
                onClick={() => markAllRead.mutate()}
                disabled={count === 0 || markAllRead.isPending}
              >
                <DoneAllRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Divider />

        {listLoading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress size={20} />
          </Box>
        ) : !items || items.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('bell.empty')}
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ py: 0 }}>
            {items.slice(0, 8).map((n) => (
              <ListItem key={n.id} disablePadding>
                <ListItemButton onClick={() => handleRowClick(n)} sx={{ alignItems: 'flex-start' }}>
                  <ListItemText
                    primary={n.title}
                    secondary={n.message}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      sx: {
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        <Divider />
        <Button
          component={Link}
          to="/dashboard/notifications"
          onClick={handleClose}
          fullWidth
          startIcon={<OpenInNewRoundedIcon />}
          sx={{ borderRadius: 0, py: 1.25 }}
        >
          {t('bell.viewAll')}
        </Button>
      </Popover>
    </>
  );
}
