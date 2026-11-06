import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { memberAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSkeleton from '../../components/LoadingSkeleton';

// All user-facing text in one place so a Hindi translation can drop in later.
const T = {
  title: 'Rewards',
  subtitle: 'Milestone rewards for building your active team',
  activeTeam: 'Active Team',
  activeTeamNote: 'Active = member who completed their product payment. Counted 6 levels deep, all branches.',
  level: 'Level',
  activeCol: 'Active Team',
  required: (m) => `Required (${m})`,
  total: 'Total',
  reward: 'Reward',
  progress: 'Progress',
  members: (a, b) => `${a.toLocaleString('en-IN')} / ${b.toLocaleString('en-IN')} members`,
  levelRow: (l, a, b) => `Level ${l}: ${a.toLocaleString('en-IN')} / ${b.toLocaleString('en-IN')}`,
  showLevels: 'Show level details',
  hideLevels: 'Hide level details',
  lockedMsg: (prev) => `Complete ${prev} first`,
  awaitingActivation: 'Target complete! Activate your product to receive this reward.',
  activateNow: 'Activate now',
  inactiveBanner: 'Your product is not active yet. Your progress is tracked, but rewards are paid only to active members.',
  achievedOn: (d) => `Achieved on ${d}`,
  viewTxn: (id) => `View transaction #${id}`,
  credited: 'Credited to your withdrawable earnings',
  status: { LOCKED: 'Locked', IN_PROGRESS: 'In Progress', ACHIEVED: 'Achieved', PAID: 'Paid' },
  loadError: 'Failed to load rewards',
  empty: 'No reward plans are active right now.'
};

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const STATUS_CLASS = { LOCKED: 'rw-st-locked', IN_PROGRESS: 'rw-st-progress', ACHIEVED: 'rw-st-achieved', PAID: 'rw-st-paid' };

const PlanIcon = ({ icon }) => {
  if (icon === 'car') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 17h14M3 17v-4l2-5a2 2 0 012-1.5h10A2 2 0 0119 8l2 5v4h-2" />
        <path d="M3 13h18" />
        <circle cx="7.5" cy="17" r="2" /><circle cx="16.5" cy="17" r="2" />
      </svg>
    );
  }
  if (icon === 'bike') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="5.5" cy="16.5" r="3.5" /><circle cx="18.5" cy="16.5" r="3.5" />
        <path d="M5.5 16.5L9 9h5l4.5 7.5M9 9L7.5 6H5m9 3l-2.5 7.5h-6M14 9l1-3h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8m-4-4v4m-5-17h10v5a5 5 0 01-10 0V4zM7 6H4a3 3 0 003 4m10-4h3a3 3 0 01-3 4" />
    </svg>
  );
};

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);

const RewardCard = ({ plan, previous }) => {
  const [open, setOpen] = useState(false);
  const locked = plan.status === 'LOCKED';
  const paid = plan.status === 'PAID' || plan.status === 'ACHIEVED';
  const pct = Math.min(Math.max(plan.progress_pct, 0), 100);

  return (
    <div className={`card rw-card ${locked ? 'is-locked' : ''} ${paid ? 'is-paid' : ''} rw-icon-${plan.icon}`}>
      <div className="rw-card-head">
        <div className="rw-icon"><PlanIcon icon={plan.icon} /></div>
        <div className="rw-head-text">
          <div className="rw-title-row">
            <h3 className="rw-title">{plan.name}</h3>
            <span className="rw-matrix">{plan.matrix_label}</span>
          </div>
          <div className="rw-amount">{inr(plan.reward_amount)}</div>
        </div>
        <span className={`rw-status ${STATUS_CLASS[plan.status] || ''}`}>{T.status[plan.status] || plan.status}</span>
      </div>

      <div className="rw-progress">
        <div className="rw-progress-top">
          <span>{T.progress}</span>
          <strong>{pct.toFixed(2)}%</strong>
        </div>
        <div className="rw-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="rw-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="rw-progress-sub">{T.members(plan.achieved_total, plan.required_total)}</div>
      </div>

      {plan.awaiting_activation && (
        <div className="rw-note rw-note-warn">
          {T.awaitingActivation} <Link to="/orders">{T.activateNow} →</Link>
        </div>
      )}

      {paid && (
        <div className="rw-note rw-note-paid">
          <div>✅ {T.achievedOn(fmtDate(plan.achieved_at || plan.paid_at))}</div>
          <div className="rw-note-sub">
            {T.credited}
            {plan.transaction_id && <> · <Link to="/wallet">{T.viewTxn(plan.transaction_id)}</Link></>}
          </div>
        </div>
      )}

      <button type="button" className="rw-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? T.hideLevels : T.showLevels}
        <span className={`rw-chevron ${open ? 'open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="rw-levels">
          {plan.levels.map(lv => {
            const lp = lv.required > 0 ? Math.min(lv.actual / lv.required, 1) * 100 : 0;
            return (
              <div key={lv.level} className={`rw-level ${lv.met ? 'met' : ''}`}>
                <div className="rw-level-text">
                  <span>{T.levelRow(lv.level, lv.actual, lv.required)}</span>
                  {lv.met && <span className="rw-check">✓</span>}
                </div>
                <div className="rw-mini-bar"><div style={{ width: `${lp}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}

      {locked && (
        <div className="rw-lock-overlay">
          <div className="rw-lock-badge">
            <LockIcon />
            <span>{T.lockedMsg(previous ? `${previous.name} (${previous.matrix_label})` : 'the previous reward')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const Rewards = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await memberAPI.getRewards();
      setData(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || T.loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const plans = data?.plans || [];
  const levels = data?.levels || [];

  return (
    <DashboardLayout>
      <div className="rewards-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">{T.title}</h1>
            <p className="page-subtitle">{T.subtitle}</p>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {data && !data.userActive && (
              <div className="rw-banner">
                <span>💡</span>
                <p>{T.inactiveBanner} <Link to="/orders">{T.activateNow} →</Link></p>
              </div>
            )}

            {/* A. Active Team table */}
            <div className="card fade-in rw-team-card">
              <div className="card-header">
                <h3 className="card-title">👥 {T.activeTeam}</h3>
              </div>
              <p className="rw-team-note">{T.activeTeamNote}</p>
              <div className="table-container">
                <table className="table rw-team-table">
                  <thead>
                    <tr>
                      <th>{T.level}</th>
                      <th>{T.activeCol}</th>
                      {plans.map(p => <th key={p.id}>{T.required(p.matrix_label)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((lv, i) => (
                      <tr key={lv.level}>
                        <td><span className="rw-lvl-chip">L{lv.level}</span></td>
                        <td className="rw-num rw-active">{lv.active.toLocaleString('en-IN')}</td>
                        {plans.map(p => {
                          const req = p.levels[i]?.required || 0;
                          return (
                            <td key={p.id} className={`rw-num ${lv.active >= req ? 'rw-met' : ''}`}>
                              {req.toLocaleString('en-IN')}{lv.active >= req && <span className="rw-check">✓</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>{T.total}</td>
                      <td className="rw-num rw-active">{(data?.totalActive || 0).toLocaleString('en-IN')}</td>
                      {plans.map(p => <td key={p.id} className="rw-num">{p.required_total.toLocaleString('en-IN')}</td>)}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* B. Reward cards, in sequence */}
            {plans.length === 0 ? (
              <div className="card rw-empty">{T.empty}</div>
            ) : (
              <div className="rw-cards">
                {plans.map((p, i) => <RewardCard key={p.id} plan={p} previous={plans[i - 1]} />)}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .rewards-page { max-width: 1000px; }

        .rw-banner { display:flex; gap:0.75rem; align-items:flex-start; padding:0.9rem 1.1rem; margin-bottom:1.25rem;
          background:var(--gold-50); border:1px solid #ECCA7B; border-radius:var(--radius-lg); }
        .rw-banner p { margin:0; font-size:0.875rem; color:var(--gold-700); line-height:1.5; }
        .rw-banner a { font-weight:600; color:var(--gold-700); }

        .rw-team-card { margin-bottom:1.5rem; }
        .rw-team-note { font-size:0.8rem; color:var(--gray-500); margin:0 1.25rem 0.75rem; }
        .rw-team-table th, .rw-team-table td { white-space:nowrap; }
        .rw-num { font-variant-numeric: tabular-nums; }
        .rw-active { font-weight:700; color:var(--primary-700); }
        .rw-met { color:var(--primary-700); font-weight:600; }
        .rw-check { margin-left:0.35rem; color:#2f8a5b; font-weight:700; }
        .rw-lvl-chip { display:inline-block; min-width:2.2rem; text-align:center; padding:0.2rem 0.5rem; border-radius:var(--radius-sm);
          background:var(--primary-50); color:var(--primary-700); font-weight:700; font-size:0.8rem; }
        .rw-team-table tfoot td { font-weight:700; background:var(--gray-50); border-top:2px solid var(--gray-200); }

        .rw-cards { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
        .rw-card { position:relative; overflow:hidden; padding:1.25rem; display:flex; flex-direction:column; gap:1rem; }
        .rw-card.is-paid { border-color:#ECCA7B; box-shadow:0 0 0 1px #ECCA7B inset; }

        .rw-card-head { display:flex; align-items:flex-start; gap:0.85rem; }
        .rw-icon { flex:0 0 auto; width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center;
          background:linear-gradient(135deg,#073C39,#0B4541); color:#ECCA7B; }
        .rw-icon svg { width:30px; height:30px; }
        .rw-head-text { flex:1; min-width:0; }
        .rw-title-row { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
        .rw-title { margin:0; font-size:1.1rem; color:var(--gray-900); }
        .rw-matrix { font-size:0.72rem; font-weight:700; padding:0.15rem 0.45rem; border-radius:var(--radius-sm);
          background:var(--gold-100); color:var(--gold-700); }
        .rw-amount { font-size:1.5rem; font-weight:800; color:var(--primary-700); margin-top:0.15rem; letter-spacing:-0.01em; }

        .rw-status { flex:0 0 auto; font-size:0.72rem; font-weight:700; padding:0.3rem 0.6rem; border-radius:var(--radius-full); white-space:nowrap; }
        .rw-st-locked { background:var(--gray-100); color:var(--gray-600); }
        .rw-st-progress { background:var(--primary-50); color:var(--primary-700); }
        .rw-st-achieved { background:var(--gold-100); color:var(--gold-700); }
        .rw-st-paid { background:#E3F4EA; color:#1F6B44; }

        .rw-progress-top { display:flex; justify-content:space-between; font-size:0.8rem; color:var(--gray-600); margin-bottom:0.4rem; }
        .rw-progress-top strong { color:var(--gray-900); font-size:0.95rem; }
        .rw-bar { height:10px; background:var(--gray-100); border-radius:999px; overflow:hidden; }
        .rw-bar-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,#B18B36,#CFAA57,#ECCA7B); transition:width .6s ease; min-width:2px; }
        .rw-progress-sub { font-size:0.75rem; color:var(--gray-500); margin-top:0.35rem; }

        .rw-note { font-size:0.82rem; padding:0.65rem 0.8rem; border-radius:var(--radius-md); line-height:1.45; }
        .rw-note a { font-weight:600; }
        .rw-note-warn { background:var(--gold-50); color:var(--gold-700); border:1px solid #ECCA7B; }
        .rw-note-paid { background:#F1F8F4; color:#1F6B44; border:1px solid #CDE8D7; font-weight:600; }
        .rw-note-sub { font-weight:400; font-size:0.75rem; color:var(--gray-600); margin-top:0.2rem; }

        .rw-toggle { display:flex; align-items:center; justify-content:space-between; width:100%; background:none; border:none;
          border-top:1px solid var(--gray-100); padding:0.75rem 0 0; font-size:0.85rem; font-weight:600; color:var(--primary-600); cursor:pointer; }
        .rw-chevron { transition:transform .2s; display:inline-block; }
        .rw-chevron.open { transform:rotate(180deg); }

        .rw-levels { display:flex; flex-direction:column; gap:0.6rem; }
        .rw-level-text { display:flex; justify-content:space-between; font-size:0.82rem; color:var(--gray-700); margin-bottom:0.25rem; font-variant-numeric:tabular-nums; }
        .rw-mini-bar { height:6px; background:var(--gray-100); border-radius:999px; overflow:hidden; }
        .rw-mini-bar > div { height:100%; background:var(--primary-500, #5D8172); border-radius:999px; }
        .rw-level.met .rw-mini-bar > div { background:#2f8a5b; }

        .rw-lock-overlay { position:absolute; inset:0; background:rgba(247,248,245,0.72); backdrop-filter:blur(1.5px);
          display:flex; align-items:center; justify-content:center; padding:1rem; pointer-events:none; }
        .rw-lock-badge { display:flex; align-items:center; gap:0.6rem; padding:0.7rem 1rem; border-radius:var(--radius-lg);
          background:#073C39; color:#fff; font-size:0.875rem; font-weight:600; box-shadow:0 8px 24px rgba(7,60,57,.25); text-align:left; }
        .rw-lock-badge svg { width:20px; height:20px; color:#ECCA7B; flex:0 0 auto; }

        .rw-empty { padding:2rem; text-align:center; color:var(--gray-500); }
        .fade-in { animation:fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }

        @media (max-width:768px) {
          .rw-cards { grid-template-columns:1fr; }
          .rw-amount { font-size:1.3rem; }
          .rw-team-table th, .rw-team-table td { padding:0.6rem 0.55rem; font-size:0.82rem; }
          .rw-team-note { margin:0 1rem 0.75rem; }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Rewards;
