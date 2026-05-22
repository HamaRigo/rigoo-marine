import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Grid, TextField, MenuItem, Button,
  IconButton, Divider, Paper, Stack, InputAdornment, Chip,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  PersonSearch as PersonSearchIcon,
  EditNote as EditNoteIcon,
} from '@mui/icons-material';
import { adminApi } from '../../services/api';
import { loadCompanySettings } from '../../pages/admin/Settings';
import toast from 'react-hot-toast';

const INVOICE_STATUSES = ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
const QUOTATION_STATUSES = ['DRAFT', 'PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

const emptyItem = () => ({ description: '', quantity: 1, unitPrice: '', taxRate: 0 });

const DEFAULT_TERMS = {
  invoice:   'Payment is due within 30 days of the invoice date.\nA 2% monthly late fee applies to overdue balances.\nAll amounts are in Qatari Riyal (QAR).',
  quotation: 'This quotation is valid for one week only from its date.\nA 50% deposit is required to confirm the booking/order.\nThe full remaining balance is due before work commences / parts are released.',
};
const DEFAULT_TERMS_AR = {
  invoice:   'يستحق السداد خلال ٣٠ يومًا من تاريخ الفاتورة\nيُطبَّق رسم تأخير ٢٪ شهريًا على المبالغ المتأخرة\nجميع المبالغ بالريال القطري',
  quotation: 'هذا العرض ساري لمدة أسبوع واحد فقط من تاريخه\nيطلب دفع عربون نسبته ٥٠٪ لتأكيد الحجز/الطلب\nيستحق دفع الرصيد المتبقي بالكامل قبل بدء العمل/إصدار القطع',
};


const fmt = (n) =>
  Number(n || 0).toLocaleString('en-QA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toDateStr = (val) => (val ? val.toString().split('T')[0] : '');

export default function CreateInvoiceDialog({ open, onClose, clients = [], type = 'invoice', onCreated, initialData = null, editId = null }) {
  const isInvoice = type === 'invoice';
  const isEdit = !!editId;
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const due30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const due14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  const defaultForm = () => initialData ? {
    workOrderId: initialData.workOrderId || '',
    clientId: initialData.clientId || '',
    status: initialData.status || (isInvoice ? 'PENDING' : 'DRAFT'),
    issueDate: toDateStr(initialData.issueDate) || today,
    dueDate: toDateStr(initialData.dueDate || initialData.expiryDate) || (isInvoice ? due30 : due14),
    notes: initialData.notes || '',
    terms: initialData.terms || '',
    termsArabic: initialData.termsArabic || '',
    logoUrl: initialData.logoUrl || loadCompanySettings().companyLogo || '/brand/logo.PNG',
  } : {
    workOrderId: '',
    clientId: '',
    status: isInvoice ? 'PENDING' : 'DRAFT',
    issueDate: today,
    dueDate: isInvoice ? due30 : due14,
    notes: '',
    terms: '',
    termsArabic: '',
    logoUrl: loadCompanySettings().companyLogo || '/brand/logo.PNG',
  };

  const defaultItems = () => initialData?.items?.length
    ? initialData.items.map((it) => ({
        description: it.description || '',
        quantity: it.quantity ?? 1,
        unitPrice: it.unitPrice ?? '',
        taxRate: it.taxRate ?? 0,
      }))
    : [emptyItem()];

  const [form, setForm] = useState(defaultForm);
  const [items, setItems] = useState(defaultItems);
  const [billToMode, setBillToMode] = useState(
    initialData?.billToName && !initialData?.clientId ? 'manual' : 'registered'
  );
  const [manualBillTo, setManualBillTo] = useState(
    initialData?.billToName && !initialData?.clientId
      ? { name: initialData.billToName || '', email: initialData.billToEmail || '', phone: initialData.billToPhone || '', address: initialData.billToAddress || '', company: initialData.billToCompany || '' }
      : { name: '', email: '', phone: '', address: '', company: '' }
  );
  const [submitting, setSubmitting] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === String(form.clientId)) || null,
    [clients, form.clientId]
  );

  const lineAmounts = items.map((it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unitPrice) || 0;
    return qty * price;
  });
  const subtotal = lineAmounts.reduce((a, b) => a + b, 0);
  const taxAmount = items.reduce((acc, it, i) => {
    const rate = parseFloat(it.taxRate) || 0;
    return acc + lineAmounts[i] * (rate / 100);
  }, 0);
  const total = subtotal + taxAmount;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const updateItem = (i, field, val) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: val } : it)));

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const setManual = (field) => (e) =>
    setManualBillTo((m) => ({ ...m, [field]: e.target.value }));

  const handleClose = () => {
    setForm(defaultForm());
    setItems(defaultItems());
    setBillToMode('registered');
    setManualBillTo({ name: '', email: '', phone: '', address: '', company: '' });
    onClose();
  };

  const handleSubmit = async () => {
    if (billToMode === 'registered' && !form.clientId) { toast.error('Please select a client'); return; }
    if (billToMode === 'manual' && !manualBillTo.name.trim()) { toast.error('Please enter the client name'); return; }
    if (items.every((it) => !it.description)) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      const docType = isInvoice ? 'invoice' : 'quotation';
      const payload = {
        ...form,
        terms:       form.terms.trim()       || DEFAULT_TERMS[docType],
        termsArabic: form.termsArabic.trim() || DEFAULT_TERMS_AR[docType],
        workOrderId: form.workOrderId ? parseInt(form.workOrderId) : null,
        clientId: billToMode === 'registered' ? parseInt(form.clientId) : null,
        billToName:    billToMode === 'manual' ? manualBillTo.name    : (selectedClient?.name    || null),
        billToEmail:   billToMode === 'manual' ? manualBillTo.email   : (selectedClient?.email   || null),
        billToPhone:   billToMode === 'manual' ? manualBillTo.phone   : (selectedClient?.phone   || null),
        billToAddress: billToMode === 'manual' ? manualBillTo.address : (selectedClient?.address || null),
        billToCompany: billToMode === 'manual' ? manualBillTo.company : (selectedClient?.company || null),
        issueDate: form.issueDate ? form.issueDate + 'T00:00:00' : null,
        dueDate: form.dueDate ? form.dueDate + 'T00:00:00' : null,
        expiryDate: !isInvoice && form.dueDate ? form.dueDate + 'T00:00:00' : null,
        items: items.filter((it) => it.description).map((it) => ({
          description: it.description,
          quantity: parseFloat(it.quantity) || 1,
          unitPrice: parseFloat(it.unitPrice) || 0,
          taxRate: parseFloat(it.taxRate) || 0,
        })),
      };
      if (isEdit) {
        if (isInvoice) {
          await adminApi.updateInvoice(editId, payload);
          toast.success('Invoice updated');
        } else {
          await adminApi.updateQuotation(editId, payload);
          toast.success('Quotation updated');
        }
      } else if (isInvoice) {
        await adminApi.createInvoice(payload);
        toast.success('Invoice created');
      } else {
        await adminApi.createQuotation(payload);
        toast.success('Quotation created');
      }
      queryClient.invalidateQueries(['admin', 'invoices']);
      queryClient.invalidateQueries(['admin', 'quotations']);
      onCreated?.();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} ${type}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { bgcolor: '#f5f5f5' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', borderBottom: '2px solid', borderColor: 'primary.main' }}>
        <ReceiptIcon color="primary" />
        <Typography variant="h6" component="span" fontWeight="bold">
          {isEdit ? 'Edit' : 'New'} {isInvoice ? 'Invoice' : 'Quotation'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Invoice Paper */}
        <Paper elevation={3} sx={{ p: 4, bgcolor: 'white', borderRadius: 2 }}>

          {/* ── Header ── */}
          <Grid container spacing={2} alignItems="flex-start" sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }} >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box
                  component="img"
                  src={form.logoUrl || '/brand/logo.PNG'}
                  alt="Rigoo Marine"
                  sx={{ height: 48, width: 'auto', objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </Box>
              <TextField
                size="small"
                label="Company Logo URL (optional)"
                value={form.logoUrl}
                onChange={set('logoUrl')}
                fullWidth
                sx={{ mt: 1 }}
                placeholder="https://..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { md: 'right' } }} >
              <Typography variant="h4" fontWeight="bold" color="primary.dark" gutterBottom>
                {isInvoice ? 'INVOICE' : 'QUOTATION'}
              </Typography>
              <Chip
                label="# Auto-generated"
                variant="outlined"
                size="small"
                color="primary"
                sx={{ mb: 1 }}
              />
              <Grid container spacing={1} sx={{ mt: 1 }}>
                <Grid size={6} >
                  <TextField size="small" fullWidth type="date" label="Issue Date"
                    InputLabelProps={{ shrink: true }} value={form.issueDate} onChange={set('issueDate')} />
                </Grid>
                <Grid size={6} >
                  <TextField size="small" fullWidth type="date"
                    label={isInvoice ? 'Due Date' : 'Expiry Date'}
                    InputLabelProps={{ shrink: true }} value={form.dueDate} onChange={set('dueDate')} />
                </Grid>
                <Grid size={12} >
                  <TextField size="small" fullWidth select label="Status"
                    value={form.status} onChange={set('status')}>
                    {(isInvoice ? INVOICE_STATUSES : QUOTATION_STATUSES).map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* ── Bill To ── */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 6 }} >
              <Typography variant="overline" color="text.secondary" fontWeight="bold">FROM</Typography>
              <Box sx={{ mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold">Rigoo Marine LLC</Typography>
                <Typography variant="body2" color="text.secondary">Doha, Qatar</Typography>
                <Typography variant="body2" color="text.secondary">info@rigoomarine.qa</Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="overline" color="text.secondary" fontWeight="bold">BILL TO</Typography>
                <ToggleButtonGroup
                  value={billToMode}
                  exclusive
                  onChange={(_, v) => { if (v) { setBillToMode(v); setForm((f) => ({ ...f, clientId: '' })); setManualBillTo({ name: '', email: '', phone: '', address: '', company: '' }); } }}
                  size="small"
                >
                  <ToggleButton value="registered" sx={{ fontSize: '0.65rem', py: 0.3, px: 1 }}>
                    <PersonSearchIcon sx={{ fontSize: 14, mr: 0.5 }} />Registered
                  </ToggleButton>
                  <ToggleButton value="manual" sx={{ fontSize: '0.65rem', py: 0.3, px: 1 }}>
                    <EditNoteIcon sx={{ fontSize: 14, mr: 0.5 }} />Manual
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {billToMode === 'registered' ? (
                <>
                  <TextField
                    select fullWidth size="small" label="Select Client" required
                    value={form.clientId} onChange={set('clientId')} sx={{ mt: 0.5 }}
                  >
                    {clients.map((c) => (
                      <MenuItem key={c.id} value={c.id}>{c.name} — {c.email}</MenuItem>
                    ))}
                  </TextField>
                  {selectedClient && (
                    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight="bold">{selectedClient.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{selectedClient.email}</Typography>
                      {selectedClient.phone && <Typography variant="body2" color="text.secondary">{selectedClient.phone}</Typography>}
                      {selectedClient.company && <Typography variant="body2" color="text.secondary">{selectedClient.company}</Typography>}
                    </Box>
                  )}
                </>
              ) : (
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  <Grid size={12} >
                    <TextField size="small" fullWidth required label="Full Name"
                      value={manualBillTo.name} onChange={setManual('name')} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} >
                    <TextField size="small" fullWidth label="Email"
                      value={manualBillTo.email} onChange={setManual('email')} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} >
                    <TextField size="small" fullWidth label="Phone"
                      value={manualBillTo.phone} onChange={setManual('phone')} />
                  </Grid>
                  <Grid size={12} >
                    <TextField size="small" fullWidth label="Company (optional)"
                      value={manualBillTo.company} onChange={setManual('company')} />
                  </Grid>
                  <Grid size={12} >
                    <TextField size="small" fullWidth label="Address (optional)"
                      value={manualBillTo.address} onChange={setManual('address')} />
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Grid>

          {isInvoice && (
            <TextField size="small" label="Work Order ID (optional)" type="number"
              value={form.workOrderId} onChange={set('workOrderId')} sx={{ mb: 2, width: 200 }} />
          )}

          <Divider sx={{ my: 2 }} />

          {/* ── Line Items ── */}
          <Typography variant="overline" color="text.secondary" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
            LINE ITEMS
          </Typography>

          {/* Table header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 90px 110px 40px', gap: 1, mb: 1, px: 1 }}>
            {['Description', 'Qty', 'Unit Price', 'Tax %', 'Amount', ''].map((h) => (
              <Typography key={h} variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                {h}
              </Typography>
            ))}
          </Box>

          <Box sx={{ mb: 1 }}>
            {items.map((item, i) => (
              <Box key={i} sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 120px 90px 110px 40px',
                gap: 1, mb: 1, alignItems: 'center',
                p: 1, bgcolor: i % 2 === 0 ? 'grey.50' : 'white', borderRadius: 1,
              }}>
                <TextField size="small" placeholder="Description" value={item.description}
                  onChange={(e) => updateItem(i, 'description', e.target.value)} />
                <TextField size="small" type="number" placeholder="1" value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                  inputProps={{ min: 1 }} />
                <TextField size="small" type="number" placeholder="0.00" value={item.unitPrice}
                  onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">QAR</InputAdornment> }} />
                <TextField size="small" type="number" placeholder="0" value={item.taxRate}
                  onChange={(e) => updateItem(i, 'taxRate', e.target.value)}
                  InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }} />
                <Typography variant="body2" fontWeight="bold" sx={{ textAlign: 'right', pr: 1 }}>
                  QAR {fmt(lineAmounts[i])}
                </Typography>
                <IconButton size="small" onClick={() => removeItem(i)} disabled={items.length === 1}
                  color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>

          <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mb: 2 }}>
            Add Line Item
          </Button>

          <Divider sx={{ my: 2 }} />

          {/* ── Totals ── */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Box sx={{ minWidth: 280 }}>
              <Stack spacing={0.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                  <Typography variant="body2">QAR {fmt(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Tax</Typography>
                  <Typography variant="body2">QAR {fmt(taxAmount)}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold">TOTAL</Typography>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    QAR {fmt(total)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* ── Notes & Terms ── */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }} >
              <TextField label="Notes" fullWidth multiline rows={3}
                value={form.notes} onChange={set('notes')}
                placeholder="Payment instructions, references…" size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }} >
              <TextField label="Terms & Conditions (English)" fullWidth multiline rows={3}
                value={form.terms} onChange={set('terms')}
                placeholder="Standard Qatari terms…" size="small" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }} >
              <TextField label="الشروط والأحكام" fullWidth multiline rows={3}
                value={form.termsArabic} onChange={set('termsArabic')}
                dir="rtl" size="small" />
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Total: <strong>QAR {fmt(total)}</strong>
          </Typography>
        </Box>
        <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting || (billToMode === 'registered' && !form.clientId) || (billToMode === 'manual' && !manualBillTo.name.trim())}>
          {submitting ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? `Save ${isInvoice ? 'Invoice' : 'Quotation'}` : `Create ${isInvoice ? 'Invoice' : 'Quotation'}`)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
