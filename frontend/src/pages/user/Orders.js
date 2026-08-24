import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { orderAPI, userAPI } from '../../utils/api';
import DashboardLayout from '../../components/DashboardLayout';
import { useSiteSettings } from '../../components/SiteSettingsProvider';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import PurchaseModal from '../../components/PurchaseModal';
import Pagination from '../../components/Pagination';
import html2pdf from 'html2pdf.js';

const API_URL = process.env.REACT_APP_API_URL;

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

// YouTube Video Modal Component
const YouTubeModal = ({ youtubeLink, onClose }) => {
  const videoId = getYouTubeId(youtubeLink);
  if (!videoId) return null;

  return (
    <div className="youtube-modal-overlay" onClick={onClose}>
      <div className="youtube-modal" onClick={(e) => e.stopPropagation()}>
        <div className="youtube-modal-header">
          <h3>Product Video</h3>
          <button className="youtube-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="youtube-modal-body">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title="Product Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
};

// Image Lightbox Component
const ImageLightbox = ({ images, currentIndex, onClose, onNext, onPrev, getImageUrl }) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>&times;</button>

        {images.length > 1 && (
          <button className="lightbox-nav lightbox-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
            &#8249;
          </button>
        )}

        <img src={getImageUrl(images[currentIndex])} alt="Product" className="lightbox-image" />

        {images.length > 1 && (
          <button className="lightbox-nav lightbox-next" onClick={(e) => { e.stopPropagation(); onNext(); }}>
            &#8250;
          </button>
        )}

        {images.length > 1 && (
          <div className="lightbox-dots">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={`lightbox-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); }}
              ></span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Image Slider Component for products with multiple images
const ImageSlider = ({ images, getImageUrl, alt, onImageClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (images && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 4000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="product-placeholder">
        <span className="product-emoji">🛏️</span>
      </div>
    );
  }

  return (
    <div className="image-slider" onClick={onImageClick} style={{ cursor: 'pointer' }}>
      <img
        src={getImageUrl(images[currentIndex])}
        alt={alt}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" viewBox="0 0 200 180"><rect fill="%23f3f4f6" width="200" height="180"/><text x="100" y="90" text-anchor="middle" font-size="60">🛏️</text></svg>';
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.3s ease' }}
      />
      {images.length > 1 && (
        <div className="slider-dots">
          {images.map((_, idx) => (
            <span key={idx} className={`dot ${idx === currentIndex ? 'active' : ''}`}></span>
          ))}
        </div>
      )}
    </div>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [lightbox, setLightbox] = useState({ isOpen: false, images: [], currentIndex: 0 });
  const [userState, setUserState] = useState('');
  const [userName, setUserName] = useState('');
  const [userReferralCode, setUserReferralCode] = useState('');
  const [userGstNumber, setUserGstNumber] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [youtubeModal, setYoutubeModal] = useState({ isOpen: false, youtubeLink: '' });
  const invoiceRef = useRef(null);
  const { siteName, siteLogo, contact_address, contact_email, contact_phone, company_state } = useSiteSettings();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchOrders(ordersPage);
  }, [ordersPage]);

  const fetchOrders = async (page) => {
    try {
      const ordersRes = await orderAPI.getMyOrders(page);
      setOrders(ordersRes.data.orders);
      setOrdersTotal(ordersRes.data.total || ordersRes.data.orders.length);
      setOrdersTotalPages(ordersRes.data.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load orders');
    }
  };

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, profileRes] = await Promise.all([
        orderAPI.getMyOrders(1),
        orderAPI.getProducts(),
        userAPI.getProfile()
      ]);
      setOrders(ordersRes.data.orders);
      setOrdersTotal(ordersRes.data.total || ordersRes.data.orders.length);
      setOrdersTotalPages(ordersRes.data.totalPages || 1);
      setProducts(productsRes.data.products);
      if (profileRes.data?.user) {
        if (profileRes.data.user.state) {
          setUserState(profileRes.data.user.state);
        }
        if (profileRes.data.user.name) {
          setUserName(profileRes.data.user.name);
        }
        if (profileRes.data.user.referral_code) {
          setUserReferralCode(profileRes.data.user.referral_code);
        }
        if (profileRes.data.user.gst_number) {
          setUserGstNumber(profileRes.data.user.gst_number);
        }
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleDescription = (productId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const openPurchaseDialog = (product) => {
    setSelectedProduct(product);
    setShowPurchaseModal(true);
  };

  const closePurchaseModal = () => {
    setShowPurchaseModal(false);
    setSelectedProduct(null);
  };

  const handlePurchaseSuccess = () => {
    fetchData();
    closePurchaseModal();
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'delivered': 'success',
      'shipped': 'info',
      'processing': 'warning',
      'pending': 'pending',
      'cancelled': 'danger'
    };
    return statusMap[status] || 'neutral';
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };

  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) return siteLogo;
      const baseUrl = API_URL.replace('/api', '');
      return `${baseUrl}${siteLogo}`;
    }
    return null;
  };

  // Calculate invoice details with state-based GST
  // GST Rate: 5% total (price is GST-inclusive)
  // Same state (Maharashtra): CGST 2.5% + SGST 2.5% = 5%
  // Other states: IGST 5%
  const calculateInvoice = (order) => {
    const totalPrice = parseFloat(order.amount) || parseFloat(order.product_price) || 0;
    const gstRate = 5; // 5% GST total

    // Price is GST-inclusive, extract taxable value
    // Taxable Value = Total Price / (1 + GST Rate/100)
    // For 5% GST: Taxable Value = Total Price / 1.05
    const taxableValue = totalPrice / 1.05;
    const totalGstAmount = totalPrice - taxableValue;

    // Determine if same state (Maharashtra) or different state
    const isSameState = userState && company_state &&
      userState.toLowerCase().trim() === company_state.toLowerCase().trim();

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isSameState) {
      // Same state (Maharashtra): CGST 2.5% + SGST 2.5%
      cgstAmount = (taxableValue * 2.5) / 100;
      sgstAmount = (taxableValue * 2.5) / 100;
    } else {
      // Other states: IGST 5%
      igstAmount = (taxableValue * 5) / 100;
    }

    return {
      basePrice: taxableValue, // Taxable value (before GST)
      totalPrice, // Total price (GST-inclusive)
      gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGstAmount,
      isSameState,
      invoiceNumber: order.order_number || `INV-${order.id}`,
      invoiceDate: order.created_at,
      productName: order.product_name || 'Product',
      productDescription: order.product_description || '',
      status: order.status,
      userState: userState || 'Not specified',
      companyState: company_state || 'Maharashtra',
      buyerName: userName || 'Customer',
      buyerReferralCode: userReferralCode || '',
      buyerGstNumber: userGstNumber || ''
    };
  };

  const openInvoice = (order) => {
    setSelectedInvoice(calculateInvoice(order));
  };

  const closeInvoice = () => {
    setSelectedInvoice(null);
  };

  const printInvoice = () => {
    if (!invoiceRef.current) return;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `invoice-${selectedInvoice.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(invoiceRef.current).save();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="orders-page">
          <div className="page-header">
            <div>
              <h1 className="page-title">Shop</h1>
              <p className="page-subtitle">Purchase products and track your orders</p>
            </div>
          </div>
          <LoadingSkeleton variant="card" style={{ marginTop: '1.5rem' }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="orders-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Shop</h1>
            <p className="page-subtitle">Browse products and track your orders</p>
          </div>
        </div>

        {/* Products Available */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Available Products</h3>
            <span className="badge badge-info">{products.length} Products</span>
          </div>
          {products.length > 0 ? (
            <div className="products-grid">
              {products.map((product, index) => {
                const dailyAmount = parseFloat(product.daily_amount || product.salary_amount || 50);
                const incentiveDays = parseInt(product.days || product.salary_duration || 15);
                const totalPayout = dailyAmount * incentiveDays;

                // Get images array or fallback to single image
                const productImages = product.images && product.images.length > 0
                  ? product.images
                  : product.image ? [product.image] : [];

                const openLightbox = () => {
                  if (productImages.length > 0) {
                    setLightbox({ isOpen: true, images: productImages, currentIndex: 0 });
                  }
                };

                return (
                  <div
                    key={product.id}
                    className="product-card-enhanced hover-lift animate-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="product-image-wrapper" onClick={openLightbox} style={{ cursor: productImages.length > 0 ? 'pointer' : 'default' }}>
                      <ImageSlider
                        images={productImages}
                        getImageUrl={getImageUrl}
                        alt={product.name}
                        onImageClick={openLightbox}
                      />
                      {!product.is_active && (
                        <div className="product-unavailable">
                          <span>Currently Unavailable</span>
                        </div>
                      )}
                    </div>
                    <div className="product-content">
                      <h4 className="product-title">{product.name}</h4>
                      <div className={`product-desc-wrapper ${expandedDescriptions[product.id] ? 'expanded' : ''}`}>
                        <p className="product-desc">
                          {product.description || 'Premium quality product'}
                        </p>
                        {product.description && product.description.length > 80 && (
                          <button
                            className="see-more-btn"
                            onClick={() => toggleDescription(product.id)}
                          >
                            {expandedDescriptions[product.id] ? 'See Less' : 'See More'}
                          </button>
                        )}
                      </div>

                      {/* Salary Benefits Card */}
                      <div className="salary-benefits-card">
                        <div className="benefit-header">
                          <span className="benefit-icon">💰</span>
                          <span className="benefit-title">Daily Referral Incentive</span>
                        </div>
                        <div className="benefit-details">
                          <div className="benefit-row">
                            <span className="benefit-label">Daily Incentive</span>
                            <span className="benefit-value">₹{dailyAmount.toLocaleString()}/day</span>
                          </div>
                          <div className="benefit-row">
                            <span className="benefit-label">Duration</span>
                            <span className="benefit-value">{incentiveDays} days</span>
                          </div>
                          <div className="benefit-row highlight">
                            <span className="benefit-label">Total Earning</span>
                            <span className="benefit-value total">₹{totalPayout.toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="benefit-note">Per active referral who purchases this product</p>
                      </div>

                      {product.youtube_link && (
                        <button
                          className="watch-video-btn"
                          onClick={() => setYoutubeModal({ isOpen: true, youtubeLink: product.youtube_link })}
                        >
                          <span className="watch-video-icon">▶</span>
                          Watch Video
                        </button>
                      )}

                      <div className="product-price-row">
                        <div className="price-section">
                          <span className="product-price">₹{parseFloat(product.price).toLocaleString()}</span>
                          <span className="price-label">Product Price</span>
                        </div>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openPurchaseDialog(product)}
                          disabled={!product.is_active}
                        >
                          {product.is_active ? 'Buy Now' : 'Unavailable'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="🛍️"
              title="No products available"
              description="Check back later for available products"
            />
          )}
        </div>

        {/* Order History */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Order History</h3>
            {orders.length > 0 && (
              <span className="badge badge-neutral">{ordersTotal} Orders</span>
            )}
          </div>
          {orders.length > 0 ? (
            <div className="orders-list">
              {orders.map((order) => {
                return (
                  <div key={order.id} className="order-item">
                    <div className="order-image">
                      {order.product_image ? (
                        <img src={getImageUrl(order.product_image)} alt={order.product_name} />
                      ) : (
                        <span className="order-emoji">📦</span>
                      )}
                    </div>
                    <div className="order-details">
                      <div className="order-main">
                        <h4 className="order-product">{order.product_name}</h4>
                        <span className={`badge badge-${getStatusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="order-meta">
                        <span className="order-number">#{order.order_number}</span>
                        <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="order-actions">
                      <div className="order-amount">
                        ₹{parseFloat(order.amount).toLocaleString()}
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openInvoice(order)}
                      >
                        View Invoice
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="📦"
              title="No orders yet"
              description="Purchase your first product to start earning referral salary"
              action={{
                label: 'Browse Products',
                onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
                variant: 'primary'
              }}
            />
          )}
          {ordersTotal > 0 && (
            <Pagination
              page={ordersPage}
              totalPages={ordersTotalPages}
              total={ordersTotal}
              onChange={setOrdersPage}
            />
          )}
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={closePurchaseModal}
        product={selectedProduct}
        onSuccess={handlePurchaseSuccess}
      />

      {/* Image Lightbox */}
      {lightbox.isOpen && (
        <ImageLightbox
          images={lightbox.images}
          currentIndex={lightbox.currentIndex}
          onClose={() => setLightbox({ isOpen: false, images: [], currentIndex: 0 })}
          onNext={() => setLightbox(prev => ({
            ...prev,
            currentIndex: (prev.currentIndex + 1) % prev.images.length
          }))}
          onPrev={() => setLightbox(prev => ({
            ...prev,
            currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
          }))}
          getImageUrl={getImageUrl}
        />
      )}

      {/* YouTube Video Modal */}
      {youtubeModal.isOpen && (
        <YouTubeModal
          youtubeLink={youtubeModal.youtubeLink}
          onClose={() => setYoutubeModal({ isOpen: false, youtubeLink: '' })}
        />
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <div className="invoice-modal-overlay" onClick={closeInvoice}>
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-header">
              <h2>Tax Invoice</h2>
              <button className="close-btn" onClick={closeInvoice}>×</button>
            </div>
            <div className="invoice-content" ref={invoiceRef}>
              <div className="invoice-letterhead">
                <div className="invoice-brand">
                  {getLogoUrl() ? (
                    <img src={getLogoUrl()} alt={siteName || 'Blisswell'} className="invoice-logo" />
                  ) : (
                    <div className="invoice-logo-placeholder">
                      <span className="brand-icon">🛏️</span>
                    </div>
                  )}
                  <div className="brand-info">
                    <span className="brand-name">{siteName || 'Blisswell'}</span>
                    <span className="brand-tagline">Premium Bedsheets</span>
                  </div>
                </div>
                <div className="company-details">
                  <div className="company-address">{contact_address || 'BUSINESS PLAZA, A WING, SHOP NO -409, AADGOAN NAKA PANCHAWATI NASHIK, PIN - 422003, MAHARASHTRA'}</div>
                  <div className="company-contact">
                    {contact_phone && <span>📞 {contact_phone}</span>}
                    {contact_email && <span>✉️ {contact_email}</span>}
                    <div>GST Number: <span className='font-bold'>27ANJPC4891P1ZB</span></div>
                  </div>
                </div>
              </div>

              <div className="invoice-title-section">
                <h3>TAX INVOICE</h3>
                <div className="invoice-meta">
                  <div className="meta-row">
                    <span className="meta-label">Invoice No:</span>
                    <span className="meta-value">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Date:</span>
                    <span className="meta-value">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="meta-row state-info">
                    <span className="meta-label">Supply:</span>
                    <span className="meta-value gst-type">
                      {selectedInvoice.isSameState ? (
                        <span className="gst-badge gst-intra">Intra-state (CGST + SGST)</span>
                      ) : (
                        <span className="gst-badge gst-inter">Inter-state (IGST)</span>
                      )}
                    </span>
                  </div>
                  <div className="meta-row">
                    <span className="meta-label">Status:</span>
                    <span className={`status-badge status-${selectedInvoice.status}`}>{selectedInvoice.status}</span>
                  </div>
                </div>
              </div>

              {/* Buyer Details */}
              <div className="invoice-buyer-section">
                <div className="buyer-header">Bill To:</div>
                <div className="buyer-details">
                  <div className="buyer-row">
                    <span className="buyer-name">{selectedInvoice.buyerName}</span>
                  </div>
                  <div className="buyer-row">
                    <span className="buyer-label">ID:</span>
                    <span className="buyer-value">{selectedInvoice.buyerReferralCode}</span>
                  </div>
                  <div className="buyer-row">
                    <span className="buyer-label">State:</span>
                    <span className="buyer-value">{selectedInvoice.userState}</span>
                  </div>
                  {selectedInvoice.buyerGstNumber && (
                    <div className="buyer-row">
                      <span className="buyer-label">GST No:</span>
                      <span className="buyer-value gst-number">{selectedInvoice.buyerGstNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="invoice-table">
                <table>
                  <thead>
                    <tr>
                      <th className="col-desc">Description</th>
                      <th className="col-qty">Qty</th>
                      <th className="col-rate">Rate</th>
                      <th className="col-amount">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 600 }}>{selectedInvoice.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                          <span style={{ fontWeight: 500 }}>HSN:</span> 6304
                        </div>
                        {selectedInvoice.productDescription && (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', marginTop: '0.25rem' }}>
                            {selectedInvoice.productDescription}
                          </div>
                        )}
                      </td>
                      <td className="text-center">1</td>
                      <td className="text-right">₹{selectedInvoice.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="text-right">₹{selectedInvoice.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="invoice-summary">
                <div className="summary-row">
                  <span>Taxable Value</span>
                  <span>₹{selectedInvoice.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedInvoice.isSameState ? (
                  <>
                    <div className="summary-row">
                      <span>CGST (2.5%)</span>
                      <span>₹{selectedInvoice.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-row">
                      <span>SGST (2.5%)</span>
                      <span>₹{selectedInvoice.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="summary-row">
                      <span>IGST (5%)</span>
                      <span>₹{selectedInvoice.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                <div className="summary-row total">
                  <span>Total Amount</span>
                  <span>₹{selectedInvoice.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Invoice Conditions */}
              <div className="invoice-conditions">
                <div className="conditions-title">Invoice Conditions:</div>
                <ol className="conditions-list">
                  <li>Goods once sold will not be taken back or exchanged unless there is a manufacturing defect.</li>
                  <li>Any shortage or damage must be reported within 24 hours of delivery with unboxing video proof.</li>
                  <li>No complaints will be entertained after 48 hours of delivery.</li>
                  <li>All disputes are subject to Nashik Jurisdiction.</li>
                </ol>
              </div>

              <div className="invoice-footer">
                <div className="footer-message">
                  <p>Thank you for your business!</p>
                  <p className="terms">This is a computer generated invoice and does not require signature.</p>
                </div>
              </div>
            </div>
            <div className="invoice-actions">
              <button className="btn btn-secondary" onClick={closeInvoice}>Close</button>
              <button className="btn btn-primary" onClick={printInvoice}>Download PDF</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .orders-page {
          max-width: 1000px;
        }

        /* Card Animation */
        @keyframes cardEntrance {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-card {
          animation: cardEntrance 0.4s ease-out forwards;
          opacity: 0;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .product-card-enhanced {
          position: relative;
          background: white;
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          transition: all 0.3s;
        }

        /* Thick gradient border (always on) — matches the website product cards */
        .product-card-enhanced::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(135deg, #2563eb, #059669);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          pointer-events: none;
          z-index: 3;
          transition: padding 0.2s ease;
        }

        .product-card-enhanced:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .product-card-enhanced:hover::before {
          padding: 2.75px;
        }

        .product-image-wrapper {
          position: relative;
          height: 160px;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          overflow: hidden;
        }

        .product-img {
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
        }

        .product-emoji {
          font-size: 4rem;
        }

        .image-slider {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .slider-dots {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 10;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transition: all 0.3s ease;
        }

        .dot.active {
          background: white;
          transform: scale(1.2);
        }

        /* Lightbox Styles */
        .lightbox-overlay {
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
          padding: 2rem;
        }

        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lightbox-image {
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 8px;
        }

        .lightbox-close {
          position: absolute;
          top: -40px;
          right: 0;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .lightbox-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          font-size: 1.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .lightbox-nav:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .lightbox-prev {
          left: -60px;
        }

        .lightbox-next {
          right: -60px;
        }

        .lightbox-dots {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }

        .lightbox-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transition: all 0.3s ease;
        }

        .lightbox-dot.active {
          background: white;
          transform: scale(1.2);
        }

        .product-unavailable {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .product-content {
          padding: 1.25rem;
        }

        .product-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.5rem;
        }

        .product-desc-wrapper {
          margin-bottom: 1rem;
        }

        .product-desc-wrapper:not(.expanded) .product-desc {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-desc-wrapper.expanded .product-desc {
          display: block;
        }

        .product-desc {
          font-size: 0.8125rem;
          color: var(--gray-500);
          line-height: 1.5;
          margin: 0;
        }

        .see-more-btn {
          background: none;
          border: none;
          color: var(--primary-600);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0.25rem 0 0 0;
          margin-top: 0.25rem;
          text-decoration: none;
          display: inline-block;
        }

        .see-more-btn:hover {
          color: var(--primary-700);
          text-decoration: underline;
        }

        /* Salary Benefits Card */
        .salary-benefits-card {
          background: linear-gradient(135deg, var(--accent-50), var(--primary-50));
          border: 1px solid var(--accent-100);
          border-radius: var(--radius-lg);
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .benefit-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--accent-100);
        }

        .benefit-icon {
          font-size: 1rem;
        }

        .benefit-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--accent-700);
        }

        .benefit-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .benefit-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .benefit-row.highlight {
          background: var(--accent-100);
          margin: 0.25rem -0.5rem;
          padding: 0.375rem 0.5rem;
          border-radius: var(--radius-sm);
        }

        .benefit-label {
          font-size: 0.75rem;
          color: var(--gray-600);
        }

        .benefit-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .benefit-value.total {
          color: var(--accent-600);
          font-size: 1rem;
        }

        .benefit-note {
          font-size: 0.6875rem;
          color: var(--gray-500);
          margin: 0.5rem 0 0 0;
          font-style: italic;
        }

        /* Watch Video Button */
        .watch-video-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 1rem;
          margin-bottom: 1rem;
          background: white;
          border: 1px solid #dc2626;
          border-radius: var(--radius-lg);
          color: #dc2626;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .watch-video-btn:hover {
          background: #dc2626;
          color: white;
        }

        .watch-video-icon {
          width: 28px;
          height: 28px;
          background: #dc2626;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .watch-video-btn:hover .watch-video-icon {
          background: white;
          color: #dc2626;
        }

        /* YouTube Video Modal */
        .youtube-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 1rem;
        }

        .youtube-modal {
          background: white;
          border-radius: var(--radius-xl);
          max-width: 800px;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .youtube-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--gray-100);
        }

        .youtube-modal-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .youtube-modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--gray-500);
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .youtube-modal-close:hover {
          color: var(--gray-900);
        }

        .youtube-modal-body {
          position: relative;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          background: #000;
        }

        .youtube-modal-body iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        .product-price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-100);
        }

        .price-section {
          display: flex;
          flex-direction: column;
        }

        .product-price {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        .price-label {
          font-size: 0.6875rem;
          color: var(--gray-500);
        }

        /* Orders List */
        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .order-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          transition: background 0.2s;
        }

        .order-item:hover {
          background: var(--gray-100);
        }

        .order-image {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .order-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .order-emoji {
          font-size: 1.5rem;
        }

        .order-details {
          flex: 1;
          min-width: 0;
        }

        .order-main {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .order-product {
          font-weight: 600;
          color: var(--gray-900);
          margin: 0;
        }

        .order-meta {
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .order-number {
          font-family: monospace;
          font-weight: 600;
        }

        .order-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
        }

        .order-amount {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        /* Invoice Modal */
        .invoice-modal-overlay {
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

        .invoice-modal {
          background: white;
          border-radius: var(--radius-xl);
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-lg);
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid var(--gray-100);
          background: var(--gray-50);
        }

        .invoice-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--gray-900);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: var(--gray-500);
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .invoice-content {
          padding: 2rem;
          background: white;
        }

        /* Invoice Letterhead */
        .invoice-letterhead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid var(--primary-600);
        }

        .invoice-brand {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .invoice-logo {
          height: 50px;
          width: auto;
          max-width: 120px;
          object-fit: contain;
        }

        .invoice-logo-placeholder {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, var(--primary-500), var(--accent-500));
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .invoice-logo-placeholder .brand-icon {
          font-size: 1.5rem;
        }

        .brand-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .brand-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        .brand-tagline {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .company-details {
          text-align: right;
        }

        .company-address {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin-bottom: 0.5rem;
          max-width: 200px;
        }

        .company-contact {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        /* Invoice Title */
        .invoice-title-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .invoice-title-section h3 {
          margin: 0;
          font-size: 1.25rem;
          color: var(--gray-900);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .invoice-meta {
          text-align: right;
        }

        .meta-row {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
          font-size: 0.8125rem;
        }

        .meta-label {
          color: var(--gray-500);
        }

        .meta-value {
          font-weight: 500;
          color: var(--gray-900);
        }

        .status-badge {
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-delivered { background: #dcfce7; color: #166534; }
        .status-shipped { background: #dbeafe; color: #1e40af; }
        .status-processing { background: #fef3c7; color: #92400e; }
        .status-pending { background: #f3f4f6; color: #374151; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }

        .state-info {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px dashed var(--gray-200);
        }

        .gst-type {
          display: flex;
          align-items: center;
        }

        .gst-badge {
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .gst-intra {
          background: #dbeafe;
          color: #1e40af;
        }

        .gst-inter {
          background: #fef3c7;
          color: #92400e;
        }

        .state-info {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px dashed var(--gray-200);
        }

        .gst-type {
          display: flex;
          align-items: center;
        }

        .gst-badge {
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-sm);
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .gst-intra {
          background: #dcfce7;
          color: #166534;
        }

        .gst-inter {
          background: #dbeafe;
          color: #1e40af;
        }

        /* Buyer Section */
        .invoice-buyer-section {
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .buyer-header {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .buyer-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .buyer-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .buyer-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .buyer-label {
          font-size: 0.8125rem;
          color: var(--gray-500);
        }

        .buyer-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--gray-700);
          font-family: monospace;
        }

        .invoice-table {
          margin-bottom: 1.5rem;
        }

        .invoice-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .invoice-table th {
          background: var(--gray-100);
          padding: 0.75rem 0.5rem;
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--gray-600);
          text-align: left;
        }

        .invoice-table td {
          padding: 0.75rem 0.5rem;
          font-size: 0.875rem;
          border-bottom: 1px solid var(--gray-100);
        }

        .col-desc { width: 50%; }
        .col-qty { width: 15%; text-align: center; }
        .col-rate { width: 17.5%; text-align: right; }
        .col-amount { width: 17.5%; text-align: right; }

        .text-center { text-align: center; }
        .text-right { text-align: right; }

        /* Invoice Summary */
        .invoice-summary {
          margin-left: auto;
          max-width: 250px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.875rem;
          border-bottom: 1px solid var(--gray-100);
        }

        .summary-row.total {
          font-size: 1rem;
          font-weight: 700;
          border-bottom: none;
          background: var(--primary-50);
          margin: 0.5rem -0.5rem;
          padding: 0.75rem 0.5rem;
          border-radius: var(--radius-sm);
        }

        /* Invoice Conditions */
        .invoice-conditions {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
        }

        .conditions-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--gray-700);
          margin-bottom: 0.5rem;
        }

        .conditions-list {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.75rem;
          color: var(--gray-600);
          line-height: 1.6;
        }

        .conditions-list li {
          margin-bottom: 0.25rem;
        }

        .conditions-list li:last-child {
          margin-bottom: 0;
        }

        /* Invoice Footer */
        .invoice-footer {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--gray-200);
        }

        .footer-message {
          text-align: center;
        }

        .footer-message p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .footer-message .terms {
          font-size: 0.6875rem;
          color: var(--gray-400);
          margin-top: 0.5rem;
        }

        .invoice-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--gray-100);
          background: var(--gray-50);
        }

        .invoice-actions .btn {
          flex: 1;
        }

        @media (max-width: 640px) {
          .invoice-letterhead {
            flex-direction: column;
            gap: 1rem;
          }

          .company-details {
            text-align: left;
          }

          .invoice-title-section {
            flex-direction: column;
            gap: 1rem;
          }

          .invoice-meta {
            text-align: left;
          }

          .invoice-summary {
            max-width: 100%;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Orders;