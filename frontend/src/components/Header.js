import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import { useSiteSettings } from './SiteSettingsProvider';

const Header = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { siteName, siteLogo } = useSiteSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    setMobileMenuOpen(false);
  };

  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) return siteLogo;
      const baseUrl = (process.env.REACT_APP_API_URL).replace('/api', '');
      return `${baseUrl}${siteLogo}`;
    }
    return null;
  };

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          {getLogoUrl() ? (
            <img src={getLogoUrl()} alt={siteName || 'Blisswell'} className="logo-img" />
          ) : (
            <span className="logo-text">{siteName || 'Blisswell'}</span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="header-nav desktop-nav">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/products" className="nav-link">Products</Link>
          <Link to="/about" className="nav-link">About</Link>
          <Link to="/gallery" className="nav-link">Gallery</Link>
          <Link to="/contact" className="nav-link">Contact</Link>

          {isAuthenticated ? (
            <>
              {user?.role === 'admin' ? (
                <Link to="/admin" className="nav-link">Admin</Link>
              ) : (
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
              )}
              <div className="nav-dropdown">
                <button className="nav-user-btn">
                  <span className="user-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                  <span className="user-name">{user?.name?.split(' ')[0]}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item">Profile</Link>
                  <Link to="/change-password" className="dropdown-item">Change Password</Link>
                  <button onClick={handleLogout} className="dropdown-item">Logout</button>
                </div>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn-register">Register</Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <nav className="mobile-nav">
          <Link to="/" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
          <Link to="/products" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Products</Link>
          <Link to="/about" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>About</Link>
          <Link to="/gallery" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Gallery</Link>
          <Link to="/contact" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Contact</Link>

          {isAuthenticated ? (
            <>
              {user?.role === 'admin' ? (
                <Link to="/admin" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Admin Panel</Link>
              ) : (
                <>
                  <Link to="/dashboard" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                  <Link to="/wallet" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Wallet</Link>
                  <Link to="/orders" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Orders</Link>
                </>
              )}
              <Link to="/profile" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
              <button onClick={handleLogout} className="mobile-link logout">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              <Link to="/register" className="mobile-link register" onClick={() => setMobileMenuOpen(false)}>Register</Link>
            </>
          )}
        </nav>
      </div>

      <style>{`
        .site-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #f3f4f6;
        }

        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
        }

        .header-logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .logo-img {
          height: 42px;
          width: auto;
          max-width: 180px;
          object-fit: contain;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.02em;
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .nav-link {
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #4b5563;
          text-decoration: none;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .nav-link:hover {
          color: #1a1a1a;
          background: #f3f4f6;
        }

        .nav-dropdown {
          position: relative;
          margin-left: 0.5rem;
        }

        .nav-user-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: none;
          border-radius: 2rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-user-btn:hover {
          background: #e5e7eb;
        }

        .user-avatar {
          width: 28px;
          height: 28px;
          background: #1a1a1a;
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .user-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1a1a1a;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          min-width: 180px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.2s;
        }

        .nav-dropdown:hover .dropdown-menu {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .dropdown-item {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #4b5563;
          text-decoration: none;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dropdown-item:hover {
          background: #f9fafb;
          color: #1a1a1a;
        }

        .dropdown-item:first-child {
          border-radius: 0.75rem 0.75rem 0 0;
        }

        .dropdown-item:last-child {
          border-radius: 0 0 0.75rem 0.75rem;
        }

        .auth-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-register {
          padding: 0.625rem 1.25rem;
          background: #1a1a1a;
          color: #fff;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .btn-register:hover {
          background: #333;
        }

        .mobile-menu-btn {
          display: none;
          padding: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #1a1a1a;
        }

        .mobile-menu {
          display: none;
          background: #fff;
          border-top: 1px solid #f3f4f6;
        }

        .mobile-menu.open {
          display: block;
        }

        .mobile-nav {
          display: flex;
          flex-direction: column;
          padding: 1rem;
        }

        .mobile-link {
          display: block;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 500;
          color: #1a1a1a;
          text-decoration: none;
          border-bottom: 1px solid #f3f4f6;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mobile-link:hover {
          background: #f9fafb;
        }

        .mobile-link.register {
          background: #1a1a1a;
          color: #fff;
          text-align: center;
          border-radius: 0.5rem;
          margin-top: 0.5rem;
        }

        .mobile-link.logout {
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .desktop-nav {
            display: none;
          }

          .mobile-menu-btn {
            display: flex;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;