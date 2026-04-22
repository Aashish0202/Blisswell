import React from 'react';
import DashboardLayout from './DashboardLayout';

/**
 * AdminLayout Component - Extends DashboardLayout with admin-specific features
 * Adds pending action alerts for PAN approvals, payouts, etc.
 */
const AdminLayout = ({ children, alerts = [] }) => {
  return (
    <DashboardLayout isAdmin={true}>
      {/* Pending Alerts Banner */}
      {alerts.length > 0 && (
        <div className="admin-alerts-banner">
          <div className="alerts-header">
            <span className="alerts-icon">⚠️</span>
            <span className="alerts-title">Pending Actions</span>
          </div>
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <a key={index} href={alert.href} className="alert-item">
                <span className={`alert-badge badge-${alert.variant || 'warning'}`}>
                  {alert.count}
                </span>
                <span className="alert-text">{alert.label}</span>
                <span className="alert-arrow">→</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {children}
      <style>{`
        .admin-alerts-banner {
          background: linear-gradient(135deg, var(--status-paused-bg), white);
          border: 1px solid #FDE68A;
          border-radius: var(--radius-lg);
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .alerts-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .alerts-icon {
          font-size: 1.25rem;
        }

        .alerts-title {
          font-weight: 600;
          color: #92400E;
          font-size: 0.875rem;
        }

        .alerts-list {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          flex: 1;
        }

        .alert-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: white;
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: all var(--transition-fast);
          border: 1px solid transparent;
        }

        .alert-item:hover {
          border-color: var(--primary-200);
          box-shadow: var(--shadow-sm);
        }

        .alert-badge {
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .alert-text {
          font-size: 0.8125rem;
          color: var(--gray-700);
        }

        .alert-arrow {
          color: var(--gray-400);
          font-size: 0.875rem;
        }

        @media (max-width: 640px) {
          .admin-alerts-banner {
            flex-direction: column;
            align-items: flex-start;
          }

          .alerts-list {
            flex-direction: column;
            width: 100%;
          }

          .alert-item {
            width: 100%;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default AdminLayout;