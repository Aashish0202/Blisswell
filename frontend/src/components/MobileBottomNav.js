import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * MobileBottomNav Component - Bottom navigation for mobile
 * Replaces sidebar on mobile devices
 */
const MobileBottomNav = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const userLinks = [
    { path: '/dashboard', label: 'Home', icon: '📊' },
    { path: '/wallet', label: 'Wallet', icon: '💰' },
    { path: '/orders', label: 'Orders', icon: '📦' },
    { path: '/referrals', label: 'Team', icon: '👥' },
    { path: '/profile', label: 'Profile', icon: '👤' }
  ];

  const adminLinks = [
    { path: '/admin', label: 'Home', icon: '📊' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/orders', label: 'Orders', icon: '📦' },
    { path: '/admin/salary', label: 'Salary', icon: '💸' },
    { path: '/admin/settings', label: 'More', icon: '⚙️' }
  ];

  const links = user?.role === 'admin' ? adminLinks : userLinks;

  return (
    <nav className="mobile-bottom-nav">
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`nav-item ${location.pathname === link.path ? 'active' : ''}`}
        >
          <span className="nav-icon">{link.icon}</span>
          <span className="nav-label">{link.label}</span>
        </Link>
      ))}

      <style>{`
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid var(--gray-200);
          display: flex;
          justify-content: space-around;
          padding: 0.5rem 0;
          padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
          z-index: 900;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.375rem 0.75rem;
          text-decoration: none;
          color: var(--gray-500);
          transition: all var(--transition-fast);
          min-width: 64px;
        }

        .nav-item.active {
          color: var(--primary-600);
        }

        .nav-icon {
          font-size: 1.25rem;
          line-height: 1;
          margin-bottom: 0.125rem;
        }

        .nav-label {
          font-size: 0.625rem;
          font-weight: 500;
        }

        .nav-item.active .nav-label {
          font-weight: 600;
        }

        @media (min-width: 1024px) {
          .mobile-bottom-nav {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default MobileBottomNav;