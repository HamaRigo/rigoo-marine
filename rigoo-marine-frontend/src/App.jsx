import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import DirectionProvider from './i18n/DirectionProvider';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Shell components — tiny, needed on every route, eager-load is correct.
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import AdminRoute from './components/AdminRoute';
import TechnicianRoute from './components/TechnicianRoute';
import TeamLeadRoute from './components/TeamLeadRoute';
import DeliveryRoute from './components/DeliveryRoute';

// ── Lazy page chunks ──────────────────────────────────────────────────────────
// Public
const Home            = lazy(() => import('./pages/public/Home'));
const Services        = lazy(() => import('./pages/public/Services'));
const BoatGallery     = lazy(() => import('./pages/public/marketplace/BoatGallery'));
const BoatDetail      = lazy(() => import('./pages/public/marketplace/BoatDetail'));
const ProductCatalog  = lazy(() => import('./pages/public/shop/ProductCatalog'));
const ProductDetail   = lazy(() => import('./pages/public/shop/ProductDetail'));
const CheckoutSuccess = lazy(() => import('./pages/public/shop/CheckoutSuccess'));
const CheckoutCancel  = lazy(() => import('./pages/public/shop/CheckoutCancel'));

// Auth
const Login          = lazy(() => import('./pages/auth/Login'));
const Register       = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyEmail    = lazy(() => import('./pages/auth/VerifyEmail'));

// Dashboard (CLIENT)
const DashboardLayout    = lazy(() => import('./pages/dashboard/DashboardLayout'));
const VesselsPage        = lazy(() => import('./pages/dashboard/VesselsPage'));
const MyListings         = lazy(() => import('./pages/dashboard/MyListings'));
const AccountPage        = lazy(() => import('./pages/dashboard/AccountPage'));
const ClientOrderDetail  = lazy(() => import('./pages/dashboard/ClientOrderDetail'));
const Profile            = lazy(() => import('./pages/dashboard/Profile'));
const Notifications      = lazy(() => import('./pages/dashboard/Notifications'));

// Work Order
const WorkOrderFlow  = lazy(() => import('./pages/workorder/WorkOrderFlow'));
const ServiceRequest = lazy(() => import('./pages/workorder/ServiceRequest'));

// Admin — layout eager so chrome stays visible during chunk load
import AdminLayout from './pages/admin/AdminLayout';
const AdminDashboard     = lazy(() => import('./pages/admin/AdminDashboard'));
const OperationsHub      = lazy(() => import('./pages/admin/OperationsHub'));
const FinanceHub         = lazy(() => import('./pages/admin/FinanceHub'));
const FleetHub           = lazy(() => import('./pages/admin/FleetHub'));
const MarketplaceHub     = lazy(() => import('./pages/admin/MarketplaceHub'));
const PeopleHub          = lazy(() => import('./pages/admin/PeopleHub'));
const ContentHub         = lazy(() => import('./pages/admin/ContentHub'));
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'));
const Settings           = lazy(() => import('./pages/admin/Settings'));
const BoatListingForm    = lazy(() => import('./pages/admin/BoatListingForm'));
const ProductForm        = lazy(() => import('./pages/admin/ProductForm'));
const DeliveryTracking   = lazy(() => import('./pages/admin/DeliveryTracking'));
const AdminDeliveryHistory = lazy(() => import('./pages/admin/AdminDeliveryHistory'));

// Technician — layout eager so shell renders immediately
import TechnicianLayout from './pages/technician/TechnicianLayout';
const TechnicianDashboard    = lazy(() => import('./pages/technician/TechnicianDashboard'));
const WorkOrderQueue         = lazy(() => import('./pages/technician/WorkOrderQueue'));
const WorkOrderDetail        = lazy(() => import('./pages/technician/WorkOrderDetail'));
const WorkOrderHistory       = lazy(() => import('./pages/technician/WorkOrderHistory'));
const TechnicianInventory    = lazy(() => import('./pages/technician/TechnicianInventory'));
const TechnicianTeamRequests = lazy(() => import('./pages/technician/TechnicianTeamRequests'));

// Delivery — layout eager
import DeliveryLayout from './pages/delivery/DeliveryLayout';
const DeliveryDashboard  = lazy(() => import('./pages/delivery/DeliveryDashboard'));
const DeliveryTasks      = lazy(() => import('./pages/delivery/DeliveryTasks'));
const DeliveryTaskDetail = lazy(() => import('./pages/delivery/DeliveryTaskDetail'));
const DeliveryRouteMap   = lazy(() => import('./pages/delivery/DeliveryRoute'));
const DeliveryHistory    = lazy(() => import('./pages/delivery/DeliveryHistory'));

// Team Lead — layout eager
import TeamLeadLayout from './pages/team-lead/TeamLeadLayout';
const TeamLeadDashboard    = lazy(() => import('./pages/team-lead/TeamLeadDashboard'));
const TeamLeadOrders       = lazy(() => import('./pages/team-lead/TeamLeadOrders'));
const TeamLeadOrderDetail  = lazy(() => import('./pages/team-lead/TeamLeadOrderDetail'));
const TeamLeadTeamRequests = lazy(() => import('./pages/team-lead/TeamLeadTeamRequests'));
const TeamLeadInvoices     = lazy(() => import('./pages/team-lead/TeamLeadInvoices'));
const TeamLeadQuotations   = lazy(() => import('./pages/team-lead/TeamLeadQuotations'));
const TeamLeadHistory      = lazy(() => import('./pages/team-lead/TeamLeadHistory'));
const TeamLeadTechnicians  = lazy(() => import('./pages/team-lead/TeamLeadTechnicians'));
const TeamLeadInspections  = lazy(() => import('./pages/team-lead/TeamLeadInspections'));
const TeamLeadApprovals    = lazy(() => import('./pages/team-lead/TeamLeadApprovals'));
const TeamLeadDelivery     = lazy(() => import('./pages/team-lead/TeamLeadDelivery'));

// Error
const NotFound = lazy(() => import('./pages/error/NotFound'));

// ── Suspense fallback ─────────────────────────────────────────────────────────
function ChunkLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
      <CircularProgress size={32} />
    </Box>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <DirectionProvider>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<ChunkLoading />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<MainLayout><Home /></MainLayout>} />
                <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
                <Route path="/boats" element={<MainLayout><BoatGallery /></MainLayout>} />
                <Route path="/boats/:slug" element={<MainLayout><BoatDetail /></MainLayout>} />
                <Route path="/shop" element={<MainLayout><ProductCatalog /></MainLayout>} />
                <Route path="/shop/products/:slug" element={<MainLayout><ProductDetail /></MainLayout>} />
                <Route path="/checkout/success" element={<MainLayout><ProtectedRoute><CheckoutSuccess /></ProtectedRoute></MainLayout>} />
                <Route path="/checkout/cancel" element={<MainLayout><ProtectedRoute><CheckoutCancel /></ProtectedRoute></MainLayout>} />

                {/* Auth (guest-only) */}
                <Route path="/login" element={<GuestRoute><MainLayout><Login /></MainLayout></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><MainLayout><Register /></MainLayout></GuestRoute>} />
                <Route path="/forgot-password" element={<GuestRoute><MainLayout><ForgotPassword /></MainLayout></GuestRoute>} />
                <Route path="/reset-password" element={<MainLayout><ResetPassword /></MainLayout>} />
                <Route path="/verify-email" element={<MainLayout><VerifyEmail /></MainLayout>} />

                {/* Work Order */}
                <Route path="/dashboard/new-order" element={<WorkOrderFlow />} />
                <Route path="/service-request" element={<ProtectedRoute><MainLayout><ServiceRequest /></MainLayout></ProtectedRoute>} />

                {/* Dashboard (CLIENT) */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<Navigate to="/dashboard/vessels" replace />} />
                  <Route path="vessels"       element={<VesselsPage />} />
                  <Route path="my-listings"   element={<MyListings />} />
                  <Route path="account"       element={<AccountPage />} />
                  <Route path="orders/:id"    element={<ClientOrderDetail />} />
                  <Route path="profile"       element={<Profile />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="orders"        element={<Navigate to="/dashboard/account" replace />} />
                  <Route path="shop-orders"   element={<Navigate to="/dashboard/account" replace />} />
                  <Route path="invoices"      element={<Navigate to="/dashboard/account" replace />} />
                  <Route path="analytics"     element={<Navigate to="/dashboard/vessels" replace />} />
                  <Route path="vessels/:id"   element={<Navigate to="/dashboard/vessels" replace />} />
                </Route>

                {/* Admin */}
                <Route path="/admin" element={<AdminRoute><Suspense fallback={<ChunkLoading />}><AdminLayout /></Suspense></AdminRoute>}>
                  <Route index                    element={<AdminDashboard />} />
                  <Route path="operations"        element={<OperationsHub />} />
                  <Route path="finance"           element={<FinanceHub />} />
                  <Route path="fleet"             element={<FleetHub />} />
                  <Route path="marketplace"       element={<MarketplaceHub />} />
                  <Route path="people"            element={<PeopleHub />} />
                  <Route path="content"           element={<ContentHub />} />
                  <Route path="delivery"          element={<DeliveryTracking />} />
                  <Route path="delivery/history"  element={<AdminDeliveryHistory backPath="/admin/delivery" homePath="/admin" title="Driver Delivery History" />} />
                  <Route path="delivery/:techId"  element={<DeliveryTracking />} />
                  <Route path="analytics"         element={<AnalyticsDashboard />} />
                  <Route path="settings"          element={<Settings />} />
                  <Route path="boats/new"         element={<BoatListingForm />} />
                  <Route path="boats/:id/edit"    element={<BoatListingForm />} />
                  <Route path="products/new"      element={<ProductForm />} />
                  <Route path="products/:id/edit" element={<ProductForm />} />
                  <Route path="orders/:id"        element={<TeamLeadOrderDetail />} />
                  <Route path="orders"            element={<Navigate to="/admin/operations" replace />} />
                  <Route path="services"          element={<Navigate to="/admin/operations?tab=1" replace />} />
                  <Route path="inventory"         element={<Navigate to="/admin/operations?tab=2" replace />} />
                  <Route path="invoices"          element={<Navigate to="/admin/finance" replace />} />
                  <Route path="quotations"        element={<Navigate to="/admin/finance?tab=1" replace />} />
                  <Route path="maintenance"       element={<Navigate to="/admin/fleet" replace />} />
                  <Route path="inspections"       element={<Navigate to="/admin/fleet?tab=1" replace />} />
                  <Route path="boats"             element={<Navigate to="/admin/marketplace" replace />} />
                  <Route path="inquiries"         element={<Navigate to="/admin/marketplace?tab=1" replace />} />
                  <Route path="products"          element={<Navigate to="/admin/marketplace?tab=2" replace />} />
                  <Route path="shop-orders"       element={<Navigate to="/admin/marketplace?tab=3" replace />} />
                  <Route path="shop-inquiries"    element={<Navigate to="/admin/marketplace?tab=4" replace />} />
                  <Route path="users"             element={<Navigate to="/admin/people" replace />} />
                  <Route path="team-requests"     element={<Navigate to="/admin/people?tab=1" replace />} />
                  <Route path="audit"             element={<Navigate to="/admin/people?tab=2" replace />} />
                  <Route path="team"              element={<Navigate to="/admin/content" replace />} />
                  <Route path="gallery"           element={<Navigate to="/admin/content?tab=1" replace />} />
                  <Route path="media"             element={<Navigate to="/admin/content?tab=2" replace />} />
                  <Route path="contact-info"      element={<Navigate to="/admin/content?tab=3" replace />} />
                </Route>

                {/* Technician */}
                <Route path="/technician" element={<TechnicianRoute><TechnicianLayout /></TechnicianRoute>}>
                  <Route index                  element={<TechnicianDashboard />} />
                  <Route path="orders"          element={<WorkOrderQueue />} />
                  <Route path="orders/:id"      element={<WorkOrderDetail />} />
                  <Route path="history"         element={<WorkOrderHistory />} />
                  <Route path="inventory"       element={<TechnicianInventory />} />
                  <Route path="team-requests"   element={<TechnicianTeamRequests />} />
                </Route>

                {/* Team Lead */}
                <Route path="/team-lead" element={<TeamLeadRoute><TeamLeadLayout /></TeamLeadRoute>}>
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
                  <Route path="delivery/history" element={<AdminDeliveryHistory backPath="/team-lead/delivery" homePath="/team-lead" title="Driver Delivery History" />} />
                  <Route path="delivery/:techId" element={<TeamLeadDelivery />} />
                </Route>

                {/* Delivery */}
                <Route path="/delivery" element={<DeliveryRoute><DeliveryLayout /></DeliveryRoute>}>
                  <Route index             element={<DeliveryDashboard />} />
                  <Route path="tasks"      element={<DeliveryTasks />} />
                  <Route path="tasks/:id"  element={<DeliveryTaskDetail />} />
                  <Route path="route"      element={<DeliveryRouteMap />} />
                  <Route path="history"    element={<DeliveryHistory />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </DirectionProvider>
    </ErrorBoundary>
  );
}

export default App;
