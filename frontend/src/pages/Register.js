import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI, siteAPI } from '../utils/api';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const Register = () => {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    state: 'Maharashtra',
    pan_number: '',
    password: '',
    confirmPassword: '',
    ref: refCode || '',
    terms_accepted: false
  });
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);
  const [termsContent, setTermsContent] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState(null);
  const [validatingRef, setValidatingRef] = useState(false);
  const [panInfo, setPanInfo] = useState(null);
  const [validatingPan, setValidatingPan] = useState(false);
  const navigate = useNavigate();
  const { siteName, siteLogo } = useSiteSettings();

  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) return siteLogo;
      const baseUrl = (process.env.REACT_APP_API_URL).replace('/api', '');
      return `${baseUrl}${siteLogo}`;
    }
    return null;
  };

  // Validate referral code
  const validateReferralCode = useCallback(async (code) => {
    if (!code || code.length < 3) {
      setReferrerInfo(null);
      return;
    }

    setValidatingRef(true);
    try {
      const response = await authAPI.validateReferralCode(code);
      if (response.data.valid) {
        setReferrerInfo({
          name: response.data.referrer.name,
          code: response.data.referrer.referral_code
        });
      } else {
        setReferrerInfo(null);
      }
    } catch (error) {
      setReferrerInfo(null);
    } finally {
      setValidatingRef(false);
    }
  }, []);

  // Validate PAN number
  const validatePAN = useCallback(async (pan) => {
    if (!pan || pan.length !== 10) {
      setPanInfo(null);
      return;
    }

    // Check format first
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(pan.toUpperCase())) {
      setPanInfo({ valid: false, message: 'Invalid PAN format' });
      return;
    }

    setValidatingPan(true);
    try {
      const response = await authAPI.validatePAN(pan);
      if (response.data.valid) {
        setPanInfo({ valid: true, message: 'PAN is available' });
      } else {
        setPanInfo({ valid: false, message: response.data.message });
      }
    } catch (error) {
      setPanInfo({ valid: false, message: 'Error validating PAN' });
    } finally {
      setValidatingPan(false);
    }
  }, []);

  useEffect(() => {
    fetchTerms();
    // Validate referral code from URL
    if (refCode) {
      validateReferralCode(refCode);
    }
  }, [refCode, validateReferralCode]);

  const fetchTerms = async () => {
    try {
      const response = await siteAPI.getSettings();
      if (response.data.settings?.terms_and_conditions) {
        setTermsContent(response.data.settings.terms_and_conditions);
      } else {
        setTermsContent('By registering, you agree to our terms of service and privacy policy. You acknowledge that the referral program is subject to the company\'s terms and conditions.');
      }
    } catch (error) {
      setTermsContent('By registering, you agree to our terms of service and privacy policy.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });

    // Validate referral code on change (with debounce)
    if (name === 'ref') {
      setReferrerInfo(null);
      if (value && value.length >= 3) {
        // Clear any existing timeout
        if (window.referralTimeout) {
          clearTimeout(window.referralTimeout);
        }
        // Set new timeout for validation
        window.referralTimeout = setTimeout(() => {
          validateReferralCode(value);
        }, 500);
      }
    }

    // Validate PAN on change (with debounce)
    if (name === 'pan_number') {
      const upperValue = value.toUpperCase();
      setFormData(prev => ({ ...prev, pan_number: upperValue }));
      setPanInfo(null);
      if (upperValue.length === 10) {
        // Clear any existing timeout
        if (window.panTimeout) {
          clearTimeout(window.panTimeout);
        }
        // Set new timeout for validation
        window.panTimeout = setTimeout(() => {
          validatePAN(upperValue);
        }, 500);
      }
    }
  };

  const validateForm = () => {
    if (!formData.ref || formData.ref.length < 3) {
      toast.error('Referral code is required');
      return false;
    }
    if (!referrerInfo) {
      toast.error('Please enter a valid referral code');
      return false;
    }
    // PAN validation - Indian format: 5 letters + 4 digits + 1 letter (10 characters total)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(formData.pan_number.toUpperCase())) {
      toast.error('Invalid PAN number. Format should be ABCDE1234F (5 letters + 4 digits + 1 letter)');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.mobile)) {
      toast.error('Invalid mobile number');
      return false;
    }
    if (!formData.terms_accepted) {
      toast.error('You must accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await authAPI.register({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        state: formData.state,
        pan_number: formData.pan_number.toUpperCase(),
        password: formData.password,
        ref: formData.ref,
        terms_accepted: formData.terms_accepted
      });

      setRegisteredUser(response.data.user);
      setShowSuccessModal(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    navigate('/login');
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <Link to="/" className="logo-link">
            {getLogoUrl() ? (
              <img src={getLogoUrl()} alt={siteName || 'Blisswell'} className="logo-img" />
            ) : (
              <span className="logo-text">🛏️ {siteName || 'Blisswell'}</span>
            )}
          </Link>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join {siteName || 'Blisswell'} and start earning</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile</label>
            <input
              type="tel"
              name="mobile"
              className="form-input"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10 digit mobile number"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">State</label>
            <select
              name="state"
              className="form-input"
              value={formData.state}
              onChange={handleChange}
              required
            >
              <option value="Maharashtra">Maharashtra</option>
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
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">PAN Number <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              name="pan_number"
              className="form-input"
              value={formData.pan_number}
              onChange={handleChange}
              placeholder="ABCDE1234F (5 letters + 4 digits + 1 letter)"
              maxLength={10}
              style={{ textTransform: 'uppercase' }}
              required
            />
            {validatingPan && (
              <span className="referral-status validating">Checking PAN...</span>
            )}
            {panInfo && !validatingPan && panInfo.valid && (
              <span className="referral-status valid">
                ✓ PAN is available
              </span>
            )}
            {panInfo && !validatingPan && !panInfo.valid && formData.pan_number.length === 10 && (
              <span className="referral-status invalid">
                ✗ {panInfo.message}
              </span>
            )}
            {formData.pan_number.length > 0 && formData.pan_number.length < 10 && !panInfo && (
              <span className="referral-status validating">
                Enter 10 characters (5 letters + 4 digits + 1 letter)
              </span>
            )}
            <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
              One PAN can be used for only one registration
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              className="form-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Referral Code <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text"
              name="ref"
              className="form-input"
              value={formData.ref}
              onChange={handleChange}
              placeholder="Enter referral code"
              style={{ textTransform: 'uppercase' }}
              required
            />
            {validatingRef && (
              <span className="referral-status validating">Checking referral code...</span>
            )}
            {referrerInfo && !validatingRef && (
              <span className="referral-status valid">
                ✓ Referred by: <strong>{referrerInfo.name}</strong>
              </span>
            )}
            {formData.ref && formData.ref.length >= 3 && !referrerInfo && !validatingRef && (
              <span className="referral-status invalid">
                ✗ Invalid referral code
              </span>
            )}
            {!formData.ref && (
              <span className="referral-status invalid">
                * A valid referral code is required to register
              </span>
            )}
          </div>

          <div className="terms-section">
            <label className="terms-checkbox">
              <input
                type="checkbox"
                name="terms_accepted"
                checked={formData.terms_accepted}
                onChange={handleChange}
                required
              />
              <span className="checkmark"></span>
              <span className="terms-text">
                I accept the{' '}
                <button type="button" className="terms-link" onClick={() => setShowTermsModal(true)}>
                  Terms and Conditions
                </button>
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6366f1' }}>
            Login
          </Link>
        </p>
      </div>

      {/* Success Modal */}
      {showSuccessModal && registeredUser && (
        <div className="modal-overlay">
          <div className="modal-content success-modal">
            <div className="modal-header success">
              <h2>🎉 Registration Successful!</h2>
            </div>
            <div className="modal-body">
              <p className="success-message">Your account has been created successfully. Please save your login details.</p>

              <div className="credentials-box">
                <div className="credential-item">
                  <label>User ID (Referral Code)</label>
                  <div className="credential-value">
                    <span>{registeredUser.referral_code}</span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(registeredUser.referral_code)}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
                <div className="credential-item">
                  <label>Email</label>
                  <div className="credential-value">
                    <span>{registeredUser.email}</span>
                  </div>
                </div>
                <div className="credential-item">
                  <label>Password</label>
                  <div className="credential-value">
                    <span>••••••••</span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(formData.password)}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              </div>

              <div className="warning-box">
                <strong>⚠️ Important:</strong> Please save your User ID safely. You will need it to login to your account.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleModalClose}>
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="modal-overlay">
          <div className="modal-content terms-modal">
            <div className="modal-header">
              <h2>Terms and Conditions</h2>
              <button className="close-btn" onClick={() => setShowTermsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="terms-content">
                {termsContent || 'Loading...'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTermsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .auth-page {
          min-height: calc(100vh - 140px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, var(--gray-50) 0%, var(--primary-50) 100%);
        }

        .auth-card {
          max-width: 450px;
          width: 100%;
          padding: 2rem;
        }

        .auth-logo {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .logo-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .logo-link .logo-img {
          height: 50px;
          width: auto;
          max-width: 200px;
          object-fit: contain;
          border-radius: 8px;
          padding: 4px 8px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .logo-link .logo-text {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--primary-600);
        }

        .auth-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .auth-subtitle {
          color: var(--gray-500);
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .terms-section {
          margin: 1.5rem 0;
          padding: 1rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
        }

        .terms-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
        }

        .terms-checkbox input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          cursor: pointer;
        }

        .terms-text {
          font-size: 0.875rem;
          color: var(--gray-600);
          line-height: 1.5;
        }

        .terms-link {
          background: none;
          border: none;
          color: var(--primary-600);
          cursor: pointer;
          text-decoration: underline;
          font-size: 0.875rem;
          padding: 0;
        }

        .terms-link:hover {
          color: var(--primary-700);
        }

        .referral-status {
          display: block;
          font-size: 0.8125rem;
          margin-top: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-sm);
        }

        .referral-status.validating {
          color: var(--gray-500);
          background: var(--gray-50);
        }

        .referral-status.valid {
          color: var(--accent-700);
          background: var(--accent-50);
        }

        .referral-status.invalid {
          color: var(--status-danger);
          background: #fef2f2;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: var(--radius-xl);
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--gray-100);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header.success {
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          color: white;
          justify-content: center;
          border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        }

        .modal-header.success h2 {
          color: white;
          margin: 0;
          font-size: 1.25rem;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.125rem;
          color: var(--gray-900);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--gray-500);
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .success-message {
          text-align: center;
          color: var(--gray-600);
          margin-bottom: 1.5rem;
        }

        .credentials-box {
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .credential-item {
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--gray-100);
        }

        .credential-item:last-child {
          border-bottom: none;
        }

        .credential-item label {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .credential-value {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .credential-value span {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          font-family: monospace;
        }

        .copy-btn {
          background: var(--primary-50);
          border: 1px solid var(--primary-200);
          color: var(--primary-700);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.2s;
        }

        .copy-btn:hover {
          background: var(--primary-100);
        }

        .warning-box {
          background: #fef3c7;
          border: 1px solid #fde68a;
          border-radius: var(--radius-lg);
          padding: 1rem;
          font-size: 0.875rem;
          color: #92400e;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--gray-100);
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .terms-modal .terms-content {
          max-height: 300px;
          overflow-y: auto;
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--gray-700);
          white-space: pre-wrap;
        }

        @media (max-width: 768px) {
          .auth-page {
            padding: 1rem;
          }

          .auth-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Register;