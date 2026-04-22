import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { login } from '../redux/slices/authSlice';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const Login = () => {
  const [formData, setFormData] = useState({
    user_id: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { siteName, siteLogo } = useSiteSettings();

  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) return siteLogo;
      // const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
            const baseUrl = (process.env.REACT_APP_API_URL).replace('/api', '');

      return `${baseUrl}${siteLogo}`;
    }
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      // Only convert user_id to uppercase, keep password as-is
      [name]: name === 'user_id' ? value.toUpperCase() : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await dispatch(login(formData)).unwrap();
      toast.success('Login successful!');

      if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error || 'Login failed. Please check your credentials.');
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

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to access your dashboard</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">User ID (Referral Code)</label>
            <input
              type="text"
              name="user_id"
              className="form-input"
              placeholder="Enter your User ID (e.g., BSW000001)"
              value={formData.user_id}
              onChange={handleChange}
              required
              style={{ textTransform: 'uppercase' }}
            />
            <small className="form-hint">Your User ID starts with BSW followed by 6 digits</small>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
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
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>New to Blisswell?</span>
        </div>

        <Link to="/register" className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
          Create an Account
        </Link>

        <div className="auth-footer">
          <Link to="/forgot-password" className="forgot-link">
            Forgot Password?
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

        .auth-footer {
          text-align: center;
          margin-top: 1rem;
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

export default Login;