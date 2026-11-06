import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { userAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';

const Referrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [modalReferral, setModalReferral] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total_referrals: 0, active_referrals: 0, team_total: 0, team_active: 0, total_direct_business: 0, total_team_business: 0, total_team_income: 0 });
  const { user } = useSelector((state) => state.auth);

  // Downline ("My Network"), limited to the admin Max Levels — search + level filter
  const [downline, setDownline] = useState([]);
  const [downlineLoading, setDownlineLoading] = useState(true);
  const [downlinePage, setDownlinePage] = useState(1);
  const [downlineTotalPages, setDownlineTotalPages] = useState(1);
  const [downlineTotal, setDownlineTotal] = useState(0);
  const [levelCounts, setLevelCounts] = useState([]);
  const [levelFilter, setLevelFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [downlineSearch, setDownlineSearch] = useState('');
  // Visible network depth = admin "Max Levels" setting (1-10), sent by the API
  const [maxLevels, setMaxLevels] = useState(10);

  useEffect(() => {
    fetchReferrals();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchDownline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downlinePage, levelFilter, downlineSearch]);

  const fetchDownline = async () => {
    try {
      setDownlineLoading(true);
      const response = await userAPI.getDownlineTeam(downlinePage, {
        level: levelFilter || undefined,
        search: downlineSearch || undefined
      });
      setDownline(response.data.members);
      setDownlineTotal(response.data.total || 0);
      setDownlineTotalPages(response.data.totalPages || 1);
      setLevelCounts(response.data.levelCounts || []);
      if (response.data.maxLevels) setMaxLevels(response.data.maxLevels);
    } catch (error) {
      toast.error('Failed to load network');
    } finally {
      setDownlineLoading(false);
    }
  };

  const handleDownlineSearch = (e) => {
    e.preventDefault();
    setDownlinePage(1);
    setDownlineSearch(searchInput.trim());
  };

  const clearDownlineSearch = () => {
    setSearchInput('');
    setDownlinePage(1);
    setDownlineSearch('');
  };

  const fetchSummary = async () => {
    try {
      const response = await userAPI.getReferralSummary();
      setSummary(response.data.summary);
    } catch (e) { /* ignore — stats are secondary */ }
  };

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getReferrals(page);
      setReferrals(response.data.referrals);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const openPurchases = async (ref) => {
    setModalReferral(ref);
    setPurchases([]);
    setPurchasesLoading(true);
    try {
      const response = await userAPI.getReferralPurchases(ref.id);
      setPurchases(response.data.purchases);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load purchases');
      setModalReferral(null);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const closePurchases = () => {
    setModalReferral(null);
    setPurchases([]);
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

  const activeReferrals = summary.active_referrals;
  const totalDirectBusiness = summary.total_direct_business;
  const totalTeamBusiness = summary.total_team_business || 0;
  const totalTeamIncome = summary.total_team_income || 0;

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
              <p>Earn Team Income when your referrals purchase a product!</p>
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
          <div className="stat-card teal">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Total Team</div>
            <div className="stat-value">{summary.team_total || 0}</div>
            <div className="stat-subtext">All {maxLevels} levels · {summary.total_referrals} direct</div>
          </div>
          <div className="stat-card success">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Active Team</div>
            <div className="stat-value">{summary.team_active || 0}</div>
            <div className="stat-subtext">With active package · {activeReferrals} direct</div>
          </div>
          <div className="stat-card primary">
            <div className="stat-icon">💼</div>
            <div className="stat-label">Direct Business</div>
            <div className="stat-value">₹{totalDirectBusiness.toLocaleString()}</div>
            <div className="stat-subtext">Purchases by direct referrals</div>
          </div>
          <div className="stat-card team-business">
            <div className="stat-icon">🌐</div>
            <div className="stat-label">Team Business</div>
            <div className="stat-value">₹{totalTeamBusiness.toLocaleString()}</div>
            <div className="stat-subtext">Total purchases across all {maxLevels} levels</div>
          </div>
          <div className="stat-card gold">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Team Income</div>
            <div className="stat-value">₹{Number(totalTeamIncome).toLocaleString()}</div>
            <div className="stat-subtext">Earned from downline</div>
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
                <p>When they sign up and buy a product, they become your referral</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Earn Team Income</h4>
                <p>Earn Team Income when anyone in your team purchases — up to {maxLevels} levels</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral List */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Referrals</h3>
            {summary.total_referrals > 0 && (
              <span className="badge badge-neutral">{summary.total_referrals} Direct</span>
            )}
          </div>
          {total > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Direct Business</th>
                    <th>Qualified</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
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
                        <span className="business-amount">₹{(ref.direct_business || 0).toLocaleString()}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${ref.has_active_package ? 'success' : 'neutral'}`}>
                          {ref.has_active_package ? '✓ Qualified' : 'Not Qualified'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${ref.has_active_package ? 'success' : 'warning'}`}>
                          {ref.has_active_package ? '✓ Active' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="text-muted">
                        {new Date(ref.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => openPurchases(ref)}
                        >
                          📦 View Products
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {total > 0 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onChange={setPage}
            />
          ) : (
            <EmptyState
              icon="👥"
              title="No referrals yet"
              description="Share your referral link with friends and family. When they register and purchase a product, they'll appear here."
              action={{
                label: 'Copy Referral Link',
                onClick: copyToClipboard,
                variant: 'primary',
                icon: '📋 '
              }}
            />
          )}
        </div>

        {/* Network (admin-limited levels) */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🌐 My Network ({maxLevels} Levels)</h3>
            {downlineTotal > 0 && (
              <span className="badge badge-neutral">{downlineTotal} Members</span>
            )}
          </div>

          {/* Level count chips */}
          {levelCounts.length > 0 && (
            <div className="level-chips">
              <button
                type="button"
                className={`level-chip ${levelFilter === '' ? 'active' : ''}`}
                onClick={() => { setLevelFilter(''); setDownlinePage(1); }}
              >
                All Levels
              </button>
              {levelCounts.map((lc) => (
                <button
                  type="button"
                  key={lc.level}
                  className={`level-chip ${levelFilter === String(lc.level) ? 'active' : ''}`}
                  onClick={() => { setLevelFilter(String(lc.level)); setDownlinePage(1); }}
                >
                  L{lc.level} <span className="level-chip-count">{lc.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <form onSubmit={handleDownlineSearch} className="filter-form">
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or referral code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">Search</button>
            {downlineSearch && (
              <button type="button" className="btn btn-ghost" onClick={clearDownlineSearch}>Clear</button>
            )}
          </form>

          {downlineLoading ? (
            <LoadingSkeleton variant="card" />
          ) : downline.length > 0 ? (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Name</th>
                      <th>Referral Code</th>
                      <th>Sponsor ID</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downline.map((m) => (
                      <tr key={m.id}>
                        <td><span className="badge badge-info">L{m.level}</span></td>
                        <td>
                          <div className="member-info">
                            <div className="member-avatar">{m.name?.charAt(0).toUpperCase()}</div>
                            <span className="member-name">{m.name}</span>
                          </div>
                        </td>
                        <td className="font-mono">{m.referral_code}</td>
                        <td className="font-mono" title={m.sponsor_name || ''}>{m.sponsor_code || '—'}</td>
                        <td>
                          <span className={`badge badge-${m.has_active_package ? 'success' : 'warning'}`}>
                            {m.has_active_package ? '✓ Active' : '⏳ Inactive'}
                          </span>
                        </td>
                        <td className="text-muted">{new Date(m.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={downlinePage}
                totalPages={downlineTotalPages}
                total={downlineTotal}
                onChange={setDownlinePage}
              />
            </>
          ) : (
            <EmptyState
              icon="🌐"
              title={downlineSearch || levelFilter ? 'No matches found' : 'No network yet'}
              description={downlineSearch || levelFilter ? 'Try a different search term or level.' : `As your referrals build their own teams, your network (up to ${maxLevels} levels) will appear here.`}
            />
          )}
        </div>
      </div>

      {/* Purchases modal */}
      {modalReferral && (
        <div className="purchases-modal-overlay" onClick={closePurchases}>
          <div className="purchases-modal" onClick={(e) => e.stopPropagation()}>
            <div className="purchases-modal-header">
              <h3>Products purchased by {modalReferral.name}</h3>
              <button className="purchases-modal-close" onClick={closePurchases}>×</button>
            </div>
            <div className="purchases-modal-body">
              {purchasesLoading ? (
                <div className="purchases-loading">Loading…</div>
              ) : purchases.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Price</th>
                        <th>Purchase Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((p, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{p.product_name}</td>
                          <td className="text-primary font-semibold">₹{Number(p.price).toLocaleString()}</td>
                          <td className="text-muted">
                            {p.purchase_date ? new Date(p.purchase_date).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="purchases-empty">No purchases yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

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

        /* Colorful brand-gradient stat cards (white text) */
        .stat-card.teal,
        .stat-card.success,
        .stat-card.primary,
        .stat-card.team-business,
        .stat-card.gold {
          color: white;
          border: none;
        }

        /* Soft decorative circle, like the wallet cards */
        .stat-card.teal::after,
        .stat-card.success::after,
        .stat-card.primary::after,
        .stat-card.team-business::after,
        .stat-card.gold::after {
          content: '';
          position: absolute;
          right: -18px;
          bottom: -18px;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          pointer-events: none;
        }

        .stat-card.teal {
          background: linear-gradient(135deg, #073C39 0%, #0B4541 100%);
          box-shadow: 0 4px 20px rgba(7, 60, 57, 0.35);
        }

        .stat-card.success {
          background: linear-gradient(135deg, #5D8172 0%, #40584E 100%);
          box-shadow: 0 4px 20px rgba(93, 129, 114, 0.35);
        }

        .stat-card.primary {
          background: linear-gradient(135deg, #CFAA57 0%, #B18B36 100%);
          box-shadow: 0 4px 20px rgba(177, 139, 54, 0.35);
        }

        .stat-card.team-business {
          background: linear-gradient(135deg, #073C39 0%, #5D8172 100%);
          box-shadow: 0 4px 20px rgba(7, 60, 57, 0.3);
        }

        .stat-card.gold {
          background: linear-gradient(135deg, #B18B36 0%, #996F19 100%);
          box-shadow: 0 4px 20px rgba(153, 111, 25, 0.35);
        }

        .stat-card.teal .stat-icon,
        .stat-card.success .stat-icon,
        .stat-card.primary .stat-icon,
        .stat-card.team-business .stat-icon,
        .stat-card.gold .stat-icon {
          background: rgba(255, 255, 255, 0.18);
        }

        .stat-card.teal .stat-value,
        .stat-card.teal .stat-label,
        .stat-card.teal .stat-subtext,
        .stat-card.success .stat-value,
        .stat-card.success .stat-label,
        .stat-card.success .stat-subtext,
        .stat-card.primary .stat-value,
        .stat-card.primary .stat-label,
        .stat-card.primary .stat-subtext,
        .stat-card.team-business .stat-value,
        .stat-card.team-business .stat-label,
        .stat-card.team-business .stat-subtext,
        .stat-card.gold .stat-value,
        .stat-card.gold .stat-label,
        .stat-card.gold .stat-subtext {
          color: white;
        }

        .stat-card.teal .stat-subtext,
        .stat-card.success .stat-subtext,
        .stat-card.primary .stat-subtext,
        .stat-card.team-business .stat-subtext,
        .stat-card.gold .stat-subtext {
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
          display: inline-block;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: bottom;
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

        .purchases-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .purchases-modal {
          background: white;
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 560px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.2));
        }

        .purchases-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--gray-200);
        }

        .purchases-modal-header h3 {
          font-size: 1.0625rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0;
        }

        .purchases-modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--gray-500);
          cursor: pointer;
          line-height: 1;
          padding: 0 0.25rem;
        }

        .purchases-modal-close:hover {
          color: var(--gray-900);
        }

        .purchases-modal-body {
          padding: 1.25rem 1.5rem;
          overflow-y: auto;
        }

        .purchases-loading,
        .purchases-empty {
          text-align: center;
          padding: 2rem 0;
          color: var(--gray-500);
        }

        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .font-mono { font-family: monospace; }
        .text-primary { color: var(--primary-600); }
        .text-muted { color: var(--gray-500); }

        .level-chips {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding: 0 0 1rem;
        }

        .level-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.4rem 0.75rem;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          background: white;
          color: var(--gray-600);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .level-chip:hover {
          border-color: var(--primary-300);
        }

        .level-chip.active {
          background: var(--primary-600);
          border-color: var(--primary-600);
          color: white;
        }

        .level-chip-count {
          font-size: 0.72rem;
          opacity: 0.8;
        }

        .filter-form {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding-bottom: 1rem;
        }

        .filter-form .form-input {
          flex: 1;
          min-width: 200px;
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