import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Skeleton,
  Divider,
  Fade,
} from '@mui/material';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { shopApi } from '../../services/api';
import { formatPrice } from '../../utils/format';

const STATUS_COLORS = {
  PENDING_PAYMENT: 'warning',
  PAID: 'success',
  CANCELLED: 'default',
  REFUNDED: 'info',
};


export default function MyShopOrders() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('shop');
  const isAr = i18n.language === 'ar';

  const { data, isLoading } = useQuery({
    queryKey: ['shop', 'my-orders'],
    queryFn: () => shopApi.getMyOrders(0, 20),
  });

  const orders = data?.content ?? [];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('orders.title')}</Typography>

      {isLoading ? (
        <Stack spacing={2}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} />
          ))}
        </Stack>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ShoppingBagOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {t('orders.empty')}
            </Typography>
            <Button variant="contained" onClick={() => navigate('/shop')}>
              {t('orders.browseShop')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {orders.map((order, i) => (
            <Fade in timeout={400} style={{ transitionDelay: `${i * 50}ms` }} key={order.id}>
              <Card
                sx={{
                  transition: 'box-shadow 0.2s ease',
                  '&:hover': { boxShadow: 4 },
                }}
              >
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" fontWeight={600}>
                          {order.orderNumber}
                        </Typography>
                        <Chip
                          size="small"
                          label={t(`orders.statuses.${order.status}`, order.status)}
                          color={STATUS_COLORS[order.status] || 'default'}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {t('orders.placedOn')}: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t('orders.items')}: {order.items?.length ?? 0}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: isAr ? 'left' : 'right' }}>
                      <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                        {t('orders.total')}
                      </Typography>
                      <Typography variant="h5" color="primary.main" fontWeight={700}>
                        {formatPrice(order.totalQar, { currency: order.currency || 'QAR' })}
                      </Typography>
                    </Box>
                  </Stack>

                  {order.items?.length > 0 && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack spacing={0.5}>
                        {order.items.slice(0, 3).map((it) => (
                          <Stack key={it.id} direction="row" justifyContent="space-between">
                            <Typography variant="body2">
                              {((isAr ? it.nameAr : it.nameEn) || it.nameEn)} × {it.quantity}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatPrice(it.lineTotalQar, { currency: order.currency || 'QAR' })}
                            </Typography>
                          </Stack>
                        ))}
                        {order.items.length > 3 && (
                          <Typography variant="caption" color="text.secondary">
                            + {order.items.length - 3} more
                          </Typography>
                        )}
                      </Stack>
                    </>
                  )}
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Stack>
      )}
    </Box>
  );
}
