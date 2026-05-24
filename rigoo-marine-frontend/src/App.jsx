import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import TeamLeadRoute from './components/TeamLeadRoute';
import DeliveryRoute from './components/DeliveryRoute';

// Dashboard Layout
import DashboardLayout from './pages/dashboard/DashboardLayout';

// Public Pages
import Home from './pages/public/Home';
import Services from './pages/public/Services';
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
import VesselsPage  from './pages/dashboard/VesselsPage';
import AccountPage  from './pages/dashboard/AccountPage';
import ClientOrderDetail from './pages/dashboard/ClientOrderDetail';
import Profile      from './pages/dashboard/Profile';
import Notifications from './pages/dashboard/Notifications';

// Work Order Flow
import WorkOrderFlow from './pages/workorder/WorkOrderFlow';
import ServiceRequest from './pages/workorder/ServiceRequest';

// Admin Pages
// AdminLayout stays eagerly imported — it owns the whole /admin route shell.
// Hub pages are lazy-loaded per navigation click; each hub's chunk bundles
// all the sub-page components it hosts.
import AdminLayout from './pages/admin/AdminLayout';
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'));
const OperationsHub   = lazy(() => import('./pages/admin/OperationsHub'));
const FinanceHub      = lazy(() => import('./pages/admin/FinanceHub'));
const FleetHub        = lazy(() => import('./pages/admin/FleetHub'));
const MarketplaceHub  = lazy(() => import('./pages/admin/MarketplaceHub'));
const PeopleHub       = lazy(() => import('./pages/admin/PeopleHub'));
const ContentHub      = lazy(() => import('./pages/admin/ContentHub'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));
const Settings        = lazy(() => import('./pages/admin/Settings'));
// Form pages — navigated to from within hub tabs, redirect back to hub on save
const BoatListingForm = lazy(() => import('./pages/admin/BoatListingForm'));
const ProductForm     = lazy(() => import('./pages/admin/ProductForm'));

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
import WorkOrderHistory from './pages/technician/WorkOrderHistory';
import TechnicianInventory from './pages/technician/TechnicianInventory';
import TechnicianTeamRequests from './pages/technician/TechnicianTeamRequests';

// Delivery Pages
import DeliveryLayout from './pages/delivery/DeliveryLayout';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';
import DeliveryTasks from './pages/delivery/DeliveryTasks';
import DeliveryTaskDetail from './pages/delivery/DeliveryTaskDetail';
import DeliveryRouteMap from './pages/delivery/DeliveryRoute';

// Admin Delivery Tracking
const DeliveryTracking = lazy(() => import('./pages/admin/DeliveryTracking'));

// Team Lead Delivery Tracking
import TeamLeadDelivery from './pages/team-lead/TeamLeadDelivery';

// Team Lead Pages
import TeamLeadLayout from './pages/team-lead/TeamLeadLayout';
import TeamLeadDashboard from './pages/team-lead/TeamLeadDashboard';
import TeamLeadOrders from './pages/team-lead/TeamLeadOrders';
import TeamLeadOrderDetail from './pages/team-lead/TeamLeadOrderDetail';
import TeamLeadTeamRequests from './pages/team-lead/TeamLeadTeamRequests';
import TeamLeadInvoices from './pages/team-lead/TeamLeadInvoices';
import TeamLeadQuotations from './pages/team-lead/TeamLeadQuotations';
import TeamLeadHistory from './pages/team-lead/TeamLeadHistory';
import TeamLeadTechnicians  from './pages/team-lead/TeamLeadTechnicians';
import TeamLeadInspections  from './pages/team-lead/TeamLeadInspections';
import TeamLeadApprovals    from './pages/team-lead/TeamLeadApprovals';

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
                {/* Default → vessels */}
                <Route index element={<Navigate to="/dashboard/vessels" replace />} />
                <Route path="vessels"       element={<VesselsPage  />} />
                <Route path="account"       element={<AccountPage  />} />
                <Route path="orders/:id"    element={<ClientOrderDetail />} />
                <Route path="profile"       element={<Profile      />} />
                <Route path="notifications" element={<Notifications />} />
                {/* Legacy URL aliases — redirect so saved links keep working */}
                <Route path="orders"        element={<Navigate to="/dashboard/account" replace />} />
                <Route path="shop-orders"   element={<Navigate to="/dashboard/account" replace />} />
                <Route path="invoices"      element={<Navigate to="/dashboard/account" replace />} />
                <Route path="analytics"     element={<Navigate to="/dashboard/vessels" replace />} />
                <Route path="vessels/:id"   element={<Navigate to="/dashboard/vessels" replace />} />
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
                {/* Hub routes — each groups related pages under a tab bar */}
                <Route index element={<AdminDashboard />} />
                <Route path="operations"  element={<OperationsHub />} />
                <Route path="finance"     element={<FinanceHub />} />
                <Route path="fleet"       element={<FleetHub />} />
                <Route path="marketplace" element={<MarketplaceHub />} />
                <Route path="people"      element={<PeopleHub />} />
                <Route path="content"     element={<ContentHub />} />
                <Route path="delivery"    element={<DeliveryTracking />} />
                <Route path="delivery/:techId" element={<DeliveryTracking />} />
                <Route path="analytics"   element={<AnalyticsDashboard />} />
                <Route path="settings"    element={<Settings />} />

                {/* Standalone form pages — navigated to from hub tabs */}
                <Route path="boats/new"       element={<BoatListingForm />} />
                <Route path="boats/:id/edit"  element={<BoatListingForm />} />
                <Route path="products/new"    element={<ProductForm />} />
                <Route path="products/:id/edit" element={<ProductForm />} />

                {/* Order detail — linked from within OperationsHub */}
                <Route path="orders/:id" element={<TeamLeadOrderDetail />} />

                {/* Legacy redirects — keep old URLs working (bookmarks, dashboard links) */}
                <Route path="orders"        element={<Navigate to="/admin/operations" replace />} />
                <Route path="services"      element={<Navigate to="/admin/operations?tab=1" replace />} />
                <Route path="inventory"     element={<Navigate to="/admin/operations?tab=2" replace />} />
                <Route path="invoices"      element={<Navigate to="/admin/finance" replace />} />
                <Route path="quotations"    element={<Navigate to="/admin/finance?tab=1" replace />} />
                <Route path="maintenance"   element={<Navigate to="/admin/fleet" replace />} />
                <Route path="inspections"   element={<Navigate to="/admin/fleet?tab=1" replace />} />
                <Route path="boats"         element={<Navigate to="/admin/marketplace" replace />} />
                <Route path="inquiries"     element={<Navigate to="/admin/marketplace?tab=1" replace />} />
                <Route path="products"      element={<Navigate to="/admin/marketplace?tab=2" replace />} />
                <Route path="shop-orders"   element={<Navigate to="/admin/marketplace?tab=3" replace />} />
                <Route path="shop-inquiries" element={<Navigate to="/admin/marketplace?tab=4" replace />} />
                <Route path="users"         element={<Navigate to="/admin/people" replace />} />
                <Route path="team-requests" element={<Navigate to="/admin/people?tab=1" replace />} />
                <Route path="audit"         element={<Navigate to="/admin/people?tab=2" replace />} />
                <Route path="team"          element={<Navigate to="/admin/content" replace />} />
                <Route path="gallery"       element={<Navigate to="/admin/content?tab=1" replace />} />
                <Route path="media"         element={<Navigate to="/admin/content?tab=2" replace />} />
                <Route path="contact-info"  element={<Navigate to="/admin/content?tab=3" replace />} />
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
                <Route path="history" element={<WorkOrderHistory />} />
                <Route path="inventory" element={<TechnicianInventory />} />
                <Route path="team-requests" element={<TechnicianTeamRequests />} />
              </Route>

              {/* Team Lead Routes (TEAM_LEAD role) */}
              <Route
                path="/team-lead"
                element={
                  <TeamLeadRoute>
                    <TeamLeadLayout />
                  </TeamLeadRoute>
                }
              >
                <Route index                  element={<TeamLeadDashboard />} />
                <Route path="approvals"       element={<TeamLeadApprovals />} />
                <Route path="orders"          element={<TeamLeadOrders />} />
                <Route path="orders/:id"      element={<TeamLeadOrderDetail />} />
                <Route path="team-requests"   element={<TeamLeadTeamRequests />} />
                <Route path="invoices"        element={<TeamLeadInvoices />} />
                <Route path="quotations"      element={<TeamLeadQuotations />} />
                <Route path="history"         element={<TeamLeadHistory />} />
                <Route path="technicians"     element={<TeamLeadTechnicians />} />
                <Route path="inspections"     element={<TeamLeadInspections />} />
                <Route path="delivery"        element={<TeamLeadDelivery />} />
              </Route>

              {/* Delivery Routes (DELIVERY role) */}
              <Route
                path="/delivery"
                element={
                  <DeliveryRoute>
                    <DeliveryLayout />
                  </DeliveryRoute>
                }
              >
                <Route index               element={<DeliveryDashboard />} />
                <Route path="tasks"        element={<DeliveryTasks />} />
                <Route path="tasks/:id"    element={<DeliveryTaskDetail />} />
                <Route path="route"        element={<DeliveryRouteMap />} />
                <Route path="history"      element={<DeliveryTasks />} />
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
