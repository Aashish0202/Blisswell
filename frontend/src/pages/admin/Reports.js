import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import ExportButton from '../../components/ExportButton';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const AdminReports = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [salesReport, setSalesReport] = useState(null);
  const [salaryReport, setSalaryReport] = useState(null);
  const [liabilityReport, setLiabilityReport] = useState(null);
  const [referralReport, setReferralReport] = useState(null);
  const [walletReport, setWalletReport] = useState(null);
  const [userFinancialReport, setUserFinancialReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    year: new Date().getFullYear(),
    ref_start_date: '',
    ref_end_date: '',
    search: '',
    type: '',
    status: ''
  });

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const response = await adminAPI.getSalesReport(filters.start_date, filters.end_date);
        setSalesReport(response.data);
      } else if (activeTab === 'salary') {
        const response = await adminAPI.getSalaryReport(filters.year);
        setSalaryReport(response.data);
      } else if (activeTab === 'liability') {
        const response = await adminAPI.getLiabilityReport();
        setLiabilityReport(response.data);
      } else if (activeTab === 'referrals') {
        const response = await adminAPI.getReferralReport(1, {
          start_date: filters.ref_start_date,
          end_date: filters.ref_end_date
        });
        setReferralReport(response.data);
      } else if (activeTab === 'wallet') {
        const response = await adminAPI.getWalletReport(1, {
          type: filters.type,
          status: filters.status
        });
        setWalletReport(response.data);
      } else if (activeTab === 'userFinancial') {
        const response = await adminAPI.getUserFinancialReport(1, {
          search: filters.search
        });
        setUserFinancialReport(response.data);
      }
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const getExportData = () => {
    if (activeTab === 'sales' && salesReport) {
      return salesReport.orders_by_status || [];
    }
    if (activeTab === 'salary' && salaryReport) {
      return salaryReport.monthly_summary || [];
    }
    if (activeTab === 'liability' && liabilityReport) {
      return liabilityReport.liability_by_status || [];
    }
    if (activeTab === 'referrals' && referralReport) {
      return referralReport.users || [];
    }
    if (activeTab === 'wallet' && walletReport) {
      return walletReport.transactions || [];
    }
    if (activeTab === 'userFinancial' && userFinancialReport) {
      return userFinancialReport.users || [];
    }
    return [];
  };

  const getExportColumns = () => {
    if (activeTab === 'sales') {
      return [{ key: 'status', label: 'Status' }, { key: 'count', label: 'Count' }];
    }
    if (activeTab === 'salary') {
      return [
        { key: 'month', label: 'Month' },
        { key: 'pending_count', label: 'Pending Count' },
        { key: 'pending_amount', label: 'Pending Amount' },
        { key: 'paid_count', label: 'Paid Count' },
        { key: 'paid_amount', label: 'Paid Amount' }
      ];
    }
    if (activeTab === 'liability') {
      return [
        { key: 'status', label: 'Status' },
        { key: 'cycle_count', label: 'Cycle Count' },
        { key: 'total_months_paid', label: 'Months Paid' },
        { key: 'remaining_months', label: 'Remaining Months' },
        { key: 'remaining_liability', label: 'Remaining Liability' }
      ];
    }
    if (activeTab === 'referrals') {
      return [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'referral_code', label: 'User ID' },
        { key: 'total_referrals', label: 'Total Referrals' },
        { key: 'active_referrals', label: 'Active Referrals' }
      ];
    }
    if (activeTab === 'wallet') {
      return [
        { key: 'created_at', label: 'Date' },
        { key: 'name', label: 'User' },
        { key: 'type', label: 'Type' },
        { key: 'amount', label: 'Amount' },
        { key: 'status', label: 'Status' },
        { key: 'description', label: 'Description' }
      ];
    }
    if (activeTab === 'userFinancial') {
      return [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'referral_code', label: 'User ID' },
        { key: 'wallet_balance', label: 'Wallet Balance' },
        { key: 'total_earned', label: 'Total Earned' },
        { key: 'pending_income', label: 'Pending Income' },
        { key: 'liability', label: 'Liability' },
        { key: 'direct_count', label: 'Direct Referrals' },
        { key: 'active_directs', label: 'Active Directs' }
      ];
    }
    return [];
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton variant="card" />;
    }

    if (activeTab === 'sales' && salesReport) {
      return (
        <div>
          {/* Date Filter */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Filter by Date</h3>
            </div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">Apply Filter</button>
            </form>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card success">
              <div className="stat-icon">💰</div>
              <div className="stat-label">Total Sales</div>
              <div className="stat-value">₹{salesReport.total_sales?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon">📦</div>
              <div className="stat-label">Total Orders</div>
              <div className="stat-value">{salesReport.order_count || 0}</div>
            </div>
          </div>

          {/* Orders by Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Orders by Status</h3>
            </div>
            <div className="table-container">
              {salesReport.orders_by_status?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReport.orders_by_status.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`badge badge-${
                            item.status === 'delivered' ? 'success' :
                            item.status === 'cancelled' ? 'danger' :
                            item.status === 'shipped' ? 'info' : 'warning'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="font-semibold">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">No data available</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'salary' && salaryReport) {
      return (
        <div>
          {/* Year Filter */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Filter by Year</h3>
            </div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group">
                <input
                  type="number"
                  className="form-input"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  min="2020" max="2030"
                  style={{ width: '150px' }}
                />
              </div>
              <button type="submit" className="btn btn-primary">Apply</button>
            </form>
          </div>

          {/* Monthly Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Monthly Summary - {salaryReport.year}</h3>
            </div>
            <div className="table-container">
              {salaryReport.monthly_summary?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Pending Count</th>
                      <th>Pending Amount</th>
                      <th>Paid Count</th>
                      <th>Paid Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryReport.monthly_summary.map((item, idx) => (
                      <tr key={idx}>
                        <td className="font-medium">{item.month}</td>
                        <td>{item.pending_count}</td>
                        <td className="text-warning">₹{item.pending_amount?.toLocaleString()}</td>
                        <td>{item.paid_count}</td>
                        <td className="text-success">₹{item.paid_amount?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">No data available for {salaryReport.year}</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'liability' && liabilityReport) {
      return (
        <div>
          {/* Total Liability */}
          <div className="stats-grid">
            <div className="stat-card danger">
              <div className="stat-icon">⚠️</div>
              <div className="stat-label">Total Active Liability</div>
              <div className="stat-value">₹{liabilityReport.total_active_liability?.toLocaleString() || 0}</div>
              <p className="stat-description">
                Maximum amount if all active cycles complete
              </p>
            </div>
          </div>

          {/* Liability by Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Liability by Status</h3>
            </div>
            <div className="table-container">
              {liabilityReport.liability_by_status?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Cycle Count</th>
                      <th>Months Paid</th>
                      <th>Remaining Months</th>
                      <th>Remaining Liability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liabilityReport.liability_by_status.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`badge badge-${
                            item.status === 'active' ? 'success' :
                            item.status === 'paused' ? 'warning' : 'info'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{item.cycle_count}</td>
                        <td>{item.total_months_paid}</td>
                        <td>{item.remaining_months}</td>
                        <td className="font-semibold text-primary">₹{item.remaining_liability?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">No liability data available</p>
              )}
            </div>

            {/* Calculation Info */}
            <div className="info-box warning">
              <h4>Liability Calculation</h4>
              <ul>
                <li><strong>Per Referral Payout:</strong> ₹100 × 12 months = ₹1,200 maximum</li>
                <li><strong>Gross Margin:</strong> ₹2,100 (product price) - ₹1,200 (max payout) = ₹900 per package</li>
                <li><strong>Break-even:</strong> System remains profitable as long as payout is within limits</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'referrals' && referralReport) {
      return (
        <div>
          {/* Date Filter */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Filter by Registration Date</h3>
            </div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.ref_start_date}
                  onChange={(e) => setFilters({ ...filters, ref_start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={filters.ref_end_date}
                  onChange={(e) => setFilters({ ...filters, ref_end_date: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">Apply Filter</button>
              <button type="button" className="btn btn-ghost" onClick={() => {
                setFilters({ ...filters, ref_start_date: '', ref_end_date: '' });
                setTimeout(fetchReports, 100);
              }}>Clear</button>
            </form>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card info">
              <div className="stat-icon">👥</div>
              <div className="stat-label">Total Users with Referrals</div>
              <div className="stat-value">{referralReport.total || 0}</div>
            </div>
          </div>

          {/* Referral Report */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">User Referral Statistics</h3>
            </div>
            <div className="table-container">
              {referralReport.users?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>User ID</th>
                      <th>Total Referrals</th>
                      <th>Active Referrals</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralReport.users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <span className="user-name">{user.name}</span>
                            <span className="user-email">{user.email}</span>
                          </div>
                        </td>
                        <td className="font-mono">{user.referral_code}</td>
                        <td className="font-semibold">{user.total_referrals}</td>
                        <td>
                          <span className={`badge ${user.active_referrals > 0 ? 'badge-success' : 'badge-neutral'}`}>
                            {user.active_referrals}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${user.has_active_package ? 'badge-success' : 'badge-warning'}`}>
                            {user.has_active_package ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-muted datetime-cell">{formatDateTime(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">No users with referrals found</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'wallet' && walletReport) {
      return (
        <div>
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card success">
              <div className="stat-icon">💰</div>
              <div className="stat-label">Total Deposits</div>
              <div className="stat-value">₹{walletReport.summary?.total_deposits?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon">🛒</div>
              <div className="stat-label">Total Purchases</div>
              <div className="stat-value">₹{walletReport.summary?.total_purchases?.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Filter Transactions</h3>
            </div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <option value="">All Types</option>
                  <option value="deposit">Deposit</option>
                  <option value="purchase">Purchase</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Apply Filter</button>
              <button type="button" className="btn btn-ghost" onClick={() => {
                setFilters({ ...filters, type: '', status: '' });
                setTimeout(fetchReports, 100);
              }}>Clear</button>
            </form>
          </div>

          {/* Transactions Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Wallet Transactions ({walletReport.total || 0})</h3>
            </div>
            <div className="table-container">
              {walletReport.transactions?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Payment ID</th>
                      <th>Status</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletReport.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="datetime-cell">{formatDateTime(tx.created_at)}</td>
                        <td>
                          <div className="user-cell" style={{color: '#000'}}>
                            <span className="user-name" style={{color: '#000'}}>{tx.name}</span>
                            <span className="user-email">{tx.email}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${tx.type === 'deposit' ? 'badge-success' : 'badge-warning'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className={`font-semibold ${tx.type === 'deposit' ? 'text-success' : 'text-danger'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}₹{parseFloat(tx.amount).toLocaleString()}
                        </td>
                        <td style={{color: '#000'}}>{tx.payment_id || '-'}</td>
                        <td>
                          <span className={`badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="text-muted">{tx.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">No transactions found</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'userFinancial' && userFinancialReport) {
      return (
        <div>
          {/* Grand Totals */}
          <div className="stats-grid">
            <div className="stat-card info">
              <div className="stat-icon">💳</div>
              <div className="stat-label">Total Wallet Balance</div>
              <div className="stat-value">₹{userFinancialReport.grand_totals?.total_wallet_balance?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-label">Total Earned</div>
              <div className="stat-value">₹{userFinancialReport.grand_totals?.total_earned?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon">⏳</div>
              <div className="stat-label">Total Pending</div>
              <div className="stat-value">₹{userFinancialReport.grand_totals?.total_pending?.toLocaleString() || 0}</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon">📊</div>
              <div className="stat-label">Total Liability</div>
              <div className="stat-value">₹{userFinancialReport.grand_totals?.total_liability?.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Search Filter */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Search Users</h3>
            </div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group" style={{ flex: 1 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by name, email, mobile, or User ID..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary">Search</button>
              <button type="button" className="btn btn-ghost" onClick={() => {
                setFilters({ ...filters, search: '' });
                setTimeout(fetchReports, 100);
              }}>Clear</button>
            </form>
          </div>

          {/* User Financial Report Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">User Financial Summary ({userFinancialReport.total || 0} users)</h3>
            </div>
            <div className="table-container">
              {userFinancialReport.users?.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>User ID</th>
                      <th>Wallet Balance</th>
                      <th>Total Earned</th>
                      <th>Pending Income</th>
                      <th>Liability</th>
                      <th>Directs</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userFinancialReport.users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <span className="user-name">{user.name}</span>
                            <span className="user-email">{user.email}</span>
                          </div>
                        </td>
                        <td className="font-mono">{user.referral_code}</td>
                        <td className="font-semibold">₹{user.wallet_balance?.toLocaleString()}</td>
                        <td className="text-success">₹{user.total_earned?.toLocaleString()}</td>
                        <td className="text-warning">₹{user.pending_income?.toLocaleString()}</td>
                        <td className="text-danger">₹{user.liability?.toLocaleString()}</td>
                        <td>
                          <span className="badge badge-info">{user.direct_count}</span>
                          <small className="text-muted"> ({user.active_directs} active)</small>
                        </td>
                        <td>
                          <span className={`badge ${user.has_active_package ? 'badge-success' : 'badge-warning'}`}>
                            {user.has_active_package ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted">No users found</p>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <AdminLayout>
      <div className="admin-reports-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">Analytics and financial insights</p>
          </div>
          <div className="page-header-actions">
            <ExportButton
              data={getExportData()}
              columns={getExportColumns()}
              filename={`${activeTab}-report`}
              label="Export CSV"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            📊 Sales
          </button>
          <button
            className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            💰 Incentive
          </button>
          <button
            className={`tab-btn ${activeTab === 'liability' ? 'active' : ''}`}
            onClick={() => setActiveTab('liability')}
          >
            ⚠️ Liability
          </button>
          <button
            className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            👥 Referrals
          </button>
          <button
            className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            💳 Wallet
          </button>
          <button
            className={`tab-btn ${activeTab === 'userFinancial' ? 'active' : ''}`}
            onClick={() => setActiveTab('userFinancial')}
          >
            📈 User Financial
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </div>

      <style>{`
        .admin-reports-page {
          max-width: 1200px;
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
          min-width: 100px;
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
          gap: 1rem;
          flex-wrap: wrap;
          align-items: flex-end;
        }

        .stat-description {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.5rem;
        }

        .info-box {
          margin-top: 1.5rem;
          padding: 1rem;
          border-radius: var(--radius-lg);
        }

        .info-box.warning {
          background: #fef3c7;
          border: 1px solid #fde68a;
        }

        .info-box h4 {
          color: #92400e;
          margin-bottom: 0.5rem;
        }

        .info-box ul {
          color: #92400e;
          font-size: 0.875rem;
          line-height: 1.8;
          margin: 0;
          padding-left: 1.25rem;
        }

        .user-cell {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-weight: 500;
          color: #1f2937;
        }

        .user-email {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .font-mono {
          font-family: monospace;
        }

        .datetime-cell {
          font-size: 0.8125rem;
          white-space: nowrap;
        }

        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .text-muted { color: #6b7280; }
        .text-primary { color: #4f46e5; }
        .text-success { color: #10b981; }
        .text-warning { color: #F59E0B; }
        .text-danger { color: #EF4444; }

        .badge-neutral {
          background: var(--gray-200);
          color: var(--gray-600);
        }

        @media (max-width: 768px) {
          .tab-nav {
            flex-direction: column;
          }

          .filter-form {
            flex-direction: column;
          }

          .filter-form .form-group {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminReports;