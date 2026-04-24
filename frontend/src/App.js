import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import store from './redux/store';
import { loadUser } from './redux/slices/authSlice';
import './styles/index.css';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SiteSettingsProvider from './components/SiteSettingsProvider';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Products from './pages/Products';
import Contact from './pages/Contact';
import Gallery from './pages/Gallery';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsConditions from './pages/TermsConditions';
import CancellationPolicy from './pages/CancellationPolicy';
import ReturnExchangePolicy from './pages/ReturnExchangePolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import GrievanceRedressal from './pages/GrievanceRedressal';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ChangePassword from './pages/ChangePassword';
import UserDashboard from './pages/user/Dashboard';
import Wallet from './pages/user/Wallet';
import Orders from './pages/user/Orders';
import Referrals from './pages/user/Referrals';
import Salary from './pages/user/Salary';
import Profile from './pages/user/Profile';
import Support from './pages/user/Support';
import IdCard from './pages/user/IdCard';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminOrders from './pages/admin/Orders';
import AdminProducts from './pages/admin/Products';
import AdminSalary from './pages/admin/Salary';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';
import AdminWalletDeposit from './pages/admin/WalletDeposit';
import AdminTickets from './pages/admin/Tickets';
import AdminGallery from './pages/admin/Gallery';
import AdminBonus from './pages/admin/Bonus';
import NotFound from './pages/NotFound';
import ImageTest from './pages/user/ImageTest';

// Admin icon component for bonus

// Auth loader component to verify token on app start
const AuthLoader = ({ children }) => {
  const dispatch = useDispatch();
  const { token, isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    // Always verify token on app start if exists
    // This ensures we have fresh user data and valid session
    if (token && !loading) {
      dispatch(loadUser());
    }
  }, []); // Only run once on app mount

  return children;
};

// Layout wrapper to hide header/footer on app pages
const AppLayout = ({ children }) => {
  const location = useLocation();

  // Pages that use app layout (no header/footer)
  const appPages = [
    '/dashboard', '/wallet', '/orders', '/referrals', '/salary', '/profile', '/support', '/id-card',
    '/change-password', '/admin', '/admin/users', '/admin/orders', '/admin/products',
    '/admin/salary', '/admin/bonus', '/admin/reports', '/admin/settings', '/admin/wallet-deposit', '/admin/tickets',
    '/admin/gallery'
  ];

  const isAppPage = appPages.some(page => location.pathname.startsWith(page));

  if (isAppPage) {
    // App layout - no header/footer, DashboardLayout handles navigation
    return <>{children}</>;
  }

  // Website layout - with header/footer
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <SiteSettingsProvider>
          <AuthLoader>
            <div className="app">
              <AppLayout>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-conditions" element={<TermsConditions />} />
                  <Route path="/cancellation-policy" element={<CancellationPolicy />} />
                  <Route path="/return-exchange-policy" element={<ReturnExchangePolicy />} />
                  <Route path="/shipping-policy" element={<ShippingPolicy />} />
                  <Route path="/grievance-redressal" element={<GrievanceRedressal />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password/:token" element={<ResetPassword />} />
                  <Route path="/image-test" element={<ImageTest />} />

                  {/* User Protected Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <UserDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/wallet" element={
                    <ProtectedRoute>
                      <Wallet />
                    </ProtectedRoute>
                  } />
                  <Route path="/orders" element={
                    <ProtectedRoute>
                      <Orders />
                    </ProtectedRoute>
                  } />
                  <Route path="/referrals" element={
                    <ProtectedRoute>
                      <Referrals />
                    </ProtectedRoute>
                  } />
                  <Route path="/salary" element={
                    <ProtectedRoute>
                      <Salary />
                    </ProtectedRoute>
                  } />
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="/support" element={
                    <ProtectedRoute>
                      <Support />
                    </ProtectedRoute>
                  } />
                  <Route path="/id-card" element={
                    <ProtectedRoute>
                      <IdCard />
                    </ProtectedRoute>
                  } />

                  {/* Public Protected Routes */}
                  <Route path="/change-password" element={
                    <ProtectedRoute>
                      <ChangePassword />
                    </ProtectedRoute>
                  } />

                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  } />
                  <Route path="/admin/users" element={
                    <AdminRoute>
                      <AdminUsers />
                    </AdminRoute>
                  } />
                  <Route path="/admin/orders" element={
                    <AdminRoute>
                      <AdminOrders />
                    </AdminRoute>
                  } />
                  <Route path="/admin/products" element={
                    <AdminRoute>
                      <AdminProducts />
                    </AdminRoute>
                  } />
                  <Route path="/admin/salary" element={
                    <AdminRoute>
                      <AdminSalary />
                    </AdminRoute>
                  } />
                  <Route path="/admin/reports" element={
                    <AdminRoute>
                      <AdminReports />
                    </AdminRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <AdminRoute>
                      <AdminSettings />
                    </AdminRoute>
                  } />
                  <Route path="/admin/wallet-deposit" element={
                    <AdminRoute>
                      <AdminWalletDeposit />
                    </AdminRoute>
                  } />
                  <Route path="/admin/tickets" element={
                    <AdminRoute>
                      <AdminTickets />
                    </AdminRoute>
                  } />
                  <Route path="/admin/gallery" element={
                    <AdminRoute>
                      <AdminGallery />
                    </AdminRoute>
                  } />
                  <Route path="/admin/bonus" element={
                    <AdminRoute>
                      <AdminBonus />
                    </AdminRoute>
                  } />

                  {/* Fallback - 404 Page */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
              <ToastContainer position="top-right" autoClose={3000} />
            </div>
          </AuthLoader>
        </SiteSettingsProvider>
      </Router>
    </Provider>
  );
}

export default App;