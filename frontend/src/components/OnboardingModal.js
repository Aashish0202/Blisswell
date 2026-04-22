import React from 'react';
import Modal from './Modal';
import ProgressTracker from './ProgressTracker';
import { useOnboarding } from '../context/OnboardingContext';

/**
 * OnboardingModal Component - Step-by-step onboarding modal
 */
const OnboardingModal = () => {
  const {
    isActive,
    currentStep,
    steps,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    progress
  } = useOnboarding();

  if (!isActive) return null;

  const isLastStep = currentStep >= steps.length - 1;
  const isFirstStep = currentStep === 0;

  const stepContent = {
    welcome: {
      icon: '👋',
      title: 'Welcome to Blisswell!',
      description: 'Let us help you get started. This quick tour will show you how to start earning.',
      features: [
        { icon: '💰', title: 'Earn Incentive', description: 'Get ₹100/month incentive per active referral' },
        { icon: '👥', title: 'Build Your Team', description: 'Invite friends and grow earnings' },
        { icon: '📦', title: 'Quality Products', description: 'Premium bedsheets at great prices' }
      ]
    },
    profile: {
      icon: '👤',
      title: 'Complete Your Profile',
      description: 'Add your PAN number for verification. This is required to purchase packages and start earning.',
      action: {
        label: 'Go to Profile',
        href: '/profile'
      }
    },
    wallet: {
      icon: '💳',
      title: 'Fund Your Wallet',
      description: 'Add money to your wallet using secure payment options. Minimum deposit is ₹100.',
      features: [
        { icon: '🔒', title: 'Secure Payments', description: 'Powered by Razorpay' },
        { icon: '⚡', title: 'Instant Credit', description: 'Funds added immediately' }
      ]
    },
    package: {
      icon: '📦',
      title: 'Purchase a Package',
      description: 'Buy a package to activate your account and start earning referral incentive.',
      action: {
        label: 'View Products',
        href: '/orders'
      }
    },
    referral: {
      icon: '👥',
      title: 'Share & Earn',
      description: 'Invite friends using your referral link. Earn ₹100/month for each active referral for 12 months!',
      features: [
        { icon: '🔗', title: 'Unique Link', description: 'Share your personal referral link' },
        { icon: '💸', title: 'Monthly Earnings', description: '₹100 per active referral' },
        { icon: '📅', title: '12 Months', description: 'Earn for a full year per referral' }
      ]
    },
    tour: {
      icon: '🎯',
      title: "You're All Set!",
      description: 'You now know everything to get started. Your dashboard shows your earnings, referrals, and wallet balance.',
      features: [
        { icon: '📊', title: 'Dashboard', description: 'Overview of your activity' },
        { icon: '💰', title: 'Wallet', description: 'Manage your funds' },
        { icon: '📦', title: 'Orders', description: 'Track your purchases' },
        { icon: '💸', title: 'Incentive', description: 'View your incentive earnings' }
      ]
    }
  };

  const currentStepId = steps[currentStep]?.id;
  const content = stepContent[currentStepId] || stepContent.welcome;

  const handlePrimaryAction = () => {
    if (isLastStep) {
      completeOnboarding();
    } else {
      nextStep();
    }
  };

  return (
    <Modal
      isOpen={isActive}
      onClose={skipOnboarding}
      size="lg"
      showCloseButton={true}
    >
      {/* Progress Tracker */}
      <div className="onboarding-progress">
        <ProgressTracker currentStep={currentStep} steps={steps} />
      </div>

      {/* Step Content */}
      <div className="onboarding-content">
        <div className="onboarding-icon">
          <span>{content.icon}</span>
        </div>
        <h2 className="onboarding-title">{content.title}</h2>
        <p className="onboarding-description">{content.description}</p>

        {/* Features Grid */}
        {content.features && (
          <div className="onboarding-features">
            {content.features.map((feature, index) => (
              <div key={index} className="onboarding-feature">
                <div className="feature-icon">{feature.icon}</div>
                <div className="feature-text">
                  <strong>{feature.title}</strong>
                  <span>{feature.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        {content.action && (
          <a href={content.action.href} className="btn btn-primary btn-lg" onClick={completeOnboarding}>
            {content.action.label}
          </a>
        )}
      </div>

      {/* Footer Actions */}
      <div className="onboarding-footer">
        <div className="footer-left">
          {!isFirstStep && (
            <button className="btn btn-ghost" onClick={prevStep}>
              ← Back
            </button>
          )}
        </div>
        <div className="footer-right">
          <button className="btn btn-ghost" onClick={skipOnboarding}>
            Skip Tour
          </button>
          {!content.action && (
            <button className="btn btn-primary" onClick={handlePrimaryAction}>
              {isLastStep ? "Let's Go!" : 'Continue →'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        .onboarding-progress {
          border-bottom: 1px solid var(--gray-100);
          margin: -1.5rem -1.5rem 0;
          padding: 0 1rem;
        }

        .onboarding-content {
          text-align: center;
          padding: 2rem 1rem;
        }

        .onboarding-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
        }

        .onboarding-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 0.75rem;
        }

        .onboarding-description {
          color: var(--gray-500);
          font-size: 1rem;
          max-width: 400px;
          margin: 0 auto 1.5rem;
          line-height: 1.6;
        }

        .onboarding-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .onboarding-feature {
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          padding: 1rem;
          text-align: left;
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
        }

        .onboarding-feature .feature-icon {
          font-size: 1.25rem;
        }

        .feature-text {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .feature-text strong {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .feature-text span {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .onboarding-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid var(--gray-100);
          margin-top: 1rem;
        }

        .footer-left,
        .footer-right {
          display: flex;
          gap: 0.75rem;
        }

        @media (max-width: 480px) {
          .onboarding-features {
            grid-template-columns: 1fr;
          }

          .onboarding-footer {
            flex-direction: column;
            gap: 1rem;
          }

          .footer-left,
          .footer-right {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </Modal>
  );
};

export default OnboardingModal;