import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { paymentAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const fileUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${API_URL.replace('/api', '')}${p}`);

// Manual QR/UPI payments submitted by users. Approving one creates the paid
// order (invoice, activation, team income); rejecting asks for a reason that
// is emailed to the user.
const AdminPaymentRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchList = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (search) filters.search = search;
      const res = await paymentAPI.getQrPayments(pageNum, filters);
      setRequests(res.data.requests || []);
      setTotalPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
      setPendingCount(res.data.pendingCount || 0);
    } catch (e) {
      toast.error('Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    setPage(1);
    fetchList(1);
  }, [fetchList]);

  const changePage = (p) => {
    setPage(p);
    fetchList(p);
  };

  const doApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(approveTarget.id);
    try {
      const res = await paymentAPI.approveQrPayment(approveTarget.id);
      toast.success(res.data.message || 'Payment approved');
      setApproveTarget(null);
      fetchList(page);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to approve payment');
    } finally { setActionLoading(null); }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error('Please enter a reason'); return; }
    setActionLoading(rejectTarget.id);
    try {
      await paymentAPI.rejectQrPayment(rejectTarget.id, rejectReason.trim());
      toast.success('Payment request rejected');
      setRejectTarget(null); setRejectReason('');
      fetchList(page);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject payment');
    } finally { setActionLoading(null); }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const statusBadge = (status) => {
    const map = { pending: 'warning', approved: 'success', rejected: 'danger' };
    const label = { pending: '⏳ Pending', approved: '✓ Approved', rejected: '✕ Rejected' };
    return <span className={`badge badge-${map[status] || 'neutral'}`}>{label[status] || status}</span>;
  };

  const alerts = pendingCount > 0
    ? [{ label: 'QR Payments Awaiting Approval', count: pendingCount, href: '/admin/payment-requests', variant: 'warning' }]
    : [];

  return (
    <AdminLayout alerts={alerts}>
      <div className="admin-payreq-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Payment Requests</h1>
            <p className="page-subtitle">Verify QR / UPI payments — approving creates the order and activates the user</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">QR Payments</h3>
            {pendingCount > 0 && <span className="badge badge-warning">{pendingCount} pending</span>}
          </div>

          <form
            className="filter-form"
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}
          >
            <select className="form-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All Status</option>
            </select>
            <input
              className="form-input"
              type="search"
              placeholder="Search UTR, name, user ID, email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary">Search</button>
          </form>

          {loading ? (
            <LoadingSkeleton variant="card" />
          ) : requests.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Screenshot</th>
                    <th>User</th>
                    <th>Product</th>
                    <th>Amount</th>
                    <th>UTR / Txn ID</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Review</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button type="button" className="proof-thumb" onClick={() => setPreview(r)} title="View screenshot">
                          <img src={fileUrl(r.screenshot)} alt={`Payment screenshot ${r.utr}`} />
                        </button>
                      </td>
                      <td>
                        <div className="pr-cell">
                          <span className="pr-name">{r.user_name}</span>
                          <span className="pr-sub">{r.referral_code} · {r.user_email}</span>
                          <span className="pr-muted">{r.user_phone}</span>
                        </div>
                      </td>
                      <td>
                        <div className="pr-cell">
                          <span className="pr-name">{r.product_name}</span>
                          {r.design_name && <span className="pr-sub">{r.design_name}</span>}
                        </div>
                      </td>
                      <td className="text-primary font-semibold">{fmt(r.amount)}</td>
                      <td className="mono">{r.utr}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td className="text-muted datetime-cell">{formatDateTime(r.created_at)}</td>
                      <td className="text-muted text-sm">
                        {r.status === 'approved' && <>Order {r.order_number}<br /></>}
                        {r.status === 'rejected' && r.reject_reason && <>{r.reject_reason}<br /></>}
                        {r.reviewed_at && <>{r.reviewed_by_name ? `${r.reviewed_by_name} · ` : ''}{formatDateTime(r.reviewed_at)}</>}
                        {!r.reviewed_at && '—'}
                      </td>
                      <td className="actions-cell">
                        {r.status === 'pending' ? (
                          <>
                            <button className="btn btn-success btn-sm" disabled={actionLoading === r.id} onClick={() => setApproveTarget(r)}>
                              Approve
                            </button>
                            <button className="btn btn-danger btn-sm" disabled={actionLoading === r.id}
                              onClick={() => { setRejectTarget(r); setRejectReason(''); }}>
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="📱"
              title="No payment requests"
              description={statusFilter ? `No ${statusFilter} QR payments found.` : 'QR payments submitted by users will appear here.'}
            />
          )}

          <Pagination page={page} totalPages={totalPages} total={total} onChange={changePage} />
        </div>
      </div>

      {/* Screenshot preview */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div className="modal-box proof-box" onClick={(e) => e.stopPropagation()}>
            <h3>Payment Screenshot</h3>
            <p>{preview.user_name} · {fmt(preview.amount)} · UTR <strong>{preview.utr}</strong></p>
            <a href={fileUrl(preview.screenshot)} target="_blank" rel="noopener noreferrer">
              <img className="proof-full" src={fileUrl(preview.screenshot)} alt={`Payment screenshot ${preview.utr}`} />
            </a>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>Close</button>
              {preview.status === 'pending' && (
                <>
                  <button className="btn btn-danger" onClick={() => { setRejectTarget(preview); setRejectReason(''); setPreview(null); }}>Reject</button>
                  <button className="btn btn-success" onClick={() => { setApproveTarget(preview); setPreview(null); }}>Approve</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve confirm */}
      {approveTarget && (
        <div className="modal-overlay" onClick={() => setApproveTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Approve Payment</h3>
            <p>
              Confirm you received <strong>{fmt(approveTarget.amount)}</strong> with UTR <strong>{approveTarget.utr}</strong> from {approveTarget.user_name}.
              This creates the order for {approveTarget.product_name}, activates the account and pays team income. It cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setApproveTarget(null)}>Cancel</button>
              <button className="btn btn-success" disabled={actionLoading === approveTarget.id} onClick={doApprove}>
                {actionLoading === approveTarget.id ? 'Approving…' : 'Approve & Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason */}
      {rejectTarget && (
        <div className="modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Payment</h3>
            <p>Rejecting {fmt(rejectTarget.amount)} (UTR {rejectTarget.utr}) from {rejectTarget.user_name}. The reason is emailed to the user, who can submit again.</p>
            <textarea className="form-input" rows={3} placeholder="Reason for rejection (e.g. payment not received, amount mismatch)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={actionLoading === rejectTarget.id} onClick={doReject}>
                {actionLoading === rejectTarget.id ? 'Rejecting…' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-payreq-page { max-width: 1300px; }
        .filter-form { display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:1rem; }
        .filter-form select { width:180px; }
        .filter-form input { flex:1; min-width:200px; max-width:360px; }
        .pr-cell { display:flex; flex-direction:column; gap:0.125rem; }
        .pr-name { font-weight:500; color:#1f2937; font-size:0.875rem; }
        .pr-sub { font-size:0.75rem; color:#6b7280; }
        .pr-muted { font-size:0.75rem; color:#9ca3af; }
        .actions-cell { display:flex; gap:0.4rem; flex-wrap:wrap; }
        .datetime-cell { font-size:0.8125rem; white-space:nowrap; }
        .font-semibold { font-weight:600; }
        .text-muted { color:#6b7280; }
        .text-sm { font-size:0.75rem; }
        .text-primary { color:#4f46e5; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:0.85rem; }
        .proof-thumb { width:52px; height:52px; padding:0; border:1px solid var(--gray-200); border-radius:6px; overflow:hidden; background:#f9fafb; cursor:zoom-in; }
        .proof-thumb img { width:100%; height:100%; object-fit:cover; display:block; }

        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:1000; padding:1rem; }
        .modal-box { background:#fff; border-radius:var(--radius-lg); padding:1.5rem; max-width:460px; width:100%; box-shadow:var(--shadow-lg); max-height:90vh; overflow-y:auto; }
        .modal-box.proof-box { max-width:560px; }
        .modal-box h3 { margin:0 0 0.5rem; font-size:1.1rem; }
        .modal-box p { color:var(--gray-600); font-size:0.9rem; margin:0 0 1rem; overflow-wrap:anywhere; }
        .modal-box textarea { width:100%; margin-bottom:1rem; resize:vertical; }
        .proof-full { display:block; width:100%; max-height:60vh; object-fit:contain; background:#f9fafb; border-radius:8px; margin-bottom:1rem; }
        .modal-actions { display:flex; gap:0.75rem; justify-content:flex-end; flex-wrap:wrap; }
      `}</style>
    </AdminLayout>
  );
};

export default AdminPaymentRequests;
