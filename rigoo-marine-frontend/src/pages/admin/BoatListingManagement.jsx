import { Box, Button, Chip, Stack, Typography, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
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
};

export default function BoatListingManagement() {
  const { t, i18n } = useTranslation('marketplace');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const isAr = i18n.language === 'ar';

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
      id: 'status',
      label: t('admin.listingColumns.status'),
      render: (r) => (
        <Chip size="small" label={t(`status.${r.status}`, r.status)} color={STATUS_COLORS[r.status] || 'default'} />
      ),
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
            options: ['DRAFT', 'AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED'].map((s) => ({
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
    </Box>
  );
}
