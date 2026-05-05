import { Box, Chip, MenuItem, Select, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import FilterableTable from '../../components/admin/FilterableTable';
import { shopApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';

const STATUS_COLORS = {
  NEW: 'info',
  IN_PROGRESS: 'warning',
  CLOSED: 'default',
};

const STATUSES = ['NEW', 'IN_PROGRESS', 'CLOSED'];
const TYPES = ['QUOTE', 'STOCK_CHECK', 'GENERAL'];

export default function ProductInquiryManagement() {
  const { t } = useTranslation('shop');
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const handleStatusChange = async (id, newStatus) => {
    try {
      await shopApi.updateInquiryStatus(id, newStatus);
      success(t('admin.inquiryStatusUpdated'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'shop-inquiries'] });
    } catch {
      error(t('admin.saveError'));
    }
  };

  const columns = [
    { id: 'id', label: t('admin.inquiryColumns.id') },
    {
      id: 'inquiryType',
      label: t('admin.inquiryColumns.type'),
      render: (r) => <Chip size="small" label={t(`inquiry.types.${r.inquiryType}`, r.inquiryType)} />,
    },
    { id: 'name', label: t('admin.inquiryColumns.name') },
    { id: 'email', label: t('admin.inquiryColumns.email') },
    { id: 'phone', label: t('admin.inquiryColumns.phone'), render: (r) => r.phone || '—' },
    {
      id: 'productId',
      label: t('admin.inquiryColumns.productId'),
      render: (r) => r.productId ?? '—',
    },
    {
      id: 'quantity',
      label: t('admin.inquiryColumns.quantity'),
      render: (r) => r.quantity ?? '—',
    },
    {
      id: 'status',
      label: t('admin.inquiryColumns.status'),
      render: (r) => (
        <Select
          value={r.status}
          size="small"
          onChange={(e) => handleStatusChange(r.id, e.target.value)}
          sx={{
            minWidth: 140,
            '& .MuiSelect-select': { py: 0.5 },
          }}
          renderValue={(v) => (
            <Chip size="small" label={v} color={STATUS_COLORS[v] || 'default'} />
          )}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      ),
    },
    {
      id: 'createdAt',
      label: t('admin.inquiryColumns.createdAt'),
      render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('admin.inquiries')}</Typography>
      <FilterableTable
        queryKey={['admin', 'shop-inquiries']}
        fetchPage={(p) => shopApi.searchInquiries(p)}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="createdAt,desc"
        filters={[
          {
            id: 'status',
            label: t('admin.inquiryColumns.status'),
            options: STATUSES.map((s) => ({ value: s, label: s })),
          },
          {
            id: 'inquiryType',
            label: t('admin.inquiryColumns.type'),
            options: TYPES.map((s) => ({ value: s, label: t(`inquiry.types.${s}`) })),
          },
        ]}
      />
    </Box>
  );
}
