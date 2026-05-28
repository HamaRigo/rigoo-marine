/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Card, CardContent, Chip, Stack, Skeleton,
  Divider, IconButton, Pagination,
} from '@mui/material';
import Button from '@mui/material/Button';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import { shopApi } from '../../services/api';
import { formatPrice } from '../../utils/format';
import { Reveal, Stagger, HoverLift } from '../../components/common/Motion';

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_META = {
  PENDING_PAYMENT: { color: 'warning', bg: '#fff8e1' },
  PAID:            { color: 'success', bg: '#e8f5e9' },
  CANCELLED:       { color: 'default', bg: '#f5f5f5' },
  REFUNDED:        { color: 'info',    bg: '#e3f2fd' },
};

// ── Mini status stepper ────────────────────────────────────────────────────

function PaymentStepper({ status }) {
  const { t } = useTranslation('shop');

  if (status === 'CANCELLED') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" py={0.5}>
        <CancelIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {t('orders.statuses.CANCELLED')}
        </Typography>
      </Stack>
    );
  }
  if (status === 'REFUNDED') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" py={0.5}>
        <InventoryRoundedIcon sx={{ fontSize: 18, color: 'info.main' }} />
        <Typography variant="caption" color="info.main" fontWeight={600}>
          {t('orders.statuses.REFUNDED')}
        </Typography>
      </Stack>
    );
  }

  const paid = status === 'PAID';
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Stack direction="row" spacing={0.75} alignItems="center">
        {paid
          ? <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
          : <CheckCircleIcon sx={{ fontSize: 18, color: 'warning.main' }} />}
        <Typography variant="caption" fontWeight={paid ? 400 : 700} color={paid ? 'text.secondary' : 'warning.main'}>
          {t('orders.statuses.PENDING_PAYMENT')}
        </Typography>
      </Stack>
      <Box sx={{ flex: 1, height: 2, bgcolor: paid ? 'success.main' : 'divider', borderRadius: 1, transition: 'background 300ms' }} />
      <Stack direction="row" spacing={0.75} alignItems="center">
        {paid
          ? <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
          : <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
        <Typography variant="caption" fontWeight={paid ? 700 : 400} color={paid ? 'success.main' : 'text.disabled'}>
          {t('orders.statuses.PAID')}
        </Typography>
      </Stack>
    </Stack>
  );
}

// ── Order card ─────────────────────────────────────────────────────────────

function ShopOrderCard({ order }) {
  const { t, i18n } = useTranslation('shop');
  const isAr   = i18n.language === 'ar';
  const [expanded, setExpanded] = useState(false);
  const meta   = STATUS_META[order.status] ?? STATUS_META.PENDING_PAYMENT;
  const items  = order.items ?? [];
  const shown  = expanded ? items : items.slice(0, 3);
  const extra  = items.length - 3;

  return (
    <HoverLift lift={4}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          borderColor: 'divider',
        }}
      >
        {/* ── Hero band ── */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
            px: 2.5, pt: 2, pb: 2.75,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{
            position: 'absolute', bottom: -1, left: 0, right: 0, height: 20,
            bgcolor: 'background.paper',
            clipPath: 'ellipse(60% 100% at 50% 100%)',
          }} />
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.15)', fontSize: '1.4rem',
              }}>
                🛒
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                  {t('orders.orderNumber')} {order.orderNumber}
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="white" lineHeight={1.2}>
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={t(`orders.statuses.${order.status}`, { defaultValue: order.status })}
              color={meta.color}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.7rem', height: 24 }}
            />
          </Stack>
        </Box>

        <CardContent sx={{ pt: 1.5 }}>
          {/* Payment stepper */}
          <Box sx={{ mb: 1.5 }}>
            <PaymentStepper status={order.status} />
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          {/* Items list */}
          <Stack spacing={0.75}>
            {shown.map((it) => (
              <Stack key={it.id} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>
                  {(isAr ? it.nameAr : it.nameEn) || it.nameEn}
                  <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.75 }}>
                    × {it.quantity}
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {formatPrice(it.lineTotalQar, { currency: order.currency || 'QAR' })}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {items.length > 3 && (
            <IconButton
              size="small"
              onClick={() => setExpanded(e => !e)}
              sx={{ p: 0, mt: 0.75, color: 'primary.main' }}
            >
              <ExpandMoreIcon
                fontSize="small"
                sx={{ transition: 'transform 200ms', transform: expanded ? 'rotate(180deg)' : 'none' }}
              />
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                {expanded ? 'Show less' : `+ ${extra} more`}
              </Typography>
            </IconButton>
          )}

          {/* Total row */}
          <Box sx={{
            mt: 1.5, p: 1.25, borderRadius: 2,
            bgcolor: meta.bg,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              {t('orders.total')}
            </Typography>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {formatPrice(order.totalQar, { currency: order.currency || 'QAR' })}
            </Typography>
          </Box>

          {/* Footer */}
          <Divider sx={{ mt: 1.5, mb: 1.25 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.disabled">
              {t('orders.placedOn')}: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </HoverLift>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function ShopOrderSkeleton() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={90} />
      <CardContent>
        <Skeleton variant="rounded" height={28} sx={{ mb: 1.5 }} />
        <Skeleton width="90%" />
        <Skeleton width="70%" sx={{ mt: 0.5 }} />
        <Skeleton width="50%" sx={{ mt: 0.5 }} />
        <Skeleton variant="rounded" height={42} sx={{ mt: 1.5 }} />
      </CardContent>
    </Card>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation('shop');
  const navigate = useNavigate();
  return (
    <Reveal variant="fade">
      <Box
        sx={{
          textAlign: 'center', py: 10,
          background: 'radial-gradient(ellipse at center, rgba(0,105,148,0.05) 0%, transparent 70%)',
          borderRadius: 4,
        }}
      >
        <Box sx={{
          width: 96, height: 96, borderRadius: '50%', mx: 'auto', mb: 3,
          background: 'linear-gradient(135deg, #006994 0%, #004263 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,105,148,0.25)',
          animation: 'rmFloat 4s ease-in-out infinite',
        }}>
          <ShoppingBagOutlinedIcon sx={{ fontSize: 44, color: 'white' }} />
        </Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {t('orders.empty')}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
          Browse our marine parts and tools shop to place your first order.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<ShoppingBagOutlinedIcon />}
          onClick={() => navigate('/shop')}
          sx={{ px: 4 }}
        >
          {t('orders.browseShop')}
        </Button>
      </Box>
    </Reveal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

export default function MyShopOrders() {
  const { t } = useTranslation('shop');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop', 'my-orders', page],
    queryFn: () => shopApi.getMyOrders(page - 1, PAGE_SIZE),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const orders      = data?.content    ?? [];
  const totalPages  = data?.totalPages ?? 0;
  const totalItems  = data?.totalElements ?? 0;

  if (isError) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>{t('orders.title')}</Typography>
        <Box sx={{ color: 'error.main', textAlign: 'center', py: 6 }}>
          <Typography>Failed to load orders. Please try again.</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* ── Header ── */}
      <Reveal variant="fade">
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={700}>{t('orders.title')}</Typography>
            {!isLoading && totalItems > 0 && (
              <Typography variant="body2" color="text.secondary">
                {totalItems} order{totalItems !== 1 ? 's' : ''} total
              </Typography>
            )}
          </Box>
          <Button
            component={Link}
            to="/shop"
            variant="outlined"
            startIcon={<ShoppingBagOutlinedIcon />}
            sx={{ fontWeight: 600 }}
          >
            {t('orders.browseShop')}
          </Button>
        </Stack>
      </Reveal>

      {/* ── Skeletons ── */}
      {isLoading && (
        <Stack spacing={2.5}>
          {[1, 2, 3].map(i => <ShopOrderSkeleton key={i} />)}
        </Stack>
      )}

      {/* ── Empty ── */}
      {!isLoading && orders.length === 0 && totalPages === 0 && <EmptyState />}

      {/* ── Orders ── */}
      {!isLoading && orders.length > 0 && (
        <Stagger step={60}>
          <Stack spacing={2.5}>
            {orders.map(order => (
              <Reveal key={order.id} variant="slideUp">
                <ShopOrderCard order={order} />
              </Reveal>
            ))}
          </Stack>
        </Stagger>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
