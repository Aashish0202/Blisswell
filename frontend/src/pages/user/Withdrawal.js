import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { userAPI, withdrawalAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';

// "07:00" -> "7:00 AM"
const fmtTime = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm || '';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const Withdrawal = () => {
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Bank KYC gate — withdrawals require approved bank details
  const [kyc, setKyc] = useState(null);
  const [kycLoaded, setKycLoaded] = useState(false);
  const [showKycPopup, setShowKycPopup] = useState(false);

  const [earnings, setEarnings] = useState({
    totalEarnings: 0, teamIncomeTotal: 0,
    availableForWithdrawal: 0, totalWithdrawn: 0, pendingWithdrawal: 0
  });
  const [wdConfig, setWdConfig] = useState(null);

  const [withdrawals, setWithdrawals] = useState([]);
  const [wdPage, setWdPage] = useState(1);
  const [wdTotalPages, setWdTotalPages] = useState(1);
  const [wdTotal, setWdTotal] = useState(0);

  const fetchCore = useCallback(async () => {
    try {
      const [earnRes, cfgRes] = await Promise.all([
        userAPI.getEarnings().catch(() => null),
        withdrawalAPI.getConfig().catch(() => null)
      ]);
      if (earnRes?.data?.earnings) setEarnings(earnRes.data.earnings);
      if (cfgRes?.data?.config) setWdConfig(cfgRes.data.config);
    } catch (e) {
      toast.error('Failed to load withdrawal data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async (page) => {
    try {
      const res = await withdrawalAPI.getMyWithdrawals(page);
      setWithdrawals(res.data.withdrawals || []);
      setWdTotal(res.data.total || 0);
      setWdTotalPages(res.data.totalPages || 1);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { fetchCore(); }, [fetchCore]);
  useEffect(() => { fetchWithdrawals(wdPage); }, [wdPage, fetchWithdrawals]);

  // Load KYC status; if not approved, pop up the "update KYC" message
  useEffect(() => {
    (async () => {
      try {
        const res = await userAPI.getKYC();
        setKyc(res.data.kyc || null);
      } catch (e) {
        setKyc(null);
      } finally {
        setKycLoaded(true);
      }
    })();
  }, []);

  const kycStatus = kyc?.kyc_status || null;
  const kycApproved = kycStatus === 'approved';
  useEffect(() => {
    if (kycLoaded && !kycApproved) setShowKycPopup(true);
  }, [kycLoaded, kycApproved]);

  const kycPopupContent = !kyc
    ? {
        icon: '🏦',
        title: 'Bank KYC Required',
        message: 'Your bank details (KYC) are not added yet. Please update them in your Profile before requesting a withdrawal.'
      }
    : kycStatus === 'pending'
      ? {
          icon: '⏳',
          title: 'KYC Under Review',
          message: 'Your bank KYC has been submitted and is awaiting admin approval. You can request a withdrawal once it is approved.'
        }
      : {
          icon: '⚠️',
          title: 'KYC Rejected',
          message: `Your bank KYC was rejected${kyc?.rejected_reason ? `: ${kyc.rejected_reason}` : ''}. Please update your bank details and resubmit.`
        };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!kycApproved) {
      setShowKycPopup(true);
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setRequesting(true);
    try {
      await withdrawalAPI.request(amt);
      toast.success('Withdrawal request submitted');
      setWithdrawAmount('');
      fetchCore();
      setWdPage(1);
      fetchWithdrawals(1);
    } catch (e) {
      const msg = e.response?.data?.message || 'Withdrawal failed';
      toast.error(msg);
    } finally {
      setRequesting(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  const wdStatusBadge = (status) => {
    const map = { pending: 'warning', processed: 'success', rejected: 'danger', reversed: 'neutral' };
    const label = { pending: '⏳ Pending', processed: '✓ Processed', rejected: '✕ Rejected', reversed: '↩ Reversed' };
    return <span className={`badge badge-${map[status] || 'neutral'}`}>{label[status] || status}</span>;
  };

  // Live withdrawal split preview (from /withdrawals/config)
  const adminChargePct = Number(wdConfig?.adminChargePercent ?? 0);
  const wdAmt = parseFloat(withdrawAmount);
  const splitPreview = (wdAmt > 0 && adminChargePct >= 0) ? {
    payout: wdAmt * (1 - adminChargePct / 100),
    adminCharge: wdAmt * adminChargePct / 100
  } : null;

  // Withdrawal window (Friday only, admin-set times) — server decides isOpenNow.
  const wdDay = wdConfig?.dayName || 'Friday';
  const wdWindow = `${fmtTime(wdConfig?.startTime || '07:00')} – ${fmtTime(wdConfig?.endTime || '10:00')} IST`;
  const windowOpen = wdConfig ? wdConfig.isOpenNow !== false : true;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="withdrawal-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Withdrawal</h1>
              <p className="page-subtitle">Withdraw your earnings to your account</p>
            </div>
          </div>
          <div className="stats-grid">
            <LoadingSkeleton variant="stat" /><LoadingSkeleton variant="stat" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="withdrawal-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Withdrawal</h1>
            <p className="page-subtitle">Withdraw your earnings to your account</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="info-banner">
          <div className="info-icon">💡</div>
          <div className="info-content">
            <strong>How Withdrawals Work</strong>
            <p>
              Request a withdrawal from your available earnings (min ₹200). At processing, {adminChargePct}% is
              deducted as an admin charge — you receive the remaining {100 - adminChargePct}%. Accepted only on {wdDay}, {wdWindow}.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card highlight">
            <div className="stat-icon">🏦</div>
            <div className="stat-label">Available for Withdrawal</div>
            <div className="stat-value">{fmt(earnings.availableForWithdrawal)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Pending Withdrawal</div>
            <div className="stat-value">{fmt(earnings.pendingWithdrawal)}</div>
            <div className="stat-subtext">Awaiting processing</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📉</div>
            <div className="stat-label">Total Withdrawn</div>
            <div className="stat-value">{fmt(earnings.totalWithdrawn)}</div>
          </div>
        </div>

        {/* Withdrawal card */}
        <div className="card fade-in earnings-card">
          <div className="card-header">
            <h3 className="card-title">🏦 Request Withdrawal</h3>
            {!kycApproved && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowKycPopup(true)}>
                {kycStatus === 'pending' ? 'KYC Under Review' : kycStatus === 'rejected' ? 'KYC Rejected' : 'KYC Required'}
              </button>
            )}
          </div>
          {!kycApproved && (
            <div className="kyc-warning-banner">
              <span className="kyc-warning-icon">⚠️</span>
              <span>
                {kycStatus === 'pending'
                  ? 'Your bank KYC is under review — withdrawals unlock once it is approved.'
                  : 'Bank KYC is required for withdrawals. Please update your bank details.'}
              </span>
              {kycStatus !== 'pending' && (
                <Link to="/profile?tab=kyc" className="btn btn-primary btn-sm kyc-warning-btn">Update KYC</Link>
              )}
            </div>
          )}
          <form className="withdraw-form" onSubmit={handleWithdraw}>
            <div className="withdraw-available">
              Available for Withdrawal: <strong>{fmt(earnings.availableForWithdrawal)}</strong>
            </div>
            <div className="withdraw-input-row">
              <input
                type="number" min="1" step="1" placeholder={kycApproved ? 'Amount (min ₹200)' : 'Complete KYC to withdraw'}
                value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={requesting || !kycApproved || !windowOpen}
              />
              <button type="submit" className="btn btn-primary" disabled={requesting || !kycApproved || !windowOpen}>
                {requesting ? 'Submitting…' : !kycApproved ? 'KYC Required' : !windowOpen ? `Opens ${wdDay}` : 'Request Withdrawal'}
              </button>
            </div>
            {splitPreview && wdAmt >= 200 && (
              <div className="split-preview">
                <div><span className="muted">You receive</span><strong className="split-payout">{fmt(splitPreview.payout)}</strong></div>
                <div><span className="muted">Admin charge ({adminChargePct}%)</span><strong>{fmt(splitPreview.adminCharge)}</strong></div>
              </div>
            )}
            <p className="withdraw-note">
              {kycApproved && !windowOpen && (
                <><strong>Withdrawals are closed right now.</strong> The next window opens on {wdDay}, {wdWindow}.<br /></>
              )}
              Withdrawals are accepted only on <strong>{wdDay}, {wdWindow}</strong>. Minimum ₹200.
              You must have at least <strong>{wdConfig?.minActiveDirects ?? 2} active direct referrals</strong> (directs with
              an active product). At processing, {adminChargePct}% is deducted as an admin charge — you receive the remainder.
              {earnings.pendingWithdrawal > 0 && ' You already have a pending request — it must be processed first.'}
            </p>
          </form>
        </div>

        {/* Withdrawal history */}
        <div className="card fade-in">
          <div className="card-header">
            <h3 className="card-title">Withdrawal History</h3>
            {wdTotal > 0 && <span className="badge badge-neutral">{wdTotal} Requests</span>}
          </div>
          {withdrawals.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Date</th><th>Amount</th><th>You Receive</th><th>Admin Charge</th><th>Status</th><th>Processed At</th><th>Reason</th></tr></thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td>{formatDateTime(w.created_at)}</td>
                      <td className="text-primary font-semibold">{fmt(w.amount)}</td>
                      <td className="font-semibold">{w.status === 'processed' ? fmt(w.payout_amount) : '—'}</td>
                      <td className="text-muted">{w.status === 'processed' ? fmt(w.admin_charge) : '—'}</td>
                      <td>{wdStatusBadge(w.status)}</td>
                      <td className="text-muted datetime-cell">{formatDateTime(w.processed_at)}</td>
                      <td className="text-muted">{w.reject_reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="🏧" title="No withdrawal requests" description="Your withdrawal requests will appear here." />
          )}
          {wdTotal > 0 && <Pagination page={wdPage} totalPages={wdTotalPages} total={wdTotal} onChange={setWdPage} />}
        </div>
      </div>

      {/* KYC popup — shown automatically when bank KYC is not approved */}
      {showKycPopup && !kycApproved && (
        <div className="modal-overlay" onClick={() => setShowKycPopup(false)}>
          <div className="modal kyc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{kycPopupContent.title}</h3>
              <button className="modal-close" onClick={() => setShowKycPopup(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="kyc-popup-body">
                <span className="kyc-popup-icon">{kycPopupContent.icon}</span>
                <p>{kycPopupContent.message}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowKycPopup(false)}>Later</button>
              {kycStatus !== 'pending' && (
                <Link to="/profile?tab=kyc" className="btn btn-primary">Update KYC Now</Link>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .withdrawal-page { max-width: 1000px; }

        .info-banner { display:flex; align-items:flex-start; gap:1rem; padding:1rem 1.25rem;
          background: var(--status-paid-bg); border:1px solid var(--primary-200);
          border-radius: var(--radius-lg); margin-bottom:1.5rem; }
        .info-icon { font-size:1.25rem; }
        .info-content strong { display:block; color:var(--primary-700); margin-bottom:0.25rem; }
        .info-content p { color:var(--primary-600); font-size:0.875rem; margin:0; line-height:1.5; }

        .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
          gap:1rem; margin-bottom:1.5rem; }
        .stat-subtext { font-size:0.75rem; color:var(--gray-500); margin-top:0.25rem; }
        .stat-card.highlight { background:linear-gradient(135deg,var(--primary-500),var(--accent-500)); border:none; }
        .stat-card.highlight .stat-label,.stat-card.highlight .stat-value,
        .stat-card.highlight .stat-subtext,.stat-card.highlight .stat-icon { color:white; }

        .earnings-card { margin-bottom:1.5rem; }

        /* Bank KYC gate */
        .kyc-warning-banner { display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem;
          background:#FEF2F2; border:1px solid #FECACA; border-radius:var(--radius-md); margin-bottom:0.75rem;
          font-size:0.85rem; color:#991B1B; }
        .kyc-warning-icon { font-size:1.1rem; }
        .kyc-warning-btn { margin-left:auto; white-space:nowrap; }

        .kyc-modal { max-width:440px; }
        .kyc-popup-body { display:flex; align-items:flex-start; gap:0.9rem; }
        .kyc-popup-icon { font-size:1.75rem; line-height:1; }
        .kyc-popup-body p { margin:0; color:var(--gray-600); font-size:0.9rem; line-height:1.55; }

        .split-preview { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; padding:0.875rem 1rem;
          background:var(--gray-50); border:1px solid var(--gray-200); border-radius:var(--radius-md); }
        .split-preview div { display:flex; flex-direction:column; }
        .split-preview .muted { font-size:0.72rem; color:var(--gray-500); }
        .split-preview strong { font-size:1rem; color:var(--gray-900); }
        .split-preview .split-payout { color:var(--primary-700); font-size:1.1rem; }

        .withdraw-form { display:flex; flex-direction:column; gap:0.75rem; }
        .withdraw-available { font-size:0.9rem; color:var(--gray-700); }
        .withdraw-available strong { color:var(--primary-700); }
        .withdraw-input-row { display:flex; gap:0.75rem; }
        .withdraw-input-row input { flex:1; padding:0.6rem 0.75rem; border:1px solid var(--gray-300); border-radius:var(--radius-md); font-size:0.95rem; }
        .withdraw-input-row input:focus { outline:none; border-color:var(--primary-500); }
        .withdraw-note { font-size:0.8rem; color:var(--gray-500); margin:0; }

        .datetime-cell { font-size:0.8125rem; white-space:nowrap; }
        .font-semibold { font-weight:600; }
        .muted { color:var(--gray-500); }
        .fade-in { animation:fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }

        @media (max-width:768px) {
          .info-banner { flex-direction:column; }
          .stats-grid { grid-template-columns:1fr 1fr; }
          .withdraw-input-row { flex-direction:column; }
          .split-preview { grid-template-columns:1fr; }
          .datetime-cell { font-size:0.75rem; }
        }
        @media (max-width:480px) {
          .stats-grid { grid-template-columns:1fr; }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Withdrawal;
