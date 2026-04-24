import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSiteSettings } from '../components/SiteSettingsProvider';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { siteName, siteLogo } = useSiteSettings();

  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) return siteLogo;
      const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      return `${baseUrl}${siteLogo}`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      await axios.post(`${apiUrl}/auth/forgot-password`, { email: email.toLowerCase().trim() });
      setEmailSent(true);
      toast.success('If an account with this email exists, a password reset link has been sent.');
    } catch (error) {
      // Even on error, show success message for security (don't reveal if email exists)
      setEmailSent(true);
      toast.success('If an account with this email exists, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
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

        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">
          {emailSent
            ? 'Check your email for the reset link'
            : 'Enter your email to receive a password reset link'}
        </p>

        {!emailSent ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <small className="form-hint">
                We'll send a password reset link to this email
              </small>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-small"></span>
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        ) : (
          <div className="email-sent-message">
            <div className="email-icon">📧</div>
            <p className="email-text">
              A password reset link has been sent to <strong>{email}</strong>
            </p>
            <p className="email-note">
              Please check your inbox and spam folder. The link will expire in 1 hour.
            </p>
            <button
              className="btn btn-secondary btn-lg"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => {
                setEmailSent(false);
                setEmail('');
              }}
            >
              Send Another Link
            </button>
          </div>
        )}

        <div className="auth-divider">
          <span>Remember your password?</span>
        </div>

        <Link to="/login" className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
          Back to Login
        </Link>

        <div className="auth-secure">
          <span className="secure-icon">🔒</span>
          <span>Secured with 256-bit encryption</span>
        </div>
      </div>

      <style>{`
        .auth-page-wrapper {
          min-height: calc(100vh - 140px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, var(--gray-50) 0%, var(--primary-50) 100%);
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

        .btn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--gray-100);
          color: var(--gray-400);
          font-size: 0.75rem;
        }

        .secure-icon {
          font-size: 0.875rem;
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .email-sent-message {
          text-align: center;
          padding: 1rem 0;
        }

        .email-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .email-text {
          font-size: 1rem;
          color: var(--gray-700);
          margin-bottom: 0.5rem;
        }

        .email-note {
          font-size: 0.875rem;
          color: var(--gray-500);
        }

        @media (max-width: 768px) {
          .auth-page-wrapper {
            min-height: calc(100vh - 60px);
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;