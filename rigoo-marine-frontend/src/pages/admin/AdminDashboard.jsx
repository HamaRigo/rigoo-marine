import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, MenuItem, ToggleButtonGroup,
  ToggleButton, Paper, Avatar, Divider, Stack, Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  Build as BuildIcon,
  Receipt as ReceiptIcon,
  RequestQuote as QuoteIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Engineering as EngineeringIcon,
  LocalShipping as VesselIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  PhotoLibrary as MediaIcon,
  ContactPhone as ContactInfoIcon,
  Image as ImageIcon,
  Business as LogoIcon,
} from '@mui/icons-material';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { formatPrice } from '../../utils/format';

const managementModules = [
  {
    title: 'User Management',
    path: '/admin/users',
    icon: PeopleIcon,
    color: '#1976d2',
    description: 'Manage users, roles, and permissions'
  },
  {
    title: 'Order Management',
    path: '/admin/orders',
    icon: BuildIcon,
    color: '#ed6c02',
    description: 'Track and manage work orders'
  },
  {
    title: 'Invoice Management',
    path: '/admin/invoices',
    icon: ReceiptIcon,
    color: '#2e7d32',
    description: 'Manage invoices and payments'
  },
  {
    title: 'Quotation Management',
    path: '/admin/quotations',
    icon: QuoteIcon,
    color: '#9c27b0',
    description: 'Create and manage quotations'
  },
  {
    title: 'Media Management',
    path: '/admin/media',
    icon: MediaIcon,
    color: '#d32f2f',
    description: 'Manage photos, videos, and media content'
  },
  {
    title: 'Contact Info',
    path: '/admin/contact-info',
    icon: ContactInfoIcon,
    color: '#009688',
    description: 'Manage contact details for About page'
  },
  {
    title: 'Service Management',
    path: '/admin/services',
    icon: EngineeringIcon,
    color: '#0288d1',
    description: 'Define services and pricing'
  },
  {
    title: 'Settings',
    path: '/admin/settings',
    icon: SettingsIcon,
    color: '#424242',
    description: 'Platform configuration'
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalUsers: 0,
    totalVessels: 0,
    monthlyRevenue: 0,
    pendingInvoices: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [documentType, setDocumentType] = useState('invoice');
  const [createDocumentOpen, setCreateDocumentOpen] = useState(false);
  const [formData, setFormData] = useState({
    workOrderId: '',
    clientId: '',
    status: 'PENDING',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
    termsArabic: '',
    logoUrl: '',
    insertedImages: [],
  });
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0, taxRate: 25 }]);
  const [newImageUrl, setNewImageUrl] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch stats from API
      const [usersData, invoicesPage] = await Promise.all([
        adminApi.getAllUsers().catch(() => []),
        adminApi.searchInvoices({ size: 100 }).catch(() => ({ content: [] })),
      ]);
      const invoicesData = invoicesPage?.content || [];

      // Calculate stats
      const totalUsers = usersData.length;
      const totalOrders = 47; // Placeholder until work-order integration
      const pendingOrders = 12;
      const completedOrders = 28;
      const monthlyRevenue = invoicesData
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      const pendingInvoices = invoicesData.filter(inv => inv.status === 'PENDING').length;

      setStats({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalUsers,
        totalVessels: 0,
        monthlyRevenue,
        pendingInvoices,
      });

      // Recent orders (placeholder)
      setRecentOrders([
        { id: 1, customer: 'John Doe', service: 'Engine Diagnostic', status: 'PENDING', date: '2026-04-15', technician: null },
        { id: 2, customer: 'Jane Smith', service: 'Bottom Paint', status: 'IN_PROGRESS', date: '2026-04-14', technician: 'Mike Davis' },
        { id: 3, customer: 'Bob Wilson', service: 'Hull Repair', status: 'COMPLETED', date: '2026-04-13', technician: 'Sarah Johnson' },
        { id: 4, customer: 'Alice Brown', service: 'Oil Change', status: 'PENDING', date: '2026-04-12', technician: null },
      ]);

      // Recent invoices
      setRecentInvoices(invoicesData.slice(0, 5) || []);
      setClients(usersData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDocument = () => {
    setCreateDocumentOpen(true);
  };

  const handleCloseCreateDocument = () => {
    setCreateDocumentOpen(false);
    setFormData({
      workOrderId: '',
      clientId: '',
      status: documentType === 'invoice' ? 'PENDING' : 'DRAFT',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: '',
      terms: '',
      termsArabic: '',
      logoUrl: '',
      insertedImages: [],
    });
    setItems([{ description: '', quantity: 1, unitPrice: 0, taxRate: 25 }]);
    setNewImageUrl('');
  };

  const handleDocumentTypeChange = (event, newType) => {
    if (newType) {
      setDocumentType(newType);
      setFormData({
        workOrderId: '',
        clientId: '',
        status: newType === 'invoice' ? 'PENDING' : 'DRAFT',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
        terms: '',
        termsArabic: '',
        logoUrl: '',
        insertedImages: [],
      });
      setItems([{ description: '', quantity: 1, unitPrice: 0, taxRate: 25 }]);
      setNewImageUrl('');
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, taxRate: 25 }]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: field === 'description' ? value : parseFloat(value) || 0 };
    setItems(newItems);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        workOrderId: documentType === 'invoice' ? parseInt(formData.workOrderId) : undefined,
        clientId: parseInt(formData.clientId),
        items: items.map(item => ({
          ...item,
          taxRate: item.taxRate || 0,
        })),
      };
      if (documentType === 'invoice') {
        await adminApi.createInvoice(payload);
        toast.success('Invoice created successfully');
      } else {
        await adminApi.createQuotation(payload);
        toast.success('Quotation created successfully');
      }
      handleCloseCreateDocument();
      fetchDashboardData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to create ${documentType}`);
    }
  };

  const handleAddImage = () => {
    if (newImageUrl && newImageUrl.trim()) {
      setFormData({ ...formData, insertedImages: [...formData.insertedImages, newImageUrl.trim()] });
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData({ ...formData, insertedImages: formData.insertedImages.filter((_, i) => i !== index) });
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'warning',
      IN_PROGRESS: 'info',
      COMPLETED: 'success',
      CANCELLED: 'error',
      PAID: 'success',
      DRAFT: 'default',
      OVERDUE: 'error',
      ACCEPTED: 'success',
      REJECTED: 'error',
      EXPIRED: 'default',
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div>
          <Typography>Loading dashboard...</Typography>
        </div>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Quick Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Complete platform management and oversight
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDashboardData}
          >
            Refresh
          </Button>
          <ToggleButtonGroup
            value={documentType}
            exclusive
            onChange={handleDocumentTypeChange}
            aria-label="document type"
            size="small"
          >
            <ToggleButton value="invoice" aria-label="invoice">
              <ReceiptIcon sx={{ mr: 1, fontSize: 'small' }} />
              Invoice
            </ToggleButton>
            <ToggleButton value="quotation" aria-label="quotation">
              <QuoteIcon sx={{ mr: 1, fontSize: 'small' }} />
              Quotation
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDocument}
          >
            Create {documentType === 'invoice' ? 'Invoice' : 'Quotation'}
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BuildIcon sx={{ fontSize: 32, mr: 1, opacity: 0.8 }} />
                <Typography variant="h4">{stats.totalOrders}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Orders</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PendingIcon sx={{ fontSize: 32, mr: 1, opacity: 0.8 }} />
                <Typography variant="h4">{stats.pendingOrders}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Pending Orders</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon sx={{ fontSize: 32, mr: 1, opacity: 0.8 }} />
                <Typography variant="h4">{stats.completedOrders}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Completed</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon sx={{ fontSize: 32, mr: 1, opacity: 0.8 }} />
                <Typography variant="h4">{stats.totalUsers}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Total Users</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <VesselIcon sx={{ fontSize: 32, mr: 1, opacity: 0.8 }} />
                <Typography variant="h4">{stats.totalVessels}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Vessels</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={2}>
          <Card sx={{ bgcolor: '#1b5e20', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MoneyIcon sx={{ fontSize: 32, mr: 1, opacity: 0.8 }} />
                <Typography variant="h5">{formatPrice(stats.monthlyRevenue, { maximumFractionDigits: 0 })}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Monthly Revenue</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Management Modules Grid */}
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Management Modules
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {managementModules.map((module) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={module.title}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate(module.path)}
                sx={{ height: '100%', p: 2 }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      mb: 2,
                      bgcolor: module.color,
                    }}
                  >
                    <module.icon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {module.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {module.description}
                  </Typography>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Section */}
      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid item xs={12} md={6}>
          <Card>
            <Box sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">Recent Orders</Typography>
              <Button size="small" onClick={() => navigate('/admin/orders')}>
                View All
              </Button>
            </Box>
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>#{order.id}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status.replace('_', ' ')}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Invoices */}
        <Grid item xs={12} md={6}>
          <Card>
            <Box sx={{
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="h6">Recent Invoices</Typography>
              <Button size="small" onClick={() => navigate('/admin/invoices')}>
                View All
              </Button>
            </Box>
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice #</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentInvoices.length > 0 ? (
                      recentInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.invoiceNumber || `#${invoice.id}`}</TableCell>
                          <TableCell>{formatPrice(invoice.total ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <Chip
                              label={invoice.status}
                              color={getStatusColor(invoice.status)}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography color="text.secondary" py={2}>
                            No invoices yet
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Document Dialog */}
      <Dialog open={createDocumentOpen} onClose={handleCloseCreateDocument} maxWidth="md" fullWidth>
        <DialogTitle>Create {documentType === 'invoice' ? 'Invoice' : 'Quotation'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Work Order ID"
                type="number"
                fullWidth
                required={documentType === 'invoice'}
                disabled={documentType === 'quotation'}
                value={formData.workOrderId}
                onChange={(e) => setFormData({ ...formData, workOrderId: e.target.value })}
                helperText={documentType === 'quotation' ? 'Not applicable for quotations' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Client"
                select
                fullWidth
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              >
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Status"
                select
                fullWidth
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {documentType === 'invoice' ? (
                  <>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="PAID">Paid</MenuItem>
                    <MenuItem value="OVERDUE">Overdue</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </>
                ) : (
                  <>
                    <MenuItem value="DRAFT">Draft</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="ACCEPTED">Accepted</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                    <MenuItem value="EXPIRED">Expired</MenuItem>
                  </>
                )}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Issue Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label={documentType === 'invoice' ? 'Due Date' : 'Expiry Date'}
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={documentType === 'invoice' ? formData.dueDate : formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, [documentType === 'invoice' ? 'dueDate' : 'expiryDate']: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                {documentType === 'invoice' ? 'Invoice' : 'Quotation'} Items
              </Typography>
              {items.map((item, index) => (
                <Card key={index} variant="outlined" sx={{ mb: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      label="Description"
                      fullWidth
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      size="small"
                    />
                    <TextField
                      label="Qty"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                    <TextField
                      label="Price"
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      size="small"
                      sx={{ width: 100 }}
                    />
                    <TextField
                      label="Tax %"
                      type="number"
                      value={item.taxRate}
                      onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)}
                      size="small"
                      sx={{ width: 80 }}
                    />
                    <IconButton onClick={() => handleRemoveItem(index)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Card>
              ))}
              <Button startIcon={<AddIcon />} onClick={handleAddItem} size="small">
                Add Item
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Terms & Conditions (English)"
                fullWidth
                multiline
                rows={2}
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                helperText="Qatari standard terms"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="الشروط والأحكام (العربية)"
                fullWidth
                multiline
                rows={2}
                value={formData.termsArabic}
                onChange={(e) => setFormData({ ...formData, termsArabic: e.target.value })}
                dir="rtl"
                helperText="الشروط القياسية القطرية"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Company Logo URL"
                fullWidth
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                InputProps={{
                  startAdornment: <LogoIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Inserted Images (Work Photos, etc.)
              </Typography>
              {formData.insertedImages.map((url, index) => (
                <Chip
                  key={index}
                  label={`Image ${index + 1}`}
                  onDelete={() => handleRemoveImage(index)}
                  sx={{ mr: 1, mb: 1 }}
                  variant="outlined"
                />
              ))}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField
                  size="small"
                  placeholder="Image URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddImage()}
                  sx={{ flex: 1 }}
                />
                <Button variant="outlined" startIcon={<ImageIcon />} onClick={handleAddImage}>
                  Add
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDocument}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.clientId}>
            Create {documentType === 'invoice' ? 'Invoice' : 'Quotation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
