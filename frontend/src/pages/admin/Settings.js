import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../utils/api';
import { useSiteSettings } from '../../components/SiteSettingsProvider';
import AdminLayout from '../../components/AdminLayout';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    closing_day: 5,
    repurchase_enabled: true
  });
  const [siteSettings, setSiteSettings] = useState({
    site_name: 'Blisswell',
    site_logo: '',
    site_tagline: 'Premium Bedsheets',
    contact_phone: '+91 98765 43210',
    contact_email: 'info@blisswell.in',
    contact_address: 'BUSINESS PLAZA, A WING, SHOP NO -409, AADGOAN NAKA PANCHAWATI NASHIK, PIN - 422003, MAHARASHTRA',
    company_state: 'Maharashtra',
    social_facebook: '',
    social_instagram: '',
    social_twitter: '',
    social_linkedin: '',
    social_youtube: '',
    terms_and_conditions: ''
  });
  const [originalSettings, setOriginalSettings] = useState(null);
  const [originalSiteSettings, setOriginalSiteSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { refreshSettings } = useSiteSettings();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [settingsRes, siteRes] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getSiteSettings()
      ]);
      setSettings(settingsRes.data.settings);
      setOriginalSettings(settingsRes.data.settings);
      if (siteRes.data.settings) {
        setSiteSettings(siteRes.data.settings);
        setOriginalSiteSettings(siteRes.data.settings);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    });
  };

  const handleSiteSettingChange = (e) => {
    const { name, value } = e.target;
    setSiteSettings({
      ...siteSettings,
      [name]: value
    });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo size must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await adminAPI.uploadLogoImage(formData);
      const logoUrl = response.data.logo_url;

      setSiteSettings(prev => ({ ...prev, site_logo: logoUrl }));
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setSiteSettings(prev => ({ ...prev, site_logo: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowConfirmDialog(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        adminAPI.updateSettings(settings),
        adminAPI.updateSiteSettings(siteSettings)
      ]);
      toast.success('Settings updated successfully');
      setOriginalSettings(settings);
      setOriginalSiteSettings(siteSettings);
      refreshSettings();
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
    }
  };

  const getLogoUrl = (logo) => {
    if (!logo) return null;
    if (logo.startsWith('http')) return logo;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${logo}`;
  };

  const hasChanges = (originalSettings && JSON.stringify(settings) !== JSON.stringify(originalSettings)) ||
    (originalSiteSettings && JSON.stringify(siteSettings) !== JSON.stringify(originalSiteSettings));

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-settings-page">
          <LoadingSkeleton variant="card" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-settings-page">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">System Settings</h1>
            <p className="page-subtitle">Configure application-wide settings</p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="settings-grid">
          <div className="settings-main">
            {/* Branding Settings */}
            <div className="card animate-fade-in">
              <div className="card-header">
                <h3 className="card-title">🎨 Site Branding</h3>
              </div>
              <div className="branding-section">
                <div className="logo-upload-area">
                  <div className="logo-preview">
                    {siteSettings.site_logo ? (
                      <>
                        <img src={getLogoUrl(siteSettings.site_logo)} alt="Site Logo" />
                        <button type="button" className="remove-logo" onClick={removeLogo}>×</button>
                      </>
                    ) : (
                      <div className="logo-placeholder">
                        <span className="placeholder-icon">🖼️</span>
                        <span className="placeholder-text">No Logo</span>
                      </div>
                    )}
                  </div>
                  <div className="logo-upload-actions">
                    <label className="upload-btn">
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                        style={{ display: 'none' }}
                      />
                    </label>
                    <p className="upload-hint">PNG, JPG, SVG, WebP (max 2MB)</p>
                    <p className="upload-hint">Recommended: Square or horizontal logo</p>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Site Name</label>
                    <input
                      type="text"
                      name="site_name"
                      className="form-input"
                      value={siteSettings.site_name}
                      onChange={handleSiteSettingChange}
                      placeholder="Enter site name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tagline</label>
                    <input
                      type="text"
                      name="site_tagline"
                      className="form-input"
                      value={siteSettings.site_tagline}
                      onChange={handleSiteSettingChange}
                      placeholder="Enter tagline"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Settings */}
            <div className="card animate-fade-in" style={{ animationDelay: '0.05s' }}>
              <div className="card-header">
                <h3 className="card-title">📞 Contact Information</h3>
              </div>
              <div className="contact-section">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      name="contact_phone"
                      className="form-input"
                      value={siteSettings.contact_phone}
                      onChange={handleSiteSettingChange}
                      placeholder="+91 98765 43210"
                    />
                    <span className="form-hint">Primary contact phone number</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      name="contact_email"
                      className="form-input"
                      value={siteSettings.contact_email}
                      onChange={handleSiteSettingChange}
                      placeholder="support@example.com"
                    />
                    <span className="form-hint">Primary contact email</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Business Address</label>
                  <textarea
                    name="contact_address"
                    className="form-input form-textarea"
                    value={siteSettings.contact_address}
                    onChange={handleSiteSettingChange}
                    placeholder="Enter complete business address"
                    rows="2"
                  />
                  <span className="form-hint">Complete business address displayed in footer and contact page</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Company State (for GST)</label>
                  <select
                    name="company_state"
                    className="form-input"
                    value={siteSettings.company_state || 'Maharashtra'}
                    onChange={handleSiteSettingChange}
                  >
                    <option value="">Select State</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                    <option value="Assam">Assam</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Chhattisgarh">Chhattisgarh</option>
                    <option value="Goa">Goa</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                    <option value="Jharkhand">Jharkhand</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Manipur">Manipur</option>
                    <option value="Meghalaya">Meghalaya</option>
                    <option value="Mizoram">Mizoram</option>
                    <option value="Nagaland">Nagaland</option>
                    <option value="Odisha">Odisha</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Sikkim">Sikkim</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tripura">Tripura</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Uttarakhand">Uttarakhand</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                    <option value="Ladakh">Ladakh</option>
                    <option value="Puducherry">Puducherry</option>
                    <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                    <option value="Chandigarh">Chandigarh</option>
                    <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                    <option value="Lakshadweep">Lakshadweep</option>
                  </select>
                  <span className="form-hint">Used to determine GST type (CGST+SGST for same state, IGST for different state)</span>
                </div>
              </div>
            </div>

            {/* Social Media Settings */}
            <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="card-header">
                <h3 className="card-title">🔗 Social Media Links</h3>
              </div>
              <div className="social-section">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="social-icon facebook">📘</span> Facebook
                    </label>
                    <input
                      type="url"
                      name="social_facebook"
                      className="form-input"
                      value={siteSettings.social_facebook}
                      onChange={handleSiteSettingChange}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <span className="social-icon instagram">📷</span> Instagram
                    </label>
                    <input
                      type="url"
                      name="social_instagram"
                      className="form-input"
                      value={siteSettings.social_instagram}
                      onChange={handleSiteSettingChange}
                      placeholder="https://instagram.com/yourprofile"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="social-icon twitter">🐦</span> Twitter
                    </label>
                    <input
                      type="url"
                      name="social_twitter"
                      className="form-input"
                      value={siteSettings.social_twitter}
                      onChange={handleSiteSettingChange}
                      placeholder="https://twitter.com/yourprofile"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      <span className="social-icon linkedin">💼</span> LinkedIn
                    </label>
                    <input
                      type="url"
                      name="social_linkedin"
                      className="form-input"
                      value={siteSettings.social_linkedin}
                      onChange={handleSiteSettingChange}
                      placeholder="https://linkedin.com/company/yourcompany"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <span className="social-icon youtube">📺</span> YouTube
                  </label>
                  <input
                    type="url"
                    name="social_youtube"
                    className="form-input"
                    value={siteSettings.social_youtube}
                    onChange={handleSiteSettingChange}
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="card animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <div className="card-header">
                <h3 className="card-title">📜 Terms and Conditions</h3>
              </div>
              <div className="terms-section">
                <div className="form-group">
                  <label className="form-label">Registration Terms & Conditions</label>
                  <textarea
                    name="terms_and_conditions"
                    className="form-input form-textarea-large"
                    value={siteSettings.terms_and_conditions}
                    onChange={handleSiteSettingChange}
                    placeholder="Enter the terms and conditions that users must accept during registration..."
                    rows="8"
                  />
                  <span className="form-hint">These terms will be shown to users during registration. They must accept these terms to create an account.</span>
                </div>
              </div>
            </div>

            {/* Application Settings */}
            <div className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="card-header">
                <h3 className="card-title">⚙️ Application Settings</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Monthly Closing Day</label>
                  <input
                    type="number"
                    name="closing_day"
                    className="form-input"
                    value={settings.closing_day}
                    onChange={handleChange}
                    min="1"
                    max="28"
                    required
                  />
                  <span className="form-hint">Day of month when incentive is calculated and processed (1-28)</span>
                </div>

                <div className="form-group">
                  <label className="toggle-label">
                    <div className="toggle-wrapper">
                      <input
                        type="checkbox"
                        name="repurchase_enabled"
                        checked={settings.repurchase_enabled}
                        onChange={handleChange}
                        className="toggle-input"
                      />
                      <span className="toggle-slider"></span>
                    </div>
                    <div className="toggle-content">
                      <span className="toggle-title">Allow Repurchase</span>
                      <span className="toggle-desc">Allow users to purchase products multiple times</span>
                    </div>
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || !hasChanges}
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                  {hasChanges && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        setSettings(originalSettings);
                        setSiteSettings(originalSiteSettings);
                      }}
                    >
                      Reset Changes
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Info Cards */}
          <div className="info-cards">
            <div className="card info-card animate-fade-in">
              <div className="info-card-icon">📅</div>
              <h4>Closing Day</h4>
              <p>Incentive cycles are processed on day <strong>{settings.closing_day}</strong> of each month.</p>
            </div>

            <div className="card info-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="info-card-icon">🔄</div>
              <h4>Repurchase</h4>
              <p>
                {settings.repurchase_enabled
                  ? 'Users can purchase products multiple times.'
                  : 'Users can only purchase once.'}
              </p>
            </div>

            <div className="card info-card highlight animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="info-card-icon">💰</div>
              <h4>Per-Product Incentive</h4>
              <p>Configure incentive for each product individually.</p>
              <a href="/admin/products" className="btn btn-secondary btn-sm">Manage Products →</a>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={confirmSave}
        title="Confirm Settings Update"
        message="Are you sure you want to update these settings?"
        confirmText="Save Changes"
        variant="info"
      />

      <style>{`
        .admin-settings-page {
          max-width: 1100px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 1.5rem;
        }

        .settings-main {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Branding Section */
        .branding-section {
          padding: 0.5rem 0;
        }

        .logo-upload-area {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--gray-100);
        }

        .logo-preview {
          width: 120px;
          height: 120px;
          border-radius: var(--radius-xl);
          overflow: hidden;
          border: 2px dashed var(--gray-200);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
          background: var(--gray-50);
        }

        .logo-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 8px;
        }

        .remove-logo {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .logo-preview:hover .remove-logo {
          opacity: 1;
        }

        .logo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--gray-400);
        }

        .placeholder-icon {
          font-size: 2rem;
        }

        .placeholder-text {
          font-size: 0.75rem;
        }

        .logo-upload-actions {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.5rem;
        }

        .upload-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.25rem;
          background: var(--primary-50);
          color: var(--primary-700);
          border: 1px solid var(--primary-200);
          border-radius: var(--radius-lg);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-btn:hover {
          background: var(--primary-100);
          border-color: var(--primary-300);
        }

        .upload-hint {
          font-size: 0.75rem;
          color: var(--gray-500);
          margin: 0;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-hint {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .form-textarea {
          resize: vertical;
          min-height: 60px;
        }

        .form-textarea-large {
          min-height: 200px;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .social-icon {
          margin-right: 0.5rem;
        }

        .contact-section,
        .social-section,
        .terms-section {
          padding: 0.5rem 0;
        }

        /* Toggle Switch */
        .toggle-label {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          cursor: pointer;
          padding: 1rem;
          background: var(--gray-50);
          border-radius: var(--radius-lg);
          transition: background 0.2s;
        }

        .toggle-label:hover {
          background: var(--gray-100);
        }

        .toggle-wrapper {
          position: relative;
          width: 48px;
          height: 26px;
          flex-shrink: 0;
        }

        .toggle-input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--gray-300);
          transition: 0.3s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: var(--shadow-sm);
        }

        .toggle-input:checked + .toggle-slider {
          background-color: var(--accent-500);
        }

        .toggle-input:checked + .toggle-slider:before {
          transform: translateX(22px);
        }

        .toggle-content {
          flex: 1;
        }

        .toggle-title {
          display: block;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 0.25rem;
        }

        .toggle-desc {
          display: block;
          font-size: 0.8125rem;
          color: var(--gray-500);
        }

        .form-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--gray-200);
        }

        /* Info Cards */
        .info-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .info-card {
          padding: 1.25rem;
        }

        .info-card-icon {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
        }

        .info-card h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
          margin: 0 0 0.5rem 0;
        }

        .info-card p {
          font-size: 0.8125rem;
          color: var(--gray-600);
          margin: 0;
          line-height: 1.5;
        }

        .info-card.highlight {
          background: linear-gradient(135deg, var(--accent-50), var(--primary-50));
          border-color: var(--accent-200);
        }

        .info-card.highlight .btn {
          margin-top: 0.75rem;
        }

        @media (max-width: 1024px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }

          .info-cards {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .info-card {
            flex: 1;
            min-width: 200px;
          }
        }

        @media (max-width: 640px) {
          .logo-upload-area {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .info-cards {
            flex-direction: column;
          }

          .info-card {
            min-width: auto;
          }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminSettings;