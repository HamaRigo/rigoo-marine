import { Box, Typography, Chip, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import FilterableTable from '../../components/admin/FilterableTable';
import { formatPrice } from '../../utils/format';

export default function ServiceManagement() {
  const { t } = useTranslation('admin');

  const columns = [
    { id: 'id', label: t('services.columns.id') },
    { id: 'name', label: t('services.columns.name') },
    { id: 'category', label: t('services.columns.category'), render: (r) => r.category || '—' },
    { id: 'price', label: t('services.columns.price'),
      render: (r) => formatPrice(r.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { id: 'active', label: t('services.columns.active'),
      render: (r) => (
        <Chip size="small" label={r.active ? t('users.yes') : t('users.no')}
              color={r.active ? 'success' : 'default'} />
      ) },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('services.title')}</Typography>
      <FilterableTable
        queryKey={['admin', 'services']}
        fetchPage={adminApi.searchServices}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="name,asc"
        filters={[
          { id: 'active', label: t('filters.verified'),
            options: [
              { value: 'true', label: t('filters.active') },
              { value: 'false', label: t('filters.inactive') },
            ] },
        ]}
        renderActions={(row) => (
          <Button size="small" variant="outlined" href={`/admin/services/${row.id}`}>
            {t('services.edit')}
          </Button>
        )}
      />
    </Box>
  );
}
