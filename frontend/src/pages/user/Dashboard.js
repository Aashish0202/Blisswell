import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { userAPI, orderAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import SmartActionCard, { getSmartCards } from '../../components/SmartActionCard';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [teamTree, setTeamTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };


  const fetchData = async () => {
    try {
      const dashboardRes = await userAPI.getDashboard();
      console.log(dashboardRes)
      setDashboard(dashboardRes.data);

      try {
        const productsRes = await orderAPI.getProducts();
        console.log(productsRes);
        setProducts(productsRes.data?.products || []);
      } catch (productErr) {
        console.error('Products fetch error:', productErr);
        setProducts([]);
      }

      try {
        const teamRes = await userAPI.getReferrals();
        setTeamTree(teamRes.data?.referrals || []);
      } catch (teamErr) {
        console.error('Team fetch error:', teamErr);
        setTeamTree([]);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyReferral = () => {
    const link = `${window.location.origin}/register?ref=${dashboard?.user?.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dashboard-page">
          <LoadingSkeleton variant="card" style={{ marginBottom: '1.5rem' }} />
          <div className="stats-skeleton">
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
            <LoadingSkeleton variant="stat" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const smartCards = getSmartCards(dashboard?.user, dashboard?.wallet, dashboard?.referrals);
  const user = dashboard?.user || {};
  const wallet = dashboard?.wallet || {};
  const salary = dashboard?.salary || {};
  const referrals = dashboard?.referrals || {};

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        {/* Smart Action Cards */}
        {smartCards.map((card) => (
          <SmartActionCard key={card.type} type={card.type} />
        ))}

        {/* User Profile Hero Card */}
        <div className="profile-hero">
          <div className="profile-hero-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className={`status-dot ${user.has_active_package ? 'active' : 'inactive'}`}></span>
            </div>
            <div className="profile-info">
              <h2 className="profile-name">{user.name}</h2>
              <p className="profile-email">{user.email}</p>
              <div className="profile-badges">
                <span className={`badge ${user.has_active_package ? 'badge-success' : 'badge-warning'}`}>
                  {user.has_active_package ? '✓ Active Member' : '○ Inactive'}
                </span>
                <span className={`badge badge-${user.pan_status === 'approved' ? 'success' : user.pan_status === 'pending' ? 'warning' : 'danger'}`}>
                  PAN: {user.pan_status?.toUpperCase() || 'PENDING'}
                </span>
              </div>
            </div>
            <div className="profile-referral" onClick={handleCopyReferral}>
              <span className="referral-label">Your Referral Code</span>
              <span className="referral-code">
                {user.referral_code}
                <span className="copy-icon">📋</span>
              </span>
            </div>
          </div>
          <div className="profile-stats-bar">
            <div className="stat-item">
              <span className="stat-value">{referrals.total || 0}</span>
              <span className="stat-label">Team Members</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">{referrals.active || 0}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">₹{parseFloat(wallet.balance || 0).toLocaleString()}</span>
              <span className="stat-label">Wallet</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-value">₹{parseFloat(salary.pending_amount || 0).toLocaleString()}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="stats-grid-enhanced">
          <Link to="/wallet" className="stat-card-enhanced success animate-in">
            <div className="stat-card-icon">💰</div>
            <div className="stat-card-content">
              <span className="stat-card-value">₹{parseFloat(wallet.balance || 0).toLocaleString()}</span>
              <span className="stat-card-label">Wallet Balance</span>
            </div>
            <div className="stat-card-arrow">→</div>
          </Link>
          <Link to="/referrals" className="stat-card-enhanced info animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="stat-card-icon">👥</div>
            <div className="stat-card-content">
              <span className="stat-card-value">{referrals.total || 0}</span>
              <span className="stat-card-label">My Team</span>
            </div>
            <div className="stat-card-sub">{referrals.active || 0} active</div>
          </Link>
          <Link to="/salary" className="stat-card-enhanced warning animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="stat-card-icon">💸</div>
            <div className="stat-card-content">
              <span className="stat-card-value">₹{parseFloat(salary.pending_amount || 0).toLocaleString()}</span>
              <span className="stat-card-label">Pending Payout</span>
            </div>
            <div className="stat-card-arrow">→</div>
          </Link>
          <div className="stat-card-enhanced accent animate-in" style={{ animationDelay: '0.3s' }}>
            <div className="stat-card-icon">📊</div>
            <div className="stat-card-content">
              <span className="stat-card-value">₹{parseFloat(salary.total_earned || 0).toLocaleString()}</span>
              <span className="stat-card-label">Total Earned</span>
            </div>
            <div className="stat-card-sub">Lifetime income</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <span className="tab-icon">📊</span>
            <span className="tab-text">Overview</span>
          </button>
          <button className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>
            <span className="tab-icon">🛍️</span>
            <span className="tab-text">Shop</span>
          </button>
          <button className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
            <span className="tab-icon">👥</span>
            <span className="tab-text">My Team</span>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-content animate-fade-in">
            {/* Quick Actions */}
            <div className="section-card">
              <div className="section-header">
                <h3 className="section-title">⚡ Quick Actions</h3>
              </div>
              <div className="quick-actions-grid">
                <Link to="/wallet" className="action-tile">
                  <div className="action-icon-wrapper blue">
                    <span>💰</span>
                  </div>
                  <div className="action-info">
                    <span className="action-title">Add Funds</span>
                    <span className="action-desc">Top up wallet</span>
                  </div>
                </Link>
                <Link to="/orders" className="action-tile primary">
                  <div className="action-icon-wrapper green">
                    <span>🛍️</span>
                  </div>
                  <div className="action-info">
                    <span className="action-title">Buy Product</span>
                    <span className="action-desc">Start earning</span>
                  </div>
                </Link>
                <button onClick={handleCopyReferral} className="action-tile">
                  <div className="action-icon-wrapper purple">
                    <span>🔗</span>
                  </div>
                  <div className="action-info">
                    <span className="action-title">Copy Link</span>
                    <span className="action-desc">Invite friends</span>
                  </div>
                </button>
                <Link to="/salary" className="action-tile">
                  <div className="action-icon-wrapper orange">
                    <span>💸</span>
                  </div>
                  <div className="action-info">
                    <span className="action-title">My Income</span>
                    <span className="action-desc">View earnings</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Featured Products */}
            {products.length > 0 && (
              <div className="section-card">
                <div className="section-header">
                  <h3 className="section-title">🛍️ Featured Products</h3>
                  <button className="link-btn" onClick={() => setActiveTab('shop')}>
                    View All →
                  </button>
                </div>
                <div className="featured-products-grid">
                  {products.slice(0, 2).map((product, index) => {
                    const incentiveAmount = parseFloat(product.salary_amount || 100);
                    return (
                      <div key={product.id} className="featured-product-tile animate-in" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="featured-product-image">
                          {product.image ? (
                            <img src={getImageUrl(product.image)} alt={product.name} onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40">🛏️</text></svg>'; }} />
                          ) : (
                            <span className="placeholder-emoji">🛏️</span>
                          )}
                        </div>
                        <div className="featured-product-content">
                          <h4>{product.name}</h4>
                          <div className="featured-incentive">
                            <span className="incentive-badge">💰 ₹{incentiveAmount.toLocaleString()}/mo</span>
                          </div>
                          <div className="featured-footer">
                            <span className="featured-price">₹{parseFloat(product.price).toLocaleString()}</span>
                            <Link to="/orders" className="btn-buy">Buy Now</Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Income Summary */}
            <div className="section-card">
              <div className="section-header">
                <h3 className="section-title">💰 Income Summary</h3>
              </div>
              <div className="income-cards-grid">
                <div className="income-mini-card">
                  <span className="income-mini-label">This Month</span>
                  <span className="income-mini-value">₹{parseFloat(salary.this_month || 0).toLocaleString()}</span>
                </div>
                <div className="income-mini-card">
                  <span className="income-mini-label">Last Month</span>
                  <span className="income-mini-value">₹{parseFloat(salary.last_month || 0).toLocaleString()}</span>
                </div>
                <div className="income-mini-card">
                  <span className="income-mini-label">Total Paid</span>
                  <span className="income-mini-value">₹{parseFloat(salary.total_paid || 0).toLocaleString()}</span>
                </div>
                <div className="income-mini-card highlight">
                  <span className="income-mini-label">Active Cycles</span>
                  <span className="income-mini-value">{salary.active_cycles || 0}</span>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="section-card">
              <div className="section-header">
                <h3 className="section-title">📋 Recent Orders</h3>
                <Link to="/orders" className="link-btn">View All</Link>
              </div>
              {dashboard?.recentOrders?.length > 0 ? (
                <div className="orders-list-compact">
                  {dashboard.recentOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="order-item-compact">
                      <div className="order-icon">📦</div>
                      <div className="order-info">
                        <span className="order-name">{order.product_name}</span>
                        <span className="order-meta">₹{order.amount?.toLocaleString()} • {new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className={`status-pill ${order.status}`}>{order.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-compact">
                  <span>No orders yet</span>
                  <Link to="/orders" className="btn btn-primary btn-sm">Shop Now</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <div className="tab-content animate-fade-in">
            <div className="shop-hero">
              <h2>🛍️ Premium Products</h2>
              <p>Purchase products and earn monthly incentive for each active referral</p>
            </div>
            <div className="products-masonry">
              {products.length > 0 ? products.map((product, index) => {
                const incentiveAmount = parseFloat(product.salary_amount || 100);
                const incentiveDuration = parseInt(product.salary_duration || 12);
                const totalPayout = incentiveAmount * incentiveDuration;

                return (
                  <div key={product.id} className="product-card-premium animate-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="product-image-wrapper">
                      {product.image ? (
                        <img src={getImageUrl(product.image)} alt={product.name} onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="%23f3f4f6" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="80">🛏️</text></svg>'; }} />
                      ) : (
                        <div className="placeholder-image"><span>🛏️</span></div>
                      )}
                    </div>
                    <div className="product-content-premium">
                      <h3 className="product-title">{product.name}</h3>
                      <p className="product-desc">{product.description || 'Premium quality product'}</p>

                      <div className="incentive-highlight">
                        <div className="salary-row">
                          <span className="salary-icon">💰</span>
                          <span className="salary-text">Earn <strong>₹{incentiveAmount.toLocaleString()}/month</strong> for {incentiveDuration} months</span>
                        </div>
                        <div className="salary-total">
                          <span>Total earning per referral:</span>
                          <span className="total-amount">₹{totalPayout.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="product-features-mini">
                        <span className="feature-tag">✓ Premium Quality</span>
                        <span className="feature-tag">✓ Free Shipping</span>
                      </div>

                      <div className="product-action-row">
                        <div className="price-block">
                          <span className="price-label">Price</span>
                          <span className="price-value">₹{parseFloat(product.price).toLocaleString()}</span>
                        </div>
                        <Link to="/orders" className="btn-purchase">
                          <span>Buy Now</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty-state-large">
                  <span className="empty-icon">🛍️</span>
                  <h3>Products Coming Soon</h3>
                  <p>Check back later for amazing products!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="tab-content animate-fade-in">
            {/* Referral Banner */}
            <div className="referral-banner">
              <div className="referral-content">
                <div className="referral-icon">🔗</div>
                <div className="referral-text">
                  <h3>Share & Earn</h3>
                  <p>Earn monthly incentive for every active team member who purchases</p>
                </div>
              </div>
              <div className="referral-link-box">
                <input
                  type="text"
                  value={`${window.location.origin}/register?ref=${user.referral_code}`}
                  readOnly
                  className="referral-input"
                />
                <button onClick={handleCopyReferral} className="btn-copy">
                  📋 Copy
                </button>
              </div>
            </div>

            {/* Team Stats */}
            <div className="team-stats-row">
              <div className="team-stat-card">
                <span className="team-stat-value">{referrals.total || 0}</span>
                <span className="team-stat-label">Total Members</span>
              </div>
              <div className="team-stat-card success">
                <span className="team-stat-value">{referrals.active || 0}</span>
                <span className="team-stat-label">Active</span>
              </div>
              <div className="team-stat-card warning">
                <span className="team-stat-value">{(referrals.total || 0) - (referrals.active || 0)}</span>
                <span className="team-stat-label">Inactive</span>
              </div>
            </div>

            {/* Team List */}
            <div className="section-card">
              <div className="section-header">
                <h3 className="section-title">👥 My Direct Team</h3>
              </div>
              {teamTree.length > 0 ? (
                <div className="team-list">
                  {teamTree.map((member, index) => (
                    <div key={member.id} className="team-member-row animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="member-avatar-lg">
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="member-details">
                        <span className="member-name">{member.name}</span>
                        <span className="member-date">Joined {new Date(member.joined_at || member.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className={`member-badge ${member.has_active_package ? 'active' : 'inactive'}`}>
                        {member.has_active_package ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-large">
                  <span className="empty-icon">👥</span>
                  <h3>Build Your Team</h3>
                  <p>Share your referral link to start earning from your team</p>
                  <button onClick={handleCopyReferral} className="btn btn-primary">
                    📋 Copy Referral Link
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ============================================
           DASHBOARD - PREMIUM STYLES
           ============================================ */

        .dashboard-page {
          max-width: 100%;
          padding-bottom: 2rem;
        }

        /* Animations */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-fade-in {
          animation: fadeInUp 0.4s ease-out;
        }

        .animate-in {
          animation: scaleIn 0.4s ease-out forwards;
          opacity: 0;
        }

        /* Profile Hero Card */
        .profile-hero {
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #172554 100%);
          color: #ffffff;
          border-radius: var(--radius-xl);
          overflow: hidden;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 40px -10px rgba(37, 99, 235, 0.5),
                      0 4px 20px -5px rgba(0, 0, 0, 0.2);
          position: relative;
        }

        .profile-hero::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
          pointer-events: none;
        }

        .profile-hero-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .profile-avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .profile-avatar {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          border: 3px solid rgba(255, 255, 255, 0.2);
        }

        .status-dot {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 3px solid #1e3a8a;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .status-dot.active { background: #10B981; }
        .status-dot.inactive { background: #F59E0B; }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 1.375rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .profile-email {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.85);
          margin: 0 0 0.625rem 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .profile-hero .badge {
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          backdrop-filter: blur(4px);
        }

        .profile-hero .badge-success {
          background: rgba(16, 185, 129, 0.25);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .profile-hero .badge-warning {
          background: rgba(245, 158, 11, 0.25);
          color: #fcd34d;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .profile-hero .badge-danger {
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .profile-referral {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding: 0.875rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(4px);
        }

        .profile-referral:hover {
          background: rgba(255, 255, 255, 0.18);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .referral-label {
          font-size: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.25rem;
        }

        .referral-code {
          font-size: 1.125rem;
          font-weight: 700;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .copy-icon {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .profile-stats-bar {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.2);
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          z-index: 1;
        }

        .profile-stats-bar .stat-item {
          flex: 1;
          text-align: center;
        }

        .profile-stats-bar .stat-value {
          display: block;
          font-size: 1.125rem;
          font-weight: 700;
          color: #ffffff;
        }

        .profile-stats-bar .stat-label {
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.7);
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: rgba(255, 255, 255, 0.15);
        }

        /* Stats Grid Enhanced */
        .stats-grid-enhanced {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card-enhanced {
          background: white;
          border-radius: var(--radius-xl);
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
          text-decoration: none;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card-enhanced:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .stat-card-enhanced::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
        }

        .stat-card-enhanced.success::before { background: var(--accent-500); }
        .stat-card-enhanced.info::before { background: var(--primary-500); }
        .stat-card-enhanced.warning::before { background: #F59E0B; }
        .stat-card-enhanced.accent::before { background: linear-gradient(to bottom, var(--primary-500), var(--accent-500)); }

        .stat-card-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .stat-card-enhanced.success .stat-card-icon { background: var(--accent-50); }
        .stat-card-enhanced.info .stat-card-icon { background: var(--primary-50); }
        .stat-card-enhanced.warning .stat-card-icon { background: #FEF3C7; }
        .stat-card-enhanced.accent .stat-card-icon { background: linear-gradient(135deg, var(--primary-50), var(--accent-50)); }

        .stat-card-content {
          flex: 1;
          min-width: 0;
        }

        .stat-card-value {
          display: block;
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--gray-900);
          line-height: 1.2;
        }

        .stat-card-label {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .stat-card-sub {
          font-size: 0.6875rem;
          color: var(--gray-400);
          margin-top: 0.125rem;
        }

        .stat-card-arrow {
          color: var(--gray-400);
          font-size: 1.25rem;
          opacity: 0;
          transition: all 0.2s;
        }

        .stat-card-enhanced:hover .stat-card-arrow {
          opacity: 1;
          transform: translateX(4px);
        }

        /* Tabs */
        .tabs-container {
          display: flex;
          gap: 0.5rem;
          padding: 0.375rem;
          background: var(--gray-100);
          border-radius: var(--radius-xl);
          margin-bottom: 1.5rem;
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1rem;
          background: transparent;
          border: none;
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--gray-600);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: white;
          color: var(--primary-600);
          box-shadow: var(--shadow-sm);
        }

        .tab-btn:hover:not(.active) {
          color: var(--gray-800);
        }

        .tab-icon { font-size: 1.125rem; }

        .tab-content {
          min-height: 300px;
        }

        /* Section Card */
        .section-card {
          background: white;
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0;
        }

        .link-btn {
          font-size: 0.8125rem;
          color: var(--primary-600);
          text-decoration: none;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
        }

        .link-btn:hover { text-decoration: underline; }

        /* Quick Actions Grid */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        .action-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 1rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          text-decoration: none;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .action-tile:hover {
          background: white;
          border-color: var(--gray-200);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .action-tile.primary {
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          border-color: var(--primary-200);
        }

        .action-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.375rem;
        }

        .action-icon-wrapper.blue { background: var(--primary-100); }
        .action-icon-wrapper.green { background: var(--accent-100); }
        .action-icon-wrapper.purple { background: #EDE9FE; }
        .action-icon-wrapper.orange { background: #FEF3C7; }

        .action-info {
          text-align: center;
        }

        .action-title {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .action-desc {
          font-size: 0.6875rem;
          color: var(--gray-500);
        }

        /* Featured Products */
        .featured-products-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .featured-product-tile {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          transition: all 0.2s ease;
        }

        .featured-product-tile:hover {
          background: white;
          box-shadow: var(--shadow-md);
        }

        .featured-product-image {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .featured-product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-emoji { font-size: 2rem; }

        .featured-product-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }

        .featured-product-content h4 {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 0.375rem 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .featured-incentive {
          margin-bottom: 0.5rem;
        }

        .incentive-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: linear-gradient(135deg, var(--accent-50), var(--primary-50));
          border: 1px solid var(--accent-200);
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--accent-700);
        }

        .featured-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .featured-price {
          font-size: 1rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        .btn-buy {
          padding: 0.375rem 0.75rem;
          background: var(--primary-600);
          color: white;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .btn-buy:hover {
          background: var(--primary-700);
          transform: scale(1.05);
        }

        /* Income Cards */
        .income-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        .income-mini-card {
          text-align: center;
          padding: 1rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          transition: all 0.2s;
        }

        .income-mini-card:hover {
          background: white;
          box-shadow: var(--shadow-sm);
        }

        .income-mini-card.highlight {
          background: linear-gradient(135deg, var(--accent-50), var(--primary-50));
          border: 1px solid var(--accent-200);
        }

        .income-mini-label {
          display: block;
          font-size: 0.6875rem;
          color: var(--gray-500);
          margin-bottom: 0.25rem;
        }

        .income-mini-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--gray-900);
        }

        /* Orders List Compact */
        .orders-list-compact {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .order-item-compact {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          transition: all 0.2s;
        }

        .order-item-compact:hover {
          background: white;
          box-shadow: var(--shadow-sm);
        }

        .order-icon {
          font-size: 1.25rem;
        }

        .order-info {
          flex: 1;
          min-width: 0;
        }

        .order-name {
          display: block;
          font-weight: 500;
          color: var(--gray-900);
          font-size: 0.875rem;
        }

        .order-meta {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .status-pill {
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-pill.delivered { background: var(--accent-100); color: var(--accent-700); }
        .status-pill.processing { background: #FEF3C7; color: #92400E; }
        .status-pill.shipped { background: var(--primary-100); color: var(--primary-700); }
        .status-pill.pending { background: #FEE2E2; color: #B91C1C; }

        .empty-compact {
          text-align: center;
          padding: 2rem;
          color: var(--gray-500);
        }

        .empty-compact .btn { margin-top: 0.75rem; }

        /* Shop Section */
        .shop-hero {
          text-align: center;
          margin-bottom: 1.5rem;
          padding: 2rem;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          border-radius: var(--radius-xl);
        }

        .shop-hero h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gray-900);
          margin: 0 0 0.5rem 0;
        }

        .shop-hero p {
          color: var(--gray-600);
          margin: 0;
        }

        .products-masonry {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .product-card-premium {
          background: white;
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
          transition: all 0.3s ease;
        }

        .product-card-premium:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.15);
        }

        .product-image-wrapper {
          height: 200px;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .product-image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-image {
          font-size: 4rem;
        }

        .product-content-premium {
          padding: 1.5rem;
        }

        .product-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 0.5rem 0;
        }

        .product-desc {
          font-size: 0.875rem;
          color: var(--gray-500);
          margin: 0 0 1rem 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .incentive-highlight {
          background: linear-gradient(135deg, var(--accent-50), var(--primary-50));
          border: 1px solid var(--accent-200);
          border-radius: var(--radius-lg);
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .salary-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .salary-icon { font-size: 1rem; }

        .salary-text {
          font-size: 0.875rem;
          color: var(--gray-700);
        }

        .salary-text strong {
          color: var(--accent-600);
        }

        .salary-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.5rem;
          border-top: 1px dashed var(--accent-200);
          font-size: 0.8125rem;
          color: var(--gray-600);
        }

        .total-amount {
          font-size: 1rem;
          font-weight: 700;
          color: var(--accent-600);
        }

        .product-features-mini {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .feature-tag {
          padding: 0.25rem 0.625rem;
          background: var(--gray-100);
          border-radius: var(--radius-full);
          font-size: 0.6875rem;
          font-weight: 500;
          color: var(--gray-600);
        }

        .product-action-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-100);
        }

        .price-block {
          display: flex;
          flex-direction: column;
        }

        .price-label {
          font-size: 0.6875rem;
          color: var(--gray-500);
        }

        .price-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        .btn-purchase {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
          color: white;
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }

        .btn-purchase:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        /* Team Section */
        .referral-banner {
          background: linear-gradient(135deg, var(--primary-600), var(--primary-800));
          color: white;
          border-radius: var(--radius-xl);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .referral-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .referral-icon {
          font-size: 2.5rem;
        }

        .referral-text h3 {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
        }

        .referral-text p {
          font-size: 0.875rem;
          opacity: 0.85;
          margin: 0;
        }

        .referral-link-box {
          display: flex;
          gap: 0.5rem;
        }

        .referral-input {
          flex: 1;
          padding: 0.875rem 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: var(--radius-lg);
          color: white;
          font-size: 0.875rem;
        }

        .referral-input::placeholder { color: rgba(255, 255, 255, 0.6); }

        .btn-copy {
          padding: 0.875rem 1.25rem;
          background: white;
          color: var(--primary-700);
          border: none;
          border-radius: var(--radius-lg);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-copy:hover {
          transform: scale(1.05);
        }

        .team-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .team-stat-card {
          background: white;
          border-radius: var(--radius-xl);
          padding: 1.25rem;
          text-align: center;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
        }

        .team-stat-card.success { border-top: 3px solid var(--accent-500); }
        .team-stat-card.warning { border-top: 3px solid #F59E0B; }

        .team-stat-card .team-stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: var(--gray-900);
        }

        .team-stat-card .team-stat-label {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .team-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .team-member-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          transition: all 0.2s;
        }

        .team-member-row:hover {
          background: white;
          box-shadow: var(--shadow-sm);
        }

        .member-avatar-lg {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 1.125rem;
          flex-shrink: 0;
        }

        .member-details {
          flex: 1;
          min-width: 0;
        }

        .member-name {
          display: block;
          font-weight: 600;
          color: var(--gray-900);
        }

        .member-date {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .member-badge {
          padding: 0.375rem 0.875rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .member-badge.active {
          background: var(--accent-100);
          color: var(--accent-700);
        }

        .member-badge.inactive {
          background: var(--gray-200);
          color: var(--gray-600);
        }

        .empty-state-large {
          text-align: center;
          padding: 3rem 1rem;
        }

        .empty-icon {
          font-size: 4rem;
          display: block;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state-large h3 {
          margin-bottom: 0.5rem;
          color: var(--gray-900);
        }

        .empty-state-large p {
          color: var(--gray-500);
          margin-bottom: 1.5rem;
        }

        /* ============================================
           RESPONSIVE STYLES
           ============================================ */

        @media (max-width: 1024px) {
          .stats-grid-enhanced {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .profile-hero-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .profile-referral {
            width: 100%;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }

          .profile-stats-bar {
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .stat-divider { display: none; }

          .profile-stats-bar .stat-item {
            flex: 1 1 45%;
            padding: 0.5rem;
          }

          .stats-grid-enhanced {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .stat-card-enhanced {
            padding: 1rem;
          }

          .stat-card-value {
            font-size: 1.125rem;
          }

          .stat-card-arrow { display: none; }

          .tabs-container {
            flex-wrap: wrap;
          }

          .tab-btn {
            flex: 1 1 calc(33.333% - 0.5rem);
            padding: 0.75rem;
          }

          .tab-text {
            display: none;
          }

          .tab-icon {
            font-size: 1.25rem;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .action-tile {
            padding: 1rem;
          }

          .action-icon-wrapper {
            width: 40px;
            height: 40px;
          }

          .action-title {
            font-size: 0.8125rem;
          }

          .action-desc {
            display: none;
          }

          .income-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .featured-products-grid {
            grid-template-columns: 1fr;
          }

          .featured-product-tile {
            padding: 1rem;
          }

          .products-masonry {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .team-stats-row {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }

          .referral-content {
            flex-direction: column;
            text-align: center;
          }

          .referral-link-box {
            flex-direction: column;
          }

          .btn-copy {
            width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .profile-hero {
            margin: 0 -1rem 1rem -1rem;
            border-radius: 0;
          }

          .profile-avatar {
            width: 56px;
            height: 56px;
            font-size: 1.5rem;
          }

          .profile-name {
            font-size: 1.125rem;
          }

          .profile-badges {
            flex-direction: column;
            align-items: flex-start;
          }

          .stats-grid-enhanced {
            grid-template-columns: 1fr;
          }

          .stat-card-enhanced {
            padding: 0.875rem;
          }

          .section-card {
            padding: 1rem;
            margin: 0 -0.5rem 1rem -0.5rem;
            border-radius: var(--radius-lg);
          }

          .product-content-premium {
            padding: 1rem;
          }

          .incentive-highlight {
            padding: 0.875rem;
          }

          .price-value {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Dashboard;