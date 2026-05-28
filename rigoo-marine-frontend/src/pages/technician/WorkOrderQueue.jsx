/* eslint-disable react/prop-types */
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Chip, Button,
  IconButton, Tooltip, CircularProgress, Alert, Stack,
} from '@mui/material';
import OpenInNewRoundedIcon   from '@mui/icons-material/OpenInNewRounded';
import PlayArrowRoundedIcon   from '@mui/icons-material/PlayArrowRounded';
import CheckRoundedIcon       from '@mui/icons-material/CheckRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import ReplayRoundedIcon      from '@mui/icons-material/ReplayRounded';
import toast from 'react-hot-toast';
import { technicianApi } from '../../services/api';
import { Reveal } from '../../components/common/Motion';

const COLS = [
  { status: 'PENDING',       label: 'To Do',         color: '#E65100', bg: '#FFF3E0' },
  { status: 'IN_PROGRESS',   label: 'In Progress',   color: '#1565C0', bg: '#E3F2FD' },
  { status: 'WAITING_PARTS', label: 'Waiting Parts', color: '#B71C1C', bg: '#FFEBEE' },
  { status: 'COMPLETED',     label: 'Done',          color: '#1B5E20', bg: '#F1F8E9' },
];

function WOCard({ order, onStatus }) {
  const navigate = useNavigate();

  return (
    <Card variant="outlined" sx={{
      transition: 'transform 150ms, box-shadow 150ms',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
    }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <Typography variant="subtitle2" fontWeight={700}>#{order.id}</Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {order.priority === 'HIGH' && (
              <Chip label="HIGH" size="small" color="error" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
            )}
            <Tooltip title="Open detail">
              <IconButton size="small" onClick={() => navigate(`/technician/orders/${order.id}`)}>
                <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {order.serviceType && (
          <Typography variant="caption" color="primary" fontWeight={600} display="block" mb={0.5}>
            {order.serviceType.replace(/_/g, ' ')}
          </Typography>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mb: 1, lineHeight: 1.4 }}>
          {order.description?.slice(0, 90)}{order.description?.length > 90 ? '…' : ''}
        </Typography>

        <Typography variant="caption" color="text.disabled">
          🚢 {order.vesselName ?? `#${order.vesselId}`}
        </Typography>

        {order.createdAt && (
          <Typography variant="caption" color="text.disabled" display="block">
            {new Date(order.createdAt).toLocaleDateString()}
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} mt={1.5} flexWrap="wrap" useFlexGap>
          {order.status === 'PENDING' && (
            <Button size="small" variant="contained" color="primary"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={() => onStatus(order.id, 'IN_PROGRESS')} sx={{ fontSize: 11 }}>
              Start
            </Button>
          )}
          {order.status === 'IN_PROGRESS' && <>
            <Button size="small" variant="contained" color="success"
              startIcon={<CheckRoundedIcon />}
              onClick={() => onStatus(order.id, 'COMPLETED')} sx={{ fontSize: 11 }}>
              Done
            </Button>
            <Button size="small" variant="outlined" color="warning"
              startIcon={<HourglassEmptyRoundedIcon />}
              onClick={() => onStatus(order.id, 'WAITING_PARTS')} sx={{ fontSize: 11 }}>
              Parts
            </Button>
          </>}
          {order.status === 'WAITING_PARTS' && <>
            <Button size="small" variant="outlined" color="primary"
              startIcon={<ReplayRoundedIcon />}
              onClick={() => onStatus(order.id, 'IN_PROGRESS')} sx={{ fontSize: 11 }}>
              Resume
            </Button>
            <Button size="small" variant="contained" color="success"
              startIcon={<CheckRoundedIcon />}
              onClick={() => onStatus(order.id, 'COMPLETED')} sx={{ fontSize: 11 }}>
              Done
            </Button>
          </>}
        </Stack>
      </CardContent>
    </Card>
  );
}

function KanbanCol({ col, cards, onStatus }) {
  return (
    <Box sx={{ minWidth: 268, flex: '0 0 268px' }}>
      <Box sx={{
        bgcolor: 'background.paper',
        borderRadius: '6px 6px 0 0',
        borderTop: `4px solid ${col.color}`,
        border: '1px solid', borderColor: 'divider',
        px: 1.5, py: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Typography variant="subtitle2" fontWeight={700}>{col.label}</Typography>
        <Box sx={{
          bgcolor: col.color, color: '#fff',
          borderRadius: 10, minWidth: 22, height: 22, px: 0.75,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>
          {cards.length}
        </Box>
      </Box>

      <Box sx={{
        border: '1px solid', borderTop: 0, borderColor: 'divider',
        borderRadius: '0 0 6px 6px',
        bgcolor: col.bg,
        p: 1, minHeight: 260,
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {cards.length === 0 ? (
          <Typography variant="caption" color="text.disabled"
            sx={{ textAlign: 'center', pt: 5, display: 'block' }}>
            Empty
          </Typography>
        ) : cards.map(o => (
          <WOCard key={o.id} order={o} onStatus={onStatus} />
        ))}
      </Box>
    </Box>
  );
}

export default function WorkOrderQueue() {
  const qc = useQueryClient();

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['tech-orders'],
    queryFn: technicianApi.getMyOrders,
    select: d => d ?? [],
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => technicianApi.updateStatus(id, status),
    onSuccess: updated => {
      qc.setQueryData(['tech-orders'], prev =>
        (prev ?? []).map(o => o.id === updated.id ? updated : o),
      );
      toast.success(`→ ${updated.status.replace(/_/g, ' ')}`);
    },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const active  = orders.filter(o => o.status !== 'COMPLETED').length;
  const total   = orders.length;

  return (
    <Box>
      <Reveal variant="fade">
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={3}>
          <Typography variant="h5" fontWeight={700}>My Work Orders</Typography>
          <Stack direction="row" spacing={2}>
            <Typography variant="body2" color="text.secondary">{active} active</Typography>
            <Typography variant="body2" color="text.disabled">{total} total</Typography>
          </Stack>
        </Stack>
      </Reveal>

      {isError && <Alert severity="error" sx={{ mb: 2 }}>Failed to load work orders.</Alert>}

      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
        {COLS.map(col => (
          <KanbanCol
            key={col.status}
            col={col}
            cards={orders.filter(o => o.status === col.status)}
            onStatus={(id, status) => updateStatus.mutate({ id, status })}
          />
        ))}
      </Box>
    </Box>
  );
}
