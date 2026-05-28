import { useNavigate } from 'react-router-dom';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Reveal } from '../../components/common/Motion';
import FilterableTable from '../../components/admin/FilterableTable';
import { workOrderApi } from '../../services/api';

export default function TeamLeadHistory() {
  const navigate = useNavigate();

  const columns = [
    { id: 'id',          label: '#',          render: r => r.id },
    { id: 'serviceType', label: 'Service',    render: r => r.serviceType?.replace(/_/g, ' ') ?? '—' },
    { id: 'vessel',      label: 'Vessel',     render: r => r.vesselName ?? `#${r.vesselId}` },
    { id: 'technician',  label: 'Technician', render: r => r.assignedTechnicianId ? `Tech #${r.assignedTechnicianId}` : '—' },
    { id: 'completedAt', label: 'Completed',  render: r => r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '—' },
    { id: 'status',      label: 'Status',     render: r => <Chip label={r.status} color="success" size="small" /> },
  ];

  return (
    <Box>
      <Reveal variant="fade">
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Completed Jobs</Typography>
      </Reveal>

      <FilterableTable
        queryKey={['team-lead', 'history']}
        fetchPage={(params) => workOrderApi.searchOrders({ ...params, status: 'COMPLETED' })}
        columns={columns}
        rowKey={r => r.id}
        defaultFilters={{ status: 'COMPLETED' }}
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
