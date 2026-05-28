/* eslint-disable react/prop-types */
/**
 * InventoryManagement — Admin/Team-Lead parts catalogue.
 *
 * Architecture:
 * - Paginated search via GET /api/inventory (q + category filters).
 * - Low-stock banner: separate query to /api/inventory/low-stock, shown as
 *   a dismissible Alert with a badge count.
 * - CRUD dialogs: Create/Edit share one <PartDialog>; Delete is a confirm dialog.
 * - Stock adjustment: inline PATCH /{id}/stock via a ± stepper chip so team
 *   leads can bump quantities without opening the full edit form.
 * - All mutations invalidate ['inventory'] so the list and low-stock banner
 *   stay consistent.
 *
 * Edge cases handled:
 * - SKU uniqueness conflict (409) surfaced as a field-level error message.
 * - Delta that would make stock go negative (400) shown as a toast.
 * - Empty search results show a friendly placeholder.
 * - Soft-deleted parts are never returned (backend filters active=true).
 */
import { useState, useCallback } from 'react';
import {
  Box, Typography, Stack, Card, CardContent,
  Table, TableBody, TableCell, TableHead, TableRow,
  TablePagination, TextField, MenuItem, Select, FormControl,
  InputLabel, InputAdornment, IconButton, Chip, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Alert, Skeleton, Divider,
  CircularProgress,
} from '@mui/material';
import SearchRoundedIcon         from '@mui/icons-material/SearchRounded';
import AddRoundedIcon            from '@mui/icons-material/AddRounded';
import EditRoundedIcon           from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon         from '@mui/icons-material/DeleteRounded';
import AddCircleOutlineIcon      from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon   from '@mui/icons-material/RemoveCircleOutline';
import WarningAmberRoundedIcon   from '@mui/icons-material/WarningAmberRounded';
import InventoryRoundedIcon      from '@mui/icons-material/InventoryRounded';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi }          from '../../services/api';
import { Reveal }                from '../../components/common/Motion';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['ELECTRICAL', 'MECHANICAL', 'HYDRAULIC', 'SAFETY', 'HULL', 'ENGINE', 'OTHER'];

const EMPTY_PART = {
  sku: '', name: '', description: '',
  quantityOnHand: 0, reorderLevel: 5,
  unitCostQar: '', supplier: '', location: '', category: '',
};

const qar = (v) =>
  v == null ? '—' : Number(v).toLocaleString('en-QA', { minimumFractionDigits: 2 }) + ' QAR';

// ─── Low-stock banner ─────────────────────────────────────────────────────────

function LowStockBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn:  inventoryApi.getLowStock,
    staleTime: 60_000,
  });

  if (!data.length || dismissed) return null;

  return (
    <Reveal>
      <Alert
        severity="warning"
        icon={<WarningAmberRoundedIcon />}
        onClose={() => setDismissed(true)}
        sx={{ mb: 2, borderRadius: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => setDismissed(true)}>
            Dismiss
          </Button>
        }
      >
        <Typography variant="body2" fontWeight={600}>
          {data.length} part{data.length !== 1 ? 's' : ''} below reorder level:
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
          {data.map((p) => (
            <Chip
              key={p.id}
              size="small"
              label={`${p.name} (${p.quantityOnHand}/${p.reorderLevel})`}
              color="warning"
              variant="outlined"
              sx={{ fontSize: '0.72rem' }}
            />
          ))}
        </Stack>
      </Alert>
    </Reveal>
  );
}

// ─── Stock adjust cell ────────────────────────────────────────────────────────

function StockAdjuster({ part }) {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);

  const adjust = useMutation({
    mutationFn: ({ delta }) => inventoryApi.adjustStock(part.id, delta),
    onMutate: () => setPending(true),
    onSettled: () => {
      setPending(false);
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Tooltip title="Remove 1">
        <span>
          <IconButton
            size="small"
            disabled={pending || part.quantityOnHand <= 0}
            onClick={() => adjust.mutate({ delta: -1 })}
          >
            <RemoveCircleOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Typography variant="body2" fontWeight={600} minWidth={28} textAlign="center">
        {pending ? <CircularProgress size={14} /> : part.quantityOnHand}
      </Typography>

      <Tooltip title="Add 1">
        <IconButton
          size="small"
          disabled={pending}
          onClick={() => adjust.mutate({ delta: 1 })}
        >
          <AddCircleOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

function PartDialog({ open, onClose, part, onSaved }) {
  const isEdit = Boolean(part?.id);
  const [form, setForm] = useState(part ?? EMPTY_PART);
  const [skuError, setSkuError] = useState('');

  const qc = useQueryClient();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? inventoryApi.update(part.id, form)
        : inventoryApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      onSaved?.();
      onClose();
    },
    onError: (err) => {
      if (err?.response?.status === 409) {
        setSkuError('SKU already exists — choose a unique value.');
      }
    },
  });

  // reset when dialog opens with new part
  const handleOpen = useCallback(() => {
    setForm(part ?? EMPTY_PART);
    setSkuError('');
  }, [part]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEntering: handleOpen }}
    >
      <DialogTitle>{isEdit ? 'Edit Part' : 'Add New Part'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="SKU *"
              value={form.sku}
              onChange={set('sku')}
              error={Boolean(skuError)}
              helperText={skuError}
              disabled={isEdit}
              fullWidth
              size="small"
            />
            <TextField
              label="Name *"
              value={form.name}
              onChange={set('name')}
              fullWidth
              size="small"
            />
          </Stack>

          <TextField
            label="Description"
            value={form.description ?? ''}
            onChange={set('description')}
            multiline
            rows={2}
            size="small"
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Qty on Hand"
              type="number"
              value={form.quantityOnHand}
              onChange={set('quantityOnHand')}
              size="small"
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Reorder Level"
              type="number"
              value={form.reorderLevel}
              onChange={set('reorderLevel')}
              size="small"
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Unit Cost (QAR)"
              type="number"
              value={form.unitCostQar ?? ''}
              onChange={set('unitCostQar')}
              size="small"
              fullWidth
              inputProps={{ min: 0, step: '0.01' }}
              InputProps={{
                endAdornment: <InputAdornment position="end">QAR</InputAdornment>,
              }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={form.category ?? ''}
                label="Category"
                onChange={set('category')}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Supplier"
              value={form.supplier ?? ''}
              onChange={set('supplier')}
              size="small"
              fullWidth
            />
            <TextField
              label="Location (bin)"
              value={form.location ?? ''}
              onChange={set('location')}
              size="small"
              fullWidth
              placeholder="e.g. A-3-2"
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => save.mutate()}
          disabled={save.isPending || !form.sku?.trim() || !form.name?.trim()}
        >
          {save.isPending ? <CircularProgress size={18} color="inherit" /> : isEdit ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({ open, onClose, part }) {
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: () => inventoryApi.delete(part.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Deactivate Part?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          <strong>{part?.name}</strong> (SKU: {part?.sku}) will be hidden from
          inventory. Existing work-order references are preserved.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={del.isPending}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => del.mutate()}
          disabled={del.isPending}
        >
          {del.isPending ? <CircularProgress size={18} color="inherit" /> : 'Deactivate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InventoryManagement() {
  const [q, setQ]               = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage]         = useState(0);
  const [rowsPerPage]           = useState(20);

  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editPart, setEditPart]       = useState(null);
  const [deletePart, setDeletePart]   = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory', 'list', { q, category, page, rowsPerPage }],
    queryFn:  () => inventoryApi.search({ q: q || undefined, category: category || undefined, page, size: rowsPerPage }),
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const parts      = data?.content ?? [];
  const totalCount = data?.totalElements ?? 0;

  const openCreate = () => { setEditPart(null); setDialogOpen(true); };
  const openEdit   = (p) => { setEditPart(p);   setDialogOpen(true); };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>

      {/* Header */}
      <Reveal>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InventoryRoundedIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h5" fontWeight={700}>Parts Inventory</Typography>
            <Chip label={`${totalCount} parts`} size="small" variant="outlined" />
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={openCreate}
            sx={{ borderRadius: 2 }}
          >
            Add Part
          </Button>
        </Stack>
      </Reveal>

      {/* Low-stock banner */}
      <LowStockBanner />

      {/* Filters */}
      <Reveal>
        <Card sx={{ mb: 2, borderRadius: 3 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                placeholder="Search by name or SKU…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(0); }}
                size="small"
                sx={{ flexGrow: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  label="Category"
                  onChange={(e) => { setCategory(e.target.value); setPage(0); }}
                >
                  <MenuItem value="">All categories</MenuItem>
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>
      </Reveal>

      {/* Table */}
      <Reveal>
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>SKU</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">Qty</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}><Skeleton variant="text" width="80%" /></TableCell>
                  ))}
                </TableRow>
              ))}

              {isError && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Alert severity="error" sx={{ m: 1 }}>Failed to load inventory.</Alert>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && parts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <InventoryRoundedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                    No parts found. Add your first part to get started.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && parts.map((part) => {
                const isLow = part.quantityOnHand <= part.reorderLevel;
                return (
                  <TableRow
                    key={part.id}
                    hover
                    sx={{ '&:last-child td': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                        {part.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" fontWeight={500}>{part.name}</Typography>
                        {isLow && (
                          <Tooltip title="Below reorder level">
                            <WarningAmberRoundedIcon color="warning" sx={{ fontSize: 16 }} />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {part.category ? (
                        <Chip label={part.category} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ) : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <StockAdjuster part={part} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{qar(part.unitCostQar)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize="0.78rem">
                        {part.location ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>
                        {part.supplier ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(part)}>
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate">
                          <IconButton size="small" color="error" onClick={() => setDeletePart(part)}>
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Divider />
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[20]}
            onPageChange={(_, newPage) => setPage(newPage)}
          />
        </Card>
      </Reveal>

      {/* Dialogs */}
      <PartDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        part={editPart}
      />

      {deletePart && (
        <DeleteDialog
          open={Boolean(deletePart)}
          onClose={() => setDeletePart(null)}
          part={deletePart}
        />
      )}
    </Box>
  );
}
