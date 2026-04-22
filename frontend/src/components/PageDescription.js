import React from 'react';

/**
 * PageDescription Component - Page header with description
 * @param {string} title - Page title
 * @param {string} description - Page description
 * @param {ReactNode} actions - Action buttons to display
 * @param {string} icon - Optional icon emoji
 */
const PageDescription = ({ title, description, actions, icon }) => {
  return (
    <div className="page-description">
      <div className="page-description-content">
        {icon && <span className="page-description-icon">{icon}</span>}
        <div className="page-description-text">
          <h1 className="page-description-title">{title}</h1>
          {description && <p className="page-description-subtitle">{description}</p>}
        </div>
      </div>
      {actions && <div className="page-description-actions">{actions}</div>}

      <style>{`
        .page-description {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .page-description-content {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .page-description-icon {
          font-size: 1.5rem;
        }

        .page-description-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .page-description-subtitle {
          color: var(--gray-500);
          font-size: 0.875rem;
          margin: 0;
          max-width: 500px;
        }

        .page-description-actions {
          display: flex;
          gap: 0.75rem;
        }

        @media (max-width: 768px) {
          .page-description {
            flex-direction: column;
          }

          .page-description-actions {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default PageDescription;