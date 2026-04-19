import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Layout Components
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import AdminRoute from './components/AdminRoute';
import TechnicianRoute from './components/TechnicianRoute';

// Dashboard Layout
import DashboardLayout from './pages/dashboard/DashboardLayout';

// Public Pages
import Home from './pages/public/Home';
import Services from './pages/public/Services';
import Gallery from './pages/public/Gallery';
import About from './pages/public/About';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import MyOrders from './pages/dashboard/MyOrders';
import MyVessels from './pages/dashboard/MyVessels';
import Invoices from './pages/dashboard/Invoices';
import Profile from './pages/dashboard/Profile';

// Work Order Flow
import WorkOrderFlow from './pages/workorder/WorkOrderFlow';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import OrderManagement from './pages/admin/OrderManagement';
import UserManagement from './pages/admin/UserManagement';
import ServiceManagement from './pages/admin/ServiceManagement';
import InvoiceManagement from './pages/admin/InvoiceManagement';
import QuotationManagement from './pages/admin/QuotationManagement';
import MediaManagement from './pages/admin/MediaManagement';
import ContactInfoManagement from './pages/admin/ContactInfoManagement';
import Settings from './pages/admin/Settings';

// Technician Pages
import TechnicianLayout from './pages/technician/TechnicianLayout';
import TechnicianDashboard from './pages/technician/TechnicianDashboard';
import WorkOrderQueue from './pages/technician/WorkOrderQueue';
import WorkOrderDetail from './pages/technician/WorkOrderDetail';

// Error Pages
import NotFound from './pages/error/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes with Main Layout */}
              <Route path="/" element={<MainLayout><Home /></MainLayout>} />
              <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
              <Route path="/gallery" element={<MainLayout><Gallery /></MainLayout>} />
              <Route path="/about" element={<MainLayout><About /></MainLayout>} />

              {/* Auth Routes - Guest only (redirect if authenticated) */}
              <Route path="/login" element={<GuestRoute><MainLayout><Login /></MainLayout></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><MainLayout><Register /></MainLayout></GuestRoute>} />
              <Route path="/forgot-password" element={<GuestRoute><MainLayout><ForgotPassword /></MainLayout></GuestRoute>} />

              {/* Work Order Flow (triggers auth prompt) */}
              <Route path="/dashboard/new-order" element={<WorkOrderFlow />} />

              {/* Protected Dashboard Routes (CLIENT role) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="orders" element={<MyOrders />} />
                <Route path="vessels" element={<MyVessels />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Admin Routes (ADMIN role only) */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<OrderManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="services" element={<ServiceManagement />} />
                <Route path="invoices" element={<InvoiceManagement />} />
                <Route path="quotations" element={<QuotationManagement />} />
                <Route path="media" element={<MediaManagement />} />
                <Route path="contact-info" element={<ContactInfoManagement />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Technician Routes (TECHNICIAN role only) */}
              <Route
                path="/technician"
                element={
                  <TechnicianRoute>
                    <TechnicianLayout />
                  </TechnicianRoute>
                }
              >
                <Route index element={<TechnicianDashboard />} />
                <Route path="orders" element={<WorkOrderQueue />} />
                <Route path="orders/:id" element={<WorkOrderDetail />} />
                <Route path="history" element={<div>Work Order History - Coming Soon</div>} />
              </Route>

              {/* 404 - Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
