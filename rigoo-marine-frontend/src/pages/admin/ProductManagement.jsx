import { Box, Button, Chip, Stack, Typography, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import FilterableTable from '../../components/admin/FilterableTable';
import { shopApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../utils/format';

const STATUS_COLORS = {
  ACTIVE: 'success',
  DRAFT: 'info',
  ARCHIVED: 'default',
};

export default function ProductManagement() {
  const { t, i18n } = useTranslation('shop');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const isAr = i18n.language === 'ar';

  const handleDelete = async (id) => {
    if (!window.confirm(t('admin.deleteConfirm'))) return;
    try {
      await shopApi.deleteProduct(id);
      success(t('admin.deleted'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'shop-products'] });
    } catch {
      error(t('admin.deleteError'));
    }
  };

  const columns = [
    { id: 'id', label: t('admin.productColumns.id') },
    { id: 'sku', label: t('admin.productColumns.sku'), render: (r) => r.sku || '—' },
    {
      id: 'name',
      label: t('admin.productColumns.name'),
      render: (r) => (isAr ? r.nameAr : r.nameEn) || r.nameEn || '—',
    },
    {
      id: 'category',
      label: t('admin.productColumns.category'),
      render: (r) => (
        <Chip size="small" label={t(`categories.${r.category}`, r.category)} color="primary" />
      ),
    },
    { id: 'brand', label: t('admin.productColumns.brand'), render: (r) => r.brand || '—' },
    {
      id: 'price',
      label: t('admin.productColumns.price'),
      render: (r) => formatPrice(r.priceQar, { currency: r.currency || 'QAR', maximumFractionDigits: 0 }),
    },
    {
      id: 'stock',
      label: t('admin.productColumns.stock'),
      render: (r) => {
        const q = r.stockQty ?? 0;
        if (q <= 0) return <Chip size="small" label={t('card.outOfStock')} />;
        if (q <= 3) return <Chip size="small" color="warning" label={t('card.lowStock', { count: q })} />;
        return <Chip size="small" color="success" label={String(q)} />;
      },
    },
    {
      id: 'status',
      label: t('admin.productColumns.status'),
      render: (r) => (
        <Chip size="small" label={t(`status.${r.status}`, r.status)} color={STATUS_COLORS[r.status] || 'default'} />
      ),
    },
  ];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">{t('admin.products')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/admin/products/new')}>
          {t('admin.newProduct')}
        </Button>
      </Stack>

      <FilterableTable
        queryKey={['admin', 'shop-products']}
        fetchPage={(p) => shopApi.searchProducts({ ...p, adminStatus: p.status || 'ALL' })}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="createdAt,desc"
        filters={[
          {
            id: 'status',
            label: t('admin.fields.status'),
            options: ['DRAFT', 'ACTIVE', 'ARCHIVED'].map((s) => ({
              value: s,
              label: t(`status.${s}`),
            })),
          },
          {
            id: 'category',
            label: t('admin.fields.category'),
            options: [
              { value: 'PART', label: t('categories.PART') },
              { value: 'TOOL', label: t('categories.TOOL') },
            ],
          },
        ]}
        renderActions={(row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title={t('admin.editProduct')}>
              <IconButton size="small" onClick={() => navigate(`/admin/products/${row.id}/edit`)}>
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
