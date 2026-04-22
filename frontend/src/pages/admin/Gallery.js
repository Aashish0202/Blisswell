import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/AdminLayout';
import Modal from '../../components/Modal';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { adminAPI } from '../../utils/api';

const API_URL = process.env.REACT_APP_API_URL;

const GALLERY_CATEGORIES = [
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'living', label: 'Living Spaces' },
  { id: 'detail', label: 'Details' },
  { id: 'bathroom', label: 'Bathroom' },
  { id: 'outdoor', label: 'Outdoor' }
];

const AdminGallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editImage, setEditImage] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, imageId: null });
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'bedroom',
    image_url: '',
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    fetchImages();
  }, [filterCategory]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      const response = await fetch(`${API_URL}/admin/gallery?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      toast.error('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (JPEG, PNG, GIF, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch(`${API_URL}/admin/gallery/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formDataUpload
      });
      const data = await response.json();

      if (data.image_url) {
        setFormData(prev => ({ ...prev, image_url: data.image_url }));
        toast.success('Image uploaded successfully');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editImage
        ? `${API_URL}/admin/gallery/${editImage.id}`
        : `${API_URL}/admin/gallery`;

      const response = await fetch(url, {
        method: editImage ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(editImage ? 'Image updated' : 'Image added');
        setShowModal(false);
        setEditImage(null);
        setFormData({ title: '', description: '', category: 'bedroom', image_url: '', display_order: 0, is_active: true });
        fetchImages();
      } else {
        throw new Error(data.message || 'Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save image');
    }
  };

  const handleEdit = (image) => {
    setEditImage(image);
    setFormData({
      title: image.title,
      description: image.description || '',
      category: image.category,
      image_url: image.image_url,
      display_order: image.display_order || 0,
      is_active: image.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/gallery/${deleteDialog.imageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        toast.success('Image deleted');
        fetchImages();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast.error('Failed to delete image');
    } finally {
      setDeleteDialog({ isOpen: false, imageId: null });
    }
  };

  const toggleStatus = async (image) => {
    try {
      const response = await fetch(`${API_URL}/admin/gallery/${image.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !image.is_active })
      });

      if (response.ok) {
        toast.success(`Image ${!image.is_active ? 'activated' : 'deactivated'}`);
        fetchImages();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openCreateModal = () => {
    setEditImage(null);
    setFormData({ title: '', description: '', category: 'bedroom', image_url: '', display_order: 0, is_active: true });
    setShowModal(true);
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };

  const inactiveCount = images.filter(i => !i.is_active).length;
  const alerts = inactiveCount > 0 ? [
    { label: 'Inactive Images', count: inactiveCount, href: '/admin/gallery', variant: 'warning' }
  ] : [];

  return (
    <AdminLayout alerts={alerts}>
      <div className="admin-gallery-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Gallery Management</h1>
            <p className="page-subtitle">Manage gallery images for your website</p>
          </div>
          <div className="page-header-actions">
            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {GALLERY_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Add Image
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="gallery-grid">
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
          </div>
        ) : images.length > 0 ? (
          <div className="gallery-grid">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="gallery-card"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="gallery-image-wrapper">
                  {image.image_url ? (
                    <img src={getImageUrl(image.image_url)} alt={image.title} />
                  ) : (
                    <div className="image-placeholder">🖼️</div>
                  )}
                  <span className={`status-badge ${image.is_active ? 'active' : 'inactive'}`}>
                    {image.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="image-overlay">
                    <button className="overlay-btn" onClick={() => handleEdit(image)}>
                      ✏️ Edit
                    </button>
                    <button className="overlay-btn delete" onClick={() => setDeleteDialog({ isOpen: true, imageId: image.id })}>
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="gallery-content">
                  <h3 className="gallery-title">{image.title}</h3>
                  <p className="gallery-desc">{image.description || 'No description'}</p>
                  <div className="gallery-meta">
                    <span className="category-tag">{GALLERY_CATEGORIES.find(c => c.id === image.category)?.label || image.category}</span>
                    <span className="order-badge">Order: {image.display_order}</span>
                  </div>
                  <button
                    className={`btn btn-sm ${image.is_active ? 'btn-secondary' : 'btn-success'}`}
                    onClick={() => toggleStatus(image)}
                  >
                    {image.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🖼️"
            title="No gallery images"
            description="Add your first gallery image to get started"
            action={{ label: 'Add Image', onClick: openCreateModal, variant: 'primary' }}
          />
        )}
      </div>

      {/* Image Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editImage ? 'Edit Image' : 'Add Image'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Image *</label>
            <div className="image-upload-container">
              {formData.image_url && (
                <div className="image-preview">
                  <img src={getImageUrl(formData.image_url)} alt="Preview" />
                  <button
                    type="button"
                    className="remove-image"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                  >
                    ×
                  </button>
                </div>
              )}
              <label className="upload-btn">
                {uploading ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              <p className="upload-hint">JPEG, PNG, GIF, WebP (max 5MB)</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Image title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Image description"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {GALLERY_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                className="form-input"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                min="0"
                placeholder="0"
              />
              <span className="form-hint">Lower numbers appear first</span>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Active (visible on website)</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !formData.image_url}>
              {editImage ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, imageId: null })}
        onConfirm={handleDelete}
        title="Delete Image"
        message="Are you sure you want to delete this gallery image? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <style>{`
        .admin-gallery-page {
          max-width: 1400px;
        }

        .page-header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .filter-select {
          padding: 0.5rem 1rem;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          background: white;
          font-size: 0.875rem;
          color: var(--gray-700);
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--primary-500);
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .gallery-card {
          background: white;
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-card);
          border: 1px solid var(--gray-100);
          transition: all 0.3s;
          animation: cardFadeIn 0.4s ease-out forwards;
          opacity: 0;
        }

        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .gallery-card:hover {
          box-shadow: var(--shadow-lg);
        }

        .gallery-image-wrapper {
          position: relative;
          height: 180px;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
        }

        .gallery-image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
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

        .image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .gallery-card:hover .image-overlay {
          opacity: 1;
        }

        .overlay-btn {
          padding: 0.5rem 1rem;
          background: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .overlay-btn:hover {
          background: var(--gray-100);
        }

        .overlay-btn.delete:hover {
          background: var(--danger-color);
          color: white;
        }

        .gallery-content {
          padding: 1rem;
        }

        .gallery-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 0.25rem 0;
        }

        .gallery-desc {
          font-size: 0.8125rem;
          color: var(--gray-500);
          margin: 0 0 0.75rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .gallery-meta {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .category-tag {
          padding: 0.25rem 0.5rem;
          background: var(--primary-100);
          color: var(--primary-700);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .order-badge {
          padding: 0.25rem 0.5rem;
          background: var(--gray-100);
          color: var(--gray-600);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
        }

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
          background: rgba(239, 68, 68, 0.9);
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

        .btn-success {
          background: var(--accent-600);
          color: white;
        }

        .btn-success:hover {
          background: var(--accent-700);
        }

        @media (max-width: 768px) {
          .gallery-grid {
            grid-template-columns: 1fr;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminGallery;