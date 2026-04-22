import React from 'react';
import Modal from './Modal';

/**
 * ConfirmationDialog Component - Replaces window.confirm() with styled dialog
 * @param {boolean} isOpen - Controls dialog visibility
 * @param {function} onClose - Callback when dialog is closed
 * @param {function} onConfirm - Callback when confirmed
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message/content
 * @param {string} confirmText - Text for confirm button (default: 'Confirm')
 * @param {string} cancelText - Text for cancel button (default: 'Cancel')
 * @param {string} variant - Style variant: 'danger', 'warning', 'info', 'success'
 * @param {boolean} loading - Show loading state on confirm button
 */
const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false
}) => {
  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }
    onClose();
  };

  const iconMap = {
    danger: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    warning: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.64 18.68 1.82 18.98C2 19.28 2.32 19.46 2.68 19.46H21.32C21.68 19.46 22 19.28 22.18 18.98C22.36 18.68 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.21 3.38 12.86 3.38C12.51 3.38 12.19 3.56 12.01 3.86H10.29Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    info: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 17V13M12 9H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    success: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  };

  const buttonVariantClass = {
    danger: 'btn-danger',
    warning: 'btn-primary',
    info: 'btn-primary',
    success: 'btn-success'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
    >
      <div className="confirmation-dialog">
        <div className={`confirmation-icon confirmation-icon-${variant}`}>
          {iconMap[variant] || iconMap.warning}
        </div>
        <h3 className="confirmation-title">{title}</h3>
        {message && <p className="confirmation-message">{message}</p>}
        <div className="confirmation-actions">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={`btn ${buttonVariantClass[variant] || 'btn-primary'}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>

      <style>{`
        .confirmation-dialog {
          text-align: center;
          padding: 1rem 0;
        }

        .confirmation-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          margin-bottom: 1rem;
        }

        .confirmation-icon-danger {
          background: var(--status-danger-bg);
          color: var(--status-danger);
        }

        .confirmation-icon-warning {
          background: var(--status-paused-bg);
          color: #D97706;
        }

        .confirmation-icon-info {
          background: var(--status-paid-bg);
          color: var(--status-paid);
        }

        .confirmation-icon-success {
          background: var(--status-active-bg);
          color: var(--status-active);
        }

        .confirmation-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.5rem;
        }

        .confirmation-message {
          color: var(--gray-500);
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .confirmation-actions {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
        }
      `}</style>
    </Modal>
  );
};

export default ConfirmationDialog;