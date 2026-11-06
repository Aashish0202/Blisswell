import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { userAPI, memberAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';
import { rankBadgeClass, RANK_COLORS } from '../../utils/rankTheme';

const Earnings = () => {
  const [loading, setLoading] = useState(true);

  const [earnings, setEarnings] = useState({
    totalEarnings: 0, teamIncomeTotal: 0, rewardIncomeTotal: 0,
    availableForWithdrawal: 0, totalWithdrawn: 0, pendingWithdrawal: 0
  });
  const [teamIncome, setTeamIncome] = useState({
    totalEarned: 0, ranks: []
  });
  const [rewardPlans, setRewardPlans] = useState([]);

  const [events, setEvents] = useState([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);

  const fetchCore = useCallback(async () => {
    try {
      const [earnRes, tiRes, rwRes] = await Promise.all([
        userAPI.getEarnings().catch(() => null),
        userAPI.getTeamIncome().catch(() => null),
        memberAPI.getRewards().catch(() => null)
      ]);
      if (earnRes?.data?.earnings) setEarnings(earnRes.data.earnings);
      if (tiRes?.data?.teamIncome) setTeamIncome(tiRes.data.teamIncome);
      if (rwRes?.data?.plans) setRewardPlans(rwRes.data.plans);
    } catch (e) {
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async (page) => {
    try {
      const res = await userAPI.getTeamIncomeHistory(page);
      setEvents(res.data.events || []);
      setEventsTotal(res.data.total || 0);
      setEventsTotalPages(res.data.totalPages || 1);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { fetchCore(); }, [fetchCore]);
  useEffect(() => { fetchEvents(eventsPage); }, [eventsPage, fetchEvents]);

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="earnings-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Earnings</h1>
              <p className="page-subtitle">Level Income &amp; Reward Income Overview</p>
            </div>
          </div>
          <div className="stats-grid">
            <LoadingSkeleton variant="stat" /><LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" /><LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="earnings-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Earnings</h1>
            <p className="page-subtitle">Level Income &amp; Reward Income Overview</p>
          </div>
          <Link to="/withdrawal" className="btn btn-primary">
            <span>🏦</span> Go to Withdrawal
          </Link>
        </div>

        {/* Info banner */}
        <div className="info-banner">
          <div className="info-icon">💡</div>
          <div className="info-content">
            <strong>How Earnings Work</strong>
            <p>
              <strong>Level Income:</strong> When your downline purchases the package, you earn level income across up to {teamIncome.maxLevels || 10} levels, as long as your own package is active.
              <strong>Reward Income:</strong> One-time milestone rewards (Bike Fund, Car Fund) credited when your team reaches the required active members. See <Link to="/rewards">Rewards</Link> for your progress.
              &nbsp;Head to the <Link to="/withdrawal">Withdrawal page</Link> to cash out your available earnings.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card highlight">
            <div className="stat-icon">📊</div>
            <div className="stat-label">Total Earnings</div>
            <div className="stat-value">{fmt(earnings.totalEarnings)}</div>
            <div className="stat-subtext">Level + reward income</div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Level Income</div>
            <div className="stat-value">{fmt(earnings.teamIncomeTotal)}</div>
            <div className="stat-subtext">From downline purchases</div>
          </div>
          <Link to="/rewards" className="stat-card reward">
            <div className="stat-icon">🏆</div>
            <div className="stat-label">Reward Income</div>
            <div className="stat-value">{fmt(earnings.rewardIncomeTotal)}</div>
            <div className="stat-subtext">Bike &amp; Car Fund →</div>
          </Link>
          <Link to="/withdrawal" className="stat-card">
            <div className="stat-icon">🏦</div>
            <div className="stat-label">Available for Withdrawal</div>
            <div className="stat-value">{fmt(earnings.availableForWithdrawal)}</div>
            <div className="stat-subtext">Withdrawable balance →</div>
          </Link>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Pending Withdrawal</div>
            <div className="stat-value">{fmt(earnings.pendingWithdrawal)}</div>
            <div className="stat-subtext">Awaiting processing</div>
          </div>
        </div>

        {/* Team Income card */}
        <div className="card fade-in earnings-card">
          <div className="card-header">
            <h3 className="card-title">👥 Team Income</h3>
          </div>
          <div className="team-body">
            <div className="team-summary">
              <div><span className="muted">Total Earned</span><strong>{fmt(teamIncome.totalEarned)}</strong></div>
            </div>
            <p className="team-note">
              Below is the income you earn per level (L1–L{teamIncome.maxLevels || 10}) when a downline member purchases the package.
              Every level is always active — the only requirement is that your own package stays active.
            </p>
            {(teamIncome.ranks || []).map((rank) => (
              <div key={rank.product_id} className="rank-block">
                <div className="rank-block-head">
                  <span className="rank-name" style={RANK_COLORS[rank.rank_name] ? { color: RANK_COLORS[rank.rank_name].dark } : undefined}>{rank.rank_name}</span>
                  <span className="rank-price">₹{Number(rank.price).toLocaleString()}</span>
                </div>
                <div className="levels-grid">
                  {(rank.levels || []).map((lv) => (
                    <div key={lv.level} className="level-chip unlocked">
                      <div className="level-head">
                        <span className="level-num">L{lv.level}</span>
                      </div>
                      <div className="level-amount">{fmt(lv.amount)}</div>
                      <div className="level-earned">{lv.earned > 0 ? `Earned ${fmt(lv.earned)}` : 'Active'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reward income — one row per milestone plan */}
        {rewardPlans.length > 0 && (
          <div className="card fade-in earnings-card">
            <div className="card-header">
              <h3 className="card-title">🏆 Reward Income</h3>
              <Link to="/rewards" className="btn btn-ghost btn-sm">View Progress →</Link>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Reward</th><th>Amount</th><th>Progress</th><th>Status</th><th>Paid On</th></tr></thead>
                <tbody>
                  {rewardPlans.map((p) => {
                    const st = p.status === 'PAID' ? { cls: 'badge-success', label: 'Paid' }
                      : p.awaiting_activation || p.status === 'ACHIEVED' ? { cls: 'badge-warning', label: 'Achieved · awaiting activation' }
                      : p.status === 'LOCKED' ? { cls: 'badge-neutral', label: 'Locked' }
                      : { cls: 'badge-info', label: 'In progress' };
                    const pct = p.status === 'PAID' ? 100 : Math.min(100, Number(p.progress_pct) || 0);
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="font-medium">{p.icon === 'car' ? '🚗' : p.icon === 'bike' ? '🏍️' : '🎁'} {p.name}</span>
                          {p.matrix_label && <span className="text-muted" style={{ fontSize: '0.75rem' }}> ({p.matrix_label})</span>}
                        </td>
                        <td className={p.status === 'PAID' ? 'text-primary font-semibold' : ''}>{fmt(p.status === 'PAID' ? (p.paid_amount ?? p.reward_amount) : p.reward_amount)}</td>
                        <td style={{ minWidth: 120 }}>
                          <div className="rw-progress"><div className="rw-progress-bar" style={{ width: `${pct}%` }} /></div>
                          <span className="text-muted" style={{ fontSize: '0.7rem' }}>{pct.toFixed(pct < 10 && pct > 0 ? 2 : 0)}%</span>
                        </td>
                        <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                        <td>{p.paid_at ? formatDateTime(p.paid_at) : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Team income history */}
        <div className="card fade-in">
          <div className="card-header">
            <h3 className="card-title">Team Income Events</h3>
            {eventsTotal > 0 && <span className="badge badge-neutral">{eventsTotal} Events</span>}
          </div>
          {events.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Date</th><th>Purchaser</th><th>Package</th><th>Level</th><th>Amount</th></tr></thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{formatDateTime(ev.created_at)}</td>
                      <td className="font-medium">{ev.purchaser_name}</td>
                      <td>{ev.rank_name ? <span className={rankBadgeClass(ev.rank_name)}>{ev.rank_name}</span> : '-'}</td>
                      <td><span className="period-badge">Level {ev.level}</span></td>
                      <td className="text-primary font-semibold">{fmt(ev.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="👥" title="No team income yet" description="When your downline purchases the package, your team income will appear here." />
          )}
          {eventsTotal > 0 && <Pagination page={eventsPage} totalPages={eventsTotalPages} total={eventsTotal} onChange={setEventsPage} />}
        </div>
      </div>

      <style>{`
        .earnings-page { max-width: 1000px; }
        .earnings-page .page-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }

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
        a.stat-card { display:block; text-decoration:none; color:inherit; }

        .earnings-card { margin-bottom:1.5rem; }
        .stat-card.reward { background:linear-gradient(135deg,#B18B36,#073C39); border:none; }
        .stat-card.reward .stat-label,.stat-card.reward .stat-value,
        .stat-card.reward .stat-subtext,.stat-card.reward .stat-icon { color:white; }
        .rw-progress { height:6px; background:var(--gray-100); border-radius:999px; overflow:hidden; margin-bottom:0.15rem; }
        .rw-progress-bar { height:100%; background:linear-gradient(90deg,#CFAA57,#B18B36); border-radius:999px; }

        .team-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1rem; }
        .team-summary div { display:flex; flex-direction:column; }
        .team-summary .muted { font-size:0.75rem; color:var(--gray-500); }
        .team-summary strong { font-size:1.1rem; color:var(--gray-900); }
        .levels-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:0.6rem; }
        .level-chip { padding:0.6rem; border-radius:var(--radius-md); border:1px solid var(--gray-200); background:var(--gray-50); text-align:center; }
        .level-chip.unlocked { border-color:var(--primary-200); background:var(--primary-50); }
        .level-head { display:flex; align-items:center; justify-content:center; gap:0.25rem; }
        .level-num { font-weight:700; color:var(--primary-700); }
        .level-amount { font-weight:600; color:var(--gray-900); font-size:0.95rem; margin-top:0.15rem; }
        .level-earned { font-size:0.7rem; color:var(--gray-500); margin-top:0.15rem; }

        .team-note { font-size:0.8rem; color:var(--gray-500); margin:0 0 1rem; }

        .income-breakdown { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem; }
        .breakdown-cell { display:flex; align-items:center; gap:0.65rem; padding:0.75rem 0.9rem;
          border:1px solid var(--gray-200); border-radius:var(--radius-md); background:var(--gray-50); }
        .breakdown-cell-repurchase { border-color:#C7DBCA; background:#F1F5F1; }
        .breakdown-icon { font-size:1.3rem; }
        .breakdown-cell div { display:flex; flex-direction:column; }
        .breakdown-cell .muted { font-size:0.72rem; color:var(--gray-500); }
        .breakdown-cell strong { font-size:1.05rem; color:var(--gray-900); }
        .breakdown-sub { font-size:0.68rem; color:var(--gray-400); }

        .event-breakdown { display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:1rem; }
        .breakdown-pill { display:inline-flex; align-items:center; gap:0.4rem; padding:0.45rem 0.85rem;
          border:1px solid var(--gray-200); border-radius:var(--radius-full); background:#fff;
          font-size:0.82rem; color:var(--gray-600); cursor:pointer; transition:all 0.15s ease; }
        .breakdown-pill strong { color:var(--gray-900); }
        .breakdown-pill:hover { border-color:var(--gray-300); }
        .breakdown-pill.active { border-color:var(--primary-500); background:var(--primary-50); color:var(--primary-700); }
        .breakdown-pill-purchase.active { border-color:#CFAA57; background:#FFF4D6; }
        .breakdown-pill-repurchase.active { border-color:#5D8172; background:#F1F5F1; }
        .pill-count { font-size:0.68rem; color:var(--gray-400); background:var(--gray-100);
          padding:0.1rem 0.4rem; border-radius:var(--radius-full); }

        .source-badge { display:inline-flex; align-items:center; gap:0.25rem; padding:0.2rem 0.55rem;
          border-radius:var(--radius-sm); font-size:0.72rem; font-weight:600; white-space:nowrap; }
        .source-purchase { background:#FFF4D6; color:#B18B36; }
        .source-repurchase { background:#F1F5F1; color:#40584E; }

        .rank-block { margin-bottom:1.25rem; }
        .rank-block:last-child { margin-bottom:0; }
        .rank-block-head { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem; }
        .rank-name { font-weight:700; color:var(--primary-700); }
        .rank-price { font-size:0.8rem; color:var(--gray-500); }
        .rank-badge { display:inline-block; padding:0.2rem 0.5rem; background:var(--primary-50); color:var(--primary-700); border-radius:var(--radius-sm); font-size:0.72rem; font-weight:600; }

        .period-badge { display:inline-block; padding:0.25rem 0.5rem; background:var(--gray-100); border-radius:var(--radius-sm); font-size:0.75rem; font-weight:500; color:var(--gray-700); }
        .datetime-cell { font-size:0.8125rem; white-space:nowrap; }
        .font-medium { font-weight:500; }
        .font-semibold { font-weight:600; }
        .muted { color:var(--gray-500); }
        .fade-in { animation:fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }

        @media (max-width:768px) {
          .info-banner { flex-direction:column; }
          .stats-grid { grid-template-columns:1fr 1fr; }
          .team-summary { grid-template-columns:1fr 1fr 1fr; }
          .datetime-cell { font-size:0.75rem; }
        }
        @media (max-width:480px) {
          .stats-grid { grid-template-columns:1fr; }
          .levels-grid { grid-template-columns:repeat(2,1fr); }
          .income-breakdown { grid-template-columns:1fr; }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Earnings;