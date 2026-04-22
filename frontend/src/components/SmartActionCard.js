import React from 'react';
import { Link } from 'react-router-dom';

/**
 * SmartActionCard Component - Context-aware prompts based on user state
 * @param {string} type - Card type: 'pan_missing', 'pan_pending', 'no_package', 'low_balance', 'no_referrals'
 * @param {object} action - Action config: { label, href, onClick }
 * @param {string} customMessage - Override default message
 * @param {boolean} dismissible - Show dismiss button
 * @param {function} onDismiss - Dismiss callback
 */
const SmartActionCard = ({
  type,
  action,
  customMessage,
  dismissible = false,
  onDismiss
}) => {
  const cardConfigs = {
    pan_missing: {
      icon: '🪪',
      title: 'Complete Your Profile',
      message: 'Add your PAN number to start earning. PAN verification is required before purchasing a package.',
      variant: 'warning',
      defaultAction: { label: 'Add PAN', href: '/profile' }
    },
    pan_pending: {
      icon: '⏳',
      title: 'PAN Verification Pending',
      message: 'Your PAN is under review. You\'ll be notified once it\'s approved. This usually takes 1-2 business days.',
      variant: 'info',
      defaultAction: { label: 'View Profile', href: '/profile' }
    },
    pan_rejected: {
      icon: '⚠️',
      title: 'PAN Verification Failed',
      message: 'Your PAN was rejected. Please update with correct details to proceed with package purchase.',
      variant: 'danger',
      defaultAction: { label: 'Update PAN', href: '/profile' }
    },
    no_package: {
      icon: '📦',
      title: 'Activate Your Account',
      message: 'Purchase a package to start earning referral salary. Your earning potential is waiting!',
      variant: 'primary',
      defaultAction: { label: 'Purchase Package', href: '/orders' }
    },
    low_balance: {
      icon: '💰',
      title: 'Low Wallet Balance',
      message: 'Add funds to your wallet to purchase packages and activate your earning potential.',
      variant: 'warning',
      defaultAction: { label: 'Add Funds', href: '/wallet' }
    },
    no_referrals: {
      icon: '👥',
      title: 'Grow Your Team',
      message: 'Share your referral link with friends and earn ₹100/month for each active referral!',
      variant: 'success',
      defaultAction: { label: 'Get Referral Link', href: '/referrals' }
    },
    welcome: {
      icon: '👋',
      title: 'Welcome to Blisswell!',
      message: 'Complete your profile setup to start your earning journey. It only takes a few minutes.',
      variant: 'primary',
      defaultAction: { label: 'Get Started', href: '/profile' }
    },
    earnings_available: {
      icon: '💸',
      title: 'Earnings Available',
      message: 'You have pending incentive payouts! Check your incentive section for details.',
      variant: 'success',
      defaultAction: { label: 'View Salary', href: '/salary' }
    }
  };

  const config = cardConfigs[type] || cardConfigs.welcome;

  const variantClasses = {
    primary: 'smart-card-primary',
    warning: 'smart-card-warning',
    danger: 'smart-card-danger',
    success: 'smart-card-success',
    info: 'smart-card-info'
  };

  const actionConfig = action || config.defaultAction;

  const renderAction = () => {
    if (!actionConfig) return null;

    if (actionConfig.href) {
      return (
        <Link to={actionConfig.href} className="btn btn-sm">
          {actionConfig.label}
        </Link>
      );
    }

    if (actionConfig.onClick) {
      return (
        <button className="btn btn-sm" onClick={actionConfig.onClick}>
          {actionConfig.label}
        </button>
      );
    }

    return null;
  };

  return (
    <div className={`smart-action-card ${variantClasses[config.variant] || ''} slide-up`}>
      <div className="smart-card-icon">
        <span>{config.icon}</span>
      </div>
      <div className="smart-card-content">
        <h4 className="smart-card-title">{config.title}</h4>
        <p className="smart-card-message">{customMessage || config.message}</p>
      </div>
      <div className="smart-card-actions">
        {renderAction()}
        {dismissible && (
          <button className="smart-card-dismiss" onClick={onDismiss} aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      <style>{`
        .smart-action-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-radius: var(--radius-lg);
          margin-bottom: 1rem;
          border: 1px solid;
        }

        .smart-card-primary {
          background: linear-gradient(135deg, var(--primary-50), white);
          border-color: var(--primary-200);
        }

        .smart-card-warning {
          background: linear-gradient(135deg, var(--status-paused-bg), white);
          border-color: #FDE68A;
        }

        .smart-card-danger {
          background: linear-gradient(135deg, var(--status-danger-bg), white);
          border-color: #FECACA;
        }

        .smart-card-success {
          background: linear-gradient(135deg, var(--status-active-bg), white);
          border-color: var(--accent-200);
        }

        .smart-card-info {
          background: linear-gradient(135deg, var(--status-paid-bg), white);
          border-color: var(--primary-200);
        }

        .smart-card-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .smart-card-content {
          flex: 1;
          min-width: 0;
        }

        .smart-card-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .smart-card-message {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0;
          line-height: 1.5;
        }

        .smart-card-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .smart-card-dismiss {
          background: none;
          border: none;
          padding: 0.5rem;
          color: var(--gray-400);
          cursor: pointer;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .smart-card-dismiss:hover {
          background: var(--gray-100);
          color: var(--gray-600);
        }

        .smart-action-card .btn {
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .smart-action-card {
            flex-direction: column;
            align-items: flex-start;
          }

          .smart-card-actions {
            width: 100%;
            justify-content: space-between;
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * GetSmartCards - Returns appropriate smart cards based on user state
 * @param {object} user - User object with profile data
 * @param {object} wallet - Wallet data
 * @param {object} referrals - Referrals data
 * @returns {Array} Array of smart card configs
 */
export const getSmartCards = (user, wallet, referrals) => {
  const cards = [];

  if (!user) return cards;

  // Normalize PAN status to lowercase for comparison
  const panStatus = (user.pan_status || '').toLowerCase();

  // PAN status checks
  if (!user.pan_number || panStatus === '' || panStatus === 'not_submitted') {
    cards.push({ type: 'pan_missing', priority: 1 });
  } else if (panStatus === 'pending') {
    cards.push({ type: 'pan_pending', priority: 2 });
  } else if (panStatus === 'rejected') {
    cards.push({ type: 'pan_rejected', priority: 1 });
  }
  // Only show package/balance alerts if PAN is approved
  else if (panStatus === 'approved') {
    // Package status check
    if (!user.has_active_package) {
      const balance = parseFloat(wallet?.balance) || 0;
      const packagePrice = 2100; // Default package price
      if (balance < packagePrice) {
        cards.push({ type: 'low_balance', priority: 2 });
      } else {
        cards.push({ type: 'no_package', priority: 1 });
      }
    }
    // Referrals check - only if has active package
    else if (!referrals || referrals.total === 0 || referrals.active === 0) {
      cards.push({ type: 'no_referrals', priority: 3 });
    }
  }

  // Sort by priority
  return cards.sort((a, b) => a.priority - b.priority);
};

export default SmartActionCard;