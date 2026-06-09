import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import AdminLayout from '../../components/AdminLayout';
import Modal from '../../components/Modal';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import DataTable from '../../components/DataTable';

const API_URL = process.env.REACT_APP_API_URL;

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

  if (!images || images.length === 0) return null;

  return (
    <div className="image-slider" onClick={onImageClick} style={{ cursor: 'pointer' }}>
      <img
        src={getImageUrl(images[currentIndex])}
        alt={alt}
        onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40">🛏️</text></svg>' }}
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

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, productId: null });
  const [uploading, setUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [lightbox, setLightbox] = useState({ isOpen: false, images: [], currentIndex: 0 });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    salary_amount: '100',
    salary_duration: '12',
    image: '',
    images: [], // New field for multiple images
    is_active: true
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getProducts();
      setProducts(response.data.products);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, index = null) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Check if we can add more images (max 5)
    const currentImages = formData.images || [];
    if (index === null && currentImages.length >= 5) {
      toast.error('Maximum 5 images allowed per product');
      return;
    }

    if (index !== null) {
      setUploadingIndex(index);
    } else {
      setUploading(true);
    }

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await adminAPI.uploadProductImage(formDataUpload);
      const imageUrl = response.data.image_url;

      // Update form data with image URL
      if (index !== null) {
        // Replace specific image
        setFormData(prev => ({
          ...prev,
          images: prev.images.map((img, i) => i === index ? imageUrl : img),
          image: index === 0 ? imageUrl : prev.image
        }));
      } else {
        // Add new image
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), imageUrl],
          image: (prev.images || []).length === 0 ? imageUrl : prev.image
        }));
      }
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      setUploadingIndex(null);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        image: newImages.length > 0 ? newImages[0] : ''
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editProduct) {
        await adminAPI.updateProduct(editProduct.id, formData);
        toast.success('Product updated');
      } else {
        await adminAPI.createProduct(formData);
        toast.success('Product created');
      }
      setShowModal(false);
      setEditProduct(null);
      setFormData({ name: '', description: '', price: '', salary_amount: '100', salary_duration: '12', image: '', images: [], is_active: true });
      fetchProducts();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    // Handle both new images array and legacy single image
    let productImages = [];
    if (product.images) {
      if (Array.isArray(product.images)) {
        productImages = product.images;
      } else if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          if (Array.isArray(parsed)) {
            productImages = parsed;
          }
        } catch (e) {
          console.error('Failed to parse images:', e);
        }
      }
    }
    if (productImages.length === 0 && product.image) {
      productImages = [product.image];
    }
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      salary_amount: product.salary_amount || '100',
      salary_duration: product.salary_duration || '12',
      image: product.image || '',
      images: productImages,
      is_active: product.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await adminAPI.deleteProduct(deleteDialog.productId);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setDeleteDialog({ isOpen: false, productId: null });
    }
  };

  const openCreateModal = () => {
    setEditProduct(null);
    setFormData({ name: '', description: '', price: '', salary_amount: '100', salary_duration: '12', image: '', images: [], is_active: true });
    setShowModal(true);
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    // If it's already a full URL, return as is
    if (image.startsWith('http')) return image;
    // Otherwise, prepend the API base URL
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };

  const getProductImages = (product) => {
    // Handle both new images array and legacy single image
    if (product.images) {
      // If it's already an array
      if (Array.isArray(product.images) && product.images.length > 0) {
        return product.images;
      }
      // If it's a JSON string, parse it
      if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error('Failed to parse images:', e);
        }
      }
    }
    if (product.image) {
      return [product.image];
    }
    return [];
  };

  const toggleProductStatus = async (product) => {
    try {
      await adminAPI.updateProduct(product.id, { is_active: !product.is_active });
      toast.success(`Product ${!product.is_active ? 'activated' : 'deactivated'}`);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update product status');
    }
  };

  // Calculate inactive products for alert
  const inactiveProducts = products.filter(p => !p.is_active).length;
  const alerts = inactiveProducts > 0 ? [
    { label: 'Inactive Products', count: inactiveProducts, href: '/admin/products', variant: 'warning' }
  ] : [];

  // Table columns for DataTable
  const tableColumns = [
    {
      key: 'name',
      label: 'Product',
      render: (value, row) => (
        <div className="product-cell">
          <div className="product-thumb">
            {row.image ? (
              <img src={getImageUrl(row.image)} alt={value} onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="20">🛏️</text></svg>'; }} />
            ) : (
              <span className="thumb-emoji">🛏️</span>
            )}
          </div>
          <div className="product-info">
            <span className="product-name">{value}</span>
            <span className="product-desc-mini">{row.description?.substring(0, 40)}{row.description?.length > 40 ? '...' : ''}</span>
          </div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Price',
      render: (value) => <span className="price-cell">₹{parseFloat(value).toLocaleString()}</span>
    },
    {
      key: 'salary_amount',
      label: 'Monthly Incentive',
      render: (value, row) => (
        <div className="salary-cell">
          <span className="salary-amount">₹{parseFloat(value || 100).toLocaleString()}</span>
          <span className="salary-duration">/ {row.salary_duration || 12} mo</span>
        </div>
      )
    },
    {
      key: 'total_payout',
      label: 'Total Payout',
      render: (value, row) => {
        const total = (parseFloat(row.salary_amount || 100) * parseInt(row.salary_duration || 12));
        return <span className="payout-cell">₹{total.toLocaleString()}</span>;
      }
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value, row) => (
        <button
          className={`status-toggle ${value ? 'active' : 'inactive'}`}
          onClick={() => toggleProductStatus(row)}
        >
          {value ? '✓ Active' : '○ Inactive'}
        </button>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (value, row) => (
        <div className="table-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(row)}>
            ✏️ Edit
          </button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteDialog({ isOpen: true, productId: row.id })}>
            🗑️
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout alerts={alerts}>
      <div className="admin-products-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Product Management</h1>
            <p className="page-subtitle">Configure products and their incentive benefits</p>
          </div>
          <div className="page-header-actions">
            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                ⊞
              </button>
              <button
                className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                ☰
              </button>
            </div>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Add Product
            </button>
          </div>
        </div>

        {/* Products Grid/Table */}
        {loading ? (
          <div className="products-grid">
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
          </div>
        ) : products.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="products-grid">
              {products.map((product, index) => {
                const productImages = getProductImages(product);
                const hasMultipleImages = productImages.length > 1;

                const openLightbox = () => {
                  if (productImages.length > 0) {
                    setLightbox({ isOpen: true, images: productImages, currentIndex: 0 });
                  }
                };

                return (
                  <div
                    key={product.id}
                    className="product-card hover-lift animate-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="product-image" onClick={openLightbox} style={{ cursor: productImages.length > 0 ? 'pointer' : 'default' }}>
                      {productImages.length > 0 ? (
                        hasMultipleImages ? (
                          <ImageSlider images={productImages} getImageUrl={getImageUrl} alt={product.name} onImageClick={openLightbox} />
                        ) : (
                          <img
                            src={getImageUrl(productImages[0])}
                            alt={product.name}
                            onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40">🛏️</text></svg>' }}
                          />
                        )
                      ) : (
                        <span className="product-emoji">🛏️</span>
                      )}
                      <span className={`status-badge ${product.is_active ? 'active' : 'inactive'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  <div className="product-content">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-description">{product.description || 'No description'}</p>

                    <div className="product-price-row">
                      <div className="price-info">
                        <span className="product-price">₹{parseFloat(product.price).toLocaleString()}</span>
                        <span className="price-label">Price</span>
                      </div>
                    </div>

                    <div className="salary-info-card">
                      <div className="salary-item">
                        <span className="salary-label">Monthly Incentive</span>
                        <span className="salary-value">₹{parseFloat(product.salary_amount || 100).toLocaleString()}</span>
                      </div>
                      <div className="salary-item">
                        <span className="salary-label">Duration</span>
                        <span className="salary-value">{product.salary_duration || 12} months</span>
                      </div>
                      <div className="salary-item highlight">
                        <span className="salary-label">Total Payout</span>
                        <span className="salary-value">₹{(parseFloat(product.salary_amount || 100) * parseInt(product.salary_duration || 12)).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="product-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEdit(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteDialog({ isOpen: true, productId: product.id })}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="products-table-wrapper animate-fade-in">
              <DataTable
                columns={tableColumns}
                data={products}
                searchable={true}
                searchPlaceholder="Search products..."
              />
            </div>
          )
        ) : (
          <EmptyState
            icon="🛍️"
            title="No products yet"
            description="Add your first product to get started"
            action={{ label: 'Add Product', onClick: openCreateModal, variant: 'primary' }}
          />
        )}
      </div>

      {/* Product Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Product Images (Max 5)</label>
            <div className="image-upload-container">
              <div className="images-grid">
                {(formData.images || []).map((img, index) => (
                  <div key={index} className="image-preview-item">
                    <img src={getImageUrl(img)} alt={`Preview ${index + 1}`} />
                    <button
                      type="button"
                      className="remove-image"
                      onClick={() => removeImage(index)}
                    >
                      ×
                    </button>
                    <label className="replace-btn">
                      {uploadingIndex === index ? 'Uploading...' : 'Replace'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, index)}
                        disabled={uploadingIndex === index}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                ))}
                {(formData.images || []).length < 5 && (
                  <label className="upload-box">
                    {uploading ? 'Uploading...' : '+ Add Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e)}
                      disabled={uploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
              <p className="upload-hint">JPEG, PNG, GIF, WebP (max 5MB each, max 5 images)</p>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Product name"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Product description"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price (₹) *</label>
              <input
                type="number"
                className="form-input"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                placeholder="Product price"
                min="0"
              />
            </div>
          </div>

          {/* Incentive Configuration Section */}
          <div className="salary-config-section">
            <h4 className="section-title">💰 Incentive Configuration</h4>
            <p className="section-desc">Configure the incentive benefits for referrers when this product is purchased</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Monthly Incentive Amount (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.salary_amount}
                  onChange={(e) => setFormData({ ...formData, salary_amount: e.target.value })}
                  min="0"
                  placeholder="100"
                />
                <span className="form-hint">Amount referrer earns per month per referral</span>
              </div>
              <div className="form-group">
                <label className="form-label">Duration (Months)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.salary_duration}
                  onChange={(e) => setFormData({ ...formData, salary_duration: e.target.value })}
                  min="1"
                  max="24"
                  placeholder="12"
                />
                <span className="form-hint">Number of months incentive is paid</span>
              </div>
            </div>
            <div className="salary-preview">
              <span className="preview-label">Total Payout per Referral:</span>
              <span className="preview-value">₹{((parseFloat(formData.salary_amount) || 100) * (parseInt(formData.salary_duration) || 12)).toLocaleString()}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Active (available for purchase)</span>
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {editProduct ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, productId: null })}
        onConfirm={handleDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
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

      <style>{`
        .admin-products-page {
          max-width: 1200px;
        }

        .page-header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .view-toggle {
          display: flex;
          background: var(--gray-100);
          border-radius: var(--radius-lg);
          padding: 0.25rem;
        }

        .toggle-btn {
          padding: 0.5rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 1rem;
          color: var(--gray-500);
          transition: all 0.2s;
        }

        .toggle-btn.active {
          background: white;
          color: var(--primary-600);
          box-shadow: var(--shadow-sm);
        }

        .toggle-btn:hover:not(.active) {
          color: var(--gray-700);
        }

        /* Card Animations */
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

        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        .product-card {
          background: white;
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
          transition: all 0.3s;
        }

        .product-image {
          position: relative;
          height: 220px;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-emoji {
          font-size: 4rem;
        }

        .status-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.9);
          color: white;
        }

        .status-badge.inactive {
          background: rgba(107, 114, 128, 0.9);
          color: white;
        }

        .product-content {
          padding: 1rem;
        }

        .product-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 0.25rem 0;
        }

        .product-description {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-bottom: 0.75rem;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-price-row {
          margin-bottom: 0.75rem;
        }

        .price-info {
          display: flex;
          flex-direction: column;
        }

        .product-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        .price-label {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .salary-info-card {
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          padding: 0.75rem;
          margin-bottom: 0.75rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .salary-item {
          text-align: center;
        }

        .salary-item.highlight {
          background: var(--accent-50);
          margin: -0.25rem;
          padding: 0.25rem;
          border-radius: var(--radius-md);
        }

        .salary-label {
          display: block;
          font-size: 0.625rem;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .salary-value {
          display: block;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gray-900);
        }

        .salary-item.highlight .salary-value {
          color: var(--accent-600);
        }

        .product-actions {
          display: flex;
          gap: 0.5rem;
        }

        /* Table Styles */
        .products-table-wrapper {
          background: white;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }

        .product-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .product-thumb {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .product-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumb-emoji {
          font-size: 1.5rem;
        }

        .product-info {
          display: flex;
          flex-direction: column;
        }

        .product-name {
          font-weight: 600;
          color: var(--gray-900);
        }

        .product-desc-mini {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .price-cell {
          font-weight: 600;
          color: var(--primary-600);
        }

        .salary-cell {
          display: flex;
          flex-direction: column;
        }

        .salary-amount {
          font-weight: 600;
          color: var(--gray-900);
        }

        .salary-duration {
          font-size: 0.75rem;
          color: var(--gray-500);
        }

        .payout-cell {
          font-weight: 600;
          color: var(--accent-600);
        }

        .status-toggle {
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-toggle.active {
          background: var(--accent-100);
          color: var(--accent-700);
        }

        .status-toggle.inactive {
          background: var(--gray-100);
          color: var(--gray-600);
        }

        .status-toggle:hover {
          transform: scale(1.05);
        }

        .table-actions {
          display: flex;
          gap: 0.25rem;
        }

        .text-danger {
          color: var(--danger-color, #ef4444) !important;
        }

        /* Form Styles */
        .form-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 18px;
          height: 18px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-200);
        }

        .image-upload-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .image-preview {
          position: relative;
          width: 100%;
          max-width: 300px;
          height: 200px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-image {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-image:hover {
          background: rgba(239, 68, 68, 0.8);
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          background: var(--gray-100);
          border: 2px dashed var(--gray-300);
          border-radius: var(--radius-lg);
          cursor: pointer;
          color: var(--gray-600);
          font-weight: 500;
          transition: all 0.2s;
        }

        .upload-btn:hover {
          background: var(--gray-50);
          border-color: var(--primary-400);
          color: var(--primary-600);
        }

        .upload-hint {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin: 0;
        }

        /* Incentive Configuration Section */
        .salary-config-section {
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          margin: 1rem 0;
          border: 1px solid var(--gray-200);
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 0.25rem 0;
        }

        .section-desc {
          font-size: 0.8125rem;
          color: var(--gray-500);
          margin: 0 0 1rem 0;
        }

        .salary-preview {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: var(--accent-50);
          border-radius: var(--radius-md);
          margin-top: 0.5rem;
        }

        .preview-label {
          font-size: 0.875rem;
          color: var(--gray-600);
        }

        .preview-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--accent-600);
        }

        /* Image Slider Styles */
        .image-slider {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
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

        /* Multiple Images Upload Grid */
        .images-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        .image-preview-item {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }

        .image-preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-preview-item .remove-image {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .image-preview-item .remove-image:hover {
          background: rgba(239, 68, 68, 0.9);
        }

        .replace-btn {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 12px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          font-size: 0.75rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .replace-btn:hover {
          background: rgba(0, 0, 0, 0.8);
        }

        .upload-box {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gray-50);
          border: 2px dashed var(--gray-300);
          border-radius: var(--radius-lg);
          cursor: pointer;
          color: var(--gray-500);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .upload-box:hover {
          background: var(--gray-100);
          border-color: var(--primary-400);
          color: var(--primary-600);
        }

        @media (max-width: 768px) {
          .products-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .salary-info-card {
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }

          .salary-item.highlight {
            margin: 0;
          }

          .images-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminProducts;