import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Reveal } from '../../components/common/Motion';
import FilterableTable from '../../components/admin/FilterableTable';
import { adminApi } from '../../services/api';

const STATUS_COLORS = {
  PENDING_APPROVAL: 'default',
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  WAITING_PARTS: 'error',
  COMPLETED: 'success',
  CANCELLED: 'default',
};

const STATUS_OPTIONS = [
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'PENDING',          label: 'Pending' },
  { value: 'IN_PROGRESS',      label: 'In Progress' },
  { value: 'WAITING_PARTS',    label: 'Waiting Parts' },
  { value: 'COMPLETED',        label: 'Completed' },
  { value: 'CANCELLED',        label: 'Cancelled' },
];

export default function TeamLeadOrders() {
  const navigate = useNavigate();

  const columns = [
    { id: 'id',          label: '#',           render: r => r.id },
    { id: 'serviceType', label: 'Service',      render: r => r.serviceType?.replace(/_/g, ' ') ?? '—' },
    { id: 'vessel',      label: 'Vessel',       render: r => r.vesselName ?? `#${r.vesselId}` },
    { id: 'status',      label: 'Status',       render: r => (
      <Chip label={r.status} color={STATUS_COLORS[r.status] || 'default'} size="small" />
    )},
    { id: 'technician',  label: 'Technician',   render: r => r.assignedTechnicianId ? `Tech #${r.assignedTechnicianId}` : <Typography variant="caption" color="text.disabled">Unassigned</Typography> },
    { id: 'createdAt',   label: 'Created',      render: r => new Date(r.createdAt).toLocaleDateString() },
  ];

  const filters = [
    {
      id: 'status',
      label: 'Status',
      options: STATUS_OPTIONS,
    },
  ];

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>All Orders</Typography>
      </Reveal>

      <FilterableTable
        queryKey={['team-lead', 'orders']}
        fetchPage={(params) => adminApi.searchOrders(params)}
        columns={columns}
        filters={filters}
        rowKey={r => r.id}
        renderActions={r => (
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => navigate(`/team-lead/orders/${r.id}`)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />
    </Box>
  );
}
