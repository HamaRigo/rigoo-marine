/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Button, ToggleButtonGroup,
  ToggleButton, Avatar, IconButton, Tooltip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Build as BuildIcon,
  Receipt as ReceiptIcon,
  RequestQuote as QuoteIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Engineering as EngineeringIcon,
  LocalShipping as VesselIcon,
  Refresh as RefreshIcon,
  PhotoLibrary as MediaIcon,
  ContactPhone as ContactInfoIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { formatPrice } from '../../utils/format';
import CreateInvoiceDialog from '../../components/admin/CreateInvoiceDialog';
import PendingApprovalsBanner from '../../components/admin/PendingApprovalsBanner';
import QuickDocumentMenu from '../../components/admin/QuickDocumentMenu';

const STATUS_COLORS = {
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

const ModuleCard = memo(function ModuleCard({ module, onClick }) {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Avatar sx={{ width: 56, height: 56, mb: 2, bgcolor: module.color }}>
            <module.icon sx={{ fontSize: 28 }} />
          </Avatar>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {module.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', display: { xs: 'none', sm: 'block' } }}>
            {module.description}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
});

const managementModules = [
  {
    title: 'People',
    path: '/admin/people',
    icon: PeopleIcon,
    color: '#1976d2',
    description: 'Users, team requests, and audit log'
  },
  {
    title: 'Operations',
    path: '/admin/operations',
    icon: BuildIcon,
    color: '#ed6c02',
    description: 'Work orders, services, and inventory'
  },
  {
    title: 'Finance',
    path: '/admin/finance',
    icon: ReceiptIcon,
    color: '#2e7d32',
    description: 'Invoices and quotations'
  },
  {
    title: 'Fleet',
    path: '/admin/fleet',
    icon: EngineeringIcon,
    color: '#0288d1',
    description: 'Maintenance and vessel inspections'
  },
  {
    title: 'Marketplace',
    path: '/admin/marketplace',
    icon: MediaIcon,
    color: '#d32f2f',
    description: 'Boats, products, orders, and inquiries'
  },
  {
    title: 'Content',
    path: '/admin/content',
    icon: ContactInfoIcon,
    color: '#009688',
    description: 'Team members, gallery, media, and contact info'
  },
  {
    title: 'Analytics',
    path: '/admin/analytics',
    icon: QuoteIcon,
    color: '#9c27b0',
    description: 'Revenue, orders, and performance metrics'
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
  const [editTarget, setEditTarget] = useState(null);

  const [quickDocOpen, setQuickDocOpen]     = useState(false);
  const [quickDocType, setQuickDocType]     = useState('invoice');
  const [quickDocPrefill, setQuickDocPrefill] = useState(null);

  const fetchDashboardData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleOpenCreateDocument = () => setCreateDocumentOpen(true);

  const handleQuickDocument = (type, order) => {
    setQuickDocType(type);
    setQuickDocPrefill({
      notes: `Order #${order.id} — ${order.service || ''}`,
      billToMode: order.clientId ? 'registered' : 'manual',
      clientId: order.clientId || '',
      billToName: order.customer || '',
      items: order.service ? [{ description: order.service, quantity: 1, unitPrice: '', taxRate: 5 }] : [],
    });
    setQuickDocOpen(true);
  };

  const handleDocumentTypeChange = (event, newType) => {
    if (newType) setDocumentType(newType);
  };

  const getStatusColor = useCallback((status) => STATUS_COLORS[status] || 'default', []);

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
      {/* Pending approvals inbox — auto-hides when empty */}
      <PendingApprovalsBanner />

      {/* Header with Quick Actions */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Complete platform management and oversight
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
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
        <Grid size={{ xs: 6, sm: 6, md: 4, lg: 2 }} >
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

        <Grid size={{ xs: 6, sm: 6, md: 4, lg: 2 }} >
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

        <Grid size={{ xs: 6, sm: 6, md: 4, lg: 2 }} >
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

        <Grid size={{ xs: 6, sm: 6, md: 4, lg: 2 }} >
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

        <Grid size={{ xs: 6, sm: 6, md: 4, lg: 2 }} >
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

        <Grid size={{ xs: 6, sm: 6, md: 4, lg: 2 }} >
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
          <Grid size={{ xs: 6, sm: 6, md: 4, lg: 2 }} key={module.title}>
            <ModuleCard module={module} onClick={() => navigate(module.path)} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity Section */}
      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid size={{ xs: 12, md: 6 }} >
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
                      <TableCell padding="checkbox" />
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
                        <TableCell padding="checkbox">
                          <QuickDocumentMenu
                            label={`Order #${order.id}`}
                            onCreateInvoice={() => handleQuickDocument('invoice', order)}
                            onCreateQuotation={() => handleQuickDocument('quotation', order)}
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
        <Grid size={{ xs: 12, md: 6 }} >
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
                      <TableCell padding="checkbox" />
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
                          <TableCell padding="checkbox">
                            <Tooltip title="Edit invoice">
                              <IconButton size="small" onClick={() => setEditTarget(invoice)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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

      <CreateInvoiceDialog
        open={createDocumentOpen}
        onClose={() => setCreateDocumentOpen(false)}
        clients={clients}
        type={documentType}
        onCreated={fetchDashboardData}
      />

      <CreateInvoiceDialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        clients={clients}
        type="invoice"
        initialData={editTarget}
        editId={editTarget?.id}
        onCreated={fetchDashboardData}
      />

      <CreateInvoiceDialog
        open={quickDocOpen}
        onClose={() => setQuickDocOpen(false)}
        clients={clients}
        type={quickDocType}
        prefill={quickDocPrefill}
        onCreated={() => { setQuickDocOpen(false); fetchDashboardData(); }}
      />
    </Box>
  );
}
