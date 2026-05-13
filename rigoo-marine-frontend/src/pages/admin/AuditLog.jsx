import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { formatDateTime } from '../../utils/format';

const ACTIONS = ['PASSWORD_RESET', 'ROLE_CHANGE', 'USER_DELETE'];

const ACTION_COLORS = {
  PASSWORD_RESET: 'warning',
  ROLE_CHANGE: 'info',
  USER_DELETE: 'error',
};

const LIMIT = 100;

export default function AuditLog() {
  const { t } = useTranslation('admin');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'audit', actionFilter, LIMIT],
    queryFn: () => adminApi.getAuditLog({
      action: actionFilter === 'all' ? undefined : actionFilter,
      limit: LIMIT,
    }),
  });

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>{t('audit.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('audit.subtitle')}
      </Typography>

      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>{t('audit.filterAction')}</InputLabel>
          <Select
            value={actionFilter}
            label={t('audit.filterAction')}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <MenuItem value="all">{t('audit.actions.all')}</MenuItem>
            {ACTIONS.map((a) => (
              <MenuItem key={a} value={a}>{t(`audit.actions.${a}`)}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert
          severity="error"
          action={
            <Box
              component="button"
              onClick={() => refetch()}
              sx={{ border: 'none', bgcolor: 'transparent', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {t('audit.retry')}
            </Box>
          }
        >
          {t('audit.errorFallback')}
        </Alert>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }} elevation={1}>
          <Typography variant="body1" color="text.secondary">
            {actionFilter === 'all'
              ? t('audit.empty.all')
              : t('audit.empty.filtered', { action: t(`audit.actions.${actionFilter}`) })}
          </Typography>
        </Paper>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('audit.columns.timestamp')}</TableCell>
                <TableCell>{t('audit.columns.actor')}</TableCell>
                <TableCell>{t('audit.columns.action')}</TableCell>
                <TableCell>{t('audit.columns.target')}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  {t('audit.columns.details')}
                </TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                  {t('audit.columns.ip')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" component="span" dir="ltr"><bdi>{row.actorEmail}</bdi></Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.action}
                      color={ACTION_COLORS[row.action] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {row.targetType}:{row.targetId ?? '—'}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {prettyDetails(row.details)}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }} dir="ltr">
                    <bdi>{row.ipAddress || '—'}</bdi>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

/** Pretty-print the audit `details` JSON, or render raw if not parseable. */
function prettyDetails(raw) {
  if (!raw) return '—';
  try {
    const obj = JSON.parse(raw);
    const keys = Object.keys(obj);
    if (keys.length === 0) return '—';
    return keys.map((k) => `${k}=${obj[k]}`).join(', ');
  } catch {
    return raw;
  }
}
