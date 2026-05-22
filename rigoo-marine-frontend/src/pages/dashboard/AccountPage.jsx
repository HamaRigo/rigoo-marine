import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import {
  Box, Typography, Tabs, Tab, Stack, Chip, Card, CardContent, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogContent, IconButton, CircularProgress, Grid, Divider,
  Stepper, Step, StepLabel, StepConnector, stepConnectorClasses,
  Skeleton, Pagination,
} from '@mui/material';
import { styled }         from '@mui/material/styles';
import ReceiptRoundedIcon      from '@mui/icons-material/ReceiptRounded';
import BuildRoundedIcon        from '@mui/icons-material/BuildRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import VisibilityIcon          from '@mui/icons-material/Visibility';
import DownloadIcon            from '@mui/icons-material/Download';
import CloseIcon               from '@mui/icons-material/Close';
import CheckCircleIcon         from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CancelIcon              from '@mui/icons-material/Cancel';
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded';
import ExpandMoreIcon          from '@mui/icons-material/ExpandMore';
import LocationOnIcon          from '@mui/icons-material/LocationOn';
import CalendarTodayIcon       from '@mui/icons-material/CalendarToday';
import DirectionsBoatIcon      from '@mui/icons-material/DirectionsBoat';
import InventoryRoundedIcon    from '@mui/icons-material/InventoryRounded';
import AddIcon                 from '@mui/icons-material/Add';
import { Link }                from 'react-router-dom';
import { useTranslation }      from 'react-i18next';
import toast                   from 'react-hot-toast';

import { workOrderApi, shopApi, invoiceApi } from '../../services/api';
import { useAuth }    from '../../context/AuthContext';
import { formatPrice, formatDate } from '../../utils/format';
import { HoverLift, Stagger, Reveal } from '../../components/common/Motion';

// ════════════════════════════════════════════════════════════
//  STATS BANNER
// ════════════════════════════════════════════════════════════

function AccountStatsBanner() {
  const { t }   = useTranslation('dashboard');
  const { user } = useAuth();
  const clientId = user?.id;

  const [ordersQuery, invoicesQuery] = useQueries({
    queries: [
      { queryKey: ['work-orders', 'my'], queryFn: workOrderApi.getMyOrders, staleTime: 60_000 },
      { queryKey: ['invoices', 'my'], queryFn: () => invoiceApi.getMyInvoices(clientId), enabled: !!clientId, staleTime: 60_000 },
    ],
  });

  const orders   = ordersQuery.data  ?? [];
  const invoices = invoicesQuery.data ?? [];
  const active   = orders.filter(o => ['PENDING','IN_PROGRESS','PENDING_APPROVAL','WAITING_PARTS'].includes(o.status)).length;
  const billed   = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.total ?? 0), 0);

  const stats = [
    { icon: BuildRoundedIcon,           color: '#006994', bg: 'rgba(0,105,148,0.08)',   label: t('account.statsTotal'),  value: orders.length },
    { icon: HourglassBottomRoundedIcon, color: '#ff9800', bg: 'rgba(255,152,0,0.08)',   label: t('account.statsActive'), value: active },
    { icon: ReceiptRoundedIcon,         color: '#4caf50', bg: 'rgba(76,175,80,0.08)',   label: t('account.statsBilled'), value: formatPrice(billed) },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map(s => (
        <Grid size={{ xs: 12, sm: 4 }} key={s.label} >
          <Card variant="outlined" sx={{ borderRadius: 3, p: 2, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.icon sx={{ color: s.color, fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} lineHeight={1.1}>
                {(ordersQuery.isLoading || invoicesQuery.isLoading) ? <Skeleton width={40} /> : s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

// ════════════════════════════════════════════════════════════
//  SERVICE ORDERS
// ════════════════════════════════════════════════════════════

const ORDER_FLOW = ['PENDING_APPROVAL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];

const ORDER_STATUS_COLOR = {
  PENDING_APPROVAL: 'default',
  PENDING:          'warning',
  IN_PROGRESS:      'info',
  WAITING_PARTS:    'secondary',
  COMPLETED:        'success',
  CANCELLED:        'error',
};

const CAT_EMOJI = {
  ENGINE:'🔧', ELECTRICAL:'⚡', HULL:'⛵', PROPULSION:'🚀',
  NAVIGATION:'🧭', PLUMBING:'💧', SAFETY:'🆘', MAINTENANCE:'🔄', OTHER:'❓',
};

const RmConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 11 },
  [`& .${stepConnectorClasses.line}`]: {
    height: 2, border: 0, borderRadius: 1, backgroundColor: theme.palette.divider,
  },
  [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line},
    &.${stepConnectorClasses.active}   .${stepConnectorClasses.line}`]: {
    backgroundColor: theme.palette.primary.main,
  },
}));

function OrderStepper({ status }) {
  const { t } = useTranslation('dashboard');

  if (status === 'CANCELLED') return (
    <Stack direction="row" spacing={1} alignItems="center" py={0.75}>
      <CancelIcon sx={{ color: 'error.main', fontSize: 18 }} />
      <Typography variant="caption" color="error.main" fontWeight={600}>
        {t('account.serviceOrders.orderCancelled')}
      </Typography>
    </Stack>
  );
  if (status === 'WAITING_PARTS') return (
    <Stack direction="row" spacing={1} alignItems="center" py={0.75}>
      <HourglassBottomRoundedIcon sx={{ color: 'secondary.main', fontSize: 18 }} />
      <Typography variant="caption" color="secondary.main" fontWeight={600}>
        {t('account.serviceOrders.waitingParts')}
      </Typography>
    </Stack>
  );
  const activeStep = ORDER_FLOW.indexOf(status);
  return (
    <Stepper activeStep={activeStep} alternativeLabel connector={<RmConnector />} sx={{ pt: 0.5, pb: 0.5 }}>
      {ORDER_FLOW.map((step, i) => (
        <Step key={step} completed={i < activeStep}>
          <StepLabel
            StepIconComponent={({ active, completed }) =>
              completed || active
                ? <CheckCircleIcon sx={{ fontSize: 20, color: completed ? 'success.main' : 'primary.main' }} />
                : <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
            }
            sx={{ '& .MuiStepLabel-label': { fontSize: '0.65rem', mt: 0.5, fontWeight: i === activeStep ? 700 : 400 } }}
          >
            {t(`account.serviceOrders.status.${step}`, { defaultValue: step.replace(/_/g, ' ') })}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

function ServiceOrderCard({ order }) {
  const { t } = useTranslation('dashboard');
  const [expanded, setExpanded] = useState(false);
  const color  = ORDER_STATUS_COLOR[order.status] ?? 'default';
  const emoji  = CAT_EMOJI[order.issueCategory] ?? '🔧';
  const desc   = (order.description || '—');
  const isLong = desc.length > 130;

  return (
    <HoverLift lift={4}>
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'divider', mb: 2 }}>
        <Box sx={{ background: 'linear-gradient(135deg,#006994 0%,#004263 100%)', px: 2.5, pt: 2, pb: 2.75, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 18, bgcolor: 'background.paper', clipPath: 'ellipse(60% 100% at 50% 100%)' }} />
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.15)', fontSize: '1.25rem' }}>
                {emoji}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>Order #{order.id}</Typography>
                <Typography variant="subtitle2" fontWeight={700} color="white">
                  {(order.issueCategory || 'Service Request').replace(/_/g, ' ')}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={t(`account.serviceOrders.status.${order.status}`, { defaultValue: order.status?.replace(/_/g, ' ') })}
              color={color}
              size="small"
              sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
            />
          </Stack>
        </Box>

        <CardContent sx={{ pt: 1.5, pb: '12px !important' }}>
          <OrderStepper status={order.status} />
          <Divider sx={{ my: 1.25 }} />
          <Grid container spacing={1} sx={{ mb: 1 }}>
            {order.vesselId && (
              <Grid size={{ xs: 12, sm: 6 }} >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <DirectionsBoatIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {t('account.serviceOrders.vessel', { id: order.vesselId })}
                  </Typography>
                </Stack>
              </Grid>
            )}
            {order.preferredDate && (
              <Grid size={{ xs: 12, sm: 6 }} >
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {t('account.serviceOrders.preferred', { date: new Date(order.preferredDate).toLocaleDateString() })}
                  </Typography>
                </Stack>
              </Grid>
            )}
            {order.locationText && (
              <Grid size={12} >
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <LocationOnIcon sx={{ fontSize: 14, color: 'text.disabled', mt: 0.15 }} />
                  <Typography variant="caption" color="text.secondary">{order.locationText}</Typography>
                </Stack>
              </Grid>
            )}
          </Grid>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
            {isLong && !expanded ? desc.slice(0, 130) + '…' : desc}
          </Typography>
          {isLong && (
            <IconButton size="small" onClick={() => setExpanded(e => !e)} sx={{ p: 0, mt: 0.5, color: 'primary.main' }}>
              <ExpandMoreIcon fontSize="small" sx={{ transition: 'transform 200ms', transform: expanded ? 'rotate(180deg)' : 'none' }} />
            </IconButton>
          )}
          {order.services?.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.25 }}>
              {order.services.map((s, i) => (
                <Chip key={i} label={s} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
              ))}
            </Stack>
          )}
          {order.rejectionReason && (
            <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: '#ffebee', border: '1px solid', borderColor: 'error.light' }}>
              <Typography variant="caption" fontWeight={700} color="error.main" display="block">
                {t('account.serviceOrders.rejectionReason')}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25 }}>{order.rejectionReason}</Typography>
            </Box>
          )}
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
            <Button
              component={Link}
              to={`/dashboard/orders/${order.id}`}
              size="small"
              variant="outlined"
              sx={{ borderRadius: 2, fontSize: '0.72rem' }}
            >
              View Details →
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </HoverLift>
  );
}

function ServiceOrdersTab() {
  const { t } = useTranslation('dashboard');
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['work-orders', 'my'],
    queryFn:  workOrderApi.getMyOrders,
  });

  if (isLoading) return (
    <Box>
      {Array(3).fill(0).map((_, i) => <Skeleton key={i} variant="rounded" height={200} sx={{ mb: 2, borderRadius: 3 }} />)}
    </Box>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2.5}>
        <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/dashboard/new-order"
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}>
          {t('account.serviceOrders.newRequest')}
        </Button>
      </Stack>
      {orders.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
          <BuildRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">{t('account.serviceOrders.noOrders')}</Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5 }}>{t('account.serviceOrders.noOrdersHint')}</Typography>
          <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/dashboard/new-order">
            {t('account.serviceOrders.newRequestShort')}
          </Button>
        </Card>
      ) : (
        <Stagger>
          {orders.map(o => <ServiceOrderCard key={o.id} order={o} />)}
        </Stagger>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
//  SHOP ORDERS
// ════════════════════════════════════════════════════════════

const SHOP_STATUS_COLOR = {
  PENDING_PAYMENT: 'warning',
  PAID:            'success',
  CANCELLED:       'default',
  REFUNDED:        'info',
};

function ShopOrderCard({ order }) {
  const { t } = useTranslation('dashboard');
  const [expanded, setExpanded] = useState(false);
  const color = SHOP_STATUS_COLOR[order.status] ?? 'default';
  const itemCount = order.items?.length ?? 0;

  return (
    <HoverLift lift={3}>
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'divider', mb: 2 }}>
        <Box sx={{ background: 'linear-gradient(135deg,#1a3050 0%,#0B1A2E 100%)', px: 2.5, pt: 2, pb: 2.5, position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 18, bgcolor: 'background.paper', clipPath: 'ellipse(60% 100% at 50% 100%)' }} />
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBagOutlinedIcon sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>Order #{order.id}</Typography>
                <Typography variant="subtitle2" fontWeight={700} color="white">
                  {t('account.shopOrders.item', { count: itemCount })}
                </Typography>
              </Box>
            </Stack>
            <Stack spacing={0.75} alignItems="flex-end">
              <Chip
                label={t(`account.shopOrders.status.${order.status}`, { defaultValue: order.status?.replace(/_/g, ' ') })}
                color={color}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }}
              />
              {order.total != null && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
                  {formatPrice(order.total)}
                </Typography>
              )}
            </Stack>
          </Stack>
        </Box>
        <CardContent sx={{ pt: 1.5, pb: '12px !important' }}>
          {order.items?.length > 0 && (
            <Box>
              {(expanded ? order.items : order.items.slice(0, 2)).map((item, i) => (
                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center" py={0.5}>
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                    {item.productName || `Product #${item.productId}`}
                    {item.quantity > 1 && <Typography component="span" variant="caption" color="text.secondary"> ×{item.quantity}</Typography>}
                  </Typography>
                  {item.price != null && (
                    <Typography variant="body2" fontWeight={600} sx={{ ml: 2, flexShrink: 0 }}>
                      {formatPrice(item.price * (item.quantity || 1))}
                    </Typography>
                  )}
                </Stack>
              ))}
              {order.items.length > 2 && (
                <Button size="small" sx={{ p: 0, mt: 0.5, fontSize: '0.72rem' }} onClick={() => setExpanded(e => !e)}>
                  {expanded
                    ? t('account.shopOrders.showLess')
                    : t('account.shopOrders.moreItems', { count: order.items.length - 2 })
                  }
                </Button>
              )}
            </Box>
          )}
          {order.createdAt && (
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              {t('account.shopOrders.placed', { date: new Date(order.createdAt).toLocaleDateString() })}
            </Typography>
          )}
        </CardContent>
      </Card>
    </HoverLift>
  );
}

function ShopOrdersTab() {
  const { t } = useTranslation('dashboard');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['shop-orders', 'my', page],
    queryFn:  () => shopApi.getMyOrders({ page: page - 1, size: PAGE_SIZE }),
  });

  const orders  = data?.content ?? data ?? [];
  const total   = data?.totalPages ?? 1;

  if (isLoading) return (
    <Box>
      {Array(3).fill(0).map((_, i) => <Skeleton key={i} variant="rounded" height={160} sx={{ mb: 2, borderRadius: 3 }} />)}
    </Box>
  );

  if (!orders.length) return (
    <Card variant="outlined" sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
      <ShoppingBagOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
      <Typography variant="h6" color="text.secondary">{t('account.shopOrders.noOrders')}</Typography>
      <Typography variant="body2" color="text.disabled">{t('account.shopOrders.noOrdersHint')}</Typography>
    </Card>
  );

  return (
    <Box>
      <Stagger>
        {orders.map(o => <ShopOrderCard key={o.id} order={o} />)}
      </Stagger>
      {total > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={total} page={page} onChange={(_, p) => setPage(p)} color="primary" />
        </Box>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
//  INVOICES
// ════════════════════════════════════════════════════════════

const INV_STATUS = { PAID:'success', PENDING:'warning', DRAFT:'default', CANCELLED:'error' };

function InvoicesTab() {
  const { t }   = useTranslation('dashboard');
  const { user }   = useAuth();
  const clientId   = user?.id;
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewUrl, setPreviewUrl]         = useState(null);
  const [loadingId, setLoadingId]           = useState(null);

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', 'my'],
    queryFn:  () => invoiceApi.getMyInvoices(clientId),
    enabled:  !!clientId,
  });

  const openPreview = async (invoice) => {
    setLoadingId(invoice.id);
    try {
      const blob = await invoiceApi.downloadPdf(invoice.id);
      const url  = URL.createObjectURL(blob);
      setPreviewInvoice(invoice);
      setPreviewUrl(url);
    } catch { toast.error(t('account.invoices.pdfError')); }
    finally { setLoadingId(null); }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewInvoice(null);
    setPreviewUrl(null);
  };

  const handleDownload = () => {
    if (!previewUrl || !previewInvoice) return;
    const a    = document.createElement('a');
    a.href     = previewUrl;
    a.download = `invoice-${previewInvoice.invoiceNumber || previewInvoice.id}.pdf`;
    a.click();
  };

  if (isLoading) return (
    <Box>
      <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
    </Box>
  );

  if (error) return <Typography color="error">{t('account.invoices.loadError')}</Typography>;

  if (!invoices.length) return (
    <Card variant="outlined" sx={{ borderRadius: 3, textAlign: 'center', py: 6 }}>
      <ReceiptRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
      <Typography variant="h6" color="text.secondary">{t('account.invoices.noInvoices')}</Typography>
      <Typography variant="body2" color="text.disabled">{t('account.invoices.noInvoicesHint')}</Typography>
    </Card>
  );

  const cols = [
    t('account.invoices.columns.invoiceNo'),
    t('account.invoices.columns.orderNo'),
    t('account.invoices.columns.date'),
    t('account.invoices.columns.dueDate'),
    t('account.invoices.columns.amount'),
    t('account.invoices.columns.status'),
    '',
  ];

  return (
    <>
      <TableContainer component={Card} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F4F7FA' }}>
              {cols.map((h, i) => (
                <TableCell key={i} sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map(inv => (
              <TableRow key={inv.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{inv.invoiceNumber || `#${inv.id}`}</TableCell>
                <TableCell>#{inv.workOrderId}</TableCell>
                <TableCell>{formatDate(inv.issueDate || inv.createdAt)}</TableCell>
                <TableCell>{formatDate(inv.dueDate)}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{formatPrice(inv.total ?? 0, { minimumFractionDigits: 2 })}</TableCell>
                <TableCell>
                  <Chip label={inv.status} color={INV_STATUS[inv.status] || 'default'} size="small"
                    sx={{ fontWeight: 700, fontSize: '0.68rem', height: 22 }} />
                </TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" startIcon={loadingId === inv.id ? <CircularProgress size={12} /> : <VisibilityIcon />}
                    disabled={loadingId === inv.id} onClick={() => openPreview(inv)}>
                    {t('account.invoices.preview')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!previewInvoice} onClose={closePreview} maxWidth="lg" fullWidth
        PaperProps={{ sx: { height: '92vh', display: 'flex', flexDirection: 'column', borderRadius: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
          <Typography variant="h6" fontWeight={700}>
            {t('account.invoices.dialogTitle', { number: previewInvoice?.invoiceNumber || `#${previewInvoice?.id}` })}
          </Typography>
          <Stack direction="row" gap={1}>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
              {t('account.invoices.download')}
            </Button>
            <IconButton onClick={closePreview} size="small"><CloseIcon /></IconButton>
          </Stack>
        </Box>
        <DialogContent sx={{ p: 0, flex: 1, bgcolor: '#525659', overflow: 'hidden' }}>
          {previewUrl
            ? <iframe src={previewUrl} title="Invoice" style={{ width:'100%', height:'100%', border:'none', display:'block' }} />
            : <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}><CircularProgress sx={{ color:'white' }} /></Box>
          }
        </DialogContent>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════
//  AccountPage
// ════════════════════════════════════════════════════════════

export default function AccountPage() {
  const { t } = useTranslation('dashboard');
  const [tab, setTab] = useState(0);

  const TABS = [
    { key: 'serviceOrders', icon: BuildRoundedIcon        },
    { key: 'shopOrders',    icon: ShoppingBagOutlinedIcon },
    { key: 'invoices',      icon: ReceiptRoundedIcon      },
  ];

  return (
    <Box>
      <Reveal variant="fade" timeout={360}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={800} sx={{ color: '#0B1A2E', mb: 0.5 }}>
            {t('account.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('account.subtitle')}
          </Typography>
        </Box>
      </Reveal>

      <AccountStatsBanner />

      <Box sx={{
        bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider',
        mb: 3, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: '#006994', height: 3 },
            '& .MuiTab-root': {
              fontSize: '0.82rem', textTransform: 'none', fontWeight: 500, minHeight: 56,
              color: 'text.secondary',
              '&.Mui-selected': { color: '#006994', fontWeight: 700 },
            },
          }}
        >
          {TABS.map(tb => (
            <Tab key={tb.key} label={t(`account.tabs.${tb.key}`)} icon={<tb.icon sx={{ fontSize: '1rem !important' }} />} iconPosition="start" />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ minHeight: 400 }}>
        {tab === 0 && <ServiceOrdersTab />}
        {tab === 1 && <ShopOrdersTab   />}
        {tab === 2 && <InvoicesTab     />}
      </Box>
    </Box>
  );
}
