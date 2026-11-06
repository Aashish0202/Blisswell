import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminLayout from '../../components/AdminLayout';
import Modal from '../../components/Modal';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import EmptyState from '../../components/EmptyState';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { adminAPI } from '../../utils/api';

const API_URL = process.env.REACT_APP_API_URL;

// <input type="datetime-local"> works in the browser's local time without a
// zone suffix; convert to/from real Date values at the edges.
const toLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

const getBannerStatus = (banner) => {
  const now = Date.now();
  if (!banner.is_active) return { key: 'inactive', label: 'Disabled' };
  if (new Date(banner.start_at).getTime() > now) return { key: 'scheduled', label: 'Scheduled' };
  if (new Date(banner.end_at).getTime() < now) return { key: 'expired', label: 'Expired' };
  return { key: 'live', label: 'Live' };
};

const emptyForm = () => {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    title: '',
    message: '',
    image_url: '',
    link_url: '',
    link_text: '',
    start_at: toLocalInput(start),
    end_at: toLocalInput(end),
    display_order: 0,
    is_active: true
  };
};

const AdminOfferBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, bannerId: null });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm());

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getOfferBanners();
      setBanners(res.data?.banners || []);
    } catch (error) {
      toast.error('Failed to load offer banners');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
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
      const fd = new FormData();
      fd.append('image', file);
      const res = await adminAPI.uploadOfferBannerImage(fd);
      if (!res.data?.image_url) throw new Error('Upload failed');
      setFormData(prev => ({ ...prev, image_url: res.data.image_url }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const start = new Date(formData.start_at);
    const end = new Date(formData.end_at);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      toast.error('Please select valid start and end date/time');
      return;
    }
    if (end <= start) {
      toast.error('End time must be after start time');
      return;
    }

    const payload = {
      ...formData,
      start_at: start.toISOString(),
      end_at: end.toISOString()
    };

    setSaving(true);
    try {
      if (editBanner) {
        await adminAPI.updateOfferBanner(editBanner.id, payload);
        toast.success('Offer banner updated');
      } else {
        await adminAPI.createOfferBanner(payload);
        toast.success('Offer banner created');
      }
      setShowModal(false);
      setEditBanner(null);
      fetchBanners();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save offer banner');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditBanner(null);
    setFormData(emptyForm());
    setShowModal(true);
  };

  const handleEdit = (banner) => {
    setEditBanner(banner);
    setFormData({
      title: banner.title,
      message: banner.message || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      link_text: banner.link_text || '',
      start_at: toLocalInput(banner.start_at),
      end_at: toLocalInput(banner.end_at),
      display_order: banner.display_order || 0,
      is_active: !!banner.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await adminAPI.deleteOfferBanner(deleteDialog.bannerId);
      toast.success('Offer banner deleted');
      fetchBanners();
    } catch (error) {
      toast.error('Failed to delete offer banner');
    } finally {
      setDeleteDialog({ isOpen: false, bannerId: null });
    }
  };

  const toggleStatus = async (banner) => {
    try {
      await adminAPI.updateOfferBanner(banner.id, { is_active: !banner.is_active });
      toast.success(`Banner ${!banner.is_active ? 'enabled' : 'disabled'}`);
      fetchBanners();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const liveCount = banners.filter(b => getBannerStatus(b).key === 'live').length;

  return (
    <AdminLayout>
      <div className="admin-offer-banners-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Offer Banners</h1>
            <p className="page-subtitle">
              Banners appear at the top of every user's dashboard between their start and end time
              {banners.length > 0 && ` · ${liveCount} live now`}
            </p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={openCreateModal}>
              + Add Banner
            </button>
          </div>
        </div>

        {loading ? (
          <div className="ob-list">
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
          </div>
        ) : banners.length > 0 ? (
          <div className="ob-list">
            {banners.map((banner) => {
              const status = getBannerStatus(banner);
              return (
                <div key={banner.id} className="ob-card">
                  <div className="ob-thumb">
                    {banner.image_url ? (
                      <img src={getImageUrl(banner.image_url)} alt={banner.title} />
                    ) : (
                      <div className="ob-thumb-placeholder">🎉</div>
                    )}
                  </div>
                  <div className="ob-body">
                    <div className="ob-title-row">
                      <h3 className="ob-title">{banner.title}</h3>
                      <span className={`ob-status ob-status-${status.key}`}>{status.label}</span>
                    </div>
                    {banner.message && <p className="ob-message">{banner.message}</p>}
                    <div className="ob-meta">
                      <span>🕒 {formatDateTime(banner.start_at)} → {formatDateTime(banner.end_at)}</span>
                      {banner.link_url && <span>🔗 {banner.link_text || 'Link'}: {banner.link_url}</span>}
                      <span>Order: {banner.display_order}</span>
                    </div>
                  </div>
                  <div className="ob-actions">
                    <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(banner)}>Edit</button>
                    <button
                      className={`btn btn-sm ${banner.is_active ? 'btn-secondary' : 'btn-success'}`}
                      onClick={() => toggleStatus(banner)}
                    >
                      {banner.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteDialog({ isOpen: true, bannerId: banner.id })}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="📢"
            title="No offer banners"
            description="Create a banner to promote an offer on the user dashboard for a set time period"
            action={{ label: 'Add Banner', onClick: openCreateModal, variant: 'primary' }}
          />
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editBanner ? 'Edit Offer Banner' : 'Add Offer Banner'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={255}
              placeholder="e.g. Diwali Offer – Flat 20% off"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className="form-input"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              placeholder="Short description of the offer"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Banner Image (optional)</label>
            <div className="image-upload-container">
              {formData.image_url && (
                <div className="ob-image-preview">
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
                {uploading ? 'Uploading...' : formData.image_url ? 'Replace Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              <p className="upload-hint">Wide images work best (e.g. 1200×300). JPEG, PNG, GIF, WebP (max 5MB)</p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Show From *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Show Until *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={formData.end_at}
                min={formData.start_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Button Link (optional)</label>
              <input
                type="text"
                className="form-input"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="/orders or https://..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Button Text</label>
              <input
                type="text"
                className="form-input"
                value={formData.link_text}
                maxLength={100}
                onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                placeholder="Shop Now"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                className="form-input"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                min="0"
              />
              <span className="form-hint">Lower numbers appear first</span>
            </div>
            <div className="form-group ob-checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span>Enabled</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || saving}>
              {saving ? 'Saving...' : editBanner ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, bannerId: null })}
        onConfirm={handleDelete}
        title="Delete Offer Banner"
        message="Are you sure you want to delete this offer banner? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <style>{`
        .admin-offer-banners-page {
          max-width: 1400px;
        }

        .page-header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .ob-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ob-card {
          display: flex;
          gap: 1rem;
          align-items: center;
          background: white;
          border-radius: var(--radius-xl);
          border: 1px solid var(--gray-100);
          box-shadow: var(--shadow-card);
          padding: 1rem;
        }

        .ob-thumb {
          flex-shrink: 0;
          width: 160px;
          height: 80px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: linear-gradient(135deg, var(--primary-50), var(--accent-50));
        }

        .ob-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .ob-thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }

        .ob-body {
          flex: 1;
          min-width: 0;
        }

        .ob-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .ob-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0;
        }

        .ob-status {
          padding: 0.125rem 0.625rem;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .ob-status-live { background: #d1fae5; color: #047857; }
        .ob-status-scheduled { background: #dbeafe; color: #1d4ed8; }
        .ob-status-expired { background: var(--gray-100); color: var(--gray-600); }
        .ob-status-inactive { background: #fee2e2; color: #b91c1c; }

        .ob-message {
          font-size: 0.875rem;
          color: var(--gray-600);
          margin: 0.25rem 0 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .ob-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem 1rem;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--gray-500);
          word-break: break-all;
        }

        .ob-actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
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

        .ob-checkbox-group {
          display: flex;
          align-items: center;
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

        .ob-image-preview {
          position: relative;
          width: 100%;
          max-width: 480px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }

        .ob-image-preview img {
          display: block;
          width: 100%;
          height: auto;
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
          align-self: flex-start;
        }

        .upload-btn:hover {
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

        .btn-danger {
          background: var(--danger-color, #ef4444);
          color: white;
        }

        @media (max-width: 768px) {
          .ob-card {
            flex-direction: column;
            align-items: stretch;
          }

          .ob-thumb {
            width: 100%;
            height: 110px;
          }

          .ob-actions {
            flex-wrap: wrap;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminOfferBanners;
