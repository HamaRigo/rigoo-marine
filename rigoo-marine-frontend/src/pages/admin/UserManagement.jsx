import { useState } from 'react';
import { Box, Typography, Chip, Button, Stack, IconButton, Tooltip } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { formatDate } from '../../utils/format';
import FilterableTable from '../../components/admin/FilterableTable';
import ResetPasswordDialog from './ResetPasswordDialog';
import UserFormDialog from './UserFormDialog';
import { useToast } from '../../hooks/useToast';

const ALL_ROLES = ['CLIENT', 'TECHNICIAN', 'TEAM_LEAD', 'DELIVERY', 'ADMIN'];

const ROLE_COLORS = {
  CLIENT: 'default',
  TECHNICIAN: 'info',
  TEAM_LEAD: 'warning',
  DELIVERY: 'success',
  ADMIN: 'secondary',
};

export default function UserManagement() {
  const { t } = useTranslation('admin');
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [resetTarget, setResetTarget] = useState(null);
  const [formTarget, setFormTarget] = useState(null); // null = closed, false = create, user = edit
  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit'] });
      toastSuccess(t('users.deleteSuccess'));
    },
    onError: () => toastError(t('users.deleteFailed')),
  });

  const handleDeleteClick = (row) => {
    if (window.confirm(t('users.deleteConfirm', { name: row.name }))) {
      deleteMutation.mutate(row.id);
    }
  };

  const columns = [
    { id: 'id', label: t('users.columns.id') },
    { id: 'name', label: t('users.columns.name') },
    { id: 'email', label: t('users.columns.email') },
    { id: 'phone', label: t('users.columns.phone'), render: (r) => r.phone || '—' },
    {
      id: 'role', label: t('users.columns.role'),
      render: (r) => <Chip size="small" label={r.role} color={ROLE_COLORS[r.role] || 'default'} />,
    },
    {
      id: 'emailVerified', label: t('users.columns.verified'),
      render: (r) => r.emailVerified ? t('users.yes') : t('users.no'),
    },
    {
      id: 'createdAt', label: t('users.columns.createdAt'),
      render: (r) => formatDate(r.createdAt),
    },
  ];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h4">{t('users.title')}</Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setFormTarget(false)}
        >
          {t('users.createUser')}
        </Button>
      </Stack>

      <FilterableTable
        queryKey={['admin', 'users']}
        fetchPage={adminApi.searchUsers}
        columns={columns}
        rowKey={(r) => r.id}
        filters={[
          {
            id: 'role', label: t('filters.role'),
            options: ALL_ROLES.map((r) => ({ value: r, label: r })),
          },
          {
            id: 'verified', label: t('filters.verified'),
            options: [
              { value: 'true', label: t('users.yes') },
              { value: 'false', label: t('users.no') },
            ],
          },
        ]}
        renderActions={(row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={t('users.edit')}>
              <IconButton size="small" color="primary" onClick={() => setFormTarget(row)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('users.resetPassword.action')}>
              <IconButton size="small" color="warning" onClick={() => setResetTarget(row)}>
                <LockResetIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('users.delete')}>
              <IconButton size="small" color="error" onClick={() => handleDeleteClick(row)}
                disabled={deleteMutation.isPending}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      />

      <ResetPasswordDialog
        open={!!resetTarget}
        targetUser={resetTarget}
        onClose={() => setResetTarget(null)}
        onSuccess={(user) => toastSuccess(t('users.resetPassword.success', { name: user.name }))}
      />

      <UserFormDialog
        open={formTarget !== null}
        user={formTarget || null}
        onClose={() => setFormTarget(null)}
        onSuccess={(saved) =>
          toastSuccess(
            formTarget
              ? t('users.form.successEdit', { name: saved.name })
              : t('users.form.successCreate', { name: saved.name })
          )
        }
      />
    </Box>
  );
}
