import { useState } from 'react';
import {
  Box, Typography, Card, CardContent, List, ListItem, ListItemText,
  ListItemButton, Stack, Button, Chip, Pagination, Skeleton, Alert,
} from '@mui/material';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import NotificationsOffRoundedIcon from '@mui/icons-material/NotificationsOffRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotificationsPage, useMarkRead, useMarkAllRead } from '../../hooks/notifications/useNotifications';
import { Reveal, Stagger } from '../../components/common/Motion';

const PAGE_SIZE = 20;

const formatRelative = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

/**
 * Dedicated notifications feed. Paged at 20/row; clicking an unread row
 * marks it read in place (no navigation — the user is already on the feed
 * page).
 */
export default function Notifications() {
  const { t } = useTranslation('notifications');
  const [page, setPage] = useState(0);

  const { data, isLoading, error } = useNotificationsPage({ page, size: PAGE_SIZE });
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={240} height={48} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error">{error.response?.data?.message || error.message}</Alert>;
  }

  const items = data?.content || [];
  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} mb={2} flexWrap="wrap">
        <Typography variant="h4">{t('page.title')}</Typography>
        <Chip size="small" label={totalElements} sx={{ ml: 1 }} />
        <Box sx={{ flexGrow: 1 }} />
        <Button
          startIcon={<DoneAllRoundedIcon />}
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          variant="outlined"
          size="small"
        >
          {t('page.markAll')}
        </Button>
      </Stack>

      {items.length === 0 ? (
        <Reveal variant="fade" timeout={420}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <NotificationsOffRoundedIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.5, mb: 1.5 }} />
              <Typography variant="h6">{t('page.empty')}</Typography>
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Stagger variant="fade" step={50} timeout={400}>
          <Card>
            <List sx={{ py: 0 }}>
              {items.map((n, idx) => (
                <Box key={n.id}>
                  <ListItem
                    disablePadding
                    sx={{ bgcolor: n.read ? 'transparent' : 'action.hover' }}
                  >
                    <ListItemButton
                      onClick={() => !n.read && markRead.mutate(n.id)}
                      sx={{ alignItems: 'flex-start', py: 1.75 }}
                    >
                      {/* Unread marker dot — primary-color pip in the leading
                          gutter; absent on read rows. */}
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: n.read ? 'transparent' : 'primary.main',
                          mt: 0.75, mr: 1.5, flexShrink: 0,
                        }}
                      />
                      <ListItemText
                        primary={n.title}
                        secondary={
                          <>
                            <Box component="span" sx={{ display: 'block' }}>{n.message}</Box>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {formatRelative(n.createdAt)}
                              {n.type && <> · {n.type}</>}
                            </Typography>
                          </>
                        }
                        primaryTypographyProps={{ fontWeight: n.read ? 400 : 600 }}
                      />
                      {/* Book-now CTA. Notifications with an actionUrl are
                          deep-links into a pre-filled form (e.g. service-
                          request seeded with vessel + serviceType). The
                          button is the highest-leverage interaction on the
                          row — fixed-right + primary-coloured so it doesn't
                          get lost in the secondary metadata. */}
                      {n.actionUrl && (
                        <Button
                          component={Link}
                          to={n.actionUrl}
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<EventAvailableRoundedIcon />}
                          onClick={(e) => {
                            e.stopPropagation(); // don't also fire markRead
                            if (!n.read) markRead.mutate(n.id);
                          }}
                          sx={{ flexShrink: 0, ml: 1 }}
                        >
                          {t('bookNow')}
                        </Button>
                      )}
                    </ListItemButton>
                  </ListItem>
                  {idx < items.length - 1 && <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
                </Box>
              ))}
            </List>
          </Card>
        </Stagger>
      )}

      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, v) => setPage(v - 1)}
            color="primary"
          />
        </Stack>
      )}
    </Box>
  );
}
