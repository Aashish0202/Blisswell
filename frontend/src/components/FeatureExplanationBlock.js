import React, { useState } from 'react';

/**
 * FeatureExplanationBlock Component - Page descriptions with collapsible help
 * @param {string} title - Block title
 * @param {string} description - Short description
 * @param {Array} features - Array of feature objects: { icon, title, description }
 * @param {boolean} collapsible - Allow collapsing the block
 * @param {boolean} defaultExpanded - Start expanded or collapsed
 * @param {string} variant - Style variant: 'default', 'highlighted', 'subtle'
 */
const FeatureExplanationBlock = ({
  title,
  description,
  features = [],
  collapsible = true,
  defaultExpanded = false,
  variant = 'default'
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const variantClasses = {
    default: 'feature-block-default',
    highlighted: 'feature-block-highlighted',
    subtle: 'feature-block-subtle'
  };

  return (
    <div className={`feature-explanation-block ${variantClasses[variant] || ''}`}>
      <div
        className={`feature-header ${collapsible ? 'clickable' : ''}`}
        onClick={() => collapsible && setExpanded(!expanded)}
      >
        <div className="feature-header-content">
          <h4 className="feature-title">{title}</h4>
          {description && <p className="feature-description">{description}</p>}
        </div>
        {collapsible && (
          <button
            className="feature-toggle"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className={`toggle-icon ${expanded ? 'rotated' : ''}`}
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {expanded && features.length > 0 && (
        <div className="feature-content slide-down">
          <div className="feature-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-item">
                {feature.icon && (
                  <div className="feature-item-icon">
                    <span>{feature.icon}</span>
                  </div>
                )}
                <div className="feature-item-content">
                  <h5 className="feature-item-title">{feature.title}</h5>
                  <p className="feature-item-description">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .feature-explanation-block {
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          overflow: hidden;
        }

        .feature-block-default {
          background: white;
          border: 1px solid var(--gray-200);
        }

        .feature-block-highlighted {
          background: linear-gradient(135deg, var(--primary-50), white);
          border: 1px solid var(--primary-200);
        }

        .feature-block-subtle {
          background: var(--gray-50);
          border: 1px solid var(--gray-100);
        }

        .feature-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1rem 1.25rem;
        }

        .feature-header.clickable {
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .feature-header.clickable:hover {
          background: var(--gray-50);
        }

        .feature-header-content {
          flex: 1;
        }

        .feature-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .feature-description {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0;
          line-height: 1.5;
        }

        .feature-toggle {
          background: none;
          border: none;
          padding: 0.25rem;
          color: var(--gray-400);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .feature-toggle:hover {
          background: var(--gray-100);
          color: var(--gray-600);
        }

        .toggle-icon {
          transition: transform 0.2s ease;
        }

        .toggle-icon.rotated {
          transform: rotate(180deg);
        }

        .feature-content {
          padding: 0 1.25rem 1rem;
          border-top: 1px solid var(--gray-100);
          margin-top: 0.5rem;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          padding-top: 1rem;
        }

        .feature-item {
          display: flex;
          gap: 0.75rem;
        }

        .feature-item-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--primary-50);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .feature-item-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.125rem;
        }

        .feature-item-description {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin: 0;
          line-height: 1.4;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default FeatureExplanationBlock;