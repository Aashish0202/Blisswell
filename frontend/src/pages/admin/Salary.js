import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const AdminSalary = () => {
  const [activeTab, setActiveTab] = useState('payouts');
  const [payouts, setPayouts] = useState([]);
  const [payoutsWithKYC, setPayoutsWithKYC] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: 'pending', month: '', year: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });

  useEffect(() => {
    fetchData();
  }, [activeTab, page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'payouts') {
        const response = await adminAPI.getPayouts(page, filters);
        setPayouts(response.data.payouts);
      } else if (activeTab === 'payoutsKyc') {
        const response = await adminAPI.getPayoutsWithKYC(filters);
        setPayoutsWithKYC(response.data.payouts);
      } else if (activeTab === 'cycles') {
        const response = await adminAPI.getSalaryCycles(page, { status: filters.status });
        setCycles(response.data.cycles);
      } else if (activeTab === 'summary') {
        const now = new Date();
        const response = await adminAPI.getMonthlySummary(now.getMonth() + 1, now.getFullYear());
        setSummary(response.data);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const updatePayoutStatus = async (payoutId, status) => {
    try {
      await adminAPI.updatePayoutStatus(payoutId, status);
      toast.success('Payout status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update payout');
    }
  };

  const runMonthlyClosing = async () => {
    try {
      const response = await adminAPI.runClosing();
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to run closing');
    } finally {
      setConfirmDialog({ isOpen: false });
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const response = await adminAPI.exportPayoutsExcel(filters);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payouts-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Excel file downloaded successfully');
    } catch (error) {
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  // Calculate pending payouts for alert
  const pendingPayouts = payouts.filter(p => p.status === 'pending').length;
  const alerts = pendingPayouts > 0 ? [
    { label: 'Pending Payouts', count: pendingPayouts, href: '/admin/salary', variant: 'warning' }
  ] : [];

  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton variant="card" />;
    }

    if (activeTab === 'payouts') {
      return (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Incentive Payouts</h3>
          </div>

          {/* Filters */}
          <form onSubmit={handleFilter} className="filter-form">
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
            <input
              type="number"
              className="form-input"
              placeholder="Month (1-12)"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              style={{ width: '120px' }}
              min="1" max="12"
            />
            <input
              type="number"
              className="form-input"
              placeholder="Year"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              style={{ width: '100px' }}
            />
            <button type="submit" className="btn btn-primary">Filter</button>
          </form>

          {payouts.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Referral</th>
                    <th>Month/Year</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Paid At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td>
                        <div className="user-cell">
                          <span className="font-medium">{payout.user_name}</span>
                          <span className="text-muted text-sm">{payout.user_mobile}</span>
                        </div>
                      </td>
                      <td>{payout.referral_name}</td>
                      <td>{payout.month}/{payout.year}</td>
                      <td className="text-primary font-semibold">₹{payout.amount}</td>
                      <td>
                        <span className={`badge badge-${payout.status === 'paid' ? 'success' : 'warning'}`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="text-muted">
                        {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        {payout.status === 'pending' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => updatePayoutStatus(payout.id, 'paid')}
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="💸"
              title="No payouts found"
              description={filters.status ? 'Try adjusting your filters' : 'Payouts will appear here after monthly closing'}
            />
          )}
        </div>
      );
    }

    if (activeTab === 'payoutsKyc') {
      return (
        <div>
          {/* Filters and Export */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Payouts with KYC Details</h3>
            </div>
            <form onSubmit={handleFilter} className="filter-form">
              <select
                className="form-input"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
              <input
                type="number"
                className="form-input"
                placeholder="Month (1-12)"
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                style={{ width: '120px' }}
                min="1" max="12"
              />
              <input
                type="number"
                className="form-input"
                placeholder="Year"
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                style={{ width: '100px' }}
              />
              <button type="submit" className="btn btn-primary">Filter</button>
              <button
                type="button"
                className="btn btn-success"
                onClick={exportToExcel}
                disabled={exporting}
              >
                {exporting ? 'Exporting...' : '📥 Export Excel'}
              </button>
            </form>
          </div>

          {/* Legend */}
          <div className="legend-bar">
            <span className="legend-item">
              <span className="legend-dot legend-warning"></span> PAN/KYC Not Complete
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-success"></span> Fully Verified
            </span>
          </div>

          {/* Payouts Table with KYC */}
          <div className="card">
            <div className="table-container" style={{ overflowX: 'auto' }}>
              {payoutsWithKYC.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>User ID</th>
                      <th>Amount</th>
                      <th>PAN</th>
                      <th>Bank Name</th>
                      <th>Account Number</th>
                      <th>IFSC Code</th>
                      <th>Branch</th>
                      <th>KYC Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutsWithKYC.map((payout) => (
                      <tr
                        key={payout.id}
                        className={payout.verification_status === 'incomplete' ? 'row-warning' : ''}
                      >
                        <td>
                          <div className="user-cell">
                            <span className="user-name">{payout.name}</span>
                            <span className="user-email">{payout.email}</span>
                            <span className="user-mobile">{payout.mobile}</span>
                          </div>
                        </td>
                        <td className="font-mono">{payout.referral_code}</td>
                        <td className="font-semibold">₹{parseFloat(payout.amount).toLocaleString()}</td>
                        <td>
                          <div className="pan-cell">
                            <span>{payout.pan_number || 'N/A'}</span>
                            <span className={`badge badge-${payout.pan_status === 'approved' ? 'success' : 'warning'}`}>
                              {payout.pan_status || 'pending'}
                            </span>
                          </div>
                        </td>
                        <td>{payout.bank_name || '-'}</td>
                        <td className="font-mono">{payout.account_number || '-'}</td>
                        <td className="font-mono">{payout.ifsc_code || '-'}</td>
                        <td>{payout.branch_name || '-'}</td>
                        <td>
                          <span className={`badge badge-${payout.kyc_status === 'approved' ? 'success' : payout.kyc_status === 'rejected' ? 'danger' : 'warning'}`}>
                            {payout.kyc_status || 'Not Submitted'}
                          </span>
                        </td>
                        <td>
                          {payout.status === 'pending' && payout.verification_status === 'complete' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => updatePayoutStatus(payout.id, 'paid')}
                            >
                              Mark Paid
                            </button>
                          )}
                          {payout.verification_status === 'incomplete' && (
                            <span className="text-warning text-sm">Verify PAN/KYC first</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  icon="📋"
                  title="No payouts found"
                  description="Try adjusting your filters"
                />
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'cycles') {
      return (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Incentive Cycles</h3>
          </div>

          <form onSubmit={handleFilter} className="filter-form">
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
            <button type="submit" className="btn btn-primary">Filter</button>
          </form>

          {cycles.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sponsor</th>
                    <th>Referral</th>
                    <th>Start Month</th>
                    <th>Monthly Amount</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((cycle) => (
                    <tr key={cycle.id}>
                      <td>
                        <div className="user-cell">
                          <span className="font-medium">{cycle.sponsor_name}</span>
                          <span className="text-muted text-sm">{cycle.sponsor_email}</span>
                        </div>
                      </td>
                      <td>{cycle.referral_name}</td>
                      <td>{new Date(cycle.start_month).toLocaleDateString()}</td>
                      <td className="text-primary font-semibold">₹{cycle.monthly_amount}</td>
                      <td>
                        <div className="progress-cell">
                          <span>{cycle.months_paid} / {cycle.duration}</span>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${(cycle.months_paid / cycle.duration) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${
                          cycle.status === 'active' ? 'success' :
                          cycle.status === 'paused' ? 'warning' : 'info'
                        }`}>
                          {cycle.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="🔄"
              title="No cycles found"
              description="Incentive cycles will appear here when users purchase packages"
            />
          )}
        </div>
      );
    }

    if (activeTab === 'summary' && summary) {
      return (
        <div>
          <div className="stats-grid">
            <div className="stat-card warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-label">Pending Payouts</div>
              <div className="stat-value">{summary.summary.pending_count}</div>
              <div className="stat-subtext">₹{summary.summary.pending_amount?.toLocaleString()}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-label">Paid This Month</div>
              <div className="stat-value">{summary.summary.paid_count}</div>
              <div className="stat-subtext">₹{summary.summary.paid_amount?.toLocaleString()}</div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon">🔄</div>
              <div className="stat-label">Active Cycles</div>
              <div className="stat-value">{summary.summary.active_cycles}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⏸️</div>
              <div className="stat-label">Paused Cycles</div>
              <div className="stat-value">{summary.summary.paused_cycles}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monthly Summary - {summary.month}/{summary.year}</h3>
            </div>
            <p className="text-muted">
              Monthly closing runs automatically on the 25th of each month. You can also trigger it manually using the "Run Monthly Closing" button above.
            </p>
          </div>
        </div>
      );
    }
  };

  return (
    <AdminLayout alerts={alerts}>
      <div className="admin-salary-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Incentive Management</h1>
            <p className="page-subtitle">Manage incentive cycles and payouts</p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn btn-success"
              onClick={() => setConfirmDialog({ isOpen: true })}
            >
              🔄 Run Monthly Closing
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            💸 Payouts
          </button>
          <button
            className={`tab-btn ${activeTab === 'payoutsKyc' ? 'active' : ''}`}
            onClick={() => setActiveTab('payoutsKyc')}
          >
            📋 Payouts + KYC
          </button>
          <button
            className={`tab-btn ${activeTab === 'cycles' ? 'active' : ''}`}
            onClick={() => setActiveTab('cycles')}
          >
            🔄 Cycles
          </button>
          <button
            className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            📊 Summary
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={runMonthlyClosing}
        title="Run Monthly Closing"
        message="This will process all pending incentive payouts for the current month. This action cannot be undone."
        confirmText="Run Closing"
        variant="warning"
      />

      <style>{`
        .admin-salary-page {
          max-width: 1400px;
        }

        .page-header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .tab-nav {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: var(--gray-100);
          padding: 0.25rem;
          border-radius: var(--radius-lg);
          flex-wrap: wrap;
        }

        .tab-btn {
          flex: 1;
          min-width: 120px;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--gray-600);
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          background: white;
          color: var(--primary-600);
          box-shadow: var(--shadow-sm);
        }

        .filter-form {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
          align-items: flex-end;
        }

        .legend-bar {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #4b5563;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .legend-warning {
          background: #fef3c7;
          border: 2px solid #f59e0b;
        }

        .legend-success {
          background: #d1fae5;
          border: 2px solid #10b981;
        }

        .row-warning {
          background-color: #fffbeb !important;
        }

        .row-warning:hover {
          background-color: #fef3c7 !important;
        }

        .user-cell {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .user-name {
          font-weight: 500;
          color: #1f2937;
        }

        .user-email {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .user-mobile {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .pan-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .progress-cell {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .progress-bar {
          height: 4px;
          background: var(--gray-200);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--primary-500);
          border-radius: 2px;
        }

        .font-mono { font-family: monospace; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .text-muted { color: #6b7280; }
        .text-sm { font-size: 0.75rem; }
        .text-warning { color: #f59e0b; }
        .text-primary { color: #4f46e5; }
        .stat-subtext { font-size: 0.875rem; color: #6b7280; }

        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge-success {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        @media (max-width: 768px) {
          .filter-form {
            flex-direction: column;
          }

          .tab-nav {
            flex-direction: column;
          }

          .legend-bar {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminSalary;