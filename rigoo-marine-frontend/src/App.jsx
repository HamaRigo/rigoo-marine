import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import DirectionProvider from './i18n/DirectionProvider';
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
import BoatGallery from './pages/public/marketplace/BoatGallery';
import BoatDetail from './pages/public/marketplace/BoatDetail';
import ProductCatalog from './pages/public/shop/ProductCatalog';
import ProductDetail from './pages/public/shop/ProductDetail';
import CheckoutSuccess from './pages/public/shop/CheckoutSuccess';
import CheckoutCancel from './pages/public/shop/CheckoutCancel';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import MyOrders from './pages/dashboard/MyOrders';
import MyVessels from './pages/dashboard/MyVessels';
import MyVesselDetail from './pages/dashboard/MyVesselDetail';
import Invoices from './pages/dashboard/Invoices';
import Profile from './pages/dashboard/Profile';
import MyShopOrders from './pages/dashboard/MyShopOrders';
import Notifications from './pages/dashboard/Notifications';

// Work Order Flow
import WorkOrderFlow from './pages/workorder/WorkOrderFlow';
import ServiceRequest from './pages/workorder/ServiceRequest';

// Admin Pages
// AdminLayout stays eagerly imported — it owns the whole /admin route shell
// and is the first chunk any admin loads. The leaf pages below are lazy-
// loaded so a regular CLIENT user never pays their cost on initial dashboard
// entry. Each React.lazy() call becomes its own chunk in the Vite output.
import AdminLayout from './pages/admin/AdminLayout';
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const OrderManagement = lazy(() => import('./pages/admin/OrderManagement'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const ServiceManagement = lazy(() => import('./pages/admin/ServiceManagement'));
const InvoiceManagement = lazy(() => import('./pages/admin/InvoiceManagement'));
const QuotationManagement = lazy(() => import('./pages/admin/QuotationManagement'));
const MediaManagement = lazy(() => import('./pages/admin/MediaManagement'));
const ContactInfoManagement = lazy(() => import('./pages/admin/ContactInfoManagement'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const BoatListingManagement = lazy(() => import('./pages/admin/BoatListingManagement'));
const BoatListingForm = lazy(() => import('./pages/admin/BoatListingForm'));
const BoatInquiryManagement = lazy(() => import('./pages/admin/BoatInquiryManagement'));
const ProductManagement = lazy(() => import('./pages/admin/ProductManagement'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm'));
const ProductInquiryManagement = lazy(() => import('./pages/admin/ProductInquiryManagement'));
const ShopOrderManagement = lazy(() => import('./pages/admin/ShopOrderManagement'));
const MaintenanceDashboard = lazy(() => import('./pages/admin/MaintenanceDashboard'));

/**
 * Lightweight spinner the Suspense fallback renders while a chunk loads.
 * Centered + low-visual-noise so the page swap doesn't flash.
 */
function ChunkLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
      <CircularProgress size={32} />
    </Box>
  );
}

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
      <DirectionProvider>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes with Main Layout */}
              <Route path="/" element={<MainLayout><Home /></MainLayout>} />
              <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
              <Route path="/gallery" element={<MainLayout><Gallery /></MainLayout>} />
              <Route path="/about" element={<MainLayout><About /></MainLayout>} />
              <Route path="/boats" element={<MainLayout><BoatGallery /></MainLayout>} />
              <Route path="/boats/:slug" element={<MainLayout><BoatDetail /></MainLayout>} />
              <Route path="/shop" element={<MainLayout><ProductCatalog /></MainLayout>} />
              <Route path="/shop/products/:slug" element={<MainLayout><ProductDetail /></MainLayout>} />
              <Route path="/checkout/success" element={<MainLayout><ProtectedRoute><CheckoutSuccess /></ProtectedRoute></MainLayout>} />
              <Route path="/checkout/cancel" element={<MainLayout><ProtectedRoute><CheckoutCancel /></ProtectedRoute></MainLayout>} />

              {/* Auth Routes - Guest only (redirect if authenticated) */}
              <Route path="/login" element={<GuestRoute><MainLayout><Login /></MainLayout></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><MainLayout><Register /></MainLayout></GuestRoute>} />
              <Route path="/forgot-password" element={<GuestRoute><MainLayout><ForgotPassword /></MainLayout></GuestRoute>} />
              <Route path="/reset-password" element={<MainLayout><ResetPassword /></MainLayout>} />
              <Route path="/verify-email" element={<MainLayout><VerifyEmail /></MainLayout>} />

              {/* Work Order Flow (triggers auth prompt) */}
              <Route path="/dashboard/new-order" element={<WorkOrderFlow />} />

              {/* Service Request Form (CLIENT or TECHNICIAN) */}
              <Route
                path="/service-request"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ServiceRequest />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />

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
                <Route path="shop-orders" element={<MyShopOrders />} />
                <Route path="vessels" element={<MyVessels />} />
                <Route path="vessels/:id" element={<MyVesselDetail />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Admin Routes (ADMIN role only) */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    {/* Suspense wraps the whole admin shell so any lazy
                        child route shows the ChunkLoading fallback during
                        its first navigation. Wrapping inside AdminLayout
                        would also work but this keeps the Layout chrome
                        visible while the route content streams. */}
                    <Suspense fallback={<ChunkLoading />}>
                      <AdminLayout />
                    </Suspense>
                  </AdminRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<OrderManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="audit" element={<AuditLog />} />
                <Route path="services" element={<ServiceManagement />} />
                <Route path="maintenance" element={<MaintenanceDashboard />} />
                <Route path="invoices" element={<InvoiceManagement />} />
                <Route path="quotations" element={<QuotationManagement />} />
                <Route path="media" element={<MediaManagement />} />
                <Route path="contact-info" element={<ContactInfoManagement />} />
                <Route path="boats" element={<BoatListingManagement />} />
                <Route path="boats/new" element={<BoatListingForm />} />
                <Route path="boats/:id/edit" element={<BoatListingForm />} />
                <Route path="inquiries" element={<BoatInquiryManagement />} />
                <Route path="products" element={<ProductManagement />} />
                <Route path="products/new" element={<ProductForm />} />
                <Route path="products/:id/edit" element={<ProductForm />} />
                <Route path="shop-inquiries" element={<ProductInquiryManagement />} />
                <Route path="shop-orders" element={<ShopOrderManagement />} />
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
      </DirectionProvider>
    </ErrorBoundary>
  );
}

export default App;
