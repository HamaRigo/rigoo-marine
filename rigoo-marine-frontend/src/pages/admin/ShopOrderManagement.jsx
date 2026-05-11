/* eslint-disable react/prop-types */
import { Box, Chip, MenuItem, Select, Typography, Stack, Avatar, Card, CardContent, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import FilterableTable from '../../components/admin/FilterableTable';
import { shopApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatPrice } from '../../utils/format';

const STATUS_COLORS = {
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  CANCELLED: 'default',
  REFUNDED: 'info',
};

const STATUSES = ['PENDING_PAYMENT', 'PAID', 'CANCELLED', 'REFUNDED'];


function OrderItemsRow({ order }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  if (!order.items?.length) return null;
  return (
    <Card variant="outlined" sx={{ mt: 1, bgcolor: 'grey.50' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1}>
          {order.items.map((it) => (
            <Stack key={it.id} direction="row" spacing={2} alignItems="center">
              <Avatar variant="rounded" src={it.imageUrl} sx={{ width: 40, height: 40 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  {((isAr ? it.nameAr : it.nameEn) || it.nameEn)} × {it.quantity}
                </Typography>
                <Typography variant="caption" color="text.secondary">{it.sku}</Typography>
              </Box>
              <Typography variant="body2" fontWeight={500}>
                {formatPrice(it.lineTotalQar, { currency: order.currency || 'QAR' })}
              </Typography>
            </Stack>
          ))}
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Stripe Session</Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {order.stripeSessionId ? order.stripeSessionId.substring(0, 24) + '…' : '—'}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ShopOrderManagement() {
  const { t } = useTranslation('shop');
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [expandedId, setExpandedId] = useState(null);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await shopApi.updateAdminOrderStatus(id, newStatus);
      success(t('admin.orderInbox.statusUpdated'));
      queryClient.invalidateQueries({ queryKey: ['admin', 'shop-orders'] });
    } catch {
      error(t('admin.orderInbox.statusError'));
    }
  };

  const columns = [
    { id: 'orderNumber', label: t('admin.orderInbox.orderNumber') },
    {
      id: 'createdAt',
      label: t('admin.orderInbox.placedOn'),
      render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
    },
    { id: 'userEmail', label: t('admin.orderInbox.customer') },
    {
      id: 'items',
      label: t('admin.orderInbox.items'),
      render: (r) => (
        <Box
          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === r.id ? null : r.id); }}
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          <Typography variant="body2">
            {r.items?.length ?? 0} {expandedId === r.id ? '▼' : '▶'}
          </Typography>
          {expandedId === r.id && <OrderItemsRow order={r} />}
        </Box>
      ),
    },
    {
      id: 'total',
      label: t('admin.orderInbox.total'),
      render: (r) => (
        <Typography variant="body2" fontWeight={600}>
          {formatPrice(r.totalQar, { currency: r.currency || 'QAR' })}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: t('admin.orderInbox.status'),
      render: (r) => (
        <Select
          value={r.status}
          size="small"
          onChange={(e) => handleStatusChange(r.id, e.target.value)}
          sx={{ minWidth: 160, '& .MuiSelect-select': { py: 0.5 } }}
          renderValue={(v) => (
            <Chip
              size="small"
              label={t(`orders.statuses.${v}`, v)}
              color={STATUS_COLORS[v] || 'default'}
            />
          )}
        >
          {STATUSES.map((s) => (
            <MenuItem key={s} value={s}>{t(`orders.statuses.${s}`, s)}</MenuItem>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>{t('admin.orderInbox.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('admin.orderInbox.description')}
      </Typography>
      <FilterableTable
        queryKey={['admin', 'shop-orders']}
        fetchPage={(p) => shopApi.searchAdminOrders(p)}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="createdAt,desc"
        filters={[
          {
            id: 'status',
            label: t('admin.orderInbox.status'),
            options: STATUSES.map((s) => ({ value: s, label: t(`orders.statuses.${s}`) })),
          },
        ]}
      />
    </Box>
  );
}
