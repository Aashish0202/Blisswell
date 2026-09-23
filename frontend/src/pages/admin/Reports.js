import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import Pagination from '../../components/Pagination';
import ExportMenu from '../../components/ExportMenu';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { REPORT_TABS, slugToKey } from './reportTypes';
import { rankBadgeClass, getRankClass } from '../../utils/rankTheme';

const AdminReports = () => {
  const { reportType } = useParams();
  // Active report now comes from the sidebar dropdown route (/admin/reports/<slug>)
  const activeTab = slugToKey(reportType) || 'sales';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    ref_start_date: '',
    ref_end_date: '',
    search: '',
    type: '',
    status: '',
    user_search: '',
    user_active: false
  });
  // User Detail report — selected user + their full report data
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setPage(1);
    setSelectedUserId(null);
    setUserDetail(null);
    fetchReports(1);
    // eslint-disable-next-line
  }, [activeTab]);

  const fetchReports = async (pageNum = page) => {
    setLoading(true);
    try {
      let response;
      if (activeTab === 'sales') {
        response = await adminAPI.getSalesReport(filters.start_date, filters.end_date);
      } else if (activeTab === 'teamIncome') {
        response = await adminAPI.getTeamIncomeReport(pageNum, {});
      } else if (activeTab === 'withdrawals') {
        response = await adminAPI.getWithdrawalReport(pageNum, filters.status ? { status: filters.status } : {});
      } else if (activeTab === 'userEarnings') {
        response = await adminAPI.getUserEarningsReport(pageNum, {});
      } else if (activeTab === 'referrals') {
        response = await adminAPI.getReferralReport(pageNum, {
          start_date: filters.ref_start_date,
          end_date: filters.ref_end_date
        });
      } else if (activeTab === 'wallet') {
        response = await adminAPI.getWalletReport(pageNum, { type: filters.type, status: filters.status });
      } else if (activeTab === 'userFinancial') {
        response = await adminAPI.getUserFinancialReport(pageNum, { search: filters.search });
      } else if (activeTab === 'ranks') {
        response = await adminAPI.getRankReport(pageNum, {});
      } else if (activeTab === 'userDetail') {
        response = await adminAPI.getUserReportList(pageNum, {
          search: filters.user_search,
          active_only: filters.user_active ? '1' : ''
        });
      }
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  // Load the complete single-user report (full history, no pagination)
  const openUserDetail = async (userId) => {
    setDetailLoading(true);
    try {
      const res = await adminAPI.getUserDetailReport(userId);
      setUserDetail(res.data);
      setSelectedUserId(userId);
    } catch (error) {
      toast.error('Failed to load user report');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReports(1);
  };

  // Loop every page of a paginated report endpoint and accumulate rows so
  // exports always contain the full dataset, not just the visible page.
  const fetchAllRows = async (fetchFn, rowKey) => {
    const all = [];
    let p = 1;
    while (true) {
      const res = await fetchFn(p);
      const d = res.data;
      const rows = d[rowKey] || [];
      all.push(...rows);
      const pages = d.pages || d.totalPages || 1;
      if (p >= pages || rows.length === 0) break;
      p++;
    }
    return all;
  };

  const getExportColumns = () => {
    if (activeTab === 'sales') {
      return [{ key: 'status', label: 'Status' }, { key: 'count', label: 'Count' }];
    }
    if (activeTab === 'teamIncome') {
      return [
        { key: 'created_at', label: 'Date' },
        { key: 'purchaser_name', label: 'Purchaser' },
        { key: 'upline_name', label: 'Upline' },
        { key: 'upline_code', label: 'Upline ID' },
        { key: 'source', label: 'Source' },
        { key: 'product_rank', label: 'Rank' },
        { key: 'level', label: 'Level' },
        { key: 'amount', label: 'Amount' }
      ];
    }
    if (activeTab === 'withdrawals') {
      return [
        { key: 'created_at', label: 'Requested' },
        { key: 'name', label: 'User' },
        { key: 'email', label: 'Email' },
        { key: 'amount', label: 'Amount' },
        { key: 'admin_charge', label: 'Admin Charge' },
        { key: 'repurchase_amount', label: 'Repurchase' },
        { key: 'payout_amount', label: 'Payout' },
        { key: 'status', label: 'Status' },
        { key: 'processed_at', label: 'Processed' },
        { key: 'reject_reason', label: 'Reason' }
      ];
    }
    if (activeTab === 'userEarnings') {
      return [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'referral_code', label: 'User ID' },
        { key: 'rank_name', label: 'Rank' },
        { key: 'team_income_total', label: 'Level Income' },
        { key: 'repurchase_balance', label: 'Repurchase Balance' },
        { key: 'total_earnings', label: 'Total Earnings' },
        { key: 'available_for_withdrawal', label: 'Available' },
        { key: 'total_withdrawn', label: 'Withdrawn' },
        { key: 'pending_withdrawal', label: 'Pending' }
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
    if (activeTab === 'ranks') {
      return [
        { key: 'created_at', label: 'Date' },
        { key: 'user_name', label: 'User' },
        { key: 'user_code', label: 'User ID' },
        { key: 'rank_name', label: 'Upgraded To' },
        { key: 'amount', label: 'Amount Debited' },
        { key: 'source_withdrawal_id', label: 'Source Withdrawal ID' }
      ];
    }
    if (activeTab === 'userDetail') {
      // When a single user is open, the header export = their full ledger
      if (selectedUserId && userDetail) {
        return [
          { key: 'created_at', label: 'Date' },
          { key: 'type', label: 'Type' },
          { key: 'amount', label: 'Amount' },
          { key: 'level', label: 'Level' },
          { key: 'source_user_name', label: 'From User' },
          { key: 'order_number', label: 'Order No' },
          { key: 'status', label: 'Status' },
          { key: 'description', label: 'Description' }
        ];
      }
      return [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'referral_code', label: 'User ID' },
        { key: 'rank_name', label: 'Rank' },
        { key: 'active', label: 'Active Package' },
        { key: 'wallet_balance', label: 'Wallet Balance' },
        { key: 'earnings_balance', label: 'Earnings Balance' },
        { key: 'repurchase_balance', label: 'Repurchase Balance' },
        { key: 'total_deposits', label: 'Total Deposits' },
        { key: 'total_income', label: 'Total Income' },
        { key: 'total_purchases', label: 'Total Purchases' },
        { key: 'total_withdrawn', label: 'Total Withdrawn' },
        { key: 'pending_withdrawal', label: 'Pending Withdrawal' },
        { key: 'direct_count', label: 'Directs' },
        { key: 'created_at', label: 'Joined' }
      ];
    }
    return [];
  };

  const fetchAllForExport = async () => {
    let rows = [];
    if (activeTab === 'sales' && data) {
      rows = data.orders_by_status || [];
    } else if (activeTab === 'teamIncome') {
      rows = await fetchAllRows((p) => adminAPI.getTeamIncomeReport(p, {}), 'events');
    } else if (activeTab === 'withdrawals') {
      rows = await fetchAllRows(
        (p) => adminAPI.getWithdrawalReport(p, filters.status ? { status: filters.status } : {}),
        'withdrawals'
      );
    } else if (activeTab === 'userEarnings') {
      rows = await fetchAllRows((p) => adminAPI.getUserEarningsReport(p, {}), 'users');
    } else if (activeTab === 'referrals') {
      rows = await fetchAllRows(
        (p) => adminAPI.getReferralReport(p, { start_date: filters.ref_start_date, end_date: filters.ref_end_date }),
        'users'
      );
    } else if (activeTab === 'wallet') {
      rows = await fetchAllRows(
        (p) => adminAPI.getWalletReport(p, { type: filters.type, status: filters.status }),
        'transactions'
      );
    } else if (activeTab === 'userFinancial') {
      rows = await fetchAllRows(
        (p) => adminAPI.getUserFinancialReport(p, { search: filters.search }),
        'users'
      );
    } else if (activeTab === 'ranks') {
      rows = await fetchAllRows((p) => adminAPI.getRankReport(p, {}), 'upgrades');
    } else if (activeTab === 'userDetail') {
      // Detail open → export the selected user's complete ledger
      if (selectedUserId && userDetail) {
        rows = userDetail.transactions;
      } else {
        rows = await fetchAllRows(
          (p) => adminAPI.getUserReportList(p, {
            search: filters.user_search,
            active_only: filters.user_active ? '1' : ''
          }),
          'users'
        );
      }
    }
    if (rows.length === 0) toast.info('No data to export');
    return rows;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const totalPages = () => (data ? (data.pages || data.totalPages || 1) : 1);

  // Type → display label for wallet ledger rows
  const TX_TYPE_LABELS = {
    deposit: 'Deposit', purchase: 'Purchase', refund: 'Refund', bonus: 'Bonus',
    incentive: 'Incentive', self_cashback: 'Self Cashback', team_income: 'Team Income',
    withdrawal: 'Withdrawal', withdrawal_reversal: 'Withdrawal Reversal'
  };
  const txTypeClass = (t) =>
    t === 'deposit' || t === 'team_income' || t === 'self_cashback' || t === 'bonus' || t === 'incentive' || t === 'refund' || t === 'withdrawal_reversal'
      ? 'badge-success'
      : t === 'withdrawal' || t === 'purchase'
        ? 'badge-danger'
        : 'badge-warning';

  // ------- User Detail: list of users -------
  const renderUserList = () => {
    const totals = data.totals || {};
    return (
      <div>
        <div className="stats-grid">
          <div className="stat-card info"><div className="stat-icon">👥</div><div className="stat-label">Users</div><div className="stat-value">{data.total || 0}</div></div>
          <div className="stat-card"><div className="stat-icon">💳</div><div className="stat-label">Wallet Balance (total)</div><div className="stat-value">{fmt(totals.wallet_balance)}</div></div>
          <div className="stat-card success"><div className="stat-icon">💰</div><div className="stat-label">Deposits (total)</div><div className="stat-value">{fmt(totals.deposits)}</div></div>
          <div className="stat-card success"><div className="stat-icon">📈</div><div className="stat-label">Income Paid (total)</div><div className="stat-value">{fmt(totals.income)}</div></div>
          <div className="stat-card"><div className="stat-icon">🛒</div><div className="stat-label">Purchases (total)</div><div className="stat-value">{fmt(totals.purchases)}</div></div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Search Users</h3></div>
          <form onSubmit={handleFilter} className="filter-form">
            <div className="form-group" style={{ flex: 1 }}>
              <input type="text" className="form-input" placeholder="Search by name, email, mobile, or User ID..." value={filters.user_search} onChange={(e) => setFilters({ ...filters, user_search: e.target.value })} />
            </div>
            <label className="user-detail-checkbox">
              <input type="checkbox" checked={filters.user_active} onChange={(e) => setFilters({ ...filters, user_active: e.target.checked })} />
              Active package only
            </label>
            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setFilters({ ...filters, user_search: '', user_active: false }); setPage(1); setTimeout(() => fetchReports(1), 100); }}>Clear</button>
          </form>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Users ({data.total || 0}) — click View Report for full history</h3>
          </div>
          <div className="table-container">
            {data.users?.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th><th>User ID</th><th>Rank</th><th>Status</th><th>Wallet</th>
                    <th>Deposits</th><th>Income</th><th>Purchases</th><th>Withdrawn</th><th>Directs</th><th>Joined</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td><div className="user-cell"><span className="user-name">{u.name}</span><span className="user-email">{u.email}</span></div></td>
                      <td className="font-mono">{u.referral_code}</td>
                      <td>{u.rank_name ? <span className={rankBadgeClass(u.rank_name)}>{u.rank_name}</span> : <span className="text-muted">—</span>}</td>
                      <td><span className={`badge ${u.has_active_package ? 'badge-success' : 'badge-warning'}`}>{u.has_active_package ? 'Active' : 'Inactive'}</span></td>
                      <td className="font-semibold">{fmt(u.wallet_balance)}</td>
                      <td>{fmt(u.total_deposits)}</td>
                      <td className="text-success">{fmt(u.total_income)}</td>
                      <td>{fmt(u.total_purchases)}</td>
                      <td className="text-muted">{fmt(u.total_withdrawn)}</td>
                      <td><span className="badge badge-info">{u.direct_count}</span><small className="text-muted"> ({u.active_directs} active)</small></td>
                      <td className="text-muted datetime-cell">{formatDateTime(u.created_at)}</td>
                      <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => openUserDetail(u.id)}>View Report</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-muted">No users found</p>}
          </div>
          <Pagination page={page} totalPages={totalPages()} total={data.total || 0} onChange={(p) => { setPage(p); fetchReports(p); }} />
        </div>
      </div>
    );
  };

  // Small section-level export button (reuses exportUtils directly)
  const SectionExport = ({ rows, columns, filename, title }) => (
    <ExportMenu
      fetchAll={async () => rows}
      columns={columns}
      filename={filename}
      title={title}
      disabled={!rows || rows.length === 0}
    />
  );

  // ------- User Detail: complete single-user report -------
  const renderUserDetail = () => {
    if (!userDetail) return <p className="text-muted">No data</p>;
    const { profile, summary, transactions, orders, income_events, withdrawals, downline, level_counts } = userDetail;
    const ledgerColumns = [
      { key: 'created_at', label: 'Date' }, { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount' }, { key: 'level', label: 'Level' },
      { key: 'source_user_name', label: 'From User' }, { key: 'order_number', label: 'Order No' },
      { key: 'status', label: 'Status' }, { key: 'description', label: 'Description' }
    ];
    const orderColumns = [
      { key: 'created_at', label: 'Date' }, { key: 'order_number', label: 'Order No' },
      { key: 'product_name', label: 'Product' }, { key: 'rank_name', label: 'Rank' },
      { key: 'amount', label: 'Amount' }, { key: 'order_source', label: 'Source' }, { key: 'status', label: 'Status' }
    ];
    const incomeColumns = [
      { key: 'created_at', label: 'Date' }, { key: 'purchaser_name', label: 'Purchaser' },
      { key: 'purchaser_code', label: 'Purchaser ID' }, { key: 'level', label: 'Level' },
      { key: 'order_source', label: 'Source' }, { key: 'amount', label: 'Amount' }
    ];
    const withdrawalColumns = [
      { key: 'created_at', label: 'Requested' }, { key: 'amount', label: 'Amount' },
      { key: 'admin_charge', label: 'Admin Charge' }, { key: 'repurchase_amount', label: 'Repurchase' },
      { key: 'payout_amount', label: 'Payout' }, { key: 'status', label: 'Status' }, { key: 'processed_at', label: 'Processed' }
    ];
    const teamColumns = [
      { key: 'level', label: 'Level' }, { key: 'name', label: 'Name' }, { key: 'referral_code', label: 'User ID' },
      { key: 'email', label: 'Email' }, { key: 'active', label: 'Active Package' }, { key: 'rank_name', label: 'Rank' }, { key: 'created_at', label: 'Joined' }
    ];

    return (
      <div>
        <div className="detail-toolbar">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelectedUserId(null); setUserDetail(null); }}>← Back to User List</button>
        </div>

        {/* Profile */}
        <div className="card profile-card">
          <div className="profile-main">
            <div>
              <h3 className="profile-name">{profile.name}</h3>
              <div className="profile-meta">
                <span className="font-mono">{profile.referral_code}</span>
                <span>· {profile.email}</span>
                <span>· {profile.mobile || '-'}</span>
              </div>
              <div className="profile-meta">
                <span>Sponsor: <strong>{profile.sponsor_name || '—'}</strong> {profile.sponsor_code ? <span className="font-mono">({profile.sponsor_code})</span> : null}</span>
                <span>· Joined {formatDateTime(profile.created_at)}</span>
              </div>
            </div>
            <div className="profile-badges">
              {profile.rank_name ? <span className={rankBadgeClass(profile.rank_name)}>🏆 {profile.rank_name}</span> : null}
              <span className={`badge ${profile.has_active_package ? 'badge-success' : 'badge-warning'}`}>{profile.has_active_package ? 'Active Package' : 'No Package'}</span>
              <span className={`badge ${profile.is_active ? 'badge-success' : 'badge-danger'}`}>{profile.is_active ? 'Account Active' : 'Blocked'}</span>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="stats-grid">
          <div className="stat-card info"><div className="stat-icon">💳</div><div className="stat-label">Wallet Balance</div><div className="stat-value">{fmt(profile.wallet_balance)}</div><div className="stat-subtext">Earnings {fmt(profile.earnings_balance)} · Repurchase {fmt(profile.repurchase_balance)}</div></div>
          <div className="stat-card success"><div className="stat-icon">💰</div><div className="stat-label">Total Deposits</div><div className="stat-value">{fmt(summary.total_deposits)}</div></div>
          <div className="stat-card success"><div className="stat-icon">📈</div><div className="stat-label">Total Income Earned</div><div className="stat-value">{fmt(summary.total_income)}</div><div className="stat-subtext">Team {fmt(summary.team_income_total)} · Cashback {fmt(summary.cashback_total)}</div></div>
          <div className="stat-card"><div className="stat-icon">🛒</div><div className="stat-label">Total Purchases</div><div className="stat-value">{fmt(summary.total_purchases)}</div><div className="stat-subtext">{summary.order_count} orders</div></div>
          <div className="stat-card warning"><div className="stat-icon">🏧</div><div className="stat-label">Withdrawn</div><div className="stat-value">{fmt(summary.total_withdrawn)}</div><div className="stat-subtext">Pending {fmt(summary.pending_withdrawal)}</div></div>
          <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-label">Team Size</div><div className="stat-value">{downline.length}</div><div className="stat-subtext">{summary.direct_count} directs ({summary.active_directs} active)</div></div>
        </div>

        {/* Level-wise team */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Team — Level-wise ({downline.length} users)</h3>
            <SectionExport rows={downline.map(d => ({ ...d, active: d.has_active_package ? 'Yes' : 'No' }))} columns={teamColumns} filename={`team-${profile.referral_code}`} title="Team Level-wise" />
          </div>
          <div className="level-strip">
            {level_counts.map((l) => (
              <div className="level-chip" key={l.level}>
                <span className="level-label">Level {l.level}</span>
                <span className="level-count">{l.total}</span>
                <span className="level-active">{l.active} active</span>
              </div>
            ))}
            {level_counts.length === 0 && <span className="text-muted">No downline yet</span>}
          </div>
          <div className="table-container">
            {downline.length > 0 ? (
              <table className="table">
                <thead><tr><th>Level</th><th>Name</th><th>User ID</th><th>Email</th><th>Status</th><th>Rank</th><th>Joined</th></tr></thead>
                <tbody>
                  {downline.map((d) => (
                    <tr key={`${d.level}-${d.id}`}>
                      <td><span className="badge badge-info">L{d.level}</span></td>
                      <td className="font-medium">{d.name}</td>
                      <td className="font-mono">{d.referral_code}</td>
                      <td className="text-muted">{d.email}</td>
                      <td><span className={`badge ${d.has_active_package ? 'badge-success' : 'badge-warning'}`}>{d.has_active_package ? 'Active' : 'Inactive'}</span></td>
                      <td>{d.rank_name ? <span className={rankBadgeClass(d.rank_name)}>{d.rank_name}</span> : <span className="text-muted">—</span>}</td>
                      <td className="text-muted datetime-cell">{formatDateTime(d.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-muted">No downline users</p>}
          </div>
        </div>

        {/* Complete transaction ledger */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Complete Transaction Ledger ({transactions.length})</h3>
            <SectionExport rows={transactions} columns={ledgerColumns} filename={`transactions-${profile.referral_code}`} title="Complete Transaction Ledger" />
          </div>
          <div className="table-container">
            {transactions.length > 0 ? (
              <table className="table">
                <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Level</th><th>From User</th><th>Order No</th><th>Status</th><th>Description</th></tr></thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-muted datetime-cell">{formatDateTime(tx.created_at)}</td>
                      <td><span className={`badge ${txTypeClass(tx.type)}`}>{TX_TYPE_LABELS[tx.type] || tx.type}</span></td>
                      <td className={`font-semibold ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>{tx.amount >= 0 ? '+' : ''}{fmt(tx.amount)}</td>
                      <td>{tx.level ? <span className="badge badge-info">L{tx.level}</span> : '-'}</td>
                      <td>{tx.source_user_name || '-'}</td>
                      <td className="font-mono">{tx.order_number || '-'}</td>
                      <td><span className={`badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{tx.status}</span></td>
                      <td className="text-muted text-sm">{tx.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-muted">No transactions</p>}
          </div>
        </div>

        {/* Orders / purchases */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Purchases & Orders ({orders.length})</h3>
            <SectionExport rows={orders} columns={orderColumns} filename={`orders-${profile.referral_code}`} title="Purchases & Orders" />
          </div>
          <div className="table-container">
            {orders.length > 0 ? (
              <table className="table">
                <thead><tr><th>Date</th><th>Order No</th><th>Product</th><th>Rank</th><th>Amount</th><th>Source</th><th>Status</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="text-muted datetime-cell">{formatDateTime(o.created_at)}</td>
                      <td className="font-mono">{o.order_number}</td>
                      <td className="font-medium">{o.product_name || '-'}</td>
                      <td>{o.rank_name ? <span className={rankBadgeClass(o.rank_name)}>{o.rank_name}</span> : <span className="text-muted">—</span>}</td>
                      <td className="font-semibold">{fmt(o.amount)}</td>
                      <td>{o.order_source === 'auto_repurchase'
                        ? <span className="rank-badge rank-badge-repurchase">🔄 Repurchase</span>
                        : <span className="rank-badge">🛒 Purchase</span>}</td>
                      <td><span className={`badge badge-${o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'danger' : o.status === 'shipped' ? 'info' : 'warning'}`}>{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-muted">No orders</p>}
          </div>
        </div>

        {/* Team income received */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Team Income Received ({income_events.length})</h3>
            <SectionExport rows={income_events} columns={incomeColumns} filename={`team-income-${profile.referral_code}`} title="Team Income Received" />
          </div>
          <div className="table-container">
            {income_events.length > 0 ? (
              <table className="table">
                <thead><tr><th>Date</th><th>Purchaser</th><th>Purchaser ID</th><th>Level</th><th>Source</th><th>Amount</th></tr></thead>
                <tbody>
                  {income_events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="text-muted datetime-cell">{formatDateTime(ev.created_at)}</td>
                      <td className="font-medium">{ev.purchaser_name}</td>
                      <td className="font-mono">{ev.purchaser_code}</td>
                      <td><span className="badge badge-info">L{ev.level}</span></td>
                      <td>{ev.order_source === 'auto_repurchase'
                        ? <span className="rank-badge rank-badge-repurchase">🔄 Repurchase</span>
                        : <span className="rank-badge">🛒 Purchase</span>}</td>
                      <td className="text-success font-semibold">{fmt(ev.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-muted">No team income received</p>}
          </div>
        </div>

        {/* Withdrawals */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Withdrawals ({withdrawals.length})</h3>
            <SectionExport rows={withdrawals} columns={withdrawalColumns} filename={`withdrawals-${profile.referral_code}`} title="Withdrawals" />
          </div>
          <div className="table-container">
            {withdrawals.length > 0 ? (
              <table className="table">
                <thead><tr><th>Requested</th><th>Amount</th><th>Admin Charge</th><th>Repurchase</th><th>Payout</th><th>Status</th><th>Processed</th></tr></thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="text-muted datetime-cell">{formatDateTime(w.created_at)}</td>
                      <td className="text-primary font-semibold">{fmt(w.amount)}</td>
                      <td>{w.status === 'processed' ? fmt(w.admin_charge) : '—'}</td>
                      <td>{w.status === 'processed' ? fmt(w.repurchase_amount) : '—'}</td>
                      <td className="text-success font-semibold">{w.status === 'processed' ? fmt(w.payout_amount) : '—'}</td>
                      <td><span className={`badge badge-${w.status === 'processed' ? 'success' : w.status === 'pending' ? 'warning' : w.status === 'rejected' ? 'danger' : 'neutral'}`}>{w.status}</span></td>
                      <td className="text-muted datetime-cell">{formatDateTime(w.processed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-muted">No withdrawals</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <LoadingSkeleton variant="card" />;
    if (!data) return null;

    if (activeTab === 'userDetail') {
      if (selectedUserId) {
        if (detailLoading) return <LoadingSkeleton variant="card" />;
        return renderUserDetail();
      }
      return renderUserList();
    }

    if (activeTab === 'sales') {
      return (
        <div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Filter by Date</h3></div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary">Apply Filter</button>
            </form>
          </div>

          <div className="stats-grid">
            <div className="stat-card success">
              <div className="stat-icon">💰</div>
              <div className="stat-label">Total Sales</div>
              <div className="stat-value">{fmt(data.total_sales)}</div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon">📦</div>
              <div className="stat-label">Total Orders</div>
              <div className="stat-value">{data.order_count || 0}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Orders by Status</h3></div>
            <div className="table-container">
              {data.orders_by_status?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>Status</th><th>Count</th></tr></thead>
                  <tbody>
                    {data.orders_by_status.map((item, idx) => (
                      <tr key={idx}>
                        <td><span className={`badge badge-${item.status === 'delivered' ? 'success' : item.status === 'cancelled' ? 'danger' : item.status === 'shipped' ? 'info' : 'warning'}`}>{item.status}</span></td>
                        <td className="font-semibold">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">No data available</p>}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'teamIncome') {
      return (
        <div>
          <div className="stats-grid">
            <div className="stat-card success">
              <div className="stat-icon">👥</div>
              <div className="stat-label">Total Income Paid</div>
              <div className="stat-value">{fmt(data.totals?.total_amount)}</div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon">🛒</div>
              <div className="stat-label">From Purchases</div>
              <div className="stat-value">{fmt(data.totals?.purchase_total)}</div>
            </div>
            <div className="stat-card info">
              <div className="stat-icon">🔄</div>
              <div className="stat-label">From Repurchases</div>
              <div className="stat-value">{fmt(data.totals?.repurchase_total)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔁</div>
              <div className="stat-label">Total Events</div>
              <div className="stat-value">{data.total || 0}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Team Income Distributions ({data.total || 0})</h3></div>
            <div className="table-container">
              {data.events?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>Date</th><th>Purchaser</th><th>Upline</th><th>Source</th><th>Rank</th><th>Level</th><th>Amount</th></tr></thead>
                  <tbody>
                    {data.events.map((ev) => (
                      <tr key={ev.id}>
                        <td className="text-muted datetime-cell">{formatDateTime(ev.created_at)}</td>
                        <td className="font-medium">{ev.purchaser_name}</td>
                        <td><div className="user-cell"><span className="user-name">{ev.upline_name}</span><span className="user-email font-mono">{ev.upline_code}</span></div></td>
                        <td>{ev.order_source === 'auto_repurchase'
                          ? <span className="rank-badge rank-badge-repurchase">🔄 Repurchase</span>
                          : <span className="rank-badge">🛒 Purchase</span>}</td>
                        <td>{ev.product_rank ? <span className={rankBadgeClass(ev.product_rank)}>{ev.product_rank}</span> : <span className="text-muted">—</span>}</td>
                        <td><span className="badge badge-info">L{ev.level}</span></td>
                        <td className="text-success font-semibold">{fmt(ev.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">No team income events yet</p>}
            </div>
            <Pagination page={page} totalPages={totalPages()} total={data.total || 0} onChange={(p) => { setPage(p); fetchReports(p); }} />
          </div>
        </div>
      );
    }

    if (activeTab === 'withdrawals') {
      const byStatus = data.by_status || [];
      const lookup = (s) => byStatus.find((r) => r.status === s) || { count: 0, amount: 0 };
      return (
        <div>
          <div className="stats-grid">
            <div className="stat-card warning"><div className="stat-icon">⏳</div><div className="stat-label">Pending</div><div className="stat-value">{lookup('pending').count}</div><div className="stat-subtext">{fmt(lookup('pending').amount)}</div></div>
            <div className="stat-card success"><div className="stat-icon">✓</div><div className="stat-label">Processed</div><div className="stat-value">{lookup('processed').count}</div><div className="stat-subtext">{fmt(lookup('processed').amount)}</div></div>
            <div className="stat-card danger"><div className="stat-icon">✕</div><div className="stat-label">Rejected</div><div className="stat-value">{lookup('rejected').count}</div><div className="stat-subtext">{fmt(lookup('rejected').amount)}</div></div>
            <div className="stat-card info"><div className="stat-icon">↩</div><div className="stat-label">Reversed</div><div className="stat-value">{lookup('reversed').count}</div><div className="stat-subtext">{fmt(lookup('reversed').amount)}</div></div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Withdrawal Requests ({data.total || 0})</h3></div>
            <div className="filter-form">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ width: '180px' }}>
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                  <option value="rejected">Rejected</option>
                  <option value="reversed">Reversed</option>
                </select>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => { setPage(1); fetchReports(1); }}>Apply</button>
            </div>
            <div className="table-container">
              {data.withdrawals?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>User</th><th>Amount</th><th>Admin Charge</th><th>Repurchase</th><th>Payout</th><th>Status</th><th>Requested</th><th>Processed</th><th>Reason</th></tr></thead>
                  <tbody>
                    {data.withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td><div className="user-cell"><span className="user-name">{w.name}</span><span className="user-email">{w.email}</span></div></td>
                        <td className="text-primary font-semibold">{fmt(w.amount)}</td>
                        <td>{w.status === 'processed' ? fmt(w.admin_charge) : '—'}</td>
                        <td>{w.status === 'processed' ? fmt(w.repurchase_amount) : '—'}</td>
                        <td className="text-success font-semibold">{w.status === 'processed' ? fmt(w.payout_amount) : '—'}</td>
                        <td><span className={`badge badge-${w.status === 'processed' ? 'success' : w.status === 'pending' ? 'warning' : w.status === 'rejected' ? 'danger' : 'neutral'}`}>{w.status}</span></td>
                        <td className="text-muted datetime-cell">{formatDateTime(w.created_at)}</td>
                        <td className="text-muted datetime-cell">{formatDateTime(w.processed_at)}</td>
                        <td className="text-muted text-sm">{w.reject_reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">No withdrawal requests found</p>}
            </div>
            <Pagination page={page} totalPages={totalPages()} total={data.total || 0} onChange={(p) => { setPage(p); fetchReports(p); }} />
          </div>
        </div>
      );
    }

    if (activeTab === 'userEarnings') {
      return (
        <div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">User Earnings Breakdown ({data.total || 0})</h3></div>
            <div className="table-container">
              {data.users?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>User</th><th>User ID</th><th>Rank</th><th>Level Income</th><th>Repurchase Balance</th><th>Total Earnings</th><th>Available</th><th>Withdrawn</th><th>Pending</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id}>
                        <td><div className="user-cell"><span className="user-name">{u.name}</span><span className="user-email">{u.email}</span></div></td>
                        <td className="font-mono">{u.referral_code}</td>
                        <td>{u.rank_name ? <span className={rankBadgeClass(u.rank_name)}>{u.rank_name}</span> : <span className="text-muted">—</span>}</td>
                        <td>{fmt(u.team_income_total)}</td>
                        <td className="text-warning">{fmt(u.repurchase_balance)}</td>
                        <td className="text-success font-semibold">{fmt(u.total_earnings)}</td>
                        <td className="text-primary">{fmt(u.available_for_withdrawal)}</td>
                        <td className="text-muted">{fmt(u.total_withdrawn)}</td>
                        <td className="text-warning">{fmt(u.pending_withdrawal)}</td>
                        <td><span className={`badge ${u.has_active_package ? 'badge-success' : 'badge-warning'}`}>{u.has_active_package ? 'Active' : 'Inactive'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">No users found</p>}
            </div>
            <Pagination page={page} totalPages={totalPages()} total={data.total || 0} onChange={(p) => { setPage(p); fetchReports(p); }} />
          </div>
        </div>
      );
    }

    if (activeTab === 'referrals') {
      return (
        <div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Filter by Registration Date</h3></div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-input" value={filters.ref_start_date} onChange={(e) => setFilters({ ...filters, ref_start_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-input" value={filters.ref_end_date} onChange={(e) => setFilters({ ...filters, ref_end_date: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary">Apply Filter</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setFilters({ ...filters, ref_start_date: '', ref_end_date: '' }); setPage(1); setTimeout(() => fetchReports(1), 100); }}>Clear</button>
            </form>
          </div>
          <div className="stats-grid">
            <div className="stat-card info"><div className="stat-icon">👥</div><div className="stat-label">Total Users with Referrals</div><div className="stat-value">{data.total || 0}</div></div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">User Referral Statistics</h3></div>
            <div className="table-container">
              {data.users?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>User</th><th>User ID</th><th>Total Referrals</th><th>Active Referrals</th><th>Status</th><th>Joined</th></tr></thead>
                  <tbody>
                    {data.users.map((user) => (
                      <tr key={user.id}>
                        <td><div className="user-cell"><span className="user-name">{user.name}</span><span className="user-email">{user.email}</span></div></td>
                        <td className="font-mono">{user.referral_code}</td>
                        <td className="font-semibold">{user.total_referrals}</td>
                        <td><span className={`badge ${user.active_referrals > 0 ? 'badge-success' : 'badge-neutral'}`}>{user.active_referrals}</span></td>
                        <td><span className={`badge ${user.has_active_package ? 'badge-success' : 'badge-warning'}`}>{user.has_active_package ? 'Active' : 'Inactive'}</span></td>
                        <td className="text-muted datetime-cell">{formatDateTime(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">No users with referrals found</p>}
            </div>
            <Pagination page={page} totalPages={totalPages()} total={data.total || 0} onChange={(p) => { setPage(p); fetchReports(p); }} />
          </div>
        </div>
      );
    }

    if (activeTab === 'wallet') {
      return (
        <div>
          <div className="stats-grid">
            <div className="stat-card success"><div className="stat-icon">💰</div><div className="stat-label">Total Deposits</div><div className="stat-value">{fmt(data.summary?.total_deposits)}</div></div>
            <div className="stat-card danger"><div className="stat-icon">🛒</div><div className="stat-label">Total Purchases</div><div className="stat-value">{fmt(data.summary?.total_purchases)}</div></div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Filter Transactions</h3></div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">All Types</option><option value="deposit">Deposit</option><option value="purchase">Purchase</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                  <option value="">All Status</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Apply Filter</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setFilters({ ...filters, type: '', status: '' }); setPage(1); setTimeout(() => fetchReports(1), 100); }}>Clear</button>
            </form>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Wallet Transactions ({data.total || 0})</h3></div>
            <div className="table-container">
              {data.transactions?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>Date</th><th>User</th><th>Type</th><th>Amount</th><th>Payment ID</th><th>Status</th><th>Description</th></tr></thead>
                  <tbody>
                    {data.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="datetime-cell">{formatDateTime(tx.created_at)}</td>
                        <td><div className="user-cell" style={{ color: '#000' }}><span className="user-name" style={{ color: '#000' }}>{tx.name}</span><span className="user-email">{tx.email}</span></div></td>
                        <td><span className={`badge ${tx.type === 'deposit' ? 'badge-success' : 'badge-warning'}`}>{tx.type}</span></td>
                        <td className={`font-semibold ${tx.type === 'deposit' ? 'text-success' : 'text-danger'}`}>{tx.type === 'deposit' ? '+' : '-'}{fmt(tx.amount)}</td>
                        <td style={{ color: '#000' }} className="payment-id-cell">{tx.payment_id || '-'}</td>
                        <td><span className={`badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>{tx.status}</span></td>
                        <td className="text-muted">{tx.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">No transactions found</p>}
            </div>
            <Pagination page={page} totalPages={totalPages()} total={data.total || 0} onChange={(p) => { setPage(p); fetchReports(p); }} />
          </div>
        </div>
      );
    }

    if (activeTab === 'userFinancial') {
      return (
        <div>
          <div className="stats-grid">
            <div className="stat-card info"><div className="stat-icon">💳</div><div className="stat-label">Total Wallet Balance</div><div className="stat-value">{fmt(data.grand_totals?.total_wallet_balance)}</div></div>
            <div className="stat-card success"><div className="stat-icon">✅</div><div className="stat-label">Total Earned</div><div className="stat-value">{fmt(data.grand_totals?.total_earned)}</div></div>
            <div className="stat-card warning"><div className="stat-icon">⏳</div><div className="stat-label">Total Pending</div><div className="stat-value">{fmt(data.grand_totals?.total_pending)}</div></div>
            <div className="stat-card danger"><div className="stat-icon">📊</div><div className="stat-label">Total Liability</div><div className="stat-value">{fmt(data.grand_totals?.total_liability)}</div></div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">Search Users</h3></div>
            <form onSubmit={handleFilter} className="filter-form">
              <div className="form-group" style={{ flex: 1 }}>
                <input type="text" className="form-input" placeholder="Search by name, email, mobile, or User ID..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary">Search</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setFilters({ ...filters, search: '' }); setPage(1); setTimeout(() => fetchReports(1), 100); }}>Clear</button>
            </form>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="card-title">User Financial Summary ({data.total || 0} users)</h3></div>
            <div className="table-container">
              {data.users?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>User</th><th>User ID</th><th>Wallet Balance</th><th>Total Earned</th><th>Pending Income</th><th>Liability</th><th>Directs</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.users.map((user) => (
                      <tr key={user.id}>
                        <td><div className="user-cell"><span className="user-name">{user.name}</span><span className="user-email">{user.email}</span></div></td>
                        <td className="font-mono">{user.referral_code}</td>
                        <td className="font-semibold">{fmt(user.wallet_balance)}</td>
                        <td className="text-success">{fmt(user.total_earned)}</td>
                        <td className="text-warning">{fmt(user.pending_income)}</td>
                        <td className="text-danger">{fmt(user.liability)}</td>
                        <td><span className="badge badge-info">{user.direct_count}</span><small className="text-muted"> ({user.active_directs} active)</small></td>
                        <td><span className={`badge ${user.has_active_package ? 'badge-success' : 'badge-warning'}`}>{user.has_active_package ? 'Active' : 'Inactive'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">No users found</p>}
            </div>
            <Pagination page={page} totalPages={totalPages()} total={data.total || 0} onChange={(p) => { setPage(p); fetchReports(p); }} />
          </div>
        </div>
      );
    }
    if (activeTab === 'ranks') {
      const rankColors = { Star: '#f59e0b', Silver: '#94a3b8', Gold: '#eab308', Platinum: '#6366f1' };
      return (
        <div>
          <div className="stats-grid">
            {data.distribution?.map((r) => (
              <div className="stat-card" key={r.product_id} style={{ borderTopColor: rankColors[r.rank_name] || undefined }}>
                <div className="stat-icon">🏆</div>
                <div className="stat-label">{r.rank_name}</div>
                <div className="stat-value">{r.user_count}</div>
                <div className="stat-subtext">{fmt(r.price)}</div>
              </div>
            ))}
            <div className="stat-card">
              <div className="stat-icon">⬜</div>
              <div className="stat-label">No Rank Yet</div>
              <div className="stat-value">{data.no_rank_count || 0}</div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card info">
              <div className="stat-icon">🔄</div>
              <div className="stat-label">Auto Upgrades</div>
              <div className="stat-value">{data.totals?.count || 0}</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon">💸</div>
              <div className="stat-label">Repurchase Wallet Spent</div>
              <div className="stat-value">{fmt(data.totals?.amount)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">Auto-Repurchase (Rank Upgrade) History ({data.total || 0})</h3></div>
            <div className="table-container">
              {data.upgrades?.length > 0 ? (
                <table className="table">
                  <thead><tr><th>Date</th><th>User</th><th>User ID</th><th>Upgraded To</th><th>Amount Debited</th><th>Source Withdrawal</th></tr></thead>
                  <tbody>
                    {data.upgrades.map((u) => (
                      <tr key={u.id}>
                        <td className="text-muted datetime-cell">{formatDateTime(u.created_at)}</td>
                        <td className="font-medium">{u.user_name}</td>
                        <td className="font-mono">{u.user_code}</td>
                        <td><span className={`rank-badge rank-badge-repurchase ${getRankClass(u.rank_name)}`}>🔄 {u.rank_name}</span></td>
                        <td className="text-warning font-semibold">{fmt(u.amount)}</td>
                        <td className="text-muted">{u.source_withdrawal_id ? `#${u.source_withdrawal_id}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-muted">No auto-repurchase upgrades yet</p>}
            </div>
            <Pagination page={page} totalPages={totalPages()} total={data.total || 0} onChange={(p) => { setPage(p); fetchReports(p); }} />
          </div>
        </div>
      );
    }
  };

  const tabs = REPORT_TABS;

  const isUserDetailOpen = activeTab === 'userDetail' && selectedUserId;

  return (
    <AdminLayout>
      <div className="admin-reports-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reports</h1>
            <p className="page-subtitle">{tabs.find((t) => t.key === activeTab)?.label} — analytics and financial insights</p>
          </div>
          <div className="page-header-actions">
            <ExportMenu
              fetchAll={fetchAllForExport}
              columns={getExportColumns()}
              filename={isUserDetailOpen
                ? `user-report-${userDetail?.profile?.referral_code || selectedUserId}`
                : `${activeTab}-report`}
              title={isUserDetailOpen ? 'User Full Transaction Report' : 'Blisswell Report'}
            />
          </div>
        </div>

        {renderContent()}
      </div>

      <style>{`
        .admin-reports-page { max-width: 1300px; }
        .page-header-actions { display: flex; gap: 0.75rem; }
        .filter-form { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end; }
        .stat-subtext { font-size: 0.8rem; color: var(--gray-500); margin-top: 0.25rem; }
        .user-cell { display: flex; flex-direction: column; }
        .user-name { font-weight: 500; color: #1f2937; }
        .user-email { font-size: 0.75rem; color: #6b7280; display: inline-block; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
        .font-mono { font-family: monospace; }
        .payment-id-cell { font-family: monospace; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .datetime-cell { font-size: 0.8125rem; white-space: nowrap; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .text-muted { color: #6b7280; }
        .text-primary { color: #4f46e5; }
        .text-success { color: #10b981; }
        .text-warning { color: #F59E0B; }
        .text-danger { color: #EF4444; }
        .text-sm { font-size: 0.75rem; }
        .badge-neutral { background: var(--gray-200); color: var(--gray-600); }
        .rank-badge { display: inline-block; padding: 0.2rem 0.5rem; background: #fef3c7; color: #b45309; border-radius: var(--radius-sm); font-size: 0.72rem; font-weight: 600; }
        .rank-badge-repurchase { background: #d1fae5; color: #047857; }
        .detail-toolbar { margin-bottom: 1rem; }
        .profile-card { margin-bottom: 1rem; }
        .profile-main { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .profile-name { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem; }
        .profile-meta { font-size: 0.875rem; color: #6b7280; display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.15rem; }
        .profile-badges { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .level-strip { display: flex; gap: 0.5rem; flex-wrap: wrap; padding: 0.75rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
        .level-chip { display: flex; flex-direction: column; align-items: center; background: var(--gray-100, #f3f4f6); border-radius: var(--radius-md, 0.5rem); padding: 0.4rem 0.9rem; min-width: 80px; }
        .level-label { font-size: 0.72rem; color: #6b7280; font-weight: 600; }
        .level-count { font-size: 1.05rem; font-weight: 700; }
        .level-active { font-size: 0.7rem; color: #10b981; }
        .card-header { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .user-detail-checkbox { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; color: var(--gray-700, #374151); padding-bottom: 0.5rem; }
        @media (max-width: 768px) {
          .filter-form { flex-direction: column; }
          .filter-form .form-group { width: 100%; }
          .stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminReports;