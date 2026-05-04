import { Box, Typography, Chip, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import FilterableTable from '../../components/admin/FilterableTable';

const ROLES = ['CLIENT', 'TECHNICIAN', 'ADMIN'];

const ROLE_COLORS = {
  CLIENT: 'default',
  TECHNICIAN: 'info',
  ADMIN: 'secondary',
};

export default function UserManagement() {
  const { t } = useTranslation('admin');

  const columns = [
    { id: 'id', label: t('users.columns.id') },
    { id: 'name', label: t('users.columns.name') },
    { id: 'email', label: t('users.columns.email') },
    { id: 'phone', label: t('users.columns.phone'), render: (r) => r.phone || '—' },
    { id: 'role', label: t('users.columns.role'),
      render: (r) => <Chip size="small" label={r.role} color={ROLE_COLORS[r.role] || 'default'} /> },
    { id: 'emailVerified', label: t('users.columns.verified'),
      render: (r) => r.emailVerified ? t('users.yes') : t('users.no') },
    { id: 'createdAt', label: t('users.columns.createdAt'),
      render: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—' },
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('users.title')}</Typography>
      <FilterableTable
        queryKey={['admin', 'users']}
        fetchPage={adminApi.searchUsers}
        columns={columns}
        rowKey={(r) => r.id}
        filters={[
          { id: 'role', label: t('filters.role'),
            options: ROLES.map((r) => ({ value: r, label: r })) },
          { id: 'verified', label: t('filters.verified'),
            options: [
              { value: 'true', label: t('users.yes') },
              { value: 'false', label: t('users.no') },
            ] },
        ]}
        renderActions={(row) => (
          <Button size="small" variant="outlined" href={`/admin/users/${row.id}`}>
            {t('users.edit')}
          </Button>
        )}
      />
    </Box>
  );
}
