/**
 * Shared drag-and-drop work order kanban board.
 * Used by TeamLeadOrders and admin OrderManagement.
 *
 * Props:
 *   orders        – WorkOrderDTO[]
 *   technicians   – ClientDTO[]   (for name lookup by id)
 *   onStatusChange(orderId, newStatus) – called on DnD drop OR button click
 *   onAction('approve'|'reject'|'assign', order) – for actions needing dialogs
 *   detailBasePath – e.g. '/team-lead/orders'
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  Box, Typography, Card, CardContent, Chip, Button,
  IconButton, Tooltip, Stack, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, alpha,
} from '@mui/material';
import DragIndicatorIcon         from '@mui/icons-material/DragIndicator';
import OpenInNewRoundedIcon      from '@mui/icons-material/OpenInNewRounded';
import CheckRoundedIcon          from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded';
import PlayArrowRoundedIcon      from '@mui/icons-material/PlayArrowRounded';
import PersonAddRoundedIcon      from '@mui/icons-material/PersonAddRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import ReplayRoundedIcon         from '@mui/icons-material/ReplayRounded';

export const KANBAN_COLS = [
  { status: 'PENDING_APPROVAL', label: 'Awaiting Approval', color: '#757575', hex: '#757575' },
  { status: 'PENDING',          label: 'To Do',              color: '#E65100', hex: '#E65100' },
  { status: 'IN_PROGRESS',      label: 'In Progress',        color: '#1565C0', hex: '#1565C0' },
  { status: 'WAITING_PARTS',    label: 'Waiting Parts',      color: '#B71C1C', hex: '#B71C1C' },
  { status: 'COMPLETED',        label: 'Done',               color: '#1B5E20', hex: '#1B5E20' },
  { status: 'CANCELLED',        label: 'Cancelled',          color: '#424242', hex: '#424242' },
];

const COL_BG = {
  PENDING_APPROVAL: '#FAFAFA',
  PENDING:          '#FFF3E0',
  IN_PROGRESS:      '#E3F2FD',
  WAITING_PARTS:    '#FFEBEE',
  COMPLETED:        '#F1F8E9',
  CANCELLED:        '#F5F5F5',
};

// ─── Ghost card shown in DragOverlay ─────────────────────────────────────────

function FloatingCard({ order }) {
  return (
    <Card elevation={8} sx={{
      width: 268, opacity: 0.95,
      borderLeft: `4px solid #1565C0`,
      transform: 'rotate(2deg)',
    }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <DragIndicatorIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
          <Typography variant="subtitle2" fontWeight={700}>#{order.id}</Typography>
        </Stack>
        {order.serviceType && (
          <Typography variant="caption" color="primary" fontWeight={600} display="block" mt={0.5}>
            {order.serviceType.replace(/_/g, ' ')}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11, mt: 0.5 }}>
          {order.description?.slice(0, 60)}{order.description?.length > 60 ? '…' : ''}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Single draggable card ────────────────────────────────────────────────────

function DraggableCard({ order, techName, onStatusChange, onAction, detailBasePath }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(order.id),
    data: { fromStatus: order.status },
  });

  return (
    <Card
      ref={setNodeRef}
      variant="outlined"
      sx={{
        opacity: isDragging ? 0.35 : 1,
        transition: isDragging ? undefined : 'transform 150ms, box-shadow 150ms',
        '&:hover': isDragging ? {} : { transform: 'translateY(-2px)', boxShadow: 4 },
        touchAction: 'none',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Header row: drag handle + id + priority + open */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box
              {...attributes}
              {...listeners}
              sx={{ color: 'text.disabled', cursor: 'grab', display: 'flex', '&:active': { cursor: 'grabbing' } }}
            >
              <DragIndicatorIcon sx={{ fontSize: 16 }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>#{order.id}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {order.priority === 'HIGH' && (
              <Chip label="HIGH" size="small" color="error"
                sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
            )}
            <Tooltip title="Open detail">
              <IconButton size="small"
                onClick={() => navigate(`${detailBasePath}/${order.id}`)}>
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

        <Typography variant="body2" color="text.secondary"
          sx={{ fontSize: 12, mb: 1, lineHeight: 1.4 }}>
          {order.description?.slice(0, 80)}{order.description?.length > 80 ? '…' : ''}
        </Typography>

        <Typography variant="caption" color="text.disabled" display="block">
          🚢 {order.vesselName ?? `#${order.vesselId}`}
        </Typography>
        {techName && (
          <Typography variant="caption" color="text.disabled" display="block">
            👤 {techName}
          </Typography>
        )}
        {order.createdAt && (
          <Typography variant="caption" color="text.disabled" display="block">
            {new Date(order.createdAt).toLocaleDateString()}
          </Typography>
        )}

        {/* Quick action buttons */}
        <Stack direction="row" spacing={0.5} mt={1.5} flexWrap="wrap" useFlexGap>
          {order.status === 'PENDING_APPROVAL' && <>
            <Button size="small" variant="contained" color="success"
              startIcon={<CheckRoundedIcon />}
              onClick={() => onAction('approve', order)} sx={{ fontSize: 11 }}>
              Approve
            </Button>
            <Button size="small" variant="outlined" color="error"
              startIcon={<CloseRoundedIcon />}
              onClick={() => onAction('reject', order)} sx={{ fontSize: 11 }}>
              Reject
            </Button>
          </>}

          {order.status === 'PENDING' && <>
            <Button size="small" variant="outlined" color="secondary"
              startIcon={<PersonAddRoundedIcon />}
              onClick={() => onAction('assign', order)} sx={{ fontSize: 11 }}>
              Assign
            </Button>
            <Button size="small" variant="contained" color="primary"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={() => onStatusChange(order.id, 'IN_PROGRESS')} sx={{ fontSize: 11 }}>
              Start
            </Button>
          </>}

          {order.status === 'IN_PROGRESS' && <>
            <Button size="small" variant="contained" color="success"
              startIcon={<CheckRoundedIcon />}
              onClick={() => onStatusChange(order.id, 'COMPLETED')} sx={{ fontSize: 11 }}>
              Done
            </Button>
            <Button size="small" variant="outlined" color="warning"
              startIcon={<HourglassEmptyRoundedIcon />}
              onClick={() => onStatusChange(order.id, 'WAITING_PARTS')} sx={{ fontSize: 11 }}>
              Parts
            </Button>
          </>}

          {order.status === 'WAITING_PARTS' && <>
            <Button size="small" variant="outlined" color="primary"
              startIcon={<ReplayRoundedIcon />}
              onClick={() => onStatusChange(order.id, 'IN_PROGRESS')} sx={{ fontSize: 11 }}>
              Resume
            </Button>
            <Button size="small" variant="contained" color="success"
              startIcon={<CheckRoundedIcon />}
              onClick={() => onStatusChange(order.id, 'COMPLETED')} sx={{ fontSize: 11 }}>
              Done
            </Button>
          </>}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────

function DroppableCol({ col, cards, techById, onStatusChange, onAction, detailBasePath }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  const bg = isOver ? alpha(col.color, 0.14) : COL_BG[col.status] ?? '#FAFAFA';

  return (
    <Box sx={{ minWidth: 268, flex: '0 0 268px' }}>
      {/* Column header */}
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

      {/* Drop zone */}
      <Box
        ref={setNodeRef}
        sx={{
          border: '1px solid', borderTop: 0, borderColor: isOver ? col.color : 'divider',
          borderRadius: '0 0 6px 6px',
          bgcolor: bg,
          p: 1, minHeight: 260,
          display: 'flex', flexDirection: 'column', gap: 1,
          transition: 'background-color 150ms, border-color 150ms',
        }}
      >
        {cards.length === 0 ? (
          <Box sx={{
            border: '2px dashed', borderColor: isOver ? col.color : 'divider',
            borderRadius: 2, m: 1, p: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 150ms',
          }}>
            <Typography variant="caption" color={isOver ? col.color : 'text.disabled'}>
              {isOver ? 'Drop here' : 'Empty'}
            </Typography>
          </Box>
        ) : (
          cards.map(o => (
            <DraggableCard
              key={o.id}
              order={o}
              techName={techById[String(o.assignedTechnicianId)]?.name}
              onStatusChange={onStatusChange}
              onAction={onAction}
              detailBasePath={detailBasePath}
            />
          ))
        )}

        {/* Drop hint when column has cards */}
        {cards.length > 0 && isOver && (
          <Box sx={{
            border: '2px dashed', borderColor: col.color,
            borderRadius: 2, p: 1.5, textAlign: 'center',
          }}>
            <Typography variant="caption" color={col.color} fontWeight={600}>
              Drop here
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export default function WorkOrderKanban({
  orders = [],
  technicians = [],
  onStatusChange,
  onAction,
  detailBasePath = '/team-lead/orders',
}) {
  const [activeOrder, setActiveOrder]   = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null); // order to cancel

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const techById = Object.fromEntries(technicians.map(t => [String(t.id), t]));

  const handleDragStart = ({ active }) => {
    setActiveOrder(orders.find(o => String(o.id) === active.id) ?? null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveOrder(null);
    if (!over) return;

    const fromStatus = active.data.current?.fromStatus;
    const toStatus   = over.id;
    if (!toStatus || fromStatus === toStatus) return;

    const order = orders.find(o => String(o.id) === active.id);
    if (!order) return;

    if (toStatus === 'CANCELLED') {
      setCancelTarget(order);
      return;
    }

    onStatusChange(order.id, toStatus);
  };

  const confirmCancel = () => {
    if (cancelTarget) onStatusChange(cancelTarget.id, 'CANCELLED');
    setCancelTarget(null);
  };

  const active    = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length;
  const total     = orders.length;

  return (
    <>
      {/* Board stats */}
      <Stack direction="row" spacing={2} mb={3} alignItems="center">
        <Typography variant="body2" color="text.secondary">{active} active</Typography>
        <Typography variant="body2" color="text.disabled">{total} total</Typography>
        <Tooltip title="Drag the ⠿ handle on any card to move it between columns">
          <Typography variant="caption" color="text.disabled"
            sx={{ ml: 'auto !important', cursor: 'help', borderBottom: '1px dashed', borderColor: 'text.disabled' }}>
            Drag cards to change status
          </Typography>
        </Tooltip>
      </Stack>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
          {KANBAN_COLS.map(col => (
            <DroppableCol
              key={col.status}
              col={col}
              cards={orders.filter(o => o.status === col.status)}
              techById={techById}
              onStatusChange={onStatusChange}
              onAction={onAction}
              detailBasePath={detailBasePath}
            />
          ))}
        </Box>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeOrder ? <FloatingCard order={activeOrder} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Cancel confirmation dialog */}
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel Order #{cancelTarget?.id}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will mark the work order as <strong>CANCELLED</strong>. The client will be notified.
            You can re-open it by dragging the card back to another column.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Back</Button>
          <Button variant="contained" color="error" onClick={confirmCancel}>
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
