/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Stack, Grid,
} from '@mui/material';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi } from '../../services/api';
import LocationPickerField from './LocationPickerField';

const TYPES = [
  { value: 'MANUAL',           label: 'Manual / Parts Delivery' },
  { value: 'SHOP_ORDER',       label: 'Shop Order' },
  { value: 'WORK_ORDER_PARTS', label: 'Work Order Parts' },
];

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const empty = {
  type: 'MANUAL',
  deliveryAddress: '',
  deliveryLat: null,
  deliveryLng: null,
  scheduledDate: localToday(),
  pickupAddress: '',
  pickupLat: null,
  pickupLng: null,
  pickupLabel: '',
  clientPhone: '',
  notes: '',
  referenceId: '',
  assignedDriverId: '',
};

/**
 * Dialog to create a new delivery task and optionally assign it to a driver.
 *
 * Props:
 *   open           – boolean
 *   onClose()      – close handler
 *   drivers        – [{id, name}]
 *   invalidateKeys – array of React Query keys to invalidate after create
 */
export default function CreateDeliveryTaskDialog({ open, onClose, drivers = [], invalidateKeys = [] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const setLocation = (prefix) => ({ address, lat, lng }) =>
    setForm(prev => ({
      ...prev,
      [`${prefix}Address`]: address,
      [`${prefix}Lat`]: lat,
      [`${prefix}Lng`]: lng,
    }));

  const mutation = useMutation({
    mutationFn: async (data) => {
      const created = await deliveryApi.adminCreateTask({
        type:            data.type,
        referenceId:     data.referenceId ? Number(data.referenceId) : undefined,
        deliveryAddress: data.deliveryAddress,
        deliveryLat:     data.deliveryLat ?? undefined,
        deliveryLng:     data.deliveryLng ?? undefined,
        scheduledDate:   data.scheduledDate,
        pickupLabel:     data.pickupLabel   || undefined,
        pickupAddress:   data.pickupAddress || undefined,
        pickupLat:       data.pickupLat ?? undefined,
        pickupLng:       data.pickupLng ?? undefined,
        clientPhone:     data.clientPhone   || undefined,
        notes:           data.notes         || undefined,
      });
      if (data.assignedDriverId) {
        await deliveryApi.adminAssignTask(created.id, Number(data.assignedDriverId));
      }
      return created;
    },
    onSuccess: () => {
      invalidateKeys.forEach(key => qc.invalidateQueries({ queryKey: [key] }));
      toast.success('Delivery task created');
      setForm(empty);
      onClose();
    },
    onError: () => toast.error('Failed to create task'),
  });

  const valid = form.deliveryAddress.trim() && form.scheduledDate;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Delivery Task</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select value={form.type} label="Type" onChange={set('type')}>
              {TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {form.type !== 'MANUAL' && (
            <TextField
              label="Reference ID (Order #)"
              value={form.referenceId}
              onChange={set('referenceId')}
              type="number"
              inputProps={{ min: 1 }}
            />
          )}

          {/* Delivery location picker */}
          <LocationPickerField
            label="Delivery Address"
            value={form.deliveryAddress}
            lat={form.deliveryLat}
            lng={form.deliveryLng}
            onChange={setLocation('delivery')}
            required
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Scheduled Date *"
                type="date"
                value={form.scheduledDate}
                onChange={set('scheduledDate')}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Client Phone"
                value={form.clientPhone}
                onChange={set('clientPhone')}
                fullWidth
              />
            </Grid>
          </Grid>

          <TextField
            label="Pickup Label (e.g. Rigoo Store)"
            value={form.pickupLabel}
            onChange={set('pickupLabel')}
            fullWidth
          />

          {/* Pickup location picker */}
          <LocationPickerField
            label="Pickup Address"
            value={form.pickupAddress}
            lat={form.pickupLat}
            lng={form.pickupLng}
            onChange={setLocation('pickup')}
          />

          <TextField
            label="Notes"
            value={form.notes}
            onChange={set('notes')}
            fullWidth
            multiline
            rows={2}
          />

          <FormControl fullWidth>
            <InputLabel>Assign Driver (optional)</InputLabel>
            <Select value={form.assignedDriverId} label="Assign Driver (optional)"
              onChange={set('assignedDriverId')}>
              <MenuItem value="">— Unassigned —</MenuItem>
              {drivers.map(d => (
                <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
        <Button variant="contained" disabled={!valid || mutation.isPending}
          onClick={() => mutation.mutate(form)}>
          {mutation.isPending ? 'Creating…' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
