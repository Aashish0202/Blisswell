import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI, withdrawalAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  // Summary totals by status (pending/processed/rejected/reversed)
  const [summary, setSummary] = useState({ pending: { count: 0, amount: 0 }, processed: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 }, reversed: { count: 0, amount: 0 } });
  // Reject reason modal
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  // Withdrawal split config (5% admin charge / 20% repurchase) — lets pending
  // rows show their expected split before processing records the real values.
  const [wdConfig, setWdConfig] = useState(null);
  // Confirm for process/reverse
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await adminAPI.getWithdrawalReport(1, { status: '' });
      const byStatus = res.data.by_status || [];
      const next = { pending: { count: 0, amount: 0 }, processed: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 }, reversed: { count: 0, amount: 0 } };
      for (const row of byStatus) {
        if (next[row.status]) {
          next[row.status] = { count: Number(row.count) || 0, amount: parseFloat(row.amount) || 0 };
        }
      }
      setSummary(next);
    } catch (e) { /* ignore summary errors */ }
  }, []);

  const fetchList = useCallback(async (pageNum = page) => {
    setLoading(true);
    try {
      const res = await adminAPI.getAllWithdrawals(pageNum, statusFilter ? { status: statusFilter } : {});
      setWithdrawals(res.data.withdrawals || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (e) {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => {
    withdrawalAPI.getConfig()
      .then(res => setWdConfig(res.data.config))
      .catch(() => { /* leave null → pending rows fall back to '—' */ });
  }, []);
  useEffect(() => {
    setPage(1);
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);
  useEffect(() => {
    fetchList(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const refreshAll = () => { fetchList(page); fetchSummary(); };

  const doProcess = async (id) => {
    setActionLoading(id);
    try {
      await adminAPI.processWithdrawal(id);
      toast.success('Withdrawal processed');
      refreshAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to process withdrawal');
    } finally { setActionLoading(null); }
  };

  const doReverse = async (id) => {
    setActionLoading(id);
    try {
      await adminAPI.reverseWithdrawal(id);
      toast.success('Withdrawal reversed');
      refreshAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reverse withdrawal');
    } finally { setActionLoading(null); }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error('Please enter a reason'); return; }
    setActionLoading(rejectTarget.id);
    try {
      await adminAPI.rejectWithdrawal(rejectTarget.id, rejectReason.trim());
      toast.success('Withdrawal rejected');
      setRejectTarget(null); setRejectReason('');
      refreshAll();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject withdrawal');
    } finally { setActionLoading(null); }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  // Split shown per row. Processed rows carry the recorded values; pending rows
  // get an estimate from the live config so the admin sees the payout before
  // clicking Process. Rejected/reversed rows show nothing.
  const splitOf = (w) => {
    const amt = parseFloat(w.amount) || 0;
    if (w.status === 'processed') {
      return { admin: w.admin_charge, repurchase: w.repurchase_amount, payout: w.payout_amount, estimated: false };
    }
    if (w.status === 'pending' && wdConfig) {
      const adminPct = Number(wdConfig.adminChargePercent ?? 0);
      const repPct = Number(wdConfig.repurchaseSharePercent ?? 0);
      return {
        admin: amt * adminPct / 100,
        repurchase: amt * repPct / 100,
        payout: amt * (100 - adminPct - repPct) / 100,
        estimated: true
      };
    }
    return null;
  };
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const statusBadge = (status) => {
    const map = { pending: 'warning', processed: 'success', rejected: 'danger', reversed: 'neutral' };
    const label = { pending: '⏳ Pending', processed: '✓ Processed', rejected: '✕ Rejected', reversed: '↩ Reversed' };
    return <span className={`badge badge-${map[status] || 'neutral'}`}>{label[status] || status}</span>;
  };

  const alerts = summary.pending.count > 0
    ? [{ label: 'Pending Withdrawals', count: summary.pending.count, href: '/admin/withdrawals', variant: 'warning' }]
    : [];

  return (
    <AdminLayout alerts={alerts}>
      <div className="admin-withdrawals-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Withdrawals</h1>
            <p className="page-subtitle">Process user withdrawal requests</p>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="stats-grid">
          <div className="stat-card warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Pending</div>
            <div className="stat-value">{summary.pending.count}</div>
            <div className="stat-subtext">{fmt(summary.pending.amount)}</div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✓</div>
            <div className="stat-label">Processed</div>
            <div className="stat-value">{summary.processed.count}</div>
            <div className="stat-subtext">{fmt(summary.processed.amount)}</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon">✕</div>
            <div className="stat-label">Rejected</div>
            <div className="stat-value">{summary.rejected.count}</div>
            <div className="stat-subtext">{fmt(summary.rejected.amount)}</div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">↩</div>
            <div className="stat-label">Reversed</div>
            <div className="stat-value">{summary.reversed.count}</div>
            <div className="stat-subtext">{fmt(summary.reversed.amount)}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Withdrawal Requests</h3>
          </div>

          {/* Status filter */}
          <div className="filter-form">
            <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '200px' }}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processed">Processed</option>
              <option value="rejected">Rejected</option>
              <option value="reversed">Reversed</option>
            </select>
          </div>

          {loading ? (
            <LoadingSkeleton variant="card" />
          ) : withdrawals.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Admin Charge (5%)</th>
                    <th>Repurchase (20%)</th>
                    <th>Payout</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Processed</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => {
                    const split = splitOf(w);
                    return (
                    <tr key={w.id}>
                      <td>
                        <div className="user-cell">
                          <span className="user-name">{w.name}</span>
                          <span className="user-email">{w.email}</span>
                          <span className="user-mobile">{w.mobile}</span>
                        </div>
                      </td>
                      <td className="text-primary font-semibold">{fmt(w.amount)}</td>
                      <td>{split ? (split.estimated ? <span className="text-muted">{fmt(split.admin)}<span className="est-tag"> est.</span></span> : fmt(split.admin)) : '—'}</td>
                      <td>{split ? (split.estimated ? <span className="text-muted">{fmt(split.repurchase)}<span className="est-tag"> est.</span></span> : fmt(split.repurchase)) : '—'}</td>
                      <td className="text-success font-semibold">{split ? (split.estimated ? <span className="text-muted">{fmt(split.payout)}<span className="est-tag"> est.</span></span> : fmt(split.payout)) : '—'}</td>
                      <td>{statusBadge(w.status)}</td>
                      <td className="text-muted datetime-cell">{formatDateTime(w.created_at)}</td>
                      <td className="text-muted datetime-cell">{formatDateTime(w.processed_at)}</td>
                      <td className="text-muted text-sm">{w.reject_reason || '-'}</td>
                      <td className="actions-cell">
                        {w.status === 'pending' && (
                          <>
                            <button className="btn btn-success btn-sm" disabled={actionLoading === w.id}
                              onClick={() => setConfirmAction({ type: 'process', id: w.id, label: `Process ₹${parseFloat(w.amount).toLocaleString()} for ${w.name}?` })}>
                              Process
                            </button>
                            <button className="btn btn-danger btn-sm" disabled={actionLoading === w.id}
                              onClick={() => { setRejectTarget(w); setRejectReason(''); }}>
                              Reject
                            </button>
                          </>
                        )}
                        {w.status === 'processed' && (
                          <button className="btn btn-warning btn-sm" disabled={actionLoading === w.id}
                            onClick={() => setConfirmAction({ type: 'reverse', id: w.id, label: `Reverse the processed withdrawal of ₹${parseFloat(w.amount).toLocaleString()} for ${w.name}? Earnings will be restored.` })}>
                            Reverse
                          </button>
                        )}
                        {(w.status === 'rejected' || w.status === 'reversed') && (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="🏧" title="No withdrawal requests" description={statusFilter ? `No ${statusFilter} withdrawals found.` : 'Withdrawal requests will appear here.'} />
          )}

          <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
        </div>
      </div>

      {/* Process / Reverse confirm dialog */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm</h3>
            <p>{confirmAction.label}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={actionLoading === confirmAction.id}
                onClick={() => {
                  const fn = confirmAction.type === 'process' ? doProcess : doReverse;
                  fn(confirmAction.id).then(() => setConfirmAction(null));
                }}>
                {actionLoading === confirmAction.id ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason dialog */}
      {rejectTarget && (
        <div className="modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Withdrawal</h3>
            <p>Rejecting ₹{parseFloat(rejectTarget.amount).toLocaleString()} for {rejectTarget.name}. Earnings will be restored to the user.</p>
            <textarea className="form-input" rows={3} placeholder="Reason for rejection" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={actionLoading === rejectTarget.id} onClick={doReject}>
                {actionLoading === rejectTarget.id ? 'Rejecting…' : 'Reject Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-withdrawals-page { max-width: 1300px; }
        .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:1rem; margin-bottom:1.5rem; }
        .stat-subtext { font-size:0.8rem; color:var(--gray-500); margin-top:0.25rem; }
        .filter-form { display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1rem; }
        .user-cell { display:flex; flex-direction:column; gap:0.125rem; }
        .user-name { font-weight:500; color:#1f2937; }
        .user-email { font-size:0.75rem; color:#6b7280; }
        .user-mobile { font-size:0.75rem; color:#9ca3af; }
        .actions-cell { display:flex; gap:0.4rem; flex-wrap:wrap; }
        .datetime-cell { font-size:0.8125rem; white-space:nowrap; }
        .font-semibold { font-weight:600; }
        .text-muted { color:#6b7280; }
        .text-sm { font-size:0.75rem; }
        .text-primary { color:#4f46e5; }
        .text-success { color:#10b981; }
        .badge-neutral { background:var(--gray-200); color:var(--gray-600); }

        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1rem; }
        .modal-box { background:#fff; border-radius:var(--radius-lg); padding:1.5rem; max-width:460px; width:100%; box-shadow:var(--shadow-lg); }
        .modal-box h3 { margin:0 0 0.5rem; font-size:1.1rem; }
        .modal-box p { color:var(--gray-600); font-size:0.9rem; margin:0 0 1rem; }
        .modal-box textarea { width:100%; margin-bottom:1rem; resize:vertical; }
        .modal-actions { display:flex; gap:0.75rem; justify-content:flex-end; }
        .btn-warning { background:#f59e0b; color:#fff; }
        .est-tag { font-size:0.65rem; color:#9ca3af; }
      `}</style>
    </AdminLayout>
  );
};

export default AdminWithdrawals;