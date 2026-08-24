import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';
import ExportMenu from '../../components/ExportMenu';

const AdminSalary = () => {
  const [activeTab, setActiveTab] = useState('payouts');
  const [payouts, setPayouts] = useState([]);
  const [payoutsWithKYC, setPayoutsWithKYC] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: 'pending', date: '' });
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [runningClosing, setRunningClosing] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page]);

  const fetchData = async (pageNum = page) => {
    setLoading(true);
    try {
      if (activeTab === 'payouts') {
        const response = await adminAPI.getPayouts(pageNum, filters);
        setPayouts(response.data.payouts);
        setTotalPages(response.data.pages || 1);
        setTotal(response.data.total || 0);
      } else if (activeTab === 'payoutsKyc') {
        const response = await adminAPI.getPayoutsWithKYC(filters);
        setPayoutsWithKYC(response.data.payouts);
        setTotalPages(1);
        setTotal(response.data.payouts ? response.data.payouts.length : 0);
      } else if (activeTab === 'cycles') {
        const response = await adminAPI.getSalaryCycles(pageNum, { status: filters.status });
        setCycles(response.data.cycles);
        setTotalPages(response.data.pages || 1);
        setTotal(response.data.total || 0);
      } else if (activeTab === 'summary') {
        const response = await adminAPI.getDailySummary();
        setSummary(response.data);
        setTotalPages(1);
        setTotal(0);
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

  const runDailyClosing = async () => {
    setRunningClosing(true);
    try {
      const response = await adminAPI.runClosing();
      const r = response.data;
      toast.success(
        `Daily closing done — ${r.credits || 0} credits, ${r.withdrawals || 0} withdrawals generated`
      );
      fetchData();
    } catch (error) {
      toast.error('Failed to run daily closing');
    } finally {
      setRunningClosing(false);
    }
  };

  // Mark ALL of a user's pending payouts as paid in one bulk call so a single
  // combined amount is processed instead of separate per-referral payouts.
  const markUserPaid = async (group) => {
    if (!group.pendingIds.length) return;
    try {
      await adminAPI.bulkUpdatePayouts(group.pendingIds, 'paid');
      toast.success(
        `Marked ${group.pendingIds.length} payout(s) — ₹${group.pendingTotal.toLocaleString()} — as paid for ${group.user_name}`
      );
      fetchData();
    } catch (error) {
      toast.error('Failed to update payouts');
    }
  };

  // Club payouts by user so each user shows as one row with a total amount.
  const groupedPayouts = useMemo(() => {
    const map = new Map();
    for (const p of payouts) {
      const key = p.user_id ?? p.user_name;
      if (!map.has(key)) {
        map.set(key, {
          user_id: p.user_id,
          user_name: p.user_name,
          user_mobile: p.user_mobile,
          user_email: p.user_email,
          payouts: [],
          total: 0,
          pendingIds: [],
          pendingTotal: 0,
          allPaid: true,
          lastPaidAt: null,
        });
      }
      const g = map.get(key);
      g.payouts.push(p);
      g.total += parseFloat(p.amount || 0);
      if (p.status === 'pending') {
        g.pendingIds.push(p.id);
        g.pendingTotal += parseFloat(p.amount || 0);
        g.allPaid = false;
      } else if (p.paid_at) {
        const ts = new Date(p.paid_at).getTime();
        if (!g.lastPaidAt || ts > g.lastPaidAt) g.lastPaidAt = ts;
      }
    }
    return Array.from(map.values());
  }, [payouts]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData(1);
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
            <h3 className="card-title">Withdrawal Requests</h3>
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
              type="date"
              className="form-input"
              placeholder="Payout date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              style={{ width: '180px' }}
            />
            <button type="submit" className="btn btn-primary">Filter</button>
            <button
              type="button"
              className="btn btn-success"
              onClick={runDailyClosing}
              disabled={runningClosing}
              title="Manually trigger the daily incentive closing now"
            >
              {runningClosing ? 'Running...' : '⚡ Run Daily Closing'}
            </button>
          </form>

          {payouts.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Transactions</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Last Paid</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedPayouts.map((group) => {
                    const isOpen = expandedUserId === (group.user_id ?? group.user_name);
                    return (
                      <React.Fragment key={group.user_id ?? group.user_name}>
                        <tr
                          className={`payout-group-row${isOpen ? ' expanded' : ''}`}
                          onClick={() => setExpandedUserId(isOpen ? null : (group.user_id ?? group.user_name))}
                          title="Click to view transaction breakdown"
                        >
                          <td>
                            <div className="user-cell">
                              <span className="font-medium">
                                <span className="expand-chevron">{isOpen ? '▾' : '▸'}</span>
                                {group.user_name}
                              </span>
                              <span className="text-muted text-sm">{group.user_mobile}</span>
                            </div>
                          </td>
                          <td>
                            <span className="font-medium">{group.payouts.length}</span>{' '}
                            <span className="text-muted text-sm">txns</span>
                          </td>
                          <td className="text-primary font-semibold">₹{group.total.toLocaleString()}</td>
                          <td>
                            {group.allPaid ? (
                              <span className="badge badge-success">All Paid</span>
                            ) : (
                              <span className="badge badge-warning">
                                {group.pendingIds.length} Pending
                              </span>
                            )}
                          </td>
                          <td className="text-muted">
                            {group.lastPaidAt ? new Date(group.lastPaidAt).toLocaleDateString() : '-'}
                          </td>
                          <td>
                            {group.pendingIds.length > 0 && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markUserPaid(group);
                                }}
                              >
                                Mark Paid (₹{group.pendingTotal.toLocaleString()})
                              </button>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="payout-bifurcation-row">
                            <td colSpan={6}>
                              <div className="bifurcation-wrap">
                                <h4 className="bifurcation-title">
                                  Transaction breakdown — {group.user_name}
                                </h4>
                                <table className="table bifurcation-table">
                                  <thead>
                                    <tr>
                                      <th>Referral</th>
                                      <th>Date</th>
                                      <th>Amount</th>
                                      <th>Status</th>
                                      <th>Paid At</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.payouts.map((payout) => (
                                      <tr key={payout.id}>
                                        <td>{payout.referral_name || (payout.is_withdrawal ? 'Withdrawal' : '-')}</td>
                                        <td>{payout.payout_date ? new Date(payout.payout_date).toLocaleDateString() : (payout.month ? `${payout.month}/${payout.year}` : '-')}</td>
                                        <td className="text-primary font-semibold">
                                          ₹{parseFloat(payout.amount).toLocaleString()}
                                        </td>
                                        <td>
                                          <span className={`badge badge-${payout.status === 'paid' ? 'success' : 'warning'}`}>
                                            {payout.status}
                                          </span>
                                        </td>
                                        <td className="text-muted">
                                          {payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="💸"
              title="No payouts found"
              description={filters.status ? 'Try adjusting your filters' : 'Withdrawal requests will appear here after daily closing'}
            />
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onChange={(p) => { setPage(p); fetchData(p); }}
          />
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
                type="date"
                className="form-input"
                placeholder="Payout date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                style={{ width: '180px' }}
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
              <option value="completed">Completed</option>
            </select>
            <button type="submit" className="btn btn-primary">Filter</button>
            <ExportMenu
              fetchAll={async () => {
                const all = [];
                let p = 1, tp = 1;
                while (p <= tp) {
                  const res = await adminAPI.getSalaryCycles(p, { status: filters.status });
                  all.push(...(res.data.cycles || []));
                  tp = res.data.pages || Math.ceil((res.data.total || all.length) / 20);
                  p++;
                }
                if (all.length === 0) toast.info('No cycles to export');
                return all;
              }}
              columns={[
                { key: 'sponsor_name', label: 'Sponsor' },
                { key: 'sponsor_email', label: 'Sponsor Email' },
                { key: 'referral_name', label: 'Referral' },
                { key: 'start_date', label: 'Start Date' },
                { key: 'daily_amount', label: 'Daily Amount' },
                { key: 'days', label: 'Days' },
                { key: 'days_paid', label: 'Days Paid' },
                { key: 'status', label: 'Status' }
              ]}
              filename="incentive-cycles"
              title="Blisswell Incentive Cycles"
            />
          </form>

          {cycles.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sponsor</th>
                    <th>Referral</th>
                    <th>Start Date</th>
                    <th>Daily Amount</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((cycle) => {
                    const dailyAmount = cycle.daily_amount || cycle.monthly_amount || 0;
                    const days = cycle.days || cycle.duration || 1;
                    const daysPaid = cycle.days_paid != null ? cycle.days_paid : (cycle.months_paid || 0);
                    const startDate = cycle.start_date || cycle.start_month;
                    return (
                      <tr key={cycle.id}>
                        <td>
                          <div className="user-cell">
                            <span className="font-medium">{cycle.sponsor_name}</span>
                            <span className="text-muted text-sm">{cycle.sponsor_email}</span>
                          </div>
                        </td>
                        <td>{cycle.referral_name}</td>
                        <td>{startDate ? new Date(startDate).toLocaleDateString() : '-'}</td>
                        <td className="text-primary font-semibold">₹{parseFloat(dailyAmount).toLocaleString()}</td>
                        <td>
                          <div className="progress-cell">
                            <span>{daysPaid} / {days} days</span>
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${Math.min(100, (daysPaid / days) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${
                            cycle.status === 'active' ? 'success' : 'info'
                          }`}>
                            {cycle.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onChange={(p) => { setPage(p); fetchData(p); }}
          />
        </div>
      );
    }

    if (activeTab === 'summary' && summary) {
      const s = summary.summary || {};
      return (
        <div>
          <div className="stats-grid">
            <div className="stat-card info">
              <div className="stat-icon">⚡</div>
              <div className="stat-label">Today's Credits</div>
              <div className="stat-value">{s.credit_count}</div>
              <div className="stat-subtext">₹{Number(s.credit_amount || 0).toLocaleString()}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">💸</div>
              <div className="stat-label">Withdrawals Today</div>
              <div className="stat-value">{s.withdrawal_count}</div>
              <div className="stat-subtext">₹{Number(s.withdrawal_amount || 0).toLocaleString()}</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-label">Pending Payouts</div>
              <div className="stat-value">{s.pending_payouts}</div>
              <div className="stat-subtext">₹{Number(s.pending_payout_amount || 0).toLocaleString()}</div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon">🔄</div>
              <div className="stat-label">Active Cycles</div>
              <div className="stat-value">{s.active_cycles}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Daily Closing Summary — {summary.date}</h3>
            </div>
            <p className="text-muted">
              Daily incentive closing runs automatically every day shortly after midnight. You can also trigger it manually from the Payouts tab.
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
            <p className="page-subtitle">Manage daily incentive cycles and withdrawal payouts</p>
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

      <style>{`
        .admin-salary-page {
          max-width: 1400px;
        }

        /* Grouped payouts (clubbed per user) */
        .payout-group-row {
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .payout-group-row:hover {
          background: #f8fafc;
        }
        .payout-group-row.expanded {
          background: #eef2ff;
        }
        .expand-chevron {
          display: inline-block;
          width: 1rem;
          margin-right: 0.4rem;
          color: #64748b;
          font-size: 0.85rem;
        }
        .payout-bifurcation-row > td {
          padding: 0 !important;
          background: #f9fafb;
          border-top: none;
        }
        .bifurcation-wrap {
          padding: 1rem 1.25rem 1.25rem 2.5rem;
        }
        .bifurcation-title {
          margin: 0 0 0.6rem 0;
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .bifurcation-table {
          margin: 0;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .bifurcation-table thead th {
          background: #f1f5f9;
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

        @media (max-width: 480px) {
          .tab-nav {
            flex-direction: row;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .tab-btn {
            white-space: nowrap;
            flex-shrink: 0;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminSalary;