import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { orderAPI } from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PurchaseModal = ({ isOpen, onClose, product, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('confirm'); // 'confirm' | 'processing' | 'success' | 'failed' | 'cancelled'
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  console.log('PurchaseModal render:', { isOpen, product: product?.name, razorpayLoaded });

  // Load Razorpay script
  useEffect(() => {
    console.log('Loading Razorpay script...');
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      console.log('Razorpay script loaded successfully');
      setRazorpayLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      toast.error('Failed to load payment gateway. Please refresh the page.');
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Record cancelled payment
  const recordCancelledPayment = async (productId, razorpayOrderId, reason) => {
    try {
      await orderAPI.recordCancelledPayment({
        product_id: productId,
        razorpay_order_id: razorpayOrderId,
        reason: reason
      });
      console.log('Cancelled payment recorded');
    } catch (error) {
      console.error('Failed to record cancelled payment:', error);
    }
  };

  // Record failed payment
  const recordFailedPayment = async (productId, razorpayOrderId, errorCode, errorDescription) => {
    try {
      await orderAPI.recordFailedPayment({
        product_id: productId,
        razorpay_order_id: razorpayOrderId,
        error_code: errorCode,
        error_description: errorDescription
      });
      console.log('Failed payment recorded');
    } catch (error) {
      console.error('Failed to record failed payment:', error);
    }
  };

  const handlePurchase = async () => {
    console.log('handlePurchase called:', { product: product?.name, razorpayLoaded });

    if (!product) {
      console.error('No product selected');
      return;
    }

    if (!razorpayLoaded) {
      console.error('Razorpay not loaded yet');
      toast.error('Payment gateway is loading. Please try again in a moment.');
      return;
    }

    setLoading(true);
    setStep('processing');
    setErrorMessage('');

    try {
      console.log('Creating Razorpay order for product:', product.id);

      // Step 1: Create Razorpay order
      const orderResponse = await orderAPI.createPaymentOrder(product.id);
      console.log('Razorpay order created:', orderResponse.data);

      const razorpayOrderId = orderResponse.data.order_id;
      setCurrentOrderId(razorpayOrderId);

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderResponse.data.key_id,
        amount: orderResponse.data.amount,
        currency: orderResponse.data.currency,
        order_id: razorpayOrderId,
        name: 'Blisswell',
        description: `Purchase: ${product.name}`,
        handler: async (response) => {
          console.log('Razorpay payment response:', response);
          try {
            // Step 3: Verify payment and create order
            const verifyResponse = await orderAPI.verifyAndPurchase({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              product_id: product.id
            });

            console.log('Payment verified:', verifyResponse.data);
            setStep('success');
            toast.success('Purchase successful!');

            // Redirect to orders page after 2 seconds
            setTimeout(() => {
              onSuccess && onSuccess(verifyResponse.data);
              onClose();
            }, 2000);

          } catch (verifyError) {
            console.error('Payment verification failed:', verifyError);
            const errorMsg = verifyError.response?.data?.message || 'Payment verification failed';
            setErrorMessage(errorMsg);
            setStep('failed');

            // Record failed payment
            await recordFailedPayment(product.id, razorpayOrderId, 'VERIFICATION_FAILED', errorMsg);

            toast.error(errorMsg);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#2563eb'
        },
        modal: {
          ondismiss: async () => {
            console.log('Razorpay modal dismissed');
            setStep('cancelled');
            setErrorMessage('Payment was cancelled by user');

            // Record cancelled payment
            await recordCancelledPayment(product.id, razorpayOrderId, 'User cancelled payment');

            toast.info('Payment cancelled');
          }
        }
      };

      console.log('Opening Razorpay checkout with options:', { key: options.key, amount: options.amount, order_id: options.order_id });
      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error('Create order error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create order';
      setErrorMessage(errorMsg);
      setStep('failed');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setErrorMessage('');
    setCurrentOrderId(null);
    onClose();
  };

  if (!isOpen || !product) return null;

  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString('en-IN');
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content purchase-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'confirm' && (
          <>
            <div className="modal-header">
              <h2>Confirm Purchase</h2>
              <button className="close-btn" onClick={handleClose}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="product-summary">
                <div className="product-image-preview">
                  {product.image ? (
                    <img
                      src={`${API_URL.replace('/api', '')}${product.image}`}
                      alt={product.name}
                    />
                  ) : (
                    <div className="product-placeholder">🛏️</div>
                  )}
                </div>
                <div className="product-details">
                  <h3>{product.name}</h3>
                  {product.description && (
                    <p className="product-description">{product.description}</p>
                  )}
                  <div className="price-info">
                    <span className="price-label">Total Amount</span>
                    <span className="price-value">₹{formatPrice(product.price)}</span>
                  </div>
                </div>
              </div>

              {product.salary_amount && product.salary_duration && (
                <div className="earning-info">
                  <div className="earning-badge">
                    <span className="earning-icon">💰</span>
                    <div className="earning-text">
                      <span className="earning-label">Your Referral Earnings</span>
                      <span className="earning-amount">₹{formatPrice(product.salary_amount)}/month for {product.salary_duration} months</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="payment-note">
                <p>Payment will be processed securely via Razorpay</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handlePurchase} disabled={loading}>
                {loading ? 'Processing...' : `Pay ₹${formatPrice(product.price)}`}
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="processing-state">
            <div className="spinner"></div>
            <p>Processing your payment...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="success-state">
            <div className="success-icon">✓</div>
            <h3>Purchase Successful!</h3>
            <p>Your order has been placed successfully.</p>
            <p className="redirect-note">Redirecting to your orders...</p>
          </div>
        )}

        {step === 'cancelled' && (
          <div className="failed-state">
            <div className="failed-icon">✕</div>
            <h3>Payment Cancelled</h3>
            <p>You cancelled the payment.</p>
            <p className="error-note">{errorMessage}</p>
            <div className="failed-actions">
              <button className="btn btn-secondary" onClick={handleClose}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => setStep('confirm')}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {step === 'failed' && (
          <div className="failed-state">
            <div className="failed-icon">✕</div>
            <h3>Payment Failed</h3>
            <p>Something went wrong with your payment.</p>
            <p className="error-note">{errorMessage}</p>
            <div className="failed-actions">
              <button className="btn btn-secondary" onClick={handleClose}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => setStep('confirm')}>
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .product-summary {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 12px;
          margin-bottom: 1rem;
        }

        .product-image-preview {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
        }

        .product-image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          font-size: 2rem;
        }

        .product-details {
          flex: 1;
        }

        .product-details h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .product-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 0.5rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .price-info {
          display: flex;
          flex-direction: column;
        }

        .price-label {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .price-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #2563eb;
        }

        .earning-info {
          margin-bottom: 1rem;
        }

        .earning-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #d1fae5, #a7f3d0);
          border-radius: 12px;
        }

        .earning-icon {
          font-size: 1.5rem;
        }

        .earning-text {
          display: flex;
          flex-direction: column;
        }

        .earning-label {
          font-size: 0.75rem;
          color: #047857;
        }

        .earning-amount {
          font-size: 0.875rem;
          font-weight: 600;
          color: #047857;
        }

        .payment-note {
          text-align: center;
          padding: 1rem;
          background: #f3f4f6;
          border-radius: 8px;
        }

        .payment-note p {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .modal-footer {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #f3f4f6;
          border: none;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-primary {
          background: #2563eb;
          border: none;
          color: white;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .processing-state, .success-state, .failed-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .success-icon {
          width: 64px;
          height: 64px;
          background: #10b981;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .failed-icon {
          width: 64px;
          height: 64px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .success-state h3 {
          margin: 0 0 0.5rem 0;
          color: #047857;
        }

        .failed-state h3 {
          margin: 0 0 0.5rem 0;
          color: #dc2626;
        }

        .success-state p, .failed-state p {
          margin: 0;
          color: #6b7280;
        }

        .redirect-note, .error-note {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #9ca3af;
        }

        .error-note {
          color: #dc2626;
          max-width: 300px;
          word-wrap: break-word;
        }

        .failed-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          width: 100%;
        }

        .failed-actions .btn {
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default PurchaseModal;