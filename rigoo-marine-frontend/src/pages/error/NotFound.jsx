import { Box, Typography, Button, Container } from '@mui/material';
import { Link } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import { useTranslation } from 'react-i18next';
import PageSEO from '../../components/common/PageSEO';

export default function NotFound() {
  const { t } = useTranslation('common');

  return (
    <Container maxWidth="md">
      <PageSEO titleKey="notFound.title" descriptionKey="notFound.description" noIndex />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" sx={{ fontSize: '120px', fontWeight: 700, color: 'primary.main' }}>
          404
        </Typography>
        <Typography variant="h4" gutterBottom>
          {t('notFound.title', '404 — Page Not Found')}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
          {t('notFound.body', "The page you're looking for doesn't exist or has been moved.")}
        </Typography>
        <Button
          component={Link}
          to="/"
          variant="contained"
          size="large"
          startIcon={<HomeIcon />}
          sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
        >
          {t('notFound.cta', 'Go Home')}
        </Button>
      </Box>
    </Container>
  );
}
