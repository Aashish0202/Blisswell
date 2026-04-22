import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getDashboard();
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Build pending alerts for AdminLayout
  const getAlerts = () => {
    const alerts = [];
    if (stats?.users?.pending_pan > 0) {
      alerts.push({
        label: 'Pending PAN Approvals',
        count: stats.users.pending_pan,
        href: '/admin/users?filter=pending_pan',
        variant: 'warning'
      });
    }
    if (stats?.salary?.pending_payouts > 0) {
      alerts.push({
        label: 'Pending Payouts',
        count: stats.salary.pending_payouts,
        href: '/admin/salary?filter=pending',
        variant: 'info'
      });
    }
    if (stats?.cycles?.paused > 0) {
      alerts.push({
        label: 'Paused Cycles',
        count: stats.cycles.paused,
        href: '/admin/salary?filter=paused',
        variant: 'warning'
      });
    }
    return alerts;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-dashboard">
          <div className="page-header">
            <h1 className="page-title">Dashboard</h1>
          </div>
          <div className="stats-grid">
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout alerts={getAlerts()}>
      <div className="admin-dashboard">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Overview of your Blisswell platform</p>
          </div>
          <div className="page-actions">
            <Link to="/admin/settings" className="btn btn-ghost">
              ⚙️ Settings
            </Link>
          </div>
        </div>

        {/* Main Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{stats?.users?.total || 0}</div>
            <div className="stat-subtext">
              <span className="text-success">{stats?.users?.active || 0} active</span>
              {stats?.users?.pending_pan > 0 && (
                <span className="text-warning"> • {stats.users.pending_pan} pending PAN</span>
              )}
            </div>
            <Link to="/admin/users" className="stat-link">Manage Users →</Link>
          </div>

          <div className="stat-card success">
            <div className="stat-icon">📦</div>
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{stats?.orders?.total || 0}</div>
            <div className="stat-subtext">
              ₹{(stats?.orders?.total_sales || 0).toLocaleString()} total sales
            </div>
            <Link to="/admin/orders" className="stat-link">View Orders →</Link>
          </div>

          <div className="stat-card warning">
            <div className="stat-icon">💸</div>
            <div className="stat-label">Pending Payouts</div>
            <div className="stat-value">₹{(stats?.salary?.pending_amount || 0).toLocaleString()}</div>
            <div className="stat-subtext">
              {stats?.salary?.pending_payouts || 0} payouts pending
            </div>
            <Link to="/admin/salary" className="stat-link">Process Payouts →</Link>
          </div>

          <div className="stat-card info">
            <div className="stat-icon">📊</div>
            <div className="stat-label">Active Liability</div>
            <div className="stat-value">₹{(stats?.salary?.active_liability || 0).toLocaleString()}</div>
            <div className="stat-subtext">
              Monthly commitment
            </div>
          </div>
        </div>

        {/* Cycle Stats */}
        <div className="stats-row">
          <div className="mini-stat">
            <span className="mini-stat-value text-success">{stats?.cycles?.active || 0}</span>
            <span className="mini-stat-label">Active Cycles</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value text-warning">{stats?.cycles?.paused || 0}</span>
            <span className="mini-stat-label">Paused Cycles</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value text-muted">{stats?.cycles?.completed || 0}</span>
            <span className="mini-stat-label">Completed</span>
          </div>
          <div className="mini-stat">
            <span className="mini-stat-value text-primary">₹{(stats?.salary?.paid_amount || 0).toLocaleString()}</span>
            <span className="mini-stat-label">Total Paid</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚡ Quick Actions</h3>
          </div>
          <div className="quick-actions-grid">
            <Link to="/admin/users" className="quick-action-card">
              <span className="quick-action-icon">👥</span>
              <div className="quick-action-content">
                <span className="quick-action-title">Manage Users</span>
                <span className="quick-action-desc">Approve PAN, view profiles</span>
              </div>
            </Link>
            <Link to="/admin/orders" className="quick-action-card">
              <span className="quick-action-icon">📦</span>
              <div className="quick-action-content">
                <span className="quick-action-title">Orders</span>
                <span className="quick-action-desc">View and manage orders</span>
              </div>
            </Link>
            <Link to="/admin/salary" className="quick-action-card">
              <span className="quick-action-icon">💰</span>
              <div className="quick-action-content">
                <span className="quick-action-title">Salary Payouts</span>
                <span className="quick-action-desc">Process monthly payouts</span>
              </div>
            </Link>
            <Link to="/admin/reports" className="quick-action-card">
              <span className="quick-action-icon">📈</span>
              <div className="quick-action-content">
                <span className="quick-action-title">Reports</span>
                <span className="quick-action-desc">Analytics and insights</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 Recent Orders</h3>
            <Link to="/admin/orders" className="btn btn-ghost btn-sm">View All</Link>
          </div>
          {stats?.recentOrders?.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="order-number">#{order.order_number}</span>
                      </td>
                      <td className="font-medium">{order.user_name}</td>
                      <td className="text-primary font-semibold">₹{order.amount?.toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${
                          order.status === 'delivered' ? 'success' :
                          order.status === 'shipped' ? 'info' :
                          order.status === 'processing' ? 'warning' : 'neutral'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="text-muted">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-mini">
              <span className="text-muted">No recent orders</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .admin-dashboard {
          max-width: 100%;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .page-subtitle {
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .page-actions {
          display: flex;
          gap: 0.75rem;
        }

        .stat-subtext {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .stat-link {
          display: block;
          font-size: 0.75rem;
          color: var(--primary-600);
          text-decoration: none;
          margin-top: 0.5rem;
        }

        .text-success { color: var(--accent-600); }
        .text-warning { color: #F59E0B; }
        .text-muted { color: var(--gray-500); }
        .text-primary { color: var(--primary-600); }

        /* Stats Row */
        .stats-row {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          padding: 1rem 1.5rem;
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          flex-wrap: wrap;
        }

        .mini-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 100px;
        }

        .mini-stat-value {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .mini-stat-label {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        /* Quick Actions Grid */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .quick-action-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          text-decoration: none;
          transition: all var(--transition-fast);
          border: 1px solid transparent;
        }

        .quick-action-card:hover {
          background: white;
          border-color: var(--primary-200);
          box-shadow: var(--shadow-md);
          transform: translateY(-2px);
        }

        .quick-action-icon {
          font-size: 1.5rem;
        }

        .quick-action-content {
          display: flex;
          flex-direction: column;
        }

        .quick-action-title {
          font-weight: 600;
          color: var(--gray-900);
        }

        .quick-action-desc {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .order-number {
          font-family: monospace;
          font-weight: 600;
          color: var(--gray-700);
        }

        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }

        .empty-state-mini {
          text-align: center;
          padding: 2rem;
        }

        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 1rem;
          }

          .stats-row {
            justify-content: space-around;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminDashboard;