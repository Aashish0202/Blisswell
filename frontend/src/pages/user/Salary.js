import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { userAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const Incentive = () => {
  const [cycles, setCycles] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [activeTab, setActiveTab] = useState('cycles');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActive: 0,
    totalPaused: 0,
    totalEarned: 0,
    pendingAmount: 0,
    remainingIncentive: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cyclesRes, payoutsRes] = await Promise.all([
        userAPI.getSalaryCycles(1),
        userAPI.getPayouts(1)
      ]);
      const cyclesData = cyclesRes.data.cycles;
      const payoutsData = payoutsRes.data.payouts;

      setCycles(cyclesData);
      setPayouts(payoutsData);

      // Calculate stats
      const activeCycles = cyclesData.filter(c => c.status === 'active');
      const pausedCycles = cyclesData.filter(c => c.status === 'paused');
      const totalEarned = payoutsData.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const pendingAmount = payoutsData.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount), 0);

      // Calculate remaining incentive (total expected - total earned - pending)
      const totalExpected = cyclesData.reduce((sum, c) => {
        if (c.status === 'active' || c.status === 'paused') {
          const remainingMonths = c.duration - c.months_paid;
          return sum + (parseFloat(c.monthly_amount) * remainingMonths);
        }
        return sum;
      }, 0);

      setStats({
        totalActive: activeCycles.length,
        totalPaused: pausedCycles.length,
        totalEarned,
        pendingAmount,
        remainingIncentive: totalExpected
      });
    } catch (error) {
      toast.error('Failed to load incentive data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'active': 'success',
      'paused': 'warning',
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
            <strong>How Incentive Works</strong>
            <p>For each active referral, you earn ₹100/month for 12 months. Cycles start when your referral purchases a package.</p>
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
          <div className="stat-card warning">
            <div className="stat-icon">⏸️</div>
            <div className="stat-label">Paused Cycles</div>
            <div className="stat-value">{stats.totalPaused}</div>
            <div className="stat-subtext">Temporarily stopped</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Total Earned</div>
            <div className="stat-value">₹{stats.totalEarned.toLocaleString()}</div>
            <div className="stat-subtext">Lifetime earnings</div>
          </div>
          <div className="stat-card info">
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Pending Amount</div>
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
            📋 Payout History
          </button>
        </div>

        {/* Incentive Cycles */}
        {activeTab === 'cycles' && (
          <div className="card fade-in">
            <div className="card-header">
              <h3 className="card-title">Incentive Cycles</h3>
              {cycles.length > 0 && (
                <span className="badge badge-neutral">{cycles.length} Cycles</span>
              )}
            </div>
            {cycles.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Referral</th>
                      <th>Start Month</th>
                      <th>Monthly Amount</th>
                      <th>Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycles.map((cycle) => (
                      <tr key={cycle.id}>
                        <td className="font-medium">{cycle.referral_name}</td>
                        <td>{new Date(cycle.start_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</td>
                        <td className="text-primary font-semibold">₹{cycle.monthly_amount}</td>
                        <td>
                          <div className="progress-cell">
                            <div className="progress-bar-mini">
                              <div
                                className="progress-fill-mini"
                                style={{ width: `${(cycle.months_paid / cycle.duration) * 100}%` }}
                              />
                            </div>
                            <span className="progress-text">{cycle.months_paid}/{cycle.duration}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${getStatusBadge(cycle.status)}`}>
                            {cycle.status === 'active' ? '✓ Active' :
                             cycle.status === 'paused' ? '⏸️ Paused' : '✓ Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="💸"
                title="No incentive cycles yet"
                description="Start referring friends to create incentive cycles. Each active referral generates ₹100/month for 12 months."
                action={{
                  label: 'View Referrals',
                  onClick: () => window.location.href = '/referrals',
                  variant: 'primary'
                }}
              />
            )}
          </div>
        )}

        {/* Payout History */}
        {activeTab === 'payouts' && (
          <div className="card fade-in">
            <div className="card-header">
              <h3 className="card-title">Payout History</h3>
              {payouts.length > 0 && (
                <span className="badge badge-neutral">{payouts.length} Payouts</span>
              )}
            </div>
            {payouts.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Referral</th>
                      <th>Period</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td className="font-medium">{payout.referral_name}</td>
                        <td>
                          <span className="period-badge">
                            {payout.month}/{payout.year}
                          </span>
                        </td>
                        <td className="text-primary font-semibold">₹{payout.amount}</td>
                        <td>
                          <span className={`badge badge-${getStatusBadge(payout.status)}`}>
                            {payout.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
                          </span>
                        </td>
                        <td className="text-muted datetime-cell">
                          {payout.status === 'paid' ? formatDateTime(payout.paid_at) : formatDateTime(payout.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="📋"
                title="No payout history"
                description="Your payout history will appear here once incentive cycles are processed."
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
      `}</style>
    </DashboardLayout>
  );
};

export default Incentive;