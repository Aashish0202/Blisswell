import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';
import ConfirmationDialog from '../../components/ConfirmationDialog';

// Milestone Rewards admin: report of users per reward + reward plan CRUD.

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const STATUSES = ['PAID', 'ACHIEVED', 'IN_PROGRESS', 'LOCKED'];
const STATUS_LABEL = { LOCKED: 'Locked', IN_PROGRESS: 'In Progress', ACHIEVED: 'Achieved', PAID: 'Paid' };
const STATUS_BADGE = { LOCKED: 'badge-neutral', IN_PROGRESS: 'badge-info', ACHIEVED: 'badge-warning', PAID: 'badge-success' };
const EMPTY_PLAN = { name: '', matrix_label: '', icon: 'gift', required_counts: ['', '', '', '', '', ''], reward_amount: '', sequence_order: '', is_active: true };

const ReportTab = ({ plans }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ rows: [], total: 0, totalPages: 1, summary: [] });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [recomputeKey, setRecomputeKey] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getRewardsReport({ page, status, plan_id: planId, search: appliedSearch });
      setData(res.data);
    } catch (e) {
      toast.error('Failed to load rewards report');
    } finally {
      setLoading(false);
    }
  }, [page, status, planId, appliedSearch]);

  useEffect(() => { load(); }, [load]);

  const recompute = async (e) => {
    e.preventDefault();
    if (!recomputeKey.trim()) return;
    setBusy(true);
    try {
      const res = await adminAPI.recomputeUserRewards(recomputeKey.trim());
      const { user, counts, paid, plans: ps } = res.data;
      toast.success(
        `${user.referral_code}: L1–L6 [${counts.join(', ')}] · ` +
        ps.map(p => `${p.name} ${STATUS_LABEL[p.status]} ${p.progress_pct}%`).join(' · ') +
        (paid.length ? ` · PAID ${paid.map(p => p.name).join(', ')}` : '')
      , { autoClose: 9000 });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Recompute failed');
    } finally {
      setBusy(false);
    }
  };

  const reconcile = async () => {
    setBusy(true);
    try {
      const res = await adminAPI.reconcileRewards();
      const s = res.data.summary;
      toast.success(`Reconciled ${s.users} users · ${s.paid} new payout(s)${s.errors ? ` · ${s.errors} error(s)` : ''}`);
      load();
    } catch (err) {
      toast.error('Reconciliation failed');
    } finally {
      setBusy(false);
    }
  };

  // summary cards per plan
  const summaryByPlan = plans.map(p => {
    const rows = data.summary.filter(s => s.plan_id === p.id);
    const get = (st) => rows.find(r => r.status === st)?.n || 0;
    return { plan: p, paid: get('PAID'), achieved: get('ACHIEVED'), inProgress: get('IN_PROGRESS'), locked: get('LOCKED'),
      paidTotal: rows.reduce((a, r) => a + r.paid_total, 0) };
  });

  return (
    <>
      <div className="rw-summary">
        {summaryByPlan.map(s => (
          <div key={s.plan.id} className="stat-card">
            <div className="stat-label">{s.plan.name} ({s.plan.matrix_label}) · {inr(s.plan.reward_amount)}</div>
            <div className="stat-value">{s.paid} paid</div>
            <div className="stat-subtext">
              {s.achieved > 0 && <>{s.achieved} awaiting activation · </>}
              {s.inProgress} in progress · {s.locked} locked · {inr(s.paidTotal)} paid out
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Users per Reward</h3>
          <span className="badge badge-neutral">{data.total} rows</span>
        </div>

        <div className="rw-tools">
          <form className="filter-form" onSubmit={(e) => { e.preventDefault(); setPage(1); setAppliedSearch(search); }}>
            <select className="form-input" value={planId} onChange={(e) => { setPage(1); setPlanId(e.target.value); }}>
              <option value="">All rewards</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name} ({p.matrix_label})</option>)}
            </select>
            <select className="form-input" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <input className="form-input" placeholder="Search name / ID / mobile" value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="submit" className="btn btn-secondary">Search</button>
          </form>
          <form className="filter-form" onSubmit={recompute}>
            <input className="form-input" placeholder="User ID or referral code" value={recomputeKey} onChange={(e) => setRecomputeKey(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={busy}>Recompute user</button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={reconcile}>Run daily reconciliation now</button>
          </form>
        </div>

        {loading ? <LoadingSkeleton /> : data.rows.length === 0 ? (
          <EmptyState title="No reward progress yet" description="Progress rows appear once members open their Rewards page, on activation, or after the daily reconciliation." />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th><th>Reward</th><th>Status</th><th>Progress</th>
                    <th>Active L1–L6</th><th>Achieved</th><th>Txn</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div className="rw-cell">
                          <span className="rw-name">{r.user_name}</span>
                          <span className="rw-sub">{r.referral_code}{r.mobile ? ` · ${r.mobile}` : ''}</span>
                        </div>
                      </td>
                      <td>
                        <div className="rw-cell">
                          <span className="rw-name">{r.plan_name} ({r.matrix_label})</span>
                          <span className="rw-sub">{inr(r.reward_amount ?? r.plan_amount)}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                      <td>
                        <div className="rw-pct">
                          <div className="rw-pct-bar"><div style={{ width: `${Math.min(r.progress_pct, 100)}%` }} /></div>
                          <span>{r.progress_pct.toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="mono rw-sub">{r.level_counts.join(' / ')}</td>
                      <td className="datetime-cell">{fmtDate(r.achieved_at)}</td>
                      <td className="mono">{r.transaction_id ? `#${r.transaction_id}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
};

const PlansTab = ({ plans, reload }) => {
  const [form, setForm] = useState(null); // null = closed; {id?} = editing
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const openNew = () => setForm({ ...EMPTY_PLAN, sequence_order: String((plans[plans.length - 1]?.sequence_order || 0) + 1) });
  const openEdit = (p) => setForm({ ...p, required_counts: p.required_counts.map(String), reward_amount: String(p.reward_amount), sequence_order: String(p.sequence_order) });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name, matrix_label: form.matrix_label, icon: form.icon,
      required_counts: form.required_counts.map(v => Number(v)),
      reward_amount: Number(form.reward_amount), sequence_order: Number(form.sequence_order), is_active: !!form.is_active
    };
    try {
      if (form.id) await adminAPI.updateRewardPlan(form.id, payload);
      else await adminAPI.createRewardPlan(payload);
      toast.success('Reward plan saved');
      setForm(null);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await adminAPI.deleteRewardPlan(toDelete.id);
      toast.success('Reward plan deleted');
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete plan');
    } finally {
      setToDelete(null);
    }
  };

  const setCount = (i, v) => setForm(f => ({ ...f, required_counts: f.required_counts.map((c, j) => (j === i ? v.replace(/\D/g, '') : c)) }));

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Reward Plans</h3>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add plan</button>
      </div>
      <p className="rw-hint">
        Plans are sequential by <strong>Order</strong>: each stays locked until the previous active plan is paid.
        Changes apply on the next recompute; rewards already paid are never changed or paid again.
      </p>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Plan</th><th>Required L1–L6</th><th>Total</th><th>Reward</th><th>Users</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id}>
                <td>{p.sequence_order}</td>
                <td><div className="rw-cell"><span className="rw-name">{p.name}</span><span className="rw-sub">{p.matrix_label} · {p.icon}</span></div></td>
                <td className="mono rw-sub">{p.required_counts.map(n => n.toLocaleString('en-IN')).join(' / ')}</td>
                <td className="mono">{p.required_counts.reduce((a, b) => a + b, 0).toLocaleString('en-IN')}</td>
                <td className="font-semibold">{inr(p.reward_amount)}</td>
                <td className="rw-sub">{(p.stats?.PAID || 0)} paid · {(p.stats?.IN_PROGRESS || 0)} in progress</td>
                <td><span className={`badge ${p.is_active ? 'badge-success' : 'badge-neutral'}`}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="actions-cell">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setToDelete(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <form className="rw-form" onSubmit={save}>
          <h4>{form.id ? `Edit: ${form.name}` : 'New reward plan'}</h4>
          <div className="rw-form-grid">
            <label>Name<input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bike Fund" /></label>
            <label>Matrix label<input className="form-input" required value={form.matrix_label} onChange={(e) => setForm({ ...form, matrix_label: e.target.value })} placeholder="3x3" /></label>
            <label>Icon
              <select className="form-input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
                {['bike', 'car', 'gift', 'trophy', 'home', 'plane'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
            <label>Reward amount (₹)<input className="form-input" required inputMode="decimal" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value.replace(/[^\d.]/g, '') })} /></label>
            <label>Order<input className="form-input" required inputMode="numeric" value={form.sequence_order} onChange={(e) => setForm({ ...form, sequence_order: e.target.value.replace(/\D/g, '') })} /></label>
            <label className="rw-check-label"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
          </div>
          <div className="rw-counts">
            {form.required_counts.map((c, i) => (
              <label key={i}>L{i + 1}<input className="form-input" required inputMode="numeric" value={c} onChange={(e) => setCount(i, e.target.value)} /></label>
            ))}
          </div>
          <div className="rw-form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</button>
          </div>
        </form>
      )}

      <ConfirmationDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        title="Delete reward plan?"
        message={toDelete ? `Delete "${toDelete.name}"? Plans with payouts cannot be deleted — deactivate them instead.` : ''}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

const AdminRewards = () => {
  const [tab, setTab] = useState('report');
  const [plans, setPlans] = useState([]);

  const loadPlans = useCallback(async () => {
    try {
      const res = await adminAPI.getRewardPlans();
      setPlans(res.data.plans || []);
    } catch (e) {
      toast.error('Failed to load reward plans');
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  return (
    <AdminLayout>
      <div className="admin-rewards-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Milestone Rewards</h1>
            <p className="page-subtitle">Bike Fund (3x3) / Car Fund (5x5) — based on active team counts, 6 levels deep</p>
          </div>
        </div>

        <div className="rw-tabs">
          <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>Report</button>
          <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>Plans</button>
        </div>

        {tab === 'report' ? <ReportTab plans={plans} /> : <PlansTab plans={plans} reload={loadPlans} />}
      </div>

      <style>{`
        .rw-tabs { display:flex; gap:0.5rem; margin-bottom:1rem; }
        .rw-tabs button { padding:0.5rem 1rem; border-radius:var(--radius-full); border:1px solid var(--gray-200); background:#fff;
          font-weight:600; font-size:0.875rem; color:var(--gray-600); cursor:pointer; }
        .rw-tabs button.active { background:var(--primary-600); border-color:var(--primary-600); color:#fff; }
        .rw-summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem; margin-bottom:1rem; }
        .stat-subtext { font-size:0.75rem; color:var(--gray-500); margin-top:0.25rem; }
        .rw-tools { display:flex; flex-direction:column; gap:0.25rem; }
        .filter-form { display:flex; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.75rem; }
        .filter-form select { width:180px; }
        .filter-form input { flex:1; min-width:180px; max-width:320px; }
        .rw-cell { display:flex; flex-direction:column; gap:0.125rem; }
        .rw-name { font-weight:500; color:#1f2937; font-size:0.875rem; }
        .rw-sub { font-size:0.75rem; color:#6b7280; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .datetime-cell { font-size:0.8125rem; white-space:nowrap; }
        .admin-rewards-page .table td .badge { white-space:nowrap; }
        .admin-rewards-page .table td.mono { white-space:nowrap; }
        .rw-pct { display:flex; align-items:center; gap:0.5rem; min-width:130px; font-size:0.8rem; font-variant-numeric:tabular-nums; }
        .rw-pct-bar { flex:1; height:6px; background:var(--gray-100); border-radius:999px; overflow:hidden; }
        .rw-pct-bar > div { height:100%; background:linear-gradient(90deg,#B18B36,#ECCA7B); }
        .actions-cell { display:flex; gap:0.4rem; flex-wrap:wrap; }
        .rw-hint { font-size:0.8rem; color:var(--gray-500); margin:0 0 1rem; }
        .rw-form { margin-top:1.25rem; padding:1rem; border:1px solid var(--gray-200); border-radius:var(--radius-lg); background:var(--gray-50); }
        .rw-form h4 { margin:0 0 0.75rem; }
        .rw-form label { display:flex; flex-direction:column; gap:0.3rem; font-size:0.8rem; font-weight:600; color:var(--gray-700); }
        .rw-form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:0.75rem; margin-bottom:0.75rem; }
        .rw-check-label { flex-direction:row !important; align-items:center; gap:0.5rem !important; padding-top:1.4rem; }
        .rw-counts { display:grid; grid-template-columns:repeat(6,1fr); gap:0.5rem; margin-bottom:0.75rem; }
        .rw-form-actions { display:flex; justify-content:flex-end; gap:0.5rem; }
        @media (max-width:640px) { .rw-counts { grid-template-columns:repeat(3,1fr); } }
      `}</style>
    </AdminLayout>
  );
};

export default AdminRewards;
