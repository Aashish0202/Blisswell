import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { walletAPI, orderAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';

const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [packageAmounts, setPackageAmounts] = useState([]);

  useEffect(() => {
    loadRazorpay();
    fetchBalance();
    fetchTransactions();
    fetchPackageAmounts();
  }, []);

  const fetchPackageAmounts = async () => {
    try {
      const response = await orderAPI.getProducts();
      const products = response.data?.products || [];
      // Extract unique prices from products
      const uniquePrices = [...new Set(products.map(p => parseFloat(p.price)))];
      // Sort prices in ascending order
      uniquePrices.sort((a, b) => a - b);
      setPackageAmounts(uniquePrices);
    } catch (error) {
      console.error('Failed to fetch package amounts:', error);
      // Fallback to default amounts if fetch fails
      setPackageAmounts([500, 1000, 2100, 5000]);
    }
  };

  const loadRazorpay = () => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
  };

  const fetchBalance = async () => {
    try {
      const response = await walletAPI.getBalance();
      setBalance(response.data.balance);
    } catch (error) {
      console.error('Failed to fetch balance');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await walletAPI.getTransactions(1);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions');
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum deposit amount is ₹100');
      return;
    }

    if (!razorpayLoaded) {
      toast.error('Payment system is loading. Please try again.');
      return;
    }

    setLoading(true);

    try {
      const orderResponse = await walletAPI.createDepositOrder(amount);
      const { order_id, key_id } = orderResponse.data;

      const options = {
        key: key_id,
        amount: amount * 100,
        currency: 'INR',
        name: 'Blisswell',
        description: 'Wallet Deposit',
        order_id: order_id,
        handler: async (response) => {
          try {
            await walletAPI.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amount
            });
            toast.success('Payment successful! Wallet credited.');
            fetchBalance();
            fetchTransactions();
            setDepositAmount('');
            setShowDepositModal(false);
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: '',
          email: ''
        },
        theme: {
          color: '#2563EB'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = packageAmounts.length > 0 ? packageAmounts : [500, 1000, 2100, 5000];

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

        {/* Balance Card */}
        <div className="wallet-card">
          <div className="wallet-content">
            <div className="wallet-label">Available Balance</div>
            <div className="wallet-balance">₹{balance?.toLocaleString() || 0}</div>
            <div className="wallet-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowDepositModal(true)}
              >
                <span>💳</span> Add Funds
              </button>
            </div>
          </div>
          <div className="wallet-decoration">
            <div className="decoration-circle c1"></div>
            <div className="decoration-circle c2"></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="wallet-stats">
          <div className="wallet-stat-card">
            <span className="stat-icon">📈</span>
            <div className="stat-content">
              <span className="stat-value">₹{transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + parseFloat(t.amount), 0).toLocaleString()}</span>
              <span className="stat-label">Total Deposited</span>
            </div>
          </div>
          <div className="wallet-stat-card">
            <span className="stat-icon">📉</span>
            <div className="stat-content">
              <span className="stat-value">₹{Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + parseFloat(t.amount), 0)).toLocaleString()}</span>
              <span className="stat-label">Total Spent</span>
            </div>
          </div>
          <div className="wallet-stat-card">
            <span className="stat-icon">🔄</span>
            <div className="stat-content">
              <span className="stat-value">{transactions.length}</span>
              <span className="stat-label">Transactions</span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Transaction History</h3>
            <div className="card-filters">
              <select className="form-select form-input" style={{ width: 'auto', minWidth: '150px' }}>
                <option value="">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="purchase">Purchases</option>
                <option value="refund">Refunds</option>
              </select>
            </div>
          </div>

          {transactions.length > 0 ? (
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
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
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
                        </span>
                      </td>
                      <td>
                        <span className={`tx-amount ${tx.amount < 0 ? 'negative' : 'positive'}`}>
                          {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString()}
                        </span>
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
              <h4>No transactions yet</h4>
              <p>Add funds to your wallet to get started</p>
              <button className="btn btn-primary" onClick={() => setShowDepositModal(true)}>
                Add Funds
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Funds to Wallet</h3>
              <button className="modal-close" onClick={() => setShowDepositModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="deposit-form">
                <label className="form-label">Select Amount</label>
                <div className="quick-amounts">
                  {quickAmounts.map(amount => (
                    <button
                      key={amount}
                      className={`quick-amount-btn ${depositAmount === amount.toString() ? 'active' : ''}`}
                      onClick={() => setDepositAmount(amount.toString())}
                    >
                      ₹{amount.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Or enter custom amount</label>
                  <div className="amount-input-wrapper">
                    <span className="currency">₹</span>
                    <input
                      type="number"
                      className="form-input amount-input"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      min="100"
                    />
                  </div>
                  <span className="form-hint">Minimum deposit: ₹100</span>
                </div>

                <div className="deposit-note">
                  <span className="note-icon">🔒</span>
                  <span>Payments secured by Razorpay. Your financial information is encrypted.</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDepositModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDeposit}
                disabled={loading || !depositAmount || parseFloat(depositAmount) < 100}
              >
                {loading ? 'Processing...' : `Pay ₹${parseFloat(depositAmount || 0).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}

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

        .wallet-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        @media (max-width: 768px) {
          .wallet-stats {
            grid-template-columns: 1fr;
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

        .tx-type.tx-bonus {
          background: #FEF3C7;
          color: #B45309;
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

        .tx-description {
          color: var(--gray-600);
          font-size: 0.875rem;
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

        /* Modal Styles */
        .modal {
          max-width: 480px;
        }

        .deposit-form {
          padding: 0.5rem 0;
        }

        .quick-amounts {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 480px) {
          .quick-amounts {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .quick-amount-btn {
          padding: 0.875rem 1rem;
          border: 2px solid var(--gray-200);
          border-radius: var(--radius-lg);
          background: white;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-700);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-amount-btn:hover {
          border-color: var(--primary-300);
          background: var(--primary-50);
        }

        .quick-amount-btn.active {
          border-color: var(--primary-500);
          background: var(--primary-50);
          color: var(--primary-700);
        }

        .amount-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .currency {
          position: absolute;
          left: 1rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-500);
        }

        .amount-input {
          padding-left: 2.5rem;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .deposit-note {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          margin-top: 1rem;
          padding: 1rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          font-size: 0.8125rem;
          color: var(--gray-600);
        }

        .note-icon {
          font-size: 1rem;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Wallet;