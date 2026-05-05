import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Fade,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';

export default function CheckoutCancel() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('shop');
  const orderId = params.get('orderId');

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Fade in timeout={500}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            <CancelIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom fontWeight={700}>
              {t('checkout.cancelled')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              {t('checkout.cancelledDetail')}
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" onClick={() => navigate('/shop')}>
                {t('checkout.backToShop')}
              </Button>
              {orderId && (
                <Button onClick={() => navigate('/dashboard/orders')}>
                  {t('orders.title')}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Fade>
    </Container>
  );
}
