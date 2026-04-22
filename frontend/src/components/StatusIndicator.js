import React from 'react';

/**
 * StatusIndicator Component - Animated status badges with pulse
 * @param {string} status - Status type: 'active', 'paused', 'completed', 'pending', 'danger'
 * @param {string} label - Display label
 * @param {boolean} pulse - Enable pulse animation
 * @param {string} size - Size: 'sm', 'md', 'lg'
 */
const StatusIndicator = ({
  status = 'active',
  label,
  pulse = false,
  size = 'md'
}) => {
  const statusConfig = {
    active: { color: 'var(--status-active)', bg: 'var(--status-active-bg)', icon: '✓' },
    paused: { color: 'var(--status-paused)', bg: 'var(--status-paused-bg)', icon: '⏸' },
    completed: { color: 'var(--status-completed)', bg: 'var(--status-completed-bg)', icon: '✓' },
    pending: { color: 'var(--status-pending)', bg: 'var(--status-pending-bg)', icon: '⏳' },
    danger: { color: 'var(--status-danger)', bg: 'var(--status-danger-bg)', icon: '✗' }
  };

  const config = statusConfig[status] || statusConfig.active;

  return (
    <span className={`status-indicator status-${status} status-${size} ${pulse ? 'status-pulse' : ''}`}>
      <span className="status-dot" style={{ background: config.color }} />
      <span className="status-label" style={{ color: config.color }}>
        {label || status}
      </span>

      <style>{`
        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          background: ${config.bg};
        }

        .status-sm {
          padding: 0.125rem 0.5rem;
          font-size: 0.6875rem;
        }

        .status-md {
          font-size: 0.75rem;
        }

        .status-lg {
          padding: 0.375rem 1rem;
          font-size: 0.8125rem;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-sm .status-dot {
          width: 5px;
          height: 5px;
        }

        .status-lg .status-dot {
          width: 8px;
          height: 8px;
        }

        .status-label {
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-pulse .status-dot {
          animation: statusPulse 2s ease-out infinite;
        }

        @keyframes statusPulse {
          0% {
            box-shadow: 0 0 0 0 currentColor;
          }
          70% {
            box-shadow: 0 0 0 6px transparent;
          }
          100% {
            box-shadow: 0 0 0 0 transparent;
          }
        }
      `}</style>
    </span>
  );
};

export default StatusIndicator;