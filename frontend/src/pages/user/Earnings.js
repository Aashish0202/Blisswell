import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { userAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';
import { rankBadgeClass, RANK_COLORS } from '../../utils/rankTheme';

const Earnings = () => {
  const [loading, setLoading] = useState(true);

  const [earnings, setEarnings] = useState({
    totalEarnings: 0, teamIncomeTotal: 0,
    availableForWithdrawal: 0, totalWithdrawn: 0, pendingWithdrawal: 0
  });
  const [teamIncome, setTeamIncome] = useState({
    totalEarned: 0,
    earnedFromPurchases: 0, earnedFromRepurchases: 0, ranks: []
  });

  const [events, setEvents] = useState([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);
  // Source filter for team income history: '' = all, 'purchase', 'repurchase'
  const [eventsSource, setEventsSource] = useState('');
  const [eventTotals, setEventTotals] = useState({ purchase: 0, purchaseCount: 0, repurchase: 0, repurchaseCount: 0 });

  const fetchCore = useCallback(async () => {
    try {
      const [earnRes, tiRes] = await Promise.all([
        userAPI.getEarnings().catch(() => null),
        userAPI.getTeamIncome().catch(() => null)
      ]);
      if (earnRes?.data?.earnings) setEarnings(earnRes.data.earnings);
      if (tiRes?.data?.teamIncome) setTeamIncome(tiRes.data.teamIncome);
    } catch (e) {
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async (page, source = eventsSource) => {
    try {
      const res = await userAPI.getTeamIncomeHistory(page, source);
      setEvents(res.data.events || []);
      setEventsTotal(res.data.total || 0);
      setEventsTotalPages(res.data.totalPages || 1);
      if (res.data.totals) setEventTotals(res.data.totals);
    } catch (e) { /* ignore */ }
  }, [eventsSource]);

  useEffect(() => { fetchCore(); }, [fetchCore]);
  useEffect(() => { fetchEvents(eventsPage); }, [eventsPage, fetchEvents]);
  const handleEventsSource = (source) => {
    setEventsSource(source);
    setEventsPage(1);
    fetchEvents(1, source);
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="earnings-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Earnings</h1>
              <p className="page-subtitle">Team Income Overview</p>
            </div>
          </div>
          <div className="stats-grid">
            <LoadingSkeleton variant="stat" /><LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" /><LoadingSkeleton variant="stat" />
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
            <p className="page-subtitle">Team Income Overview</p>
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
              <strong>Level Income:</strong> When your downline purchases, you earn per the purchaser's rank table — all 10 levels per rank (Star, Silver, Gold, Platinum), as long as your own package is active. You also earn again when your downline's Repurchase Wallet auto-buys their next rank.
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
            <div className="stat-subtext">Level income (purchases + repurchases)</div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Level Income</div>
            <div className="stat-value">{fmt(earnings.teamIncomeTotal)}</div>
            <div className="stat-subtext">From downline purchases</div>
          </div>
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
            <div className="income-breakdown">
              <div className="breakdown-cell">
                <span className="breakdown-icon">🛒</span>
                <div>
                  <span className="muted">From Purchases</span>
                  <strong>{fmt(teamIncome.earnedFromPurchases)}</strong>
                  <span className="breakdown-sub">downline product orders</span>
                </div>
              </div>
              <div className="breakdown-cell breakdown-cell-repurchase">
                <span className="breakdown-icon">🔄</span>
                <div>
                  <span className="muted">From Repurchases</span>
                  <strong>{fmt(teamIncome.earnedFromRepurchases)}</strong>
                  <span className="breakdown-sub">auto rank upgrades of downline</span>
                </div>
              </div>
            </div>
            <p className="team-note">
              Each rank below shows the income you earn per level (L1–L10) when a downline member purchases that rank.
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

        {/* Team income history */}
        <div className="card fade-in">
          <div className="card-header">
            <h3 className="card-title">Team Income Events</h3>
            {eventsTotal > 0 && <span className="badge badge-neutral">{eventsTotal} Events</span>}
          </div>
          {/* Income breakdown strip */}
          <div className="event-breakdown">
            <button className={`breakdown-pill ${eventsSource === '' ? 'active' : ''}`} onClick={() => handleEventsSource('')}>
              All Income <strong>{fmt(eventTotals.purchase + eventTotals.repurchase)}</strong>
            </button>
            <button className={`breakdown-pill breakdown-pill-purchase ${eventsSource === 'purchase' ? 'active' : ''}`} onClick={() => handleEventsSource('purchase')}>
              🛒 Purchases <strong>{fmt(eventTotals.purchase)}</strong>
              <span className="pill-count">{eventTotals.purchaseCount}</span>
            </button>
            <button className={`breakdown-pill breakdown-pill-repurchase ${eventsSource === 'repurchase' ? 'active' : ''}`} onClick={() => handleEventsSource('repurchase')}>
              🔄 Repurchases <strong>{fmt(eventTotals.repurchase)}</strong>
              <span className="pill-count">{eventTotals.repurchaseCount}</span>
            </button>
          </div>
          {events.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Date</th><th>Purchaser</th><th>Source</th><th>Rank</th><th>Level</th><th>Amount</th></tr></thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{formatDateTime(ev.created_at)}</td>
                      <td className="font-medium">{ev.purchaser_name}</td>
                      <td>{ev.order_source === 'auto_repurchase'
                        ? <span className="source-badge source-repurchase">🔄 Repurchase</span>
                        : <span className="source-badge source-purchase">🛒 Purchase</span>}</td>
                      <td>{ev.rank_name ? <span className={rankBadgeClass(ev.rank_name)}>{ev.rank_name}</span> : '-'}</td>
                      <td><span className="period-badge">Level {ev.level}</span></td>
                      <td className="text-primary font-semibold">{fmt(ev.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="👥" title="No team income yet" description="When your downline purchases a product (or auto-repurchases to a higher rank), your team income will appear here." />
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