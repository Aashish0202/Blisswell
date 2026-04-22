import React from 'react';

/**
 * EmptyState Component - Professional empty state with illustration and CTA
 * @param {string} icon - Emoji icon to display
 * @param {string} title - Title text
 * @param {string} description - Description text
 * @param {object} action - Action button config: { label, onClick, variant, icon }
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {ReactNode} children - Custom content below description
 */
const EmptyState = ({
  icon,
  title,
  description,
  action,
  size = 'md',
  children
}) => {
  const sizeClasses = {
    sm: 'empty-state-sm',
    md: '',
    lg: 'empty-state-lg'
  };

  const buttonVariant = action?.variant || 'primary';

  return (
    <div className={`empty-state-container ${sizeClasses[size] || ''}`}>
      {icon && (
        <div className="empty-state-icon">
          <span role="img" aria-hidden="true">{icon}</span>
        </div>
      )}
      {title && <h4 className="empty-state-title">{title}</h4>}
      {description && <p className="empty-state-description">{description}</p>}
      {children}
      {action && (
        <button
          className={`btn btn-${buttonVariant}`}
          onClick={action.onClick}
        >
          {action.icon && <span>{action.icon}</span>}
          {action.label}
        </button>
      )}

      <style>{`
        .empty-state-container {
          text-align: center;
          padding: 3rem 1.5rem;
        }

        .empty-state-sm {
          padding: 2rem 1rem;
        }

        .empty-state-sm .empty-state-icon {
          width: 64px;
          height: 64px;
          font-size: 2rem;
        }

        .empty-state-sm .empty-state-title {
          font-size: 1rem;
        }

        .empty-state-lg {
          padding: 4rem 2rem;
        }

        .empty-state-lg .empty-state-icon {
          width: 120px;
          height: 120px;
          font-size: 3.5rem;
        }

        .empty-state-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 88px;
          height: 88px;
          margin: 0 auto 1.25rem;
          background: linear-gradient(135deg, var(--primary-50) 0%, var(--accent-50) 100%);
          border-radius: 50%;
          font-size: 2.5rem;
        }

        .empty-state-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-800);
          margin-bottom: 0.5rem;
        }

        .empty-state-description {
          color: var(--gray-500);
          font-size: 0.875rem;
          max-width: 320px;
          margin: 0 auto 1.25rem;
          line-height: 1.5;
        }

        .empty-state-container .btn {
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default EmptyState;