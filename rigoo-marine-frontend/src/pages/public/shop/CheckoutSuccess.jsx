import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Fade,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { shopApi } from '../../../services/api';

function fmtPrice(value, currency = 'QAR') {
  if (value == null) return '—';
  return `${currency} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('shop');
  const orderId = params.get('orderId');
  const isAr = i18n.language === 'ar';
  const queryClient = useQueryClient();

  // Poll the order until status flips to PAID — webhook may take a few seconds.
  const { data: order } = useQuery({
    queryKey: ['shop', 'order', orderId],
    queryFn: () => shopApi.getOrderById(orderId),
    enabled: !!orderId,
    refetchInterval: (query) => {
      const o = query.state.data;
      return o?.status === 'PAID' ? false : 3000;
    },
  });

  const isPaid = order?.status === 'PAID';

  // When the order flips to PAID, refresh the cart (server has cleared it).
  if (isPaid) {
    queryClient.invalidateQueries({ queryKey: ['shop', 'cart'] });
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Fade in timeout={500}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            {isPaid ? (
              <>
                <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom fontWeight={700}>
                  {t('checkout.success')}
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  {t('checkout.successDetail')}
                </Typography>
                <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 3, textAlign: isAr ? 'right' : 'left' }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography color="text.secondary">{t('checkout.orderNumber')}</Typography>
                    <Typography fontWeight={600}>{order?.orderNumber}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">{t('orders.total')}</Typography>
                    <Typography fontWeight={600}>{fmtPrice(order?.totalQar, order?.currency)}</Typography>
                  </Stack>
                  {order?.items?.length > 0 && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack spacing={0.5}>
                        {order.items.map((it) => (
                          <Stack key={it.id} direction="row" justifyContent="space-between">
                            <Typography variant="body2">
                              {((isAr ? it.nameAr : it.nameEn) || it.nameEn)} × {it.quantity}
                            </Typography>
                            <Typography variant="body2">{fmtPrice(it.lineTotalQar, order.currency)}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </>
                  )}
                </Box>
                <Stack direction="row" spacing={2} justifyContent="center">
                  <Button variant="contained" onClick={() => navigate('/dashboard/orders')}>
                    {t('checkout.viewOrder')}
                  </Button>
                  <Button onClick={() => navigate('/shop')}>
                    {t('checkout.backToShop')}
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <CircularProgress sx={{ mb: 3 }} />
                <Typography variant="h5" gutterBottom>
                  {t('checkout.waitingForPayment')}
                </Typography>
                <Typography color="text.secondary">
                  {t('checkout.orderNumber')}: {order?.orderNumber || '—'}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
