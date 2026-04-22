import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useSiteSettings } from './SiteSettingsProvider';
import { logout } from '../redux/slices/authSlice';

const DashboardLayout = ({ children, isAdmin = false }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { siteName, siteLogo, siteTagline, refreshSettings } = useSiteSettings();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  // Handle collapse toggle
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const userLinks = [
    { path: '/dashboard', label: 'Home', icon: 'home', matchExact: true },
    { path: '/wallet', label: 'Wallet', icon: 'wallet' },
    { path: '/orders', label: 'Shop', icon: 'shop' },
    { path: '/referrals', label: 'Team', icon: 'team' },
    { path: '/salary', label: 'Incentive', icon: 'income' },
    { path: '/id-card', label: 'ID Card', icon: 'idcard' },
    { path: '/support', label: 'Support', icon: 'support' },
    { path: '/profile', label: 'Profile', icon: 'profile' },
  ];

  const adminLinks = [
    { path: '/admin', label: 'Dashboard', icon: 'dashboard', matchExact: true },
    { path: '/admin/users', label: 'Users', icon: 'users' },
    { path: '/admin/orders', label: 'Orders', icon: 'orders' },
    { path: '/admin/products', label: 'Products', icon: 'products' },
    { path: '/admin/gallery', label: 'Gallery', icon: 'gallery' },
    { path: '/admin/salary', label: 'Incentive', icon: 'salary' },
    { path: '/admin/bonus', label: 'Bonus', icon: 'bonus' },
    { path: '/admin/wallet-deposit', label: 'Wallet', icon: 'wallet' },
    { path: '/admin/tickets', label: 'Support', icon: 'support' },
    { path: '/admin/reports', label: 'Reports', icon: 'reports' },
    { path: '/admin/settings', label: 'Settings', icon: 'settings' },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  // Check if path is active
  const isActive = (path, matchExact = false) => {
    if (matchExact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Get logo URL
  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) {
        return siteLogo;
      }
      // const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const baseUrl = (process.env.REACT_APP_API_URL).replace('/api', '');
      return `${baseUrl}${siteLogo}`;
    }
    return null;
  };

  // Icon component
  const Icon = ({ name }) => {
    const icons = {
      home: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      wallet: <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
      shop: <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />,
      team: <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
      income: <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
      idcard: <><rect x="2" y="5" width="20" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M14 10h4m-4 3h3" /></>,
      profile: <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
      dashboard: <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      users: <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
      orders: <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
      products: <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      gallery: <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
      salary: <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
      bonus: <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5M8 7.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0zM12 21l-4-4m4 4l4-4" />,
      reports: <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
      settings: <><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
      support: <path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />,
      logout: <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
      menu: <path d="M4 6h16M4 12h16M4 18h16" />,
      close: <path d="M6 18L18 6M6 6l12 12" />,
      collapse: <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />,
      expand: <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />,
    };

    return (
      <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icons[name] || icons.home}
      </svg>
    );
  };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Overlay - Mobile Only */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
          {/* Sidebar Header */}
          <div className="sidebar-header">
            <Link to="/" className="app-logo" onClick={() => setSidebarOpen(false)}>
              {getLogoUrl() ? (
                <img src={getLogoUrl()} alt={siteName} className="logo-image" />
              ) : (
                <div className="logo-fallback">
                  <span className="logo-emoji">🛏️</span>
                </div>
              )}
              <div className="logo-text-wrapper">
                <span className="logo-text">{siteName}</span>
                {!collapsed && <span className="logo-tagline">{siteTagline}</span>}
              </div>
            </Link>
            {isAdmin && !collapsed && <span className="admin-badge">Admin</span>}
            <button
              className="sidebar-close-btn mobile-only"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <Icon name="close" />
            </button>
          </div>

          {/* Collapse Toggle - Desktop Only */}
          <button className="collapse-toggle desktop-only" onClick={toggleCollapse} aria-label="Toggle sidebar">
            <Icon name={collapsed ? 'expand' : 'collapse'} />
          </button>

          {/* Sidebar Navigation */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              {!collapsed && <span className="nav-section-title">Menu</span>}
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${isActive(link.path, link.matchExact) ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? link.label : ''}
                >
                  <span className="nav-icon"><Icon name={link.icon} /></span>
                  {!collapsed && <span className="nav-label">{link.label}</span>}
                  {!collapsed && isActive(link.path, link.matchExact) && <span className="nav-indicator" />}
                </Link>
              ))}
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <button
              className="logout-link"
              onClick={() => {
                dispatch(logout());
                navigate('/login');
              }}
              title={collapsed ? 'Logout' : ''}
            >
              <span className="nav-icon"><Icon name="logout" /></span>
              {!collapsed && <span className="nav-label">Logout</span>}
            </button>
            {!collapsed && user && (
              <div className="user-info">
                <div className="user-avatar">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="user-details">
                  <span className="user-name">{user.name}</span>
                  <span className="user-email">{user.email}</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="main-wrapper">
          {/* Mobile Header */}
          <header className="mobile-header">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Icon name="menu" />
            </button>
            <Link to="/" className="header-logo">
              {getLogoUrl() ? (
                <img src={getLogoUrl()} alt={siteName} className="header-logo-img" />
              ) : (
                <span>🛏️ {siteName}</span>
              )}
            </Link>
            <Link to="/profile" className="header-avatar">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Link>
          </header>

          {/* Page Content */}
          <main className="page-content">
            {children}
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="mobile-bottom-nav">
            {links.slice(0, 5).map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-item ${isActive(link.path, link.matchExact) ? 'active' : ''}`}
              >
                <span className="nav-icon"><Icon name={link.icon} /></span>
                <span className="nav-label">{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <style>{`
          /* ============================================
             SIDEBAR - PROFESSIONAL STYLES
             ============================================ */

          :root {
            --sidebar-width: 260px;
            --sidebar-collapsed-width: 80px;
            --mobile-header-height: 60px;
            --mobile-nav-height: 68px;
          }

          /* App Layout */
          .app-layout {
            display: flex;
            min-height: 100vh;
            background: var(--gray-50);
          }

          /* Sidebar Overlay - Mobile Only */
          .sidebar-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 40;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .sidebar-overlay.open {
            display: block;
            opacity: 1;
          }

          @media (min-width: 1024px) {
            .sidebar-overlay { display: none !important; }
          }

          /* Sidebar */
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: var(--sidebar-width);
            background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
            display: flex;
            flex-direction: column;
            z-index: 50;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow-y: auto;
            overflow-x: hidden;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
          }

          .sidebar.collapsed {
            width: var(--sidebar-collapsed-width);
          }

          /* Mobile: Hidden by default */
          @media (max-width: 1023px) {
            .sidebar {
              transform: translateX(-100%);
              width: var(--sidebar-width);
            }

            .sidebar.open {
              transform: translateX(0);
            }

            .sidebar.collapsed {
              width: var(--sidebar-width);
            }
          }

          /* Desktop: Always visible */
          @media (min-width: 1024px) {
            .sidebar {
              transform: translateX(0);
            }
          }

          /* Sidebar Header */
          .sidebar-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1.25rem 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            min-height: 72px;
          }

          .app-logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            flex: 1;
            padding: 0.25rem;
            border-radius: var(--radius-lg);
            transition: all 0.2s;
          }

          .app-logo:hover {
            background: rgba(255, 255, 255, 0.05);
          }

          .logo-image {
            height: 42px;
            width: auto;
            max-width: 140px;
            border-radius: var(--radius-md);
            object-fit: contain;
            flex-shrink: 0;
            background: #ffffff;
            padding: 4px 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .logo-fallback {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-md);
            background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .logo-emoji {
            font-size: 1.25rem;
          }

          .logo-text-wrapper {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .logo-text {
            font-size: 1.125rem;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .logo-tagline {
            font-size: 0.625rem;
            color: rgba(255, 255, 255, 0.5);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .sidebar.collapsed .logo-text-wrapper {
            display: none;
          }

          .admin-badge {
            background: linear-gradient(135deg, var(--accent-500), #059669);
            color: white;
            padding: 0.25rem 0.625rem;
            border-radius: var(--radius-full);
            font-size: 0.625rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            flex-shrink: 0;
          }

          .sidebar-close-btn {
            display: none;
            width: 36px;
            height: 36px;
            border: none;
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.7);
            border-radius: var(--radius-md);
            cursor: pointer;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .sidebar-close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }

          .mobile-only { display: none; }
          .desktop-only { display: flex; }

          @media (max-width: 1023px) {
            .mobile-only { display: flex; }
            .desktop-only { display: none; }
          }

          /* Collapse Toggle */
          .collapse-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: calc(100% - 2rem);
            margin: 0.5rem 1rem;
            padding: 0.5rem;
            border: none;
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.5);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.2s;
          }

          .collapse-toggle:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
          }

          .collapse-toggle .nav-svg {
            width: 18px;
            height: 18px;
          }

          .sidebar.collapsed .collapse-toggle {
            width: calc(100% - 1rem);
            margin: 0.5rem 0.5rem;
          }

          /* Sidebar Navigation */
          .sidebar-nav {
            flex: 1;
            padding: 0.5rem 0.75rem;
            overflow-y: auto;
            overflow-x: hidden;
          }

          .nav-section {
            margin-bottom: 1rem;
          }

          .nav-section-title {
            display: block;
            font-size: 0.625rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.35);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 0 0.75rem;
            margin-bottom: 0.5rem;
          }

          .sidebar.collapsed .nav-section-title {
            display: none;
          }

          .nav-link {
            display: flex;
            align-items: center;
            gap: 0.875rem;
            padding: 0.75rem 1rem;
            min-height: 44px;
            color: rgba(255, 255, 255, 0.65);
            text-decoration: none;
            border-radius: var(--radius-lg);
            margin-bottom: 0.25rem;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }

          .nav-link:hover {
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.95);
          }

          .nav-link.active {
            background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
            color: white;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.35);
          }

          .nav-link.active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: white;
            border-radius: 0 2px 2px 0;
          }

          .sidebar.collapsed .nav-link {
            justify-content: center;
            padding: 0.75rem;
          }

          .nav-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .nav-svg {
            width: 20px;
            height: 20px;
          }

          .nav-label {
            font-size: 0.875rem;
            font-weight: 500;
            white-space: nowrap;
          }

          .sidebar.collapsed .nav-label {
            display: none;
          }

          .nav-indicator {
            margin-left: auto;
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 50%;
          }

          /* Sidebar Footer */
          .sidebar-footer {
            padding: 0.75rem;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .logout-link {
            display: flex;
            align-items: center;
            gap: 0.875rem;
            padding: 0.75rem 1rem;
            min-height: 44px;
            color: rgba(255, 255, 255, 0.5);
            text-decoration: none;
            border-radius: var(--radius-lg);
            transition: all 0.2s ease;
            border: none;
            background: none;
            cursor: pointer;
            width: 100%;
            font-size: inherit;
            font-family: inherit;
          }

          .logout-link:hover {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
          }

          .sidebar.collapsed .logout-link {
            justify-content: center;
            padding: 0.75rem;
          }

          .sidebar.collapsed .logout-link .nav-label {
            display: none;
          }

          .user-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            margin-top: 0.5rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: var(--radius-lg);
          }

          .user-avatar {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
            flex-shrink: 0;
          }

          .user-details {
            flex: 1;
            min-width: 0;
          }

          .user-name {
            display: block;
            font-size: 0.8125rem;
            font-weight: 600;
            color: white;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .user-email {
            display: block;
            font-size: 0.6875rem;
            color: rgba(255, 255, 255, 0.5);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Main Wrapper */
          .main-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            transition: margin-left 0.3s ease;
          }

          @media (min-width: 1024px) {
            .main-wrapper {
              margin-left: var(--sidebar-width);
            }

            .sidebar-collapsed .main-wrapper {
              margin-left: var(--sidebar-collapsed-width);
            }
          }

          /* Mobile Header */
          .mobile-header {
            display: none;
            position: sticky;
            top: 0;
            z-index: 30;
            height: var(--mobile-header-height);
            background: white;
            padding: 0 1rem;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          }

          @media (max-width: 1023px) {
            .mobile-header { display: flex; }
          }

          .menu-toggle {
            width: 44px;
            height: 44px;
            border: none;
            background: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--gray-700);
            border-radius: var(--radius-md);
            transition: background 0.2s;
          }

          .menu-toggle:hover { background: var(--gray-100); }
          .menu-toggle .nav-svg { width: 24px; height: 24px; }

          .header-logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-weight: 700;
            color: var(--gray-900);
            text-decoration: none;
          }

          .header-logo-img {
            height: 32px;
            width: auto;
            max-width: 120px;
            border-radius: var(--radius-sm);
            background: #ffffff;
            padding: 3px 6px;
          }

          .header-avatar {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            text-decoration: none;
            font-size: 0.875rem;
          }

          /* Page Content */
          .page-content {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
          }

          @media (max-width: 1023px) {
            .page-content {
              padding: 1rem;
              padding-bottom: calc(var(--mobile-nav-height) + 1rem);
            }
          }

          /* Mobile Bottom Navigation */
          .mobile-bottom-nav {
            display: none;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: var(--mobile-nav-height);
            background: white;
            border-top: 1px solid var(--gray-200);
            z-index: 30;
            padding-bottom: env(safe-area-inset-bottom);
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
          }

          @media (max-width: 1023px) {
            .mobile-bottom-nav { display: flex; }
          }

          .mobile-bottom-nav .nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            padding: 0.5rem 0;
            min-height: 44px;
            text-decoration: none;
            color: var(--gray-500);
            transition: all 0.2s;
          }

          .mobile-bottom-nav .nav-item.active {
            color: var(--primary-600);
          }

          .mobile-bottom-nav .nav-item:active {
            background: var(--gray-50);
          }

          .mobile-bottom-nav .nav-svg {
            width: 22px;
            height: 22px;
          }

          .mobile-bottom-nav .nav-label {
            font-size: 0.625rem;
            font-weight: 600;
          }

          /* Scrollbar Styling */
          .sidebar::-webkit-scrollbar {
            width: 6px;
          }

          .sidebar::-webkit-scrollbar-track {
            background: transparent;
          }

          .sidebar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
          }

          .sidebar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        `}</style>
      </div>
  );
};

export default DashboardLayout;