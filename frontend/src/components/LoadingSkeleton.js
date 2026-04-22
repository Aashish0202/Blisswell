import React from 'react';

/**
 * LoadingSkeleton Component - Animated loading placeholders
 * @param {string} variant - Type: 'text', 'card', 'table', 'avatar', 'image'
 * @param {number} count - Number of items (for text/table rows)
 * @param {string} width - Custom width (e.g., '100%', '200px')
 * @param {string} height - Custom height
 * @param {string} className - Additional CSS classes
 */
const LoadingSkeleton = ({
  variant = 'text',
  count = 1,
  width,
  height,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'text':
        return (
          <div className={`skeleton-container ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className="skeleton skeleton-text"
                style={{
                  width: width || (i === count - 1 ? '80%' : '100%'),
                  height: height || '16px'
                }}
              />
            ))}
          </div>
        );

      case 'card':
        return (
          <div className={`skeleton-card ${className}`}>
            <div className="skeleton skeleton-card-header" />
            <div className="skeleton-card-body">
              <div className="skeleton skeleton-line" style={{ width: '100%' }} />
              <div className="skeleton skeleton-line" style={{ width: '90%' }} />
              <div className="skeleton skeleton-line" style={{ width: '75%' }} />
            </div>
          </div>
        );

      case 'table':
        return (
          <div className={`skeleton-table ${className}`}>
            {/* Header */}
            <div className="skeleton-table-header">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-cell" style={{ height: '20px' }} />
              ))}
            </div>
            {/* Rows */}
            {Array.from({ length: count }).map((_, rowIndex) => (
              <div key={rowIndex} className="skeleton-table-row">
                {Array.from({ length: 5 }).map((_, cellIndex) => (
                  <div key={cellIndex} className="skeleton skeleton-cell" />
                ))}
              </div>
            ))}
          </div>
        );

      case 'avatar':
        return (
          <div
            className={`skeleton skeleton-avatar ${className}`}
            style={{ width: width || '40px', height: height || '40px' }}
          />
        );

      case 'image':
        return (
          <div
            className={`skeleton skeleton-image ${className}`}
            style={{ width: width || '100%', height: height || '200px' }}
          />
        );

      case 'stat':
        return (
          <div className={`skeleton-stat ${className}`}>
            <div className="skeleton skeleton-stat-icon" />
            <div className="skeleton-stat-content">
              <div className="skeleton skeleton-stat-label" />
              <div className="skeleton skeleton-stat-value" />
            </div>
          </div>
        );

      default:
        return (
          <div
            className={`skeleton ${className}`}
            style={{ width: width || '100%', height: height || '20px' }}
          />
        );
    }
  };

  return renderSkeleton();
};

export default LoadingSkeleton;