import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';

const WalletDeposit = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [verifyName, setVerifyName] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery || searchQuery.length < 2) {
      toast.error('Please enter at least 2 characters');
      return;
    }

    setSearching(true);
    try {
      const response = await adminAPI.searchUsers(searchQuery);
      setSearchResults(response.data.users);
      if (response.data.users.length === 0) {
        toast.info('No users found');
      }
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    setVerifyName(user.name);
    setVerifyEmail(user.email);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleDeposit = async (e) => {
    e.preventDefault();

    if (!selectedUser) {
      toast.error('Please select a user first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Verify name and email match
    if (verifyName.toLowerCase() !== selectedUser.name.toLowerCase()) {
      toast.error('Name does not match the selected user');
      return;
    }

    if (verifyEmail.toLowerCase() !== selectedUser.email.toLowerCase()) {
      toast.error('Email does not match the selected user');
      return;
    }

    setLoading(true);
    try {
      const response = await adminAPI.addWalletBalance({
        userId: selectedUser.id,
        amount: parseFloat(amount),
        description: description || `Admin deposit`,
        verifyName,
        verifyEmail
      });

      toast.success(`₹${amount} added to ${selectedUser.name}'s wallet`);

      // Reset form
      setSelectedUser(null);
      setAmount('');
      setDescription('');
      setVerifyName('');
      setVerifyEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add balance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="wallet-deposit-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Wallet Deposit</h1>
            <p className="page-subtitle">Add balance to user wallets</p>
          </div>
        </div>

        {!selectedUser ? (
          <div className="card">
            <h3>Search User</h3>
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                className="form-input"
                placeholder="Search by name, email, mobile, or referral code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={searching}>
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>Results ({searchResults.length})</h4>
                <div className="user-list">
                  {searchResults.map((user) => (
                    <div key={user.id} className="user-item" onClick={() => selectUser(user)}>
                      <div className="user-info">
                        <strong>{user.name}</strong>
                        <span className="user-email">{user.email}</span>
                        <span className="user-mobile">{user.mobile}</span>
                        <span className="user-referral">Referral: {user.referral_code}</span>
                      </div>
                      <div className="user-meta">
                        <span className={`badge badge-${user.is_active ? 'success' : 'danger'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {user.has_active_package && (
                          <span className="badge badge-info">Has Package</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="deposit-form-container">
            <div className="card">
              <div className="selected-user">
                <h3>Selected User</h3>
                <div className="user-details">
                  <div className="detail-row">
                    <label>Name:</label>
                    <span>{selectedUser.name}</span>
                  </div>
                  <div className="detail-row">
                    <label>Email:</label>
                    <span>{selectedUser.email}</span>
                  </div>
                  <div className="detail-row">
                    <label>Mobile:</label>
                    <span>{selectedUser.mobile}</span>
                  </div>
                  <div className="detail-row">
                    <label>Referral Code:</label>
                    <span style={{ fontWeight: 'bold', color: '#6366f1' }}>{selectedUser.referral_code}</span>
                  </div>
                  <div className="detail-row">
                    <label>Status:</label>
                    <span className={`badge badge-${selectedUser.is_active ? 'success' : 'danger'}`}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-ghost"
                  onClick={() => setSelectedUser(null)}
                >
                  Change User
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Deposit Details</h3>
              <form onSubmit={handleDeposit}>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    className="form-input"
                    placeholder="Reason for deposit..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows="3"
                  />
                </div>

                <div className="verification-section">
                  <h4>Verification</h4>
                  <p className="verification-note">
                    Please confirm the following details match the selected user:
                  </p>

                  <div className="form-group">
                    <label>Confirm Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type the user's name"
                      value={verifyName}
                      onChange={(e) => setVerifyName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Type the user's email"
                      value={verifyEmail}
                      onChange={(e) => setVerifyEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setSelectedUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : `Deposit ₹${amount || '0'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .wallet-deposit-page {
          max-width: 800px;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .search-form {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-form .form-input {
          flex: 1;
        }

        .search-results {
          margin-top: 1.5rem;
        }

        .search-results h4 {
          margin-bottom: 1rem;
          color: var(--text-secondary);
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .user-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: var(--bg-color);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid var(--border-color);
        }

        .user-item:hover {
          background: var(--primary-light);
          border-color: var(--primary-color);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .user-info strong {
          color: var(--text-primary);
        }

        .user-email, .user-mobile, .user-referral {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .user-referral {
          color: #6366f1;
          font-weight: 500;
        }

        .user-meta {
          display: flex;
          gap: 0.5rem;
        }

        .deposit-form-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .selected-user {
          background: var(--bg-color);
          padding: 1.5rem;
          border-radius: 8px;
        }

        .user-details {
          margin: 1rem 0;
        }

        .detail-row {
          display: flex;
          gap: 1rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row label {
          font-weight: 500;
          min-width: 100px;
          color: var(--text-secondary);
        }

        .detail-row span {
          color: var(--text-primary);
        }

        .verification-section {
          background: var(--bg-color);
          padding: 1.5rem;
          border-radius: 8px;
          margin: 1.5rem 0;
        }

        .verification-section h4 {
          margin-bottom: 0.5rem;
        }

        .verification-note {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge-success {
          background: #10B981;
          color: white;
        }

        .badge-danger {
          background: #EF4444;
          color: white;
        }

        .badge-info {
          background: #3B82F6;
          color: white;
        }

        @media (max-width: 768px) {
          .search-form {
            flex-direction: column;
          }

          .user-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .user-meta {
            flex-wrap: wrap;
          }

          .form-actions {
            flex-direction: column;
          }

          .form-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default WalletDeposit;