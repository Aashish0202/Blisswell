import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { orderAPI, paymentAPI } from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Extract YouTube video ID from various URL formats
const getYouTubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// initialDesignIdx: the design the buyer already picked on the product card.
// When set, that design is locked in here so it isn't chosen twice.
const PurchaseModal = ({ isOpen, onClose, product, onSuccess, initialDesignIdx = null }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('confirm'); // 'confirm' | 'qr' | 'qr-submitted' | 'processing' | 'success' | 'failed' | 'cancelled'
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [, setCurrentOrderId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDesignIdx, setSelectedDesignIdx] = useState(null);
  const [designLocked, setDesignLocked] = useState(false);
  const [designImageIdx, setDesignImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [designVideoOpen, setDesignVideoOpen] = useState(false);
  // One-time purchase rule
  const [alreadyOwned, setAlreadyOwned] = useState(false);
  // Payment methods the admin has switched on, and the buyer's choice
  const [payConfig, setPayConfig] = useState(null);
  const [payMethod, setPayMethod] = useState('razorpay');
  const [pendingQr, setPendingQr] = useState(null);
  const [qrUtr, setQrUtr] = useState('');
  const [qrFile, setQrFile] = useState(null);
  const [qrPreview, setQrPreview] = useState('');
  const [qrSubmitting, setQrSubmitting] = useState(false);

  const designs = (product && Array.isArray(product.designs)) ? product.designs : [];
  const selectedDesign = selectedDesignIdx !== null ? (designs[selectedDesignIdx] || null) : null;
  // Out-of-stock designs stay visible but can't be bought; if every design is
  // out of stock the product can't be purchased at all.
  const allDesignsOutOfStock = designs.length > 0 && designs.every(d => d.out_of_stock);

  // Reset the design selection whenever the modal opens or the product
  // changes, so a stale selection never leaks between purchases. A design
  // picked on the product card carries over and is locked. Also gate the
  // confirm step for users who already own a package (one-time rule).
  useEffect(() => {
    if (isOpen) {
      // An out-of-stock design picked on the card is not carried over — the
      // buyer chooses another one here instead.
      const carried = initialDesignIdx !== null && designs[initialDesignIdx] && !designs[initialDesignIdx].out_of_stock
        ? initialDesignIdx
        : null;
      setSelectedDesignIdx(carried);
      setDesignLocked(carried !== null);
      setDesignImageIdx(0);
      setLightboxOpen(false);
      setDesignVideoOpen(false);
      setQrUtr('');
      setQrFile(null);
      setPendingQr(null);
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        setAlreadyOwned(!!(u && u.has_active_package));
      } catch (e) {
        setAlreadyOwned(false);
      }
    }
  }, [isOpen, product?.id, initialDesignIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load enabled payment methods + any QR payment still awaiting approval
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    Promise.all([
      paymentAPI.getConfig(),
      paymentAPI.getMyQrPayments().catch(() => ({ data: { requests: [] } }))
    ]).then(([cfg, mine]) => {
      if (cancelled) return;
      const config = cfg.data;
      setPayConfig(config);
      setPayMethod(config.razorpay.enabled ? 'razorpay' : 'qr');
      setPendingQr((mine.data.requests || []).find(r => r.status === 'pending') || null);
    }).catch(() => {
      if (!cancelled) setPayConfig({ razorpay: { enabled: true }, qr: { enabled: false } });
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Local preview of the attached payment screenshot
  useEffect(() => {
    if (!qrFile) { setQrPreview(''); return undefined; }
    const url = URL.createObjectURL(qrFile);
    setQrPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [qrFile]);

  const selectDesign = (idx) => {
    if (designs[idx] && designs[idx].out_of_stock) return;
    setSelectedDesignIdx(idx);
    setDesignImageIdx(0);
    setDesignVideoOpen(false);
  };

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

    if (designs.length > 0 && !selectedDesign) {
      toast.error('Please select a design before purchasing');
      return;
    }

    if (selectedDesign && selectedDesign.out_of_stock) {
      toast.error(`${selectedDesign.name} is out of stock. Please select another design.`);
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

      // Step 1: Create Razorpay order (design is validated server-side and
      // stored on the 'processing' order)
      const orderResponse = await orderAPI.createPaymentOrder(
        product.id,
        selectedDesign ? selectedDesign.name : null
      );
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
        description: `Purchase: ${product.name}${selectedDesign ? ` (${selectedDesign.name})` : ''}`,
        handler: async (response) => {
          console.log('Razorpay payment response:', response);
          try {
            // Step 3: Verify payment and create order
            const verifyResponse = await orderAPI.verifyAndPurchase({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              product_id: product.id,
              design_name: selectedDesign ? selectedDesign.name : null
            });

            console.log('Payment verified:', verifyResponse.data);
            setStep('success');
            toast.success('Purchase successful!');

            // Keep the locally cached user in sync so one-time-purchase
            // gating reflects immediately (no refresh needed).
            try {
              const u = JSON.parse(localStorage.getItem('user') || 'null');
              if (u) {
                u.has_active_package = true;
                if (product.rank_name) u.rank_name = product.rank_name;
                localStorage.setItem('user', JSON.stringify(u));
              }
            } catch (e) { /* ignore */ }

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
          color: '#073C39'
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

  // Pay button: Razorpay opens checkout; QR moves to the scan-and-upload step
  const handlePay = () => {
    if (payMethod === 'qr') {
      if (designs.length > 0 && !selectedDesign) {
        toast.error('Please select a design before purchasing');
        return;
      }
      setErrorMessage('');
      setStep('qr');
      return;
    }
    handlePurchase();
  };

  const handleQrFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) { setQrFile(null); return; }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error('Please attach a JPG, PNG or WEBP screenshot');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Screenshot must be under 5MB');
      e.target.value = '';
      return;
    }
    setQrFile(file);
  };

  const handleQrSubmit = async () => {
    const utr = qrUtr.trim().replace(/\s+/g, '');
    if (!qrFile) { toast.error('Please attach the payment screenshot'); return; }
    if (!/^[A-Za-z0-9]{6,30}$/.test(utr)) {
      toast.error('Enter a valid transaction ID / UTR');
      return;
    }
    const formData = new FormData();
    formData.append('product_id', product.id);
    if (selectedDesign) formData.append('design_name', selectedDesign.name);
    formData.append('utr', utr);
    formData.append('screenshot', qrFile);

    setQrSubmitting(true);
    try {
      await paymentAPI.submitQrPayment(formData);
      setStep('qr-submitted');
      toast.success('Payment submitted for verification');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit payment. Please try again.');
    } finally {
      setQrSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('confirm');
    setErrorMessage('');
    setCurrentOrderId(null);
    setLightboxOpen(false);
    setDesignVideoOpen(false);
    onClose();
  };

  if (!isOpen || !product) return null;

  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString('en-IN');
  };

  // Gallery images: the main product images until a design (with images) is
  // picked, then only that design's images.
  const productImages = (product.images && product.images.length > 0)
    ? product.images
    : (product.image ? [product.image] : []);
  const designImages = (selectedDesign && selectedDesign.images && selectedDesign.images.length > 0)
    ? selectedDesign.images
    : productImages;
  const galleryLabel = selectedDesign ? selectedDesign.name : product.name;
  const previewImage = designImages[designImageIdx] || designImages[0] || product.image;
  const needsDesign = designs.length > 0 && (!selectedDesign || selectedDesign.out_of_stock);
  const resolveImageUrl = (img) => {
    if (!img) return null;
    return img.startsWith('http') ? img : `${API_URL.replace('/api', '')}${img}`;
  };
  // Only the main package can be bought; others are display-only
  const notPurchasable = !product.is_purchasable;
  const razorpayOn = !!(payConfig && payConfig.razorpay.enabled);
  const qrOn = !!(payConfig && payConfig.qr.enabled);
  const noPaymentMethod = payConfig && !razorpayOn && !qrOn;

  return (
    <>
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content purchase-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'confirm' && notPurchasable && (
          <>
            <div className="modal-header">
              <h2>{product.name}</h2>
              <button className="close-btn" onClick={handleClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="owned-notice">
                <div className="owned-notice-icon">🔁</div>
                <h3>This is a repurchase product</h3>
                <p>Buy as product for repurchase — <strong>Repurchase coming soon.</strong></p>
                <p className="owned-notice-sub">You'll be able to purchase this product once repurchase opens.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleClose}>Got it</button>
            </div>
          </>
        )}

        {step === 'confirm' && !notPurchasable && alreadyOwned && (
          <>
            <div className="modal-header">
              <h2>Package Already Owned</h2>
              <button className="close-btn" onClick={handleClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="owned-notice">
                <div className="owned-notice-icon">🔒</div>
                <h3>One-time purchase only</h3>
                <p>You have already purchased this package, so you can't purchase it again.</p>
                <p className="owned-notice-sub">Repurchase is coming soon.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleClose}>Got it</button>
            </div>
          </>
        )}

        {step === 'confirm' && !notPurchasable && !alreadyOwned && pendingQr && (
          <>
            <div className="modal-header">
              <h2>Payment Under Review</h2>
              <button className="close-btn" onClick={handleClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="owned-notice">
                <div className="owned-notice-icon">⏳</div>
                <h3>Awaiting admin approval</h3>
                <p>
                  Your QR payment of <strong>₹{formatPrice(pendingQr.amount)}</strong> (UTR {pendingQr.utr}) is being verified.
                  Your order will be confirmed once it is approved.
                </p>
                <p className="owned-notice-sub">You'll get an email as soon as it's reviewed.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={handleClose}>Got it</button>
            </div>
          </>
        )}

        {step === 'confirm' && !notPurchasable && !alreadyOwned && !pendingQr && (
          <>
            <div className="modal-header">
              <h2>Confirm Purchase</h2>
              <button className="close-btn" onClick={handleClose}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="product-summary">
                <div className="product-image-preview">
                  {previewImage ? (
                    <img
                      src={resolveImageUrl(previewImage)}
                      alt={selectedDesign ? `${product.name} - ${selectedDesign.name}` : product.name}
                    />
                  ) : (
                    <div className="product-placeholder">🛏️</div>
                  )}
                </div>
                <div className="product-details">
                  <h3>{product.name}</h3>
                  {selectedDesign ? (
                    <p className="product-description">{selectedDesign.description || product.description}</p>
                  ) : (
                    product.description && <p className="product-description">{product.description}</p>
                  )}
                  <div className="price-info">
                    <span className="price-label">Total Amount</span>
                    <span className="price-value">₹{formatPrice(product.price)}</span>
                    {product.rank_name && (
                      <span className="rank-chip">★ {product.rank_name} Rank</span>
                    )}
                  </div>
                </div>
              </div>

              {designs.length > 0 && (
                <div className="design-selector">
                  {!designLocked && (
                    <div className="design-tabs">
                      {designs.map((d, idx) => (
                        <button
                          key={`${d.name}-${idx}`}
                          type="button"
                          className={`design-tab${idx === selectedDesignIdx ? ' active' : ''}${d.out_of_stock ? ' out-of-stock' : ''}`}
                          onClick={() => selectDesign(idx)}
                          disabled={d.out_of_stock}
                          title={d.out_of_stock ? 'This design is out of stock' : undefined}
                        >
                          {d.name}
                          {d.out_of_stock && <span className="design-tab-oos">Out of stock</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {designImages.length > 0 && (
                    <>
                      <div
                        className="design-main-image"
                        onClick={() => setLightboxOpen(true)}
                        title="Click to view full size"
                      >
                        <img
                          src={resolveImageUrl(designImages[designImageIdx] || designImages[0])}
                          alt={selectedDesign ? `${product.name} - ${selectedDesign.name}` : product.name}
                        />
                        <span className="design-zoom-hint">&#128269; Click to enlarge</span>
                      </div>
                      {designImages.length > 1 && (
                        <div className="design-images">
                          {designImages.map((img, idx) => (
                            <button
                              key={`${img}-${idx}`}
                              type="button"
                              className={`design-thumb${idx === designImageIdx ? ' active' : ''}`}
                              onClick={() => setDesignImageIdx(idx)}
                            >
                              <img src={resolveImageUrl(img)} alt={`${galleryLabel} ${idx + 1}`} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="design-selected-name">
                    {allDesignsOutOfStock ? (
                      <span className="design-out-of-stock">
                        All designs of this product are currently out of stock. Please check back later.
                      </span>
                    ) : selectedDesign ? (
                      <>Selected design: <strong>{selectedDesign.name}</strong></>
                    ) : initialDesignIdx !== null && designs[initialDesignIdx] && designs[initialDesignIdx].out_of_stock ? (
                      <span className="design-out-of-stock">
                        {designs[initialDesignIdx].name} is out of stock. Please select another design.
                      </span>
                    ) : (
                      <span className="design-required">Please select a design to continue</span>
                    )}
                  </div>

                  {selectedDesign && selectedDesign.video_link && (
                    <button
                      type="button"
                      className="design-video-btn"
                      onClick={() => setDesignVideoOpen(true)}
                    >
                      ▶ Watch {selectedDesign.name} Video
                    </button>
                  )}
                </div>
              )}

              <div className="earning-info">
                <div className="earning-badge">
                  <span className="earning-icon">💰</span>
                  <div className="earning-text">
                    <span className="earning-label">Your Earnings</span>
                    <span className="earning-amount">
                      Level Income (10 levels) for your upline
                    </span>
                  </div>
                </div>
              </div>

              {!payConfig ? (
                <div className="payment-note"><p>Loading payment options...</p></div>
              ) : noPaymentMethod ? (
                <div className="payment-note payment-note-warn">
                  <p>Payments are temporarily unavailable. Please try again later.</p>
                </div>
              ) : razorpayOn && qrOn ? (
                <div className="pay-methods" role="radiogroup" aria-label="Payment method">
                  <span className="pay-methods-label">Choose payment method</span>
                  <label className={`pay-method${payMethod === 'razorpay' ? ' active' : ''}`}>
                    <input type="radio" name="pay-method" value="razorpay" checked={payMethod === 'razorpay'} onChange={() => setPayMethod('razorpay')} />
                    <span className="pay-method-title">💳 Pay Online</span>
                    <span className="pay-method-sub">Card / UPI / Netbanking via Razorpay · instant</span>
                  </label>
                  <label className={`pay-method${payMethod === 'qr' ? ' active' : ''}`}>
                    <input type="radio" name="pay-method" value="qr" checked={payMethod === 'qr'} onChange={() => setPayMethod('qr')} />
                    <span className="pay-method-title">📱 Scan QR &amp; Pay</span>
                    <span className="pay-method-sub">Pay by any UPI app, upload screenshot · confirmed after admin approval</span>
                  </label>
                </div>
              ) : (
                <div className="payment-note">
                  <p>{qrOn ? 'Pay by scanning the QR code with any UPI app' : 'Payment will be processed securely via Razorpay'}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handlePay} disabled={loading || needsDesign || !payConfig || noPaymentMethod}>
                {loading ? 'Processing...' : `Pay ₹${formatPrice(product.price)}`}
              </button>
            </div>
          </>
        )}

        {step === 'qr' && payConfig && (
          <>
            <div className="modal-header">
              <h2>Scan &amp; Pay</h2>
              <button className="close-btn" onClick={handleClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="qr-amount">
                <span>Amount to pay</span>
                <strong>₹{formatPrice(product.price)}</strong>
                <small>{product.name}{selectedDesign ? ` · ${selectedDesign.name}` : ''}</small>
              </div>
              <div className="qr-box">
                <img src={resolveImageUrl(payConfig.qr.image)} alt="Payment QR code" />
                {payConfig.qr.payeeName && <div className="qr-payee">{payConfig.qr.payeeName}</div>}
                {payConfig.qr.upiId && (
                  <button
                    type="button"
                    className="qr-upi"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(payConfig.qr.upiId).then(() => toast.success('UPI ID copied')).catch(() => {});
                      }
                    }}
                    title="Copy UPI ID"
                  >
                    UPI ID: <strong>{payConfig.qr.upiId}</strong> ⧉
                  </button>
                )}
              </div>
              <ol className="qr-steps">
                <li>Scan the QR with any UPI app and pay <strong>exactly ₹{formatPrice(product.price)}</strong>.</li>
                <li>Take a screenshot of the successful payment.</li>
                <li>Attach it below with the transaction ID / UTR and submit.</li>
              </ol>

              <label className="qr-field">
                <span>Payment screenshot *</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleQrFile} />
              </label>
              {qrPreview && (
                <div className="qr-preview"><img src={qrPreview} alt="Payment screenshot preview" /></div>
              )}
              <label className="qr-field">
                <span>Transaction ID / UTR *</span>
                <input
                  type="text"
                  maxLength={30}
                  placeholder="e.g. 412345678901"
                  value={qrUtr}
                  onChange={(e) => setQrUtr(e.target.value)}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStep('confirm')} disabled={qrSubmitting}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleQrSubmit} disabled={qrSubmitting || !qrFile || !qrUtr.trim()}>
                {qrSubmitting ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </>
        )}

        {step === 'qr-submitted' && (
          <div className="success-state">
            <div className="success-icon">⏳</div>
            <h3>Payment Submitted</h3>
            <p>Your payment is under review. Your order will be created and your account activated once the admin approves it.</p>
            <p className="redirect-note">You'll receive an email when it's reviewed. You can track it in My Orders.</p>
            <button
              className="btn btn-primary next-upgrade-btn"
              onClick={() => {
                onSuccess && onSuccess({ success: true, pending: true });
                handleClose();
              }}
            >
              Got it
            </button>
          </div>
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
          background: linear-gradient(135deg, #E3EDE4, #C7DBCA);
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
          white-space: pre-line;
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
          color: #073C39;
        }

        .rank-chip {
          display: inline-block;
          margin-top: 0.25rem;
          padding: 0.2rem 0.5rem;
          background: #fef3c7;
          color: #b45309;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          width: fit-content;
        }

        .earning-info {
          margin-bottom: 1rem;
        }

        .design-selector {
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 12px;
        }

        .design-tabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .design-tab {
          padding: 0.5rem 0.9rem;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .design-tab:hover {
          border-color: #073C39;
          color: #073C39;
        }

        .design-tab.active {
          background: #073C39;
          border-color: #073C39;
          color: white;
        }

        .design-tab.out-of-stock,
        .design-tab.out-of-stock:hover {
          opacity: 0.6;
          cursor: not-allowed;
          text-decoration: line-through;
          background: #f3f4f6;
          border-color: #e5e7eb;
          color: #6b7280;
        }

        .design-tab-oos {
          display: inline-block;
          margin-left: 0.35rem;
          font-size: 0.65rem;
          font-weight: 700;
          color: #b91c1c;
          text-decoration: none;
        }

        .design-out-of-stock {
          color: #b91c1c;
          font-weight: 600;
        }

        .design-main-image {
          position: relative;
          margin-top: 0.75rem;
          width: 100%;
          height: 320px;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #e5e7eb;
          cursor: zoom-in;
        }

        .design-main-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #fff;
        }

        .design-zoom-hint {
          position: absolute;
          right: 10px;
          bottom: 10px;
          padding: 0.3rem 0.7rem;
          background: rgba(0, 0, 0, 0.55);
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 999px;
          pointer-events: none;
        }

        .design-images {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.6rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }

        .design-thumb {
          width: 72px;
          height: 72px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid transparent;
          padding: 0;
          cursor: pointer;
          background: white;
          flex-shrink: 0;
        }

        .design-thumb.active {
          border-color: #073C39;
        }

        .design-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .design-selected-name {
          margin-top: 0.6rem;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .design-selected-name strong {
          color: #111827;
        }

        .design-required {
          color: #b45309;
          font-weight: 600;
        }

        .design-video-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: white;
          border: 1px solid #dc2626;
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .design-video-btn:hover {
          background: #dc2626;
          color: white;
        }

        .design-video-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2100;
          padding: 1rem;
        }

        .design-video-box {
          position: relative;
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 720px;
          overflow: hidden;
        }

        .design-video-close {
          position: absolute;
          top: 8px;
          right: 12px;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          color: white;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          font-size: 1.3rem;
          cursor: pointer;
          z-index: 10;
        }

        .design-video-frame {
          position: relative;
          padding-top: 56.25%;
          background: #000;
        }

        .design-video-frame iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        .design-lightbox-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 2.5rem 1rem 4rem;
        }

        .design-lightbox-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
        }

        .design-lightbox-close {
          position: absolute;
          top: 16px;
          right: 20px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 1.6rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .design-lightbox-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .design-lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          font-size: 1.6rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .design-lightbox-nav:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .design-lightbox-prev {
          left: 12px;
        }

        .design-lightbox-next {
          right: 12px;
        }

        .design-lightbox-caption {
          position: absolute;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .earning-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #E3EDE4, #C7DBCA);
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
          color: #40584E;
        }

        .earning-amount {
          font-size: 0.875rem;
          font-weight: 600;
          color: #40584E;
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
          background: #073C39;
          border: none;
          color: white;
        }

        .btn-primary:hover {
          background: #0B4541;
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
          border-top-color: #073C39;
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
          background: #5D8172;
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
          color: #40584E;
        }

        /* One-time purchase notice (already owns a package) */
        .owned-notice {
          text-align: center;
          padding: 1rem 0.5rem;
        }
        .owned-notice-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .owned-notice h3 {
          margin: 0 0 0.75rem 0;
          color: #073C39;
        }
        .owned-notice p {
          color: #5D8172;
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0 0 0.5rem;
        }
        .owned-notice-sub {
          color: #B18B36 !important;
          font-weight: 600;
        }

        /* Post-purchase next-upgrade popup */
        .pay-methods {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .pay-methods-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
        }
        .pay-method {
          display: grid;
          grid-template-columns: auto 1fr;
          column-gap: 0.6rem;
          align-items: center;
          padding: 0.75rem 0.9rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          cursor: pointer;
        }
        .pay-method input { grid-row: span 2; accent-color: #073C39; }
        .pay-method.active { border-color: #073C39; background: #f2f6f4; }
        .pay-method-title { font-weight: 600; color: #111827; font-size: 0.95rem; }
        .pay-method-sub { font-size: 0.78rem; color: #6b7280; }
        .payment-note-warn { background: #fef3c7 !important; }
        .payment-note-warn p { color: #92400e !important; }
        .qr-amount {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
          margin-bottom: 1rem;
        }
        .qr-amount span { font-size: 0.8rem; color: #6b7280; }
        .qr-amount strong { font-size: 1.75rem; color: #073C39; }
        .qr-amount small { font-size: 0.8rem; color: #6b7280; }
        .qr-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
        }
        .qr-box img {
          width: 100%;
          max-width: 240px;
          aspect-ratio: 1;
          object-fit: contain;
        }
        .qr-payee { font-weight: 600; color: #111827; }
        .qr-upi {
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          padding: 0.3rem 0.6rem;
          font-size: 0.85rem;
          color: #374151;
          cursor: pointer;
          word-break: break-all;
        }
        .qr-steps {
          margin: 1rem 0;
          padding-left: 1.2rem;
          font-size: 0.85rem;
          color: #4b5563;
          line-height: 1.6;
        }
        .qr-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-bottom: 0.9rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
        }
        .qr-field input[type="text"] {
          padding: 0.65rem 0.75rem;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 400;
        }
        .qr-field input[type="text"]:focus { outline: none; border-color: #073C39; }
        .qr-field input[type="file"] { font-weight: 400; font-size: 0.85rem; max-width: 100%; }
        .qr-preview {
          margin: -0.4rem 0 0.9rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          max-height: 220px;
          display: flex;
          justify-content: center;
          background: #f9fafb;
        }
        .qr-preview img { max-height: 220px; max-width: 100%; object-fit: contain; }

        .next-upgrade-btn {
          margin-top: 1.25rem;
          min-width: 140px;
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

    {lightboxOpen && previewImage && (
      <div className="design-lightbox-overlay" onClick={() => setLightboxOpen(false)}>
        <button className="design-lightbox-close" onClick={() => setLightboxOpen(false)}>&times;</button>
        <img
          className="design-lightbox-image"
          src={resolveImageUrl(previewImage)}
          alt={`${galleryLabel} - full view`}
          onClick={(e) => e.stopPropagation()}
        />
        {designImages.length > 1 && (
          <>
            <button
              className="design-lightbox-nav design-lightbox-prev"
              onClick={(e) => { e.stopPropagation(); setDesignImageIdx((designImageIdx - 1 + designImages.length) % designImages.length); }}
            >
              &#8249;
            </button>
            <button
              className="design-lightbox-nav design-lightbox-next"
              onClick={(e) => { e.stopPropagation(); setDesignImageIdx((designImageIdx + 1) % designImages.length); }}
            >
              &#8250;
            </button>
            <div className="design-lightbox-caption">
              {`${galleryLabel} · ${designImageIdx + 1} / ${designImages.length}`}
            </div>
          </>
        )}
      </div>
    )}
    {designVideoOpen && selectedDesign && getYouTubeId(selectedDesign.video_link) && (
      <div className="design-video-overlay" onClick={() => setDesignVideoOpen(false)}>
        <div className="design-video-box" onClick={(e) => e.stopPropagation()}>
          <button className="design-video-close" onClick={() => setDesignVideoOpen(false)}>&times;</button>
          <div className="design-video-frame">
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(selectedDesign.video_link)}?autoplay=1&rel=0`}
              title={`${selectedDesign.name} Video`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default PurchaseModal;