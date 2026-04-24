import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSiteSettings } from '../components/SiteSettingsProvider';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const { siteName, siteLogo } = useSiteSettings();

  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) return siteLogo;
      const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      return `${baseUrl}${siteLogo}`;
    }
    return null;
  };

  useEffect(() => {
    const validateToken = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const response = await axios.get(`${apiUrl}/auth/validate-reset-token/${token}`);
        setValidToken(response.data.valid);
      } catch (error) {
        setValidToken(false);
      } finally {
        setValidating(false);
      }
    };

    if (token) {
      validateToken();
    } else {
      setValidating(false);
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      await axios.post(`${apiUrl}/auth/reset-password/${token}`, { password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-card card">
          <div className="loading-state">
            <span className="spinner-large"></span>
            <p>Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!validToken) {
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

          <div className="invalid-token-message">
            <div className="invalid-icon">⚠️</div>
            <h2>Invalid or Expired Link</h2>
            <p>This password reset link is invalid or has expired.</p>
            <p>Please request a new password reset link.</p>
            <Link to="/forgot-password" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1.5rem' }}>
              Request New Link
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }}>
              Back to Login
            </Link>
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

          .invalid-token-message {
            text-align: center;
            padding: 1rem 0;
          }

          .invalid-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .invalid-token-message h2 {
            font-size: 1.25rem;
            color: var(--gray-800);
            margin-bottom: 0.5rem;
          }

          .invalid-token-message p {
            font-size: 0.875rem;
            color: var(--gray-500);
            margin-bottom: 0.25rem;
          }
        `}</style>
      </div>
    );
  }

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

        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-subtitle">Enter your new password</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <small className="form-hint">Password must be at least 6 characters</small>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
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
                Resetting...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/login" className="forgot-link">
            Back to Login
          </Link>
        </div>

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

        .spinner-large {
          width: 40px;
          height: 40px;
          border: 3px solid var(--gray-200);
          border-top-color: var(--primary-600);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: block;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-state {
          text-align: center;
          padding: 2rem;
        }

        .loading-state p {
          color: var(--gray-500);
          margin-top: 1rem;
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

        .auth-footer {
          text-align: center;
        }

        .forgot-link {
          color: var(--primary-600);
          font-size: 0.875rem;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-input-wrapper .form-input {
          padding-right: 45px;
        }

        .password-toggle-btn {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 5px;
          font-size: 1.1rem;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .password-toggle-btn:hover {
          opacity: 1;
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

export default ResetPassword;