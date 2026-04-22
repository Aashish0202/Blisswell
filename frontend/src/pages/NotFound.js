import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <div className="not-found-icon">
          <span>404</span>
        </div>
        <h1>Page Not Found</h1>
        <p>Sorry, the page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            <span>🏠</span> Go to Home
          </Link>
          <Link to="/login" className="btn btn-secondary">
            <span>👤</span> Login
          </Link>
        </div>
        <div className="not-found-help">
          <p>Need help? <Link to="/contact">Contact Support</Link></p>
        </div>
      </div>

      <style>{`
        .not-found-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--gray-50) 0%, var(--primary-50) 100%);
          padding: 2rem;
        }

        .not-found-content {
          text-align: center;
          max-width: 500px;
        }

        .not-found-icon {
          margin-bottom: 2rem;
        }

        .not-found-icon span {
          font-size: 8rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }

        .not-found-content h1 {
          font-size: 2rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 1rem;
        }

        .not-found-content p {
          font-size: 1.125rem;
          color: var(--gray-600);
          margin-bottom: 2rem;
        }

        .not-found-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }

        .not-found-actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          font-size: 1rem;
        }

        .not-found-help {
          padding-top: 1.5rem;
          border-top: 1px solid var(--gray-200);
        }

        .not-found-help p {
          font-size: 0.875rem;
          color: var(--gray-500);
          margin: 0;
        }

        .not-found-help a {
          color: var(--primary-600);
          font-weight: 500;
        }

        .not-found-help a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .not-found-icon span {
            font-size: 5rem;
          }

          .not-found-content h1 {
            font-size: 1.5rem;
          }

          .not-found-content p {
            font-size: 1rem;
          }

          .not-found-actions {
            flex-direction: column;
          }

          .not-found-actions .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default NotFound;