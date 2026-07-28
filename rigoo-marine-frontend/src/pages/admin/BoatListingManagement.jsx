/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  Box, Button, Chip, Stack, Typography, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  InputAdornment, Alert, CircularProgress,
} from '@mui/material';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import FilterableTable from '../../components/admin/FilterableTable';
import { marketplaceApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../utils/format';

const STATUS_COLORS = {
  AVAILABLE: 'success',
  RESERVED: 'warning',
  SOLD: 'default',
  ARCHIVED: 'default',
  DRAFT: 'info',
  PENDING_REVIEW: 'warning',
  REJECTED: 'error',
};

// ── Approve dialog ────────────────────────────────────────────────────────

function ApproveDialog({ listing, onClose }) {
  const { t } = useTranslation('marketplace');
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [gainPct, setGainPct] = useState('');

  const mutation = useMutation({
    mutationFn: () => marketplaceApi.approveListing(listing.id, {
      companyGainPct: gainPct !== '' ? parseFloat(gainPct) : 0,
    }),
    onSuccess: () => {
      success(t('admin.approveListing') + ' ✓');
      queryClient.invalidateQueries({ queryKey: ['admin', 'boat-listings'] });
      onClose();
    },
    onError: () => error('Failed to approve listing'),
  });

  return (
    <Dialog open={!!listing} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{t('admin.approveDialog.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('admin.approveDialog.body')}
        </Typography>
        <TextField
          label={t('admin.companyGainPct')}
          type="number"
          value={gainPct}
          onChange={e => setGainPct(e.target.value)}
          fullWidth
          autoFocus
          inputProps={{ min: 0, max: 100, step: 0.5 }}
          InputProps={{
            endAdornment: <InputAdornment position="end">%</InputAdornment>,
          }}
          helperText={t('admin.companyGainPctHelp')}
        />
        {gainPct !== '' && listing && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {listing.salePrice && (
              <span>Sale: {formatPrice(listing.salePrice * (1 + parseFloat(gainPct || 0) / 100), { maximumFractionDigits: 0 })} effective price</span>
            )}
            {listing.dailyRate && (
              <span>Daily: {formatPrice(listing.dailyRate * (1 + parseFloat(gainPct || 0) / 100), { maximumFractionDigits: 0 })} / day effective</span>
            )}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>{t('admin.cancel')}</Button>
        <Button
          variant="contained"
          color="success"
          startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : <CheckCircleOutlineIcon />}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {t('admin.approveDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Reject dialog ─────────────────────────────────────────────────────────

function RejectDialog({ listing, onClose }) {
  const { t } = useTranslation('marketplace');
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => marketplaceApi.rejectListing(listing.id, reason),
    onSuccess: () => {
      success('Listing rejected');
      queryClient.invalidateQueries({ queryKey: ['admin', 'boat-listings'] });
      onClose();
    },
    onError: () => error('Failed to reject listing'),
  });

  return (
    <Dialog open={!!listing} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{t('admin.rejectDialog.title')}</DialogTitle>
      <DialogContent>
        <TextField
          label={t('admin.rejectDialog.reason')}
          multiline
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
          fullWidth
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={mutation.isPending}>{t('admin.cancel')}</Button>
        <Button
          variant="contained"
          color="error"
          startIcon={mutation.isPending ? <CircularProgress size={14} color="inherit" /> : <CancelOutlinedIcon />}
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {t('admin.rejectDialog.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function BoatListingManagement() {
  const { t, i18n } = useTranslation('marketplace');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const isAr = i18n.language === 'ar';

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.deleteConfirm'))) return;
    try {
      await marketplaceApi.deleteListing(id);
      success(t('admin.deleted'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'boat-listings'] });
    } catch {
      error(t('admin.deleteError'));
    }
  };

  const columns = [
    { id: 'id', label: t('admin.listingColumns.id') },
    {
      id: 'title',
      label: t('admin.listingColumns.title'),
      render: (r) => (isAr ? r.titleAr : r.titleEn) || r.titleEn || '—',
    },
    {
      id: 'type',
      label: t('admin.listingColumns.type'),
      render: (r) => r.boatType || '—',
    },
    {
      id: 'modes',
      label: t('admin.listingColumns.modes'),
      render: (r) => (
        <Stack direction="row" spacing={0.5}>
          {r.forSale && <Chip size="small" label={t('modes.buy')} color="primary" />}
          {r.forRent && <Chip size="small" label={t('modes.rent')} color="secondary" />}
        </Stack>
      ),
    },
    {
      id: 'price',
      label: t('admin.listingColumns.price'),
      render: (r) =>
        r.salePrice
          ? formatPrice(r.salePrice, { currency: r.currency || 'QAR', maximumFractionDigits: 0 })
          : r.dailyRate
          ? `${formatPrice(r.dailyRate, { currency: r.currency || 'QAR', maximumFractionDigits: 0 })} / d`
          : '—',
    },
    {
      id: 'companyGainPct',
      label: t('admin.listingColumns.gain'),
      render: (r) => r.companyGainPct != null ? `${r.companyGainPct}%` : '—',
    },
    {
      id: 'status',
      label: t('admin.listingColumns.status'),
      render: (r) => (
        <Chip size="small" label={t(`status.${r.status}`, r.status)} color={STATUS_COLORS[r.status] || 'default'} />
      ),
    },
    {
      id: 'reviewedBy',
      label: t('admin.listingColumns.reviewedBy', 'Reviewed By'),
      render: (r) => r.reviewedByEmail ? (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <VerifiedUserOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Stack>
            <Typography variant="caption" noWrap sx={{ maxWidth: 140 }}>{r.reviewedByEmail}</Typography>
            <Typography variant="caption" color="text.disabled">
              {r.reviewedByRole} · {new Date(r.reviewedAt).toLocaleDateString()}
            </Typography>
          </Stack>
        </Stack>
      ) : '—',
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">{t('admin.listings')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/admin/boats/new')}>
          {t('admin.newListing')}
        </Button>
      </Stack>

      <FilterableTable
        queryKey={['admin', 'boat-listings']}
        fetchPage={(p) => marketplaceApi.searchListings({ ...p, adminStatus: p.status || 'ALL' })}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="createdAt,desc"
        filters={[
          {
            id: 'status',
            label: t('admin.fields.status'),
            options: ['PENDING_REVIEW', 'DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED', 'REJECTED'].map((s) => ({
              value: s,
              label: t(`status.${s}`),
            })),
          },
          {
            id: 'mode',
            label: t('admin.listingColumns.modes'),
            options: [
              { value: 'BUY', label: t('modes.buy') },
              { value: 'RENT', label: t('modes.rent') },
            ],
          },
        ]}
        renderActions={(row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            {row.status === 'PENDING_REVIEW' && (
              <>
                <Tooltip title={t('admin.approveListing')}>
                  <IconButton size="small" color="success" onClick={() => setApproveTarget(row)}>
                    <CheckCircleOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('admin.rejectListing')}>
                  <IconButton size="small" color="error" onClick={() => setRejectTarget(row)}>
                    <CancelOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title={t('admin.editListing')}>
              <IconButton size="small" onClick={() => navigate(`/admin/boats/${row.id}/edit`)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('admin.delete')}>
              <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      />

      <ApproveDialog listing={approveTarget} onClose={() => setApproveTarget(null)} />
      <RejectDialog listing={rejectTarget} onClose={() => setRejectTarget(null)} />
    </Box>
  );
}
