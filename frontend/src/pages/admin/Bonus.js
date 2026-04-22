import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const AdminBonus = () => {
  const [activeTab, setActiveTab] = useState('report');
  const [bonuses, setBonuses] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: 'pending' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'report') {
        const response = await adminAPI.getBusinessBonusReport(1, filters);
        setBonuses(response.data.bonuses || []);
        setSummary(response.data.summary);
      } else if (activeTab === 'payouts') {
        const response = await adminAPI.getBonusPayouts(filters);
        setPayouts(response.data.payouts || []);
        setSummary(response.data.summary);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchData();
  };

  const updatePayoutStatus = async (payoutId, status) => {
    try {
      await adminAPI.updateBonusPayoutStatus(payoutId, status);
      toast.success('Payout status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update payout');
    }
  };

  const recalculateBonuses = async () => {
    setRecalculating(true);
    try {
      const response = await adminAPI.recalculateBonuses();
      toast.success(`Recalculated bonuses for ${response.data.users_processed} users`);
      fetchData();
    } catch (error) {
      toast.error('Failed to recalculate');
    } finally {
      setRecalculating(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const response = await adminAPI.exportBonusPayoutsExcel(filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bonus-payouts-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Excel downloaded');
    } catch (error) {
      toast.error('Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton variant="card" />;
    }

    if (activeTab === 'report') {
      return (
        <div>
          {/* Summary Stats */}
          <div className="stats-grid">
            <div className="stat-card info">
              <div className="stat-icon">📊</div>
              <div className="stat-label">Total Direct Business</div>
              <div className="stat-value">₹{summary?.total_business?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">💰</div>
              <div className="stat-label">Total Bonus Earned</div>
              <div className="stat-value">₹{summary?.total_bonus_earned?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-label">Pending Bonus</div>
              <div className="stat-value">₹{summary?.pending_bonus?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-label">Paid Bonus</div>
              <div className="stat-value">₹{summary?.paid_bonus?.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Bonus Rules Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bonus Rules</h3>
            </div>
            <div className="info-box">
              <ul>
                <li><strong>Threshold:</strong> Every ₹50,000 in direct business</li>
                <li><strong>Bonus Amount:</strong> ₹3,000 for each milestone</li>
                <li><strong>Eligibility:</strong> User must have PAN approved and KYC completed for payout</li>
                <li><strong>Calculation:</strong> Based on total purchases by direct referrals</li>
              </ul>
            </div>
          </div>

          {/* Search Filter */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">User Bonus Report</h3>
            </div>
            <form onSubmit={handleFilter} className="filter-form">
              <input
                type="text"
                className="form-input"
                placeholder="Search by name, email, or User ID..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary">Search</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setFilters({ ...filters, search: '' }); fetchData(); }}>
                Clear
              </button>
            </form>

            {bonuses.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>User ID</th>
                      <th>Direct Business</th>
                      <th>Bonus Earned</th>
                      <th>Pending</th>
                      <th>Paid</th>
                      <th>Next Milestone</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bonuses.map((bonus) => {
                      const nextMilestone = Math.ceil((bonus.total_direct_business + 1) / 50000) * 50000;
                      const progress = (bonus.total_direct_business % 50000) / 50000 * 100;

                      return (
                        <tr key={bonus.user_id} className={bonus.verification_status === 'incomplete' ? 'row-warning' : ''}>
                          <td>
                            <div className="user-cell">
                              <span className="user-name">{bonus.name}</span>
                              <span className="user-email">{bonus.email}</span>
                            </div>
                          </td>
                          <td className="font-mono">{bonus.referral_code}</td>
                          <td className="font-semibold">₹{bonus.total_direct_business?.toLocaleString()}</td>
                          <td className="text-success">₹{bonus.bonus_earned?.toLocaleString()}</td>
                          <td className="text-warning">₹{bonus.pending_bonus?.toLocaleString()}</td>
                          <td className="text-primary">₹{bonus.paid_bonus?.toLocaleString()}</td>
                          <td>
                            <div className="progress-cell">
                              <span className="text-sm">₹{nextMilestone.toLocaleString()}</span>
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-muted text-xs">₹{(bonus.total_direct_business % 50000).toLocaleString()} / ₹50,000</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${bonus.pan_status === 'approved' && bonus.kyc_status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                              {bonus.pan_status === 'approved' && bonus.kyc_status === 'approved' ? 'Verified' : 'Incomplete'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="💰" title="No bonus records" description="Bonus records will appear when users have direct business" />
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'payouts') {
      return (
        <div>
          {/* Summary */}
          <div className="stats-grid">
            <div className="stat-card warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-label">Pending Payouts</div>
              <div className="stat-value">{summary?.pending_count || 0}</div>
              <div className="stat-subtext">₹{summary?.pending_amount?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-label">Paid Payouts</div>
              <div className="stat-value">₹{summary?.paid_amount?.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bonus Payouts</h3>
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
              <button type="submit" className="btn btn-primary">Filter</button>
              <button type="button" className="btn btn-success" onClick={exportToExcel} disabled={exporting}>
                {exporting ? 'Exporting...' : '📥 Export Excel'}
              </button>
            </form>

            {/* Legend */}
            <div className="legend-bar">
              <span className="legend-item">
                <span className="legend-dot legend-warning"></span> PAN/KYC Not Complete
              </span>
              <span className="legend-item">
                <span className="legend-dot legend-success"></span> Fully Verified
              </span>
            </div>

            {payouts.length > 0 ? (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>User ID</th>
                      <th>Amount</th>
                      <th>Milestone</th>
                      <th>PAN Status</th>
                      <th>Bank Name</th>
                      <th>Account Number</th>
                      <th>IFSC</th>
                      <th>KYC</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className={payout.verification_status === 'incomplete' ? 'row-warning' : ''}>
                        <td>
                          <div className="user-cell">
                            <span className="user-name">{payout.name}</span>
                            <span className="user-email">{payout.email}</span>
                            <span className="user-mobile">{payout.mobile}</span>
                          </div>
                        </td>
                        <td className="font-mono">{payout.referral_code}</td>
                        <td className="font-semibold">₹{payout.amount?.toLocaleString()}</td>
                        <td>₹{payout.milestone_amount?.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${payout.pan_status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                            {payout.pan_status || 'pending'}
                          </span>
                        </td>
                        <td>{payout.bank_name || '-'}</td>
                        <td className="font-mono">{payout.account_number || '-'}</td>
                        <td className="font-mono">{payout.ifsc_code || '-'}</td>
                        <td>
                          <span className={`badge ${payout.kyc_status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                            {payout.kyc_status || 'Not Submitted'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${payout.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                            {payout.status}
                          </span>
                        </td>
                        <td>
                          {payout.status === 'pending' && payout.verification_status === 'complete' && (
                            <button className="btn btn-success btn-sm" onClick={() => updatePayoutStatus(payout.id, 'paid')}>
                              Mark Paid
                            </button>
                          )}
                          {payout.verification_status === 'incomplete' && (
                            <span className="text-warning text-sm">Verify first</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="💸" title="No bonus payouts" description="Payouts will appear when users reach milestones" />
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <AdminLayout>
      <div className="admin-bonus-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Business Bonus</h1>
            <p className="page-subtitle">Manage direct business bonuses (₹3,000 per ₹50,000)</p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn btn-primary"
              onClick={recalculateBonuses}
              disabled={recalculating}
            >
              {recalculating ? 'Recalculating...' : '🔄 Recalculate All'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
          >
            📊 Bonus Report
          </button>
          <button
            className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            💸 Payouts
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      <style>{`
        .admin-bonus-page {
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
        }

        .tab-btn {
          flex: 1;
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

        .info-box {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 1rem;
        }

        .info-box ul {
          margin: 0;
          padding-left: 1.25rem;
          color: #1e40af;
        }

        .info-box li {
          margin-bottom: 0.5rem;
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
          background: #4f46e5;
          border-radius: 2px;
        }

        .font-mono { font-family: monospace; }
        .font-semibold { font-weight: 600; }
        .text-muted { color: #6b7280; }
        .text-sm { font-size: 0.75rem; }
        .text-xs { font-size: 0.7rem; }
        .text-warning { color: #f59e0b; }
        .text-success { color: #10b981; }
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

        @media (max-width: 768px) {
          .filter-form {
            flex-direction: column;
          }

          .tab-nav {
            flex-direction: column;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminBonus;