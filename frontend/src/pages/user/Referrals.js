import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { userAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const Referrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const response = await userAPI.getReferrals();
      setReferrals(response.data.referrals);
    } catch (error) {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const referralLink = `${window.location.origin}/register?ref=${user?.referral_code}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Blisswell',
          text: 'Join me on Blisswell and start earning! Use my referral link:',
          url: referralLink
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      copyToClipboard();
    }
  };

  const activeReferrals = referrals.filter(r => r.has_active_package).length;
  const totalDirectBusiness = referrals.reduce((sum, r) => sum + (r.direct_business || 0), 0);
  const totalBonusReceived = referrals.reduce((sum, r) => sum + (r.bonus_received || 0), 0);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="referrals-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Team</h1>
              <p className="page-subtitle">Manage your referrals and track earnings</p>
            </div>
          </div>
          <LoadingSkeleton variant="card" style={{ marginBottom: '1.5rem' }} />
          <div className="stats-grid">
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="referrals-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Team</h1>
            <p className="page-subtitle">Manage your referrals and track earnings</p>
          </div>
        </div>

        {/* Referral Link Card */}
        <div className="referral-link-card">
          <div className="referral-card-content">
            <div className="referral-icon">🔗</div>
            <div className="referral-info">
              <h3>Share Your Referral Link</h3>
              <p>Earn ₹100/month for 12 months when your referrals purchase a package!</p>
            </div>
          </div>
          <div className="referral-link-box">
            <input
              type="text"
              className="referral-input"
              value={referralLink}
              readOnly
            />
            <div className="referral-actions">
              <button
                className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
                onClick={copyToClipboard}
              >
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              <button className="btn btn-secondary" onClick={shareLink}>
                📤 Share
              </button>
            </div>
          </div>
          <div className="referral-code-display">
            <span className="referral-code-label">Your Referral Code:</span>
            <span className="referral-code-value">{user?.referral_code}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Total Referrals</div>
            <div className="stat-value">{referrals.length}</div>
            <div className="stat-subtext">People you've referred</div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Active Referrals</div>
            <div className="stat-value">{activeReferrals}</div>
            <div className="stat-subtext">Earning you incentive</div>
          </div>
          <div className="stat-card primary">
            <div className="stat-icon">💼</div>
            <div className="stat-label">Direct Business</div>
            <div className="stat-value">₹{totalDirectBusiness.toLocaleString()}</div>
            <div className="stat-subtext">Total purchases by team</div>
          </div>
          <div className="stat-card bonus">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Bonus Received</div>
            <div className="stat-value">₹{totalBonusReceived.toLocaleString()}</div>
            <div className="stat-subtext">Earnings from referrals</div>
          </div>
        </div>

        {/* How It Works */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">How Referrals Work</h3>
          </div>
          <div className="how-it-works">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Share Your Link</h4>
                <p>Send your unique referral link to friends and family</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>They Register & Purchase</h4>
                <p>When they sign up and buy a package, they become your referral</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Earn Monthly Income</h4>
                <p>Earn Monthly rewards for each active referral</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Referrals</h3>
            {referrals.length > 0 && (
              <span className="badge badge-neutral">{referrals.length} Members</span>
            )}
          </div>
          {referrals.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Direct Business</th>
                    <th>Bonus Received</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((ref) => (
                    <tr key={ref.id}>
                      <td>
                        <div className="member-info">
                          <div className="member-avatar">
                            {ref.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="member-name">{ref.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <span className="contact-email">{ref.email}</span>
                          <span className="contact-mobile">{ref.mobile}</span>
                        </div>
                      </td>
                      <td>
                        <span className="business-amount">₹{(ref.direct_business || 0).toLocaleString()}</span>
                      </td>
                      <td>
                        <span className="bonus-amount">₹{(ref.bonus_received || 0).toLocaleString()}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${ref.has_active_package ? 'success' : 'warning'}`}>
                          {ref.has_active_package ? '✓ Active' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="text-muted">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon="👥"
              title="No referrals yet"
              description="Share your referral link with friends and family. When they register and purchase a package, they'll appear here."
              action={{
                label: 'Copy Referral Link',
                onClick: copyToClipboard,
                variant: 'primary',
                icon: '📋 '
              }}
            />
          )}
        </div>
      </div>

      <style>{`
        .referrals-page {
          max-width: 1000px;
        }

        .referral-link-card {
          background: linear-gradient(135deg, var(--primary-700) 0%, var(--primary-900) 100%);
          color: white;
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .referral-card-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .referral-icon {
          font-size: 2rem;
        }

        .referral-info h3 {
          color: white;
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }

        .referral-info p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.875rem;
          margin: 0;
        }

        .referral-link-box {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .referral-input {
          flex: 1;
          min-width: 200px;
          padding: 0.875rem 1rem;
          border: none;
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.15);
          color: white;
          font-size: 0.875rem;
        }

        .referral-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .referral-actions {
          display: flex;
          gap: 0.5rem;
        }

        .referral-actions .btn {
          background: white;
          color: var(--primary-700);
        }

        .referral-actions .btn:hover {
          background: var(--gray-50);
        }

        .referral-code-display {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .referral-code-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
        }

        .referral-code-value {
          font-family: monospace;
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .stat-subtext {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .stat-card.primary {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
        }

        .stat-card.primary .stat-value,
        .stat-card.primary .stat-label,
        .stat-card.primary .stat-subtext {
          color: white;
        }

        .stat-card.primary .stat-subtext {
          opacity: 0.8;
        }

        .stat-card.bonus {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .stat-card.bonus .stat-value,
        .stat-card.bonus .stat-label,
        .stat-card.bonus .stat-subtext {
          color: white;
        }

        .stat-card.bonus .stat-subtext {
          opacity: 0.8;
        }

        .how-it-works {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          padding: 0.5rem 0;
        }

        .step {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .step-number {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
        }

        .step-content h4 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .step-content p {
          font-size: 0.8125rem;
          color: var(--gray-500);
          margin: 0;
          line-height: 1.4;
        }

        .member-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .member-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .member-name {
          font-weight: 500;
          color: var(--gray-900);
        }

        .contact-info {
          display: flex;
          flex-direction: column;
        }

        .contact-email {
          font-size: 0.875rem;
          color: var(--gray-700);
        }

        .contact-mobile {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .business-amount {
          font-weight: 600;
          color: var(--primary-600);
        }

        .bonus-amount {
          font-weight: 600;
          color: var(--success-600);
        }

        @media (max-width: 768px) {
          .table-container {
            overflow-x: auto;
          }

          .table th, .table td {
            min-width: 100px;
          }
        }

        @media (max-width: 640px) {
          .referral-link-box {
            flex-direction: column;
          }

          .referral-actions {
            width: 100%;
          }

          .referral-actions .btn {
            flex: 1;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Referrals;