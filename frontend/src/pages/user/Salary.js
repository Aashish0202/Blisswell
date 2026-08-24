import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { userAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';

const Incentive = () => {
  const [cycles, setCycles] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [activeTab, setActiveTab] = useState('cycles');
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState({ earnings_balance: 0, total_earned: 0, min_payout_amount: 500, payout_day: 1 });
  const [stats, setStats] = useState({
    totalActive: 0,
    totalEarned: 0,
    pendingAmount: 0,
    remainingIncentive: 0
  });
  const [cyclesPage, setCyclesPage] = useState(1);
  const [cyclesTotalPages, setCyclesTotalPages] = useState(1);
  const [cyclesTotal, setCyclesTotal] = useState(0);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [payoutsTotalPages, setPayoutsTotalPages] = useState(1);
  const [payoutsTotal, setPayoutsTotal] = useState(0);

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => { fetchCycles(cyclesPage); }, [cyclesPage]);
  useEffect(() => { fetchPayouts(payoutsPage); }, [payoutsPage]);

  const fetchInitial = async () => {
    try {
      const [cyclesRes, payoutsRes, earningsRes, summaryRes] = await Promise.all([
        userAPI.getSalaryCycles(1),
        userAPI.getPayouts(1),
        userAPI.getEarnings().catch(() => null),
        userAPI.getSalarySummary().catch(() => null)
      ]);
      setCycles(cyclesRes.data.cycles);
      setCyclesTotal(cyclesRes.data.total || cyclesRes.data.cycles.length);
      setCyclesTotalPages(cyclesRes.data.totalPages || 1);
      setPayouts(payoutsRes.data.payouts);
      setPayoutsTotal(payoutsRes.data.total || payoutsRes.data.payouts.length);
      setPayoutsTotalPages(payoutsRes.data.totalPages || 1);
      if (earningsRes?.data) setEarnings(earningsRes.data);
      if (summaryRes?.data?.summary) setStats(summaryRes.data.summary);
    } catch (error) {
      toast.error('Failed to load incentive data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async (page) => {
    try {
      const res = await userAPI.getSalaryCycles(page);
      setCycles(res.data.cycles);
      setCyclesTotal(res.data.total || res.data.cycles.length);
      setCyclesTotalPages(res.data.totalPages || 1);
    } catch (e) { /* ignore page fetch errors */ }
  };

  const fetchPayouts = async (page) => {
    try {
      const res = await userAPI.getPayouts(page);
      setPayouts(res.data.payouts);
      setPayoutsTotal(res.data.total || res.data.payouts.length);
      setPayoutsTotalPages(res.data.totalPages || 1);
    } catch (e) { /* ignore page fetch errors */ }
  };

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const payoutDayName = DAY_NAMES[earnings.payout_day ?? 1] || 'Monday';

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': 'success',
      'completed': 'info',
      'paid': 'success',
      'pending': 'warning'
    };
    return statusMap[status] || 'neutral';
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="incentive-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Incentive</h1>
              <p className="page-subtitle">Track your referral earnings</p>
            </div>
          </div>
          <div className="stats-grid">
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="incentive-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Incentive</h1>
            <p className="page-subtitle">Track your referral earnings and payouts</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="info-banner">
          <div className="info-icon">💡</div>
          <div className="info-content">
            <strong>How Daily Incentive Works</strong>
            <p>For each active referral, a fixed daily incentive is credited daily to your Earning Wallet (lifetime total). Your Withdrawal Wallet shows the currently withdrawable balance. Every <strong>{payoutDayName}</strong>, a withdrawal request is auto-generated for your withdrawable balance (min ₹{Number(earnings.min_payout_amount || 0).toLocaleString()}) and paid to your bank by admin.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Active Cycles</div>
            <div className="stat-value">{stats.totalActive}</div>
            <div className="stat-subtext">Currently earning</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Earning Wallet</div>
            <div className="stat-value">₹{Number(earnings.total_earned || 0).toLocaleString()}</div>
            <div className="stat-subtext">Lifetime incentive earned</div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">🏦</div>
            <div className="stat-label">Withdrawal Wallet</div>
            <div className="stat-value">₹{Number(earnings.earnings_balance || 0).toLocaleString()}</div>
            <div className="stat-subtext">Withdrawable on {payoutDayName}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Pending Withdrawals</div>
            <div className="stat-value">₹{stats.pendingAmount.toLocaleString()}</div>
            <div className="stat-subtext">Awaiting payout</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-icon">📊</div>
            <div className="stat-label">Remaining Incentive</div>
            <div className="stat-value">₹{stats.remainingIncentive.toLocaleString()}</div>
            <div className="stat-subtext">To be received</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'cycles' ? 'active' : ''}`}
            onClick={() => setActiveTab('cycles')}
          >
            💸 Incentive Cycles
          </button>
          <button
            className={`tab ${activeTab === 'payouts' ? 'active' : ''}`}
            onClick={() => setActiveTab('payouts')}
          >
            📋 Withdrawal History
          </button>
        </div>

        {/* Incentive Cycles */}
        {activeTab === 'cycles' && (
          <div className="card fade-in">
            <div className="card-header">
              <h3 className="card-title">Incentive Cycles</h3>
              {cyclesTotal > 0 && (
                <span className="badge badge-neutral">{cyclesTotal} Cycles</span>
              )}
            </div>
            {cycles.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Referral</th>
                      <th>Start Date</th>
                      <th>Daily Amount</th>
                      <th>Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycles.map((cycle) => {
                      const days = cycle.days || cycle.duration || 1;
                      const daysPaid = cycle.days_paid != null ? cycle.days_paid : (cycle.months_paid || 0);
                      const startDate = cycle.start_date || cycle.start_month;
                      const dailyAmount = cycle.daily_amount || cycle.monthly_amount || 0;
                      return (
                        <tr key={cycle.id}>
                          <td className="font-medium">{cycle.referral_name}</td>
                          <td>{startDate ? new Date(startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                          <td className="text-primary font-semibold">₹{parseFloat(dailyAmount).toLocaleString()}</td>
                          <td>
                            <div className="progress-cell">
                              <div className="progress-bar-mini">
                                <div
                                  className="progress-fill-mini"
                                  style={{ width: `${Math.min(100, (daysPaid / days) * 100)}%` }}
                                />
                              </div>
                              <span className="progress-text">{daysPaid}/{days} days</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-${getStatusBadge(cycle.status)}`}>
                              {cycle.status === 'active' ? '✓ Active' : '✓ Completed'}
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
                icon="💸"
                title="No incentive cycles yet"
                description="Start referring friends to create incentive cycles. Each active referral earns a daily incentive credited to your earning wallet."
                action={{
                  label: 'View Referrals',
                  onClick: () => window.location.href = '/referrals',
                  variant: 'primary'
                }}
              />
            )}
            {cyclesTotal > 0 && (
              <Pagination
                page={cyclesPage}
                totalPages={cyclesTotalPages}
                total={cyclesTotal}
                onChange={setCyclesPage}
              />
            )}
          </div>
        )}

        {/* Payout History */}
        {activeTab === 'payouts' && (
          <div className="card fade-in">
            <div className="card-header">
              <h3 className="card-title">Withdrawal History</h3>
              {payoutsTotal > 0 && (
                <span className="badge badge-neutral">{payoutsTotal} Withdrawals</span>
              )}
            </div>
            {payouts.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Referral</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td>
                          <span className="period-badge">
                            {payout.is_withdrawal ? 'Withdrawal' : 'Incentive'}
                          </span>
                        </td>
                        <td className="font-medium">{payout.referral_name || '-'}</td>
                        <td>
                          <span className="period-badge">
                            {payout.payout_date ? new Date(payout.payout_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (payout.month ? `${payout.month}/${payout.year}` : '-')}
                          </span>
                        </td>
                        <td className="text-primary font-semibold">₹{parseFloat(payout.amount).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${getStatusBadge(payout.status)}`}>
                            {payout.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                          </span>
                        </td>
                        <td className="text-muted datetime-cell">
                          {payout.paid_at ? formatDateTime(payout.paid_at) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="📋"
                title="No withdrawal history"
                description="Your withdrawal requests will appear here once your earning wallet reaches the minimum payout amount."
              />
            )}
            {payoutsTotal > 0 && (
              <Pagination
                page={payoutsPage}
                totalPages={payoutsTotalPages}
                total={payoutsTotal}
                onChange={setPayoutsPage}
              />
            )}
          </div>
        )}
      </div>

      <style>{`
        .incentive-page {
          max-width: 1000px;
        }

        .info-banner {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--status-paid-bg);
          border: 1px solid var(--primary-200);
          border-radius: var(--radius-lg);
          margin-bottom: 1.5rem;
        }

        .info-icon {
          font-size: 1.25rem;
        }

        .info-content strong {
          display: block;
          color: var(--primary-700);
          margin-bottom: 0.25rem;
        }

        .info-content p {
          color: var(--primary-600);
          font-size: 0.875rem;
          margin: 0;
          line-height: 1.4;
        }

        .stat-subtext {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card.highlight {
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          border: none;
        }

        .stat-card.highlight .stat-label,
        .stat-card.highlight .stat-value,
        .stat-card.highlight .stat-subtext,
        .stat-card.highlight .stat-icon {
          color: white;
        }

        .progress-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .progress-bar-mini {
          width: 80px;
          height: 6px;
          background: var(--gray-200);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-fill-mini {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-500), var(--accent-500));
          border-radius: var(--radius-full);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.75rem;
          color: var(--gray-500);
          font-weight: 500;
        }

        .period-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: var(--gray-100);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--gray-700);
        }

        .datetime-cell {
          font-size: 0.8125rem;
          white-space: nowrap;
        }

        .font-medium {
          font-weight: 500;
        }

        .font-semibold {
          font-weight: 600;
        }

        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: var(--gray-100);
          padding: 0.25rem;
          border-radius: var(--radius-lg);
        }

        .tab {
          flex: 1;
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

        .tab.active {
          background: white;
          color: var(--primary-600);
          box-shadow: var(--shadow-sm);
        }

        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .info-banner {
            flex-direction: column;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .datetime-cell {
            font-size: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Incentive;