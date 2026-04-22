import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { orderAPI, userAPI } from '../../utils/api';
import { useSelector } from 'react-redux';
import DashboardLayout from '../../components/DashboardLayout';
import { useSiteSettings } from '../../components/SiteSettingsProvider';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import html2pdf from 'html2pdf.js';

const API_URL = process.env.REACT_APP_API_URL;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseDialog, setPurchaseDialog] = useState({ isOpen: false, product: null });
  const [purchasing, setPurchasing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [userState, setUserState] = useState('');
  const [userName, setUserName] = useState('');
  const [userReferralCode, setUserReferralCode] = useState('');
  const invoiceRef = useRef(null);
  const { user } = useSelector((state) => state.auth);
  const { siteName, siteLogo, contact_address, contact_email, contact_phone, company_state } = useSiteSettings();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, profileRes] = await Promise.all([
        orderAPI.getMyOrders(1),
        orderAPI.getProducts(),
        userAPI.getProfile()
      ]);
      setOrders(ordersRes.data.orders);
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
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!purchaseDialog.product) return;

    setPurchasing(true);
    try {
      await orderAPI.purchaseProduct(purchaseDialog.product.id);
      toast.success('Purchase successful!');
      fetchData();
      setPurchaseDialog({ isOpen: false, product: null });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  const openPurchaseDialog = (product) => {
    setPurchaseDialog({ isOpen: true, product });
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
  const calculateInvoice = (order) => {
    const basePrice = parseFloat(order.amount) || parseFloat(order.product_price) || 0;
    const gstRate = 18; // 18% GST total

    // Determine if same state (CGST + SGST) or different state (IGST)
    const isSameState = userState && company_state &&
      userState.toLowerCase().trim() === company_state.toLowerCase().trim();

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isSameState) {
      // Same state: CGST (9%) + SGST (9%)
      cgstAmount = (basePrice * 9) / 100;
      sgstAmount = (basePrice * 9) / 100;
    } else {
      // Different state or state not specified: IGST (18%)
      igstAmount = (basePrice * 18) / 100;
    }

    const totalGstAmount = cgstAmount + sgstAmount + igstAmount;
    const totalPrice = basePrice + totalGstAmount;

    return {
      basePrice,
      gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGstAmount,
      totalPrice,
      isSameState,
      invoiceNumber: order.order_number || `INV-${order.id}`,
      invoiceDate: order.created_at,
      productName: order.product_name || 'Product',
      status: order.status,
      userState: userState || 'Not specified',
      companyState: company_state || 'Maharashtra',
      buyerName: userName || 'Customer',
      buyerReferralCode: userReferralCode || ''
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
                const salaryAmount = parseFloat(product.salary_amount || 100);
                const salaryDuration = parseInt(product.salary_duration || 12);
                const totalPayout = salaryAmount * salaryDuration;

                return (
                  <div
                    key={product.id}
                    className="product-card-enhanced hover-lift animate-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="product-image-wrapper">
                      {product.image ? (
                        <img
                          src={getImageUrl(product.image)}
                          alt={product.name}
                          className="product-img"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" viewBox="0 0 200 180"><rect fill="%23f3f4f6" width="200" height="180"/><text x="100" y="90" text-anchor="middle" font-size="60">🛏️</text></svg>';
                          }}
                        />
                      ) : (
                        <div className="product-placeholder">
                          <span className="product-emoji">🛏️</span>
                        </div>
                      )}
                      {!product.is_active && (
                        <div className="product-unavailable">
                          <span>Currently Unavailable</span>
                        </div>
                      )}
                    </div>
                    <div className="product-content">
                      <h4 className="product-title">{product.name}</h4>
                      <p className="product-desc">{product.description || 'Premium quality product'}</p>

                      {/* Salary Benefits Card */}
                      <div className="salary-benefits-card">
                        <div className="benefit-header">
                          <span className="benefit-icon">💰</span>
                          <span className="benefit-title">Referral Salary Benefits</span>
                        </div>
                        <div className="benefit-details">
                          <div className="benefit-row">
                            <span className="benefit-label">Monthly Salary</span>
                            <span className="benefit-value">₹{salaryAmount.toLocaleString()}/mo</span>
                          </div>
                          <div className="benefit-row">
                            <span className="benefit-label">Duration</span>
                            <span className="benefit-value">{salaryDuration} months</span>
                          </div>
                          <div className="benefit-row highlight">
                            <span className="benefit-label">Total Earning</span>
                            <span className="benefit-value total">₹{totalPayout.toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="benefit-note">Per active referral who purchases this product</p>
                      </div>

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
              <span className="badge badge-neutral">{orders.length} Orders</span>
            )}
          </div>
          {orders.length > 0 ? (
            <div className="orders-list">
              {orders.map((order) => {
                const invoice = calculateInvoice(order);
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
        </div>
      </div>

      {/* Purchase Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={purchaseDialog.isOpen}
        onClose={() => setPurchaseDialog({ isOpen: false, product: null })}
        onConfirm={handlePurchase}
        title="Confirm Purchase"
        message={purchaseDialog.product ? `Are you sure you want to purchase "${purchaseDialog.product.name}" for ₹${purchaseDialog.product.price?.toLocaleString()}? The amount will be deducted from your wallet.` : ''}
        confirmText={purchasing ? 'Processing...' : 'Confirm Purchase'}
        variant="info"
        loading={purchasing}
      />

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
                      <td>{selectedInvoice.productName}</td>
                      <td className="text-center">1</td>
                      <td className="text-right">₹{selectedInvoice.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="text-right">₹{selectedInvoice.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="invoice-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{selectedInvoice.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedInvoice.isSameState ? (
                  <>
                    <div className="summary-row">
                      <span>CGST (9%)</span>
                      <span>₹{selectedInvoice.cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="summary-row">
                      <span>SGST (9%)</span>
                      <span>₹{selectedInvoice.sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="summary-row">
                    <span>IGST (18%)</span>
                    <span>₹{selectedInvoice.igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total Amount</span>
                  <span>₹{selectedInvoice.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
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
          background: white;
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
          transition: all 0.3s;
        }

        .product-card-enhanced:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
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

        .product-desc {
          font-size: 0.8125rem;
          color: var(--gray-500);
          line-height: 1.5;
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
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