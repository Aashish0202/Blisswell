import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { walletAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import Pagination from '../../components/Pagination';

// Consistent money formatting across all cards: ₹1,060.50
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Wallet = () => {
  const [earningsBalance, setEarningsBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [stats, setStats] = useState({ total_earned: 0, total_withdrawn: 0, total_spent: 0, reward_income: 0 });
  const [txFilter, setTxFilter] = useState('');

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    fetchTransactions(txPage);
  }, [txPage]);

  const fetchBalance = async () => {
    try {
      const response = await walletAPI.getBalance();
      setEarningsBalance(response.data.earnings_balance || 0);
    } catch (error) {
      console.error('Failed to fetch balance');
    }
  };

  const fetchTransactions = async (page) => {
    try {
      const response = await walletAPI.getTransactions(page);
      setTransactions(response.data.transactions);
      setTxTotal(response.data.total || 0);
      setTxTotalPages(response.data.totalPages || 1);
      // Lifetime totals computed server-side across ALL history — never
      // sum amounts client-side here, transactions are paginated.
      if (response.data.stats) setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch transactions');
    }
  };

  // Client-side type filter on the current page
  const displayedTransactions = txFilter
    ? transactions.filter(t => t.type === txFilter)
    : transactions;

  return (
    <DashboardLayout>
      <div className="wallet-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Wallet</h1>
            <p className="page-subtitle">Manage your funds and transactions</p>
          </div>
        </div>

        {/* Available for Withdrawal (earnings balance) */}
        <div className="wallet-card earnings-card">
          <div className="wallet-content">
            <div className="wallet-label">Available for Withdrawal</div>
            <div className="wallet-balance">₹{fmt(earningsBalance)}</div>
            <div className="wallet-actions">
              <Link to="/withdrawal" className="btn btn-primary">
                <span>🏦</span> Withdraw Earnings
              </Link>
            </div>
          </div>
          <div className="wallet-decoration">
            <div className="decoration-circle c1"></div>
            <div className="decoration-circle c2"></div>
          </div>
        </div>

        {/* Quick Stats — lifetime totals computed server-side */}
        <div className="wallet-stats">
          <div className="wallet-stat-card">
            <span className="stat-icon">📈</span>
            <div className="stat-content">
              <span className="stat-value">₹{fmt(stats.total_earned)}</span>
              <span className="stat-label">Total Earned</span>
            </div>
          </div>
          <Link to="/rewards" className="wallet-stat-card reward-stat">
            <span className="stat-icon">🏆</span>
            <div className="stat-content">
              <span className="stat-value">₹{fmt(stats.reward_income)}</span>
              <span className="stat-label">Reward Income</span>
            </div>
          </Link>
          <div className="wallet-stat-card">
            <span className="stat-icon">🏧</span>
            <div className="stat-content">
              <span className="stat-value">₹{fmt(stats.total_withdrawn)}</span>
              <span className="stat-label">Total Withdrawn</span>
            </div>
          </div>
          <div className="wallet-stat-card">
            <span className="stat-icon">🛍️</span>
            <div className="stat-content">
              <span className="stat-value">₹{fmt(stats.total_spent)}</span>
              <span className="stat-label">Total Spent</span>
            </div>
          </div>
          <div className="wallet-stat-card">
            <span className="stat-icon">🔄</span>
            <div className="stat-content">
              <span className="stat-value">{txTotal}</span>
              <span className="stat-label">Transactions</span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Transaction History</h3>
            <div className="card-filters">
              <select
                className="form-select form-input"
                style={{ width: 'auto', minWidth: '150px' }}
                value={txFilter}
                onChange={(e) => setTxFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="purchase">Purchases</option>
                <option value="refund">Refunds</option>
                <option value="team_income">Level Income</option>
                <option value="reward">Milestone Rewards</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="withdrawal_reversal">Withdrawal Reversals</option>
              </select>
            </div>
          </div>

          {displayedTransactions.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map((tx) => (
                    <tr key={tx.id} className={tx.status === 'failed' ? 'tx-row-failed' : ''}>
                      <td>
                        <div className="tx-date">
                          <span className="date">{new Date(tx.created_at).toLocaleDateString()}</span>
                          <span className="time">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`tx-type tx-${tx.type}`}>
                          {tx.type === 'deposit' && '💰 Deposit'}
                          {tx.type === 'purchase' && '🛍️ Purchase'}
                          {tx.type === 'refund' && '↩️ Refund'}
                          {tx.type === 'bonus' && '🎁 Bonus'}
                          {tx.type === 'team_income' && '👥 Level Income'}
                          {tx.type === 'reward' && `🏆 ${tx.description || 'Milestone Reward'}`}
                          {tx.type === 'withdrawal' && '🏧 Withdrawal'}
                          {tx.type === 'withdrawal_reversal' && '↩️ Withdrawal Reversal'}
                          {tx.type === 'repurchase' && '🔄 Repurchase'}
                        </span>
                      </td>
                      <td>
                        {/* Failed attempts never moved money — show muted, no +/- sign */}
                        {tx.status === 'failed' ? (
                          <span className="tx-amount failed" title="Payment failed — no money moved">
                            ₹{fmt(Math.abs(tx.amount))}
                          </span>
                        ) : (
                          <span className={`tx-amount ${tx.amount < 0 ? 'negative' : 'positive'}`}>
                            {tx.amount < 0 ? '-' : '+'}₹{fmt(Math.abs(tx.amount))}
                          </span>
                        )}
                      </td>
                      <td className="tx-description">{tx.description || '-'}</td>
                      <td>
                        <span className={`badge badge-${tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'pending' : 'danger'}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <h4>{txFilter ? 'No matching transactions' : 'No transactions yet'}</h4>
              <p>{txFilter ? 'Try a different filter.' : 'Your earnings and purchases will appear here'}</p>
            </div>
          )}
          {txTotal > 0 && (
            <Pagination
              page={txPage}
              totalPages={txTotalPages}
              total={txTotal}
              onChange={setTxPage}
            />
          )}
        </div>
      </div>

      <style>{`
        .wallet-page {
          max-width: 1000px;
        }

        .wallet-card {
          background: linear-gradient(135deg, var(--primary-700) 0%, var(--primary-900) 100%);
          color: white;
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        .wallet-content {
          position: relative;
          z-index: 1;
        }

        .wallet-decoration {
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 100%;
        }

        .decoration-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
        }

        .decoration-circle.c1 {
          width: 150px;
          height: 150px;
          top: -50px;
          right: -50px;
        }

        .decoration-circle.c2 {
          width: 100px;
          height: 100px;
          bottom: -30px;
          right: 50px;
        }

        .wallet-label {
          font-size: 0.875rem;
          opacity: 0.8;
          margin-bottom: 0.25rem;
        }

        .wallet-balance {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .wallet-actions .btn {
          background: white;
          color: var(--primary-700);
        }

        .earnings-card {
          margin-top: 1rem;
          background: linear-gradient(135deg, var(--primary-600), var(--accent-500));
        }
        .earnings-card .wallet-label,
        .earnings-card .wallet-balance {
          color: white;
        }
        .earnings-card .wallet-actions .btn {
          background: white;
          color: var(--primary-700);
        }

        .repurchase-card {
          margin-top: 1rem;
          background: linear-gradient(135deg, var(--accent-600), var(--accent-800));
        }
        .repurchase-card .wallet-label,
        .repurchase-card .wallet-balance {
          color: white;
        }
        .repurchase-hint {
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.85);
          max-width: 480px;
          margin-bottom: 0.75rem;
        }
        .upgrade-progress {
          max-width: 480px;
        }
        .upgrade-progress-bar {
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.25);
          overflow: hidden;
          margin-bottom: 0.375rem;
        }
        .upgrade-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: white;
          transition: width 0.4s ease;
        }
        .upgrade-progress-text {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.9);
        }

        .wallet-stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (min-width: 769px) and (max-width: 1200px) {
          .wallet-stats {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .wallet-stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .wallet-stats > :last-child:nth-child(odd) {
            grid-column: 1 / -1;
          }
        }

        .wallet-stat-card {
          background: white;
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
        }

        .wallet-stat-card .stat-icon {
          font-size: 1.5rem;
        }

        .wallet-stat-card .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--gray-900);
          display: block;
        }

        a.wallet-stat-card { text-decoration: none; }
        .wallet-stat-card.reward-stat {
          background: linear-gradient(135deg, #B18B36 0%, #073C39 100%);
          border: none;
        }
        .wallet-stat-card.reward-stat .stat-value,
        .wallet-stat-card.reward-stat .stat-label { color: #fff; }
        .wallet-stat-card.reward-stat .stat-label { opacity: 0.85; }

        .wallet-stat-card .stat-label {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .card-filters {
          display: flex;
          gap: 0.5rem;
        }

        .tx-date {
          display: flex;
          flex-direction: column;
        }

        .tx-date .date {
          font-weight: 500;
          color: var(--gray-700);
        }

        .tx-date .time {
          font-size: 0.75rem;
          color: var(--gray-400);
        }

        .tx-type {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .tx-type.tx-deposit {
          background: var(--accent-50);
          color: var(--accent-700);
        }

        .tx-type.tx-purchase {
          background: var(--primary-50);
          color: var(--primary-700);
        }

        .tx-type.tx-refund {
          background: var(--status-pending-bg);
          color: #C2410C;
        }

        .tx-amount {
          font-weight: 700;
          font-size: 0.9375rem;
        }

        .tx-amount.positive {
          color: var(--accent-600);
        }

        .tx-amount.negative {
          color: var(--status-danger);
        }

        /* Failed payment attempts never moved money — muted + struck through */
        .tx-amount.failed {
          color: var(--gray-400);
          text-decoration: line-through;
          font-weight: 500;
        }

        .tx-row-failed td {
          opacity: 0.75;
        }

        .tx-description {
          color: var(--gray-600);
          font-size: 0.875rem;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h4 {
          color: var(--gray-700);
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: var(--gray-500);
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Wallet;