import React from 'react';

/**
 * FloatingActionButton Component - Fixed FAB for mobile
 * @param {ReactNode} icon - Button icon
 * @param {string} label - Accessibility label
 * @param {function} onClick - Click handler
 * @param {string} variant - Style variant: 'primary', 'secondary', 'success', 'danger'
 * @param {boolean} extended - Extended FAB with text
 */
const FloatingActionButton = ({
  icon,
  label,
  onClick,
  variant = 'primary',
  extended = false
}) => {
  return (
    <button
      className={`fab fab-${variant} ${extended ? 'fab-extended' : ''}`}
      onClick={onClick}
      aria-label={label}
    >
      {icon && <span className="fab-icon">{icon}</span>}
      {extended && <span className="fab-label">{label}</span>}

      <style>{`
        .fab {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all var(--transition-normal);
          z-index: 900;
        }

        .fab:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .fab:active {
          transform: scale(0.95);
        }

        .fab-primary {
          background: linear-gradient(135deg, var(--primary-600), var(--primary-700));
          color: white;
        }

        .fab-secondary {
          background: white;
          color: var(--gray-700);
          border: 1px solid var(--gray-200);
        }

        .fab-success {
          background: linear-gradient(135deg, var(--accent-500), var(--accent-600));
          color: white;
        }

        .fab-danger {
          background: linear-gradient(135deg, #EF4444, #DC2626);
          color: white;
        }

        .fab-extended {
          width: auto;
          padding: 0 1.25rem;
          border-radius: 28px;
          gap: 0.5rem;
        }

        .fab-icon {
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fab-label {
          font-size: 0.875rem;
          font-weight: 600;
        }

        @media (min-width: 1024px) {
          .fab {
            display: none;
          }
        }
      `}</style>
    </button>
  );
};

export default FloatingActionButton;