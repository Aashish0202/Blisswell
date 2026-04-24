import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { userAPI } from '../../utils/api';
import { loadUser } from '../../redux/slices/authSlice';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    state: '',
    address: '',
    pan_number: ''
  });
  const [kycData, setKycData] = useState({
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    nominee_name: '',
    nominee_relation: ''
  });
  const [existingKyc, setExistingKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      setProfileData(response.data.user);
      setProfileImage(response.data.user.profile_image);
      setFormData({
        name: response.data.user.name || '',
        mobile: response.data.user.mobile || '',
        state: response.data.user.state || '',
        address: response.data.user.address || '',
        pan_number: response.data.user.pan_number || ''
      });
      if (response.data.kyc) {
        setExistingKyc(response.data.kyc);
        setKycData({
          bank_name: response.data.kyc.bank_name || '',
          account_number: response.data.kyc.account_number || '',
          ifsc_code: response.data.kyc.ifsc_code || '',
          branch_name: response.data.kyc.branch_name || '',
          nominee_name: response.data.kyc.nominee_name || '',
          nominee_relation: response.data.kyc.nominee_relation || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Get profile image URL
  const getProfileImageUrl = () => {
    if (profileImage) {
      if (profileImage.startsWith('http')) {
        return profileImage;
      }
      // Use API URL from environment
      const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      return `${baseUrl}${profileImage}`;
    }
    return null;
  };

  // Handle profile image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (jpeg, jpg, png, gif, webp)');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('profile_image', file);

      const response = await userAPI.uploadProfileImage(formData);
      setProfileImage(response.data.profile_image);
      toast.success('Profile image uploaded successfully');
      dispatch(loadUser());
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleKycChange = (e) => {
    setKycData({
      ...kycData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      // Only send fields that are editable (not locked by admin)
      const updateData = {
        state: formData.state,
        address: formData.address
      };

      // Only include name if it's not already set (not locked)
      if (!profileData.name || profileData.name.trim() === '') {
        updateData.name = formData.name;
      }

      // Only include mobile if it's not already set (not locked)
      if (!profileData.mobile || profileData.mobile.trim() === '') {
        updateData.mobile = formData.mobile;
      }

      // Only include pan_number if it's not already set (not locked)
      if (!profileData.pan_number || profileData.pan_number.trim() === '') {
        updateData.pan_number = formData.pan_number;
      }

      await userAPI.updateProfile(updateData);
      toast.success('Profile updated successfully');
      dispatch(loadUser());
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setKycLoading(true);

    try {
      await userAPI.submitKYC(kycData);
      toast.success('KYC submitted successfully');
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit KYC');
    } finally {
      setKycLoading(false);
    }
  };

  if (!profileData) {
    return (
      <DashboardLayout>
        <div className="profile-page">
          <div className="page-header">
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your account details</p>
          </div>
          <LoadingSkeleton variant="card" />
        </div>
      </DashboardLayout>
    );
  }

  const getPANStatusBadge = () => {
    const statusConfig = {
      approved: { label: '✓ Approved', class: 'badge-success' },
      pending: { label: '⏳ Pending', class: 'badge-warning' },
      rejected: { label: '✗ Rejected', class: 'badge-danger' }
    };
    const status = statusConfig[profileData.pan_status] || { label: 'Not Submitted', class: 'badge-neutral' };
    return <span className={`badge ${status.class}`}>{status.label}</span>;
  };

  const getKYCStatusBadge = () => {
    if (!existingKyc) {
      return <span className="badge badge-neutral">Not Submitted</span>;
    }
    const statusConfig = {
      approved: { label: '✓ Approved', class: 'badge-success' },
      pending: { label: '⏳ Pending', class: 'badge-warning' },
      rejected: { label: '✗ Rejected', class: 'badge-danger' }
    };
    const status = statusConfig[existingKyc.kyc_status] || { label: 'Not Submitted', class: 'badge-neutral' };
    return <span className={`badge ${status.class}`}>{status.label}</span>;
  };

  const kycDisabled = existingKyc?.kyc_status === 'approved';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="profile-page">
          <LoadingSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="profile-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your account details and settings</p>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="profile-overview">
          <div className="profile-avatar-section">
            <div className="profile-avatar-large" onClick={() => fileInputRef.current?.click()}>
              {getProfileImageUrl() ? (
                <img src={getProfileImageUrl()} alt="Profile" className="avatar-image" />
              ) : (
                <span className="avatar-initial">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
              {imageUploading && <div className="avatar-loading"><span>Uploading...</span></div>}
              <div className="avatar-overlay"><span>Change Photo</span></div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
            />
            <button
              className="btn-change-photo"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageUploading}
            >
              {imageUploading ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
          <div className="profile-meta">
            <h2>{profileData.name}</h2>
            <p>{profileData.email}</p>
            <div className="profile-badges">
              <span className={`badge ${profileData.has_active_package ? 'badge-success' : 'badge-warning'}`}>
                {profileData.has_active_package ? '✓ Active Package' : '○ No Active Package'}
              </span>
              {getPANStatusBadge()}
              {getKYCStatusBadge()}
            </div>
          </div>
          <div className="profile-quick-info">
            <div className="quick-info-item">
              <span className="quick-info-label">User ID</span>
              <span className="quick-info-value">{profileData.referral_code}</span>
            </div>
            <div className="quick-info-item">
              <span className="quick-info-label">Member Since</span>
              <span className="quick-info-value">
                {new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile Info
          </button>
          <button
            className={`tab-btn ${activeTab === 'kyc' ? 'active' : ''}`}
            onClick={() => setActiveTab('kyc')}
          >
            🏦 Bank Details (KYC)
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Edit Profile</h3>
            </div>
            <form onSubmit={handleProfileSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleProfileChange}
                    disabled={profileData.name && profileData.name.trim() !== ''}
                    style={profileData.name && profileData.name.trim() !== '' ? { background: '#f3f4f6', cursor: 'not-allowed' } : {}}
                    required
                  />
                  {profileData.name && profileData.name.trim() !== '' && (
                    <small className="form-hint" style={{ color: 'var(--accent-600)' }}>
                      🔒 Name is set by admin and cannot be changed. Contact support for corrections.
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={profileData.email}
                    disabled
                    style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                  />
                  <small className="form-hint">Email cannot be changed</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    name="mobile"
                    className="form-input"
                    value={formData.mobile}
                    onChange={handleProfileChange}
                    pattern="[0-9]{10}"
                    title="Please enter a valid 10-digit mobile number"
                    disabled={profileData.mobile && profileData.mobile.trim() !== ''}
                    style={profileData.mobile && profileData.mobile.trim() !== '' ? { background: '#f3f4f6', cursor: 'not-allowed' } : {}}
                    required
                  />
                  {profileData.mobile && profileData.mobile.trim() !== '' && (
                    <small className="form-hint" style={{ color: 'var(--accent-600)' }}>
                      🔒 Mobile number is set by admin and cannot be changed. Contact support for corrections.
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input
                    type="text"
                    name="pan_number"
                    className="form-input"
                    value={formData.pan_number}
                    onChange={handleProfileChange}
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    placeholder="e.g., ABCDE1234F"
                    style={{ textTransform: 'uppercase' }}
                    disabled={profileData.pan_number && profileData.pan_number.trim() !== ''}
                  />
                  {profileData.pan_number && profileData.pan_number.trim() !== '' && (
                    <small className="form-hint" style={{ color: 'var(--accent-600)' }}>
                      🔒 PAN cannot be changed once submitted. Contact admin for corrections.
                    </small>
                  )}
                  <div className="pan-status-hint">
                    {profileData.pan_status === 'approved' && (
                      <span className="hint-success">✓ Your PAN is approved</span>
                    )}
                    {profileData.pan_status === 'pending' && formData.pan_number && (
                      <span className="hint-warning">⏳ PAN verification pending</span>
                    )}
                    {profileData.pan_status === 'rejected' && (
                      <span className="hint-danger">✗ PAN rejected. Contact admin for corrections.</span>
                    )}
                    {!profileData.pan_status && !profileData.pan_number && (
                      <span className="hint-info">⚠️ Please enter your PAN. One-time entry only - cannot be changed later.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">State</label>
                  <select
                    name="state"
                    className="form-input"
                    value={formData.state}
                    onChange={handleProfileChange}
                  >
                    <option value="">Select State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    name="address"
                    className="form-input"
                    value={formData.address}
                    onChange={handleProfileChange}
                    placeholder="Enter your full address"
                    rows="3"
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={profileLoading}
                >
                  {profileLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* KYC Tab */}
        {activeTab === 'kyc' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Bank Details (KYC)</h3>
              {getKYCStatusBadge()}
            </div>

            {existingKyc?.kyc_status === 'rejected' && existingKyc.rejected_reason && (
              <div className="rejection-notice">
                <strong>Rejection Reason:</strong> {existingKyc.rejected_reason}
              </div>
            )}

            {existingKyc?.kyc_status === 'approved' && (
              <div className="approval-notice">
                <span className="notice-icon">✓</span>
                <span>Your KYC has been approved. Bank details are locked.</span>
              </div>
            )}

            {!existingKyc && (
              <div className="info-notice">
                <span className="notice-icon">ℹ️</span>
                <span><strong>Important:</strong> Bank details can only be submitted/updated once. After submission, please contact support for any changes.</span>
              </div>
            )}

            {existingKyc && existingKyc.kyc_status === 'pending' && (
              <div className="pending-notice">
                <span className="notice-icon">⏳</span>
                <span>Your KYC is pending verification. You will be notified once approved.</span>
              </div>
            )}

            <form onSubmit={handleKycSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bank Name *</label>
                  <input
                    type="text"
                    name="bank_name"
                    className="form-input"
                    value={kycData.bank_name}
                    onChange={handleKycChange}
                    placeholder="Enter bank name"
                    required
                    disabled={kycDisabled}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number *</label>
                  <input
                    type="text"
                    name="account_number"
                    className="form-input"
                    value={kycData.account_number}
                    onChange={handleKycChange}
                    placeholder="Enter account number"
                    required
                    disabled={kycDisabled}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">IFSC Code *</label>
                  <input
                    type="text"
                    name="ifsc_code"
                    className="form-input"
                    value={kycData.ifsc_code}
                    onChange={handleKycChange}
                    placeholder="e.g., SBIN0001234"
                    pattern="[A-Z]{4}0[A-Z0-9]{6}"
                    style={{ textTransform: 'uppercase' }}
                    required
                    disabled={kycDisabled}
                  />
                  <small className="form-hint">11 character code (e.g., SBIN0001234)</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    name="branch_name"
                    className="form-input"
                    value={kycData.branch_name}
                    onChange={handleKycChange}
                    placeholder="Enter branch name"
                    disabled={kycDisabled}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nominee Name</label>
                  <input
                    type="text"
                    name="nominee_name"
                    className="form-input"
                    value={kycData.nominee_name}
                    onChange={handleKycChange}
                    placeholder="Enter nominee name"
                    disabled={kycDisabled}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nominee Relation</label>
                  <select
                    name="nominee_relation"
                    className="form-input"
                    value={kycData.nominee_relation}
                    onChange={handleKycChange}
                    disabled={kycDisabled}
                  >
                    <option value="">Select relation</option>
                    <option value="spouse">Spouse</option>
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="brother">Brother</option>
                    <option value="sister">Sister</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {!kycDisabled && (
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={kycLoading}
                  >
                    {kycLoading ? 'Submitting...' : existingKyc ? 'Update KYC' : 'Submit KYC'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Security Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Security</h3>
          </div>
          <div className="security-content">
            <div className="security-info">
              <h4>Password & Security</h4>
              <p>Keep your account secure by using a strong password and updating it regularly.</p>
            </div>
            <a href="/change-password" className="btn btn-secondary">
              Change Password
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .profile-page {
          max-width: 800px;
        }

        .tabs-container {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          background: var(--gray-100);
          padding: 0.25rem;
          border-radius: var(--radius-lg);
        }

        .tab-btn {
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

        .tab-btn.active {
          background: white;
          color: var(--primary-600);
          box-shadow: var(--shadow-sm);
        }

        .profile-overview {
          background: white;
          border-radius: var(--radius-xl);
          padding: 2rem;
          margin-bottom: 1.5rem;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          align-items: center;
        }

        .profile-avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .profile-avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 700;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .avatar-initial {
          font-size: 2rem;
          font-weight: 700;
        }

        .avatar-loading {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.7rem;
        }

        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .avatar-overlay span {
          color: white;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .profile-avatar-large:hover .avatar-overlay {
          opacity: 1;
        }

        .btn-change-photo {
          padding: 0.4rem 0.75rem;
          font-size: 0.75rem;
          background: var(--primary-50);
          color: var(--primary-600);
          border: 1px solid var(--primary-200);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-change-photo:hover {
          background: var(--primary-100);
        }

        .btn-change-photo:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .profile-meta {
          flex: 1;
          min-width: 200px;
        }

        .profile-meta h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .profile-meta p {
          color: var(--gray-500);
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .profile-badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .profile-quick-info {
          display: flex;
          gap: 2rem;
          padding-left: 1.5rem;
          border-left: 1px solid var(--gray-200);
        }

        .quick-info-item {
          display: flex;
          flex-direction: column;
        }

        .quick-info-label {
          font-size: 0.75rem;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .quick-info-value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          font-family: monospace;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .pan-status-hint {
          margin-top: 0.5rem;
          font-size: 0.8125rem;
        }

        .hint-success {
          color: var(--accent-600);
        }

        .hint-warning {
          color: #D97706;
        }

        .hint-danger {
          color: var(--status-danger);
        }

        .hint-info {
          color: var(--gray-500);
        }

        .form-actions {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-100);
        }

        .security-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .security-info h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .security-info p {
          color: var(--gray-500);
          font-size: 0.875rem;
          margin: 0;
        }

        .rejection-notice {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 1rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .approval-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          color: #065f46;
          padding: 1rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .info-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 1rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .pending-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
          padding: 1rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .notice-icon {
          font-weight: bold;
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        select.form-input {
          appearance: auto;
        }

        @media (max-width: 768px) {
          .profile-overview {
            flex-direction: column;
            text-align: center;
          }

          .profile-meta {
            min-width: 100%;
          }

          .profile-badges {
            justify-content: center;
          }

          .profile-quick-info {
            border-left: none;
            border-top: 1px solid var(--gray-200);
            padding-left: 0;
            padding-top: 1rem;
            width: 100%;
            justify-content: center;
          }

          .security-content {
            flex-direction: column;
            text-align: center;
          }

          .tabs-container {
            flex-direction: column;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Profile;