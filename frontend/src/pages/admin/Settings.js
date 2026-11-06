import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI, paymentAPI } from '../../utils/api';
import { useSiteSettings } from '../../components/SiteSettingsProvider';
import AdminLayout from '../../components/AdminLayout';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Pagination from '../../components/Pagination';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Default flat income settings (matching backend defaults).
const DEFAULT_INCOME = {
  qualification_levels_per_direct: 2,
  qualification_max_levels: 10,
  withdrawal_min_amount: 200,
  withdrawal_start_time: '07:00',
  withdrawal_end_time: '10:00',
  withdrawal_timezone: 'Asia/Kolkata',
  withdrawal_admin_charge_percent: 5
};

const DEFAULT_PAYMENT = { razorpayEnabled: true, qrEnabled: false, qrImage: '', upiId: '', payeeName: '' };

// Flatten the nested GET response into the flat keys the form/edit uses.
const flattenIncome = (s) => {
  if (!s) return { ...DEFAULT_INCOME };
  const q = s.qualification || {};
  const w = s.withdrawal || {};
  return {
    qualification_levels_per_direct: q.levelsPerDirect ?? DEFAULT_INCOME.qualification_levels_per_direct,
    qualification_max_levels: q.maxLevels ?? DEFAULT_INCOME.qualification_max_levels,
    withdrawal_min_amount: w.minAmount ?? DEFAULT_INCOME.withdrawal_min_amount,
    withdrawal_start_time: w.startTime ?? DEFAULT_INCOME.withdrawal_start_time,
    withdrawal_end_time: w.endTime ?? DEFAULT_INCOME.withdrawal_end_time,
    withdrawal_timezone: w.timezone ?? DEFAULT_INCOME.withdrawal_timezone,
    withdrawal_admin_charge_percent: w.adminChargePercent ?? DEFAULT_INCOME.withdrawal_admin_charge_percent
  };
};

const AdminSettings = () => {
  const [settings, setSettings] = useState({ ...DEFAULT_INCOME });
  const [siteSettings, setSiteSettings] = useState({
    site_name: 'Blisswell', site_logo: '', site_tagline: 'Premium Bedsheets',
    contact_phone: '+91 98765 43210', contact_email: 'info@blisswell.in',
    contact_address: 'BUSINESS PLAZA, A WING, SHOP NO -409, AADGOAN NAKA PANCHAWATI NASHIK, PIN - 422003, MAHARASHTRA',
    company_state: 'Maharashtra',
    social_facebook: '', social_instagram: '', social_twitter: '', social_linkedin: '', social_youtube: '',
    terms_and_conditions: ''
  });
  const [originalSettings, setOriginalSettings] = useState(null);
  const [originalSiteSettings, setOriginalSiteSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { refreshSettings } = useSiteSettings();

  // Payment methods (saved separately from the income form)
  const [payment, setPayment] = useState({ ...DEFAULT_PAYMENT });
  const [originalPayment, setOriginalPayment] = useState(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);

  // Audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchAuditLogs = async (p = auditPage) => {
    setAuditLoading(true);
    try {
      const res = await adminAPI.getSettingsAuditLogs(p);
      setAuditLogs(res.data.logs || []);
      setAuditTotalPages(res.data.pages || 1);
      setAuditTotal(res.data.total || 0);
    } catch (e) { /* ignore */ } finally { setAuditLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const [settingsRes, siteRes, paymentRes] = await Promise.all([
        adminAPI.getSettings(),
        adminAPI.getSiteSettings(),
        paymentAPI.getPaymentSettings().catch(() => null)
      ]);
      if (paymentRes?.data?.settings) {
        setPayment(paymentRes.data.settings);
        setOriginalPayment(paymentRes.data.settings);
      }
      const flat = flattenIncome(settingsRes.data.settings);
      setSettings(flat);
      setOriginalSettings(flat);
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
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSiteSettingChange = (e) => {
    const { name, value } = e.target;
    setSiteSettings({ ...siteSettings, [name]: value });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) { toast.error('Only image files are allowed (JPEG, PNG, GIF, WebP, SVG)'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo size must be less than 2MB'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await adminAPI.uploadLogoImage(formData);
      setSiteSettings(prev => ({ ...prev, site_logo: response.data.logo_url }));
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => setSiteSettings(prev => ({ ...prev, site_logo: '' }));

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('QR image must be JPG, PNG or WEBP'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('QR image must be less than 2MB'); return; }
    setQrUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await paymentAPI.uploadPaymentQr(formData);
      setPayment(prev => ({ ...prev, qrImage: res.data.image_url }));
      toast.success('QR uploaded — click Save Payment Settings to apply');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload QR image');
    } finally {
      setQrUploading(false);
    }
  };

  const savePayment = async () => {
    if (payment.qrEnabled && !payment.qrImage) {
      toast.error('Upload a QR code image before enabling QR payment');
      return;
    }
    setPaymentSaving(true);
    try {
      const res = await paymentAPI.updatePaymentSettings(payment);
      setPayment(res.data.settings);
      setOriginalPayment(res.data.settings);
      toast.success('Payment settings saved');
      fetchAuditLogs(1);
      setAuditPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save payment settings');
    } finally {
      setPaymentSaving(false);
    }
  };

  const paymentChanged = originalPayment && JSON.stringify(payment) !== JSON.stringify(originalPayment);

  const handleSubmit = (e) => {
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
      fetchAuditLogs(1);
      setAuditPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
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
        <div className="admin-settings-page"><LoadingSkeleton variant="card" /></div>
      </AdminLayout>
    );
  }

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <AdminLayout>
      <div className="admin-settings-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">System Settings</h1>
            <p className="page-subtitle">Configure application-wide settings</p>
          </div>
        </div>

        <div className="settings-grid">
          <div className="settings-main">
            {/* Income Settings */}
            <div className="card animate-fade-in">
              <div className="card-header">
                <h3 className="card-title">💰 Income System</h3>
              </div>
              <form onSubmit={handleSubmit}>
                {/* Team Income */}
                <div className="setting-section">
                  <h4 className="setting-section-title">👥 Team Income</h4>
                  <div className="setting-hint">
                    Level income is configured on the <strong>Star package</strong> (the only purchasable product) — set the
                    L1–L10 amounts on it in <strong>Products</strong>. All other products are display-only repurchase products.
                  </div>
                </div>

                {/* Qualification */}
                <div className="setting-section">
                  <h4 className="setting-section-title">🎯 Team Income Depth</h4>
                  <div className="setting-hint">
                    Every active-package upline earns from every downline level, with no qualified-directs requirement — the only condition to earn is having an active package yourself.
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Max Levels</label>
                      <input type="number" name="qualification_max_levels" className="form-input" value={settings.qualification_max_levels} onChange={handleChange} min="1" max="10" />
                      <span className="form-hint">Levels that pay team income (1–10). Users also see their team (My Network) only up to this level.</span>
                    </div>
                  </div>
                </div>

                {/* Withdrawal Split */}
                <div className="setting-section">
                  <h4 className="setting-section-title">✂️ Withdrawal Split</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Admin Charge (%)</label>
                      <input type="number" name="withdrawal_admin_charge_percent" className="form-input" value={settings.withdrawal_admin_charge_percent} onChange={handleChange} min="0" max="100" step="0.01" />
                      <span className="form-hint">Deducted from every processed withdrawal</span>
                    </div>
                  </div>
                  <div className="setting-hint">
                    Payout to user = {100 - settings.withdrawal_admin_charge_percent}% (admin charge {settings.withdrawal_admin_charge_percent}%).
                    Example: {fmt(1000)} → admin {fmt(settings.withdrawal_admin_charge_percent * 10)}, user receives {fmt(1000 - settings.withdrawal_admin_charge_percent * 10)}.
                  </div>
                </div>

                {/* Withdrawal */}
                <div className="setting-section">
                  <h4 className="setting-section-title">🏧 Withdrawal</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Minimum Amount (₹)</label>
                      <input type="number" name="withdrawal_min_amount" className="form-input" value={settings.withdrawal_min_amount} onChange={handleChange} min="0" step="0.01" />
                      <span className="form-hint">Minimum withdrawable earnings balance</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Timezone</label>
                      <select name="withdrawal_timezone" className="form-input" value={settings.withdrawal_timezone} onChange={handleChange}>
                        <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                        <option value="UTC">UTC</option>
                      </select>
                      <span className="form-hint">Server timezone for the withdrawal window</span>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Window Start (HH:MM)</label>
                      <input type="time" name="withdrawal_start_time" className="form-input" value={settings.withdrawal_start_time} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Window End (HH:MM)</label>
                      <input type="time" name="withdrawal_end_time" className="form-input" value={settings.withdrawal_end_time} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="setting-hint">
                    Users can request withdrawals on <strong>Fridays only</strong>, between <strong>{settings.withdrawal_start_time}</strong> and <strong>{settings.withdrawal_end_time}</strong> ({settings.withdrawal_timezone}).
                  </div>
                </div>

                {/* Repurchase */}
                <div className="setting-section">
                  <div className="setting-hint">
                    <strong>One-time purchase rule:</strong> every user buys the Star package once — second purchases
                    are blocked. Repurchase products are display-only until repurchase launches.
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving || !hasChanges}>
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                  {hasChanges && (
                    <button type="button" className="btn btn-ghost"
                      onClick={() => { setSettings(originalSettings); setSiteSettings(originalSiteSettings); }}>
                      Reset Changes
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Payment Methods */}
            <div className="card animate-fade-in" style={{ animationDelay: '0.03s' }}>
              <div className="card-header"><h3 className="card-title">💳 Payment Methods</h3></div>
              <div className="setting-section">
                <div className="setting-hint">
                  Turn on one or both. When both are on, the user chooses how to pay. QR payments create the order only after
                  you approve them in <strong>Payment Requests</strong>.
                </div>
                <div className="form-group">
                  <label className="toggle-label">
                    <div className="toggle-wrapper">
                      <input type="checkbox" checked={!!payment.razorpayEnabled} onChange={(e) => setPayment(prev => ({ ...prev, razorpayEnabled: e.target.checked }))} className="toggle-input" />
                      <span className="toggle-slider"></span>
                    </div>
                    <div className="toggle-content">
                      <span className="toggle-title">Razorpay (online payment)</span>
                      <span className="toggle-desc">Card / UPI / Netbanking checkout — order confirmed instantly</span>
                    </div>
                  </label>
                </div>
                <div className="form-group">
                  <label className="toggle-label">
                    <div className="toggle-wrapper">
                      <input type="checkbox" checked={!!payment.qrEnabled} onChange={(e) => setPayment(prev => ({ ...prev, qrEnabled: e.target.checked }))} className="toggle-input" />
                      <span className="toggle-slider"></span>
                    </div>
                    <div className="toggle-content">
                      <span className="toggle-title">QR / UPI (manual approval)</span>
                      <span className="toggle-desc">User scans your QR, uploads the screenshot + transaction ID, and you approve it</span>
                    </div>
                  </label>
                </div>
                {!payment.razorpayEnabled && !payment.qrEnabled && (
                  <div className="setting-hint payment-off-warning">⚠️ Both methods are off — users cannot purchase.</div>
                )}

                <div className="qr-settings">
                  <div className="qr-settings-preview">
                    {payment.qrImage ? (
                      <img src={getLogoUrl(payment.qrImage)} alt="Payment QR code" />
                    ) : (
                      <span>No QR uploaded</span>
                    )}
                  </div>
                  <div className="qr-settings-fields">
                    <label className="btn btn-secondary btn-sm qr-upload-btn">
                      {qrUploading ? 'Uploading...' : payment.qrImage ? 'Replace QR Image' : 'Upload QR Image'}
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleQrUpload} disabled={qrUploading} hidden />
                    </label>
                    <div className="form-group">
                      <label className="form-label">UPI ID</label>
                      <input type="text" className="form-input" value={payment.upiId} onChange={(e) => setPayment(prev => ({ ...prev, upiId: e.target.value }))} placeholder="e.g. blisswell@okaxis" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payee Name</label>
                      <input type="text" className="form-input" value={payment.payeeName} onChange={(e) => setPayment(prev => ({ ...prev, payeeName: e.target.value }))} placeholder="e.g. Blisswell Enterprises" />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-primary" onClick={savePayment} disabled={paymentSaving || !paymentChanged}>
                    {paymentSaving ? 'Saving...' : 'Save Payment Settings'}
                  </button>
                  {paymentChanged && (
                    <button type="button" className="btn btn-ghost" onClick={() => setPayment(originalPayment)}>Reset</button>
                  )}
                </div>
              </div>
            </div>

            {/* Site Branding */}
            <div className="card animate-fade-in" style={{ animationDelay: '0.05s' }}>
              <div className="card-header"><h3 className="card-title">🎨 Site Branding</h3></div>
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
                      <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} style={{ display: 'none' }} />
                    </label>
                    <p className="upload-hint">PNG, JPG, SVG, WebP (max 2MB)</p>
                    <p className="upload-hint">Recommended: Square or horizontal logo</p>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Site Name</label>
                    <input type="text" name="site_name" className="form-input" value={siteSettings.site_name} onChange={handleSiteSettingChange} placeholder="Enter site name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tagline</label>
                    <input type="text" name="site_tagline" className="form-input" value={siteSettings.site_tagline} onChange={handleSiteSettingChange} placeholder="Enter tagline" />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Settings */}
            <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="card-header"><h3 className="card-title">📞 Contact Information</h3></div>
              <div className="contact-section">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" name="contact_phone" className="form-input" value={siteSettings.contact_phone} onChange={handleSiteSettingChange} placeholder="+91 98765 43210" />
                    <span className="form-hint">Primary contact phone number</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" name="contact_email" className="form-input" value={siteSettings.contact_email} onChange={handleSiteSettingChange} placeholder="support@example.com" />
                    <span className="form-hint">Primary contact email</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Business Address</label>
                  <textarea name="contact_address" className="form-input form-textarea" value={siteSettings.contact_address} onChange={handleSiteSettingChange} placeholder="Enter complete business address" rows="2" />
                  <span className="form-hint">Complete business address displayed in footer and contact page</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Company State (for GST)</label>
                  <select name="company_state" className="form-input" value={siteSettings.company_state || 'Maharashtra'} onChange={handleSiteSettingChange}>
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
            <div className="card animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <div className="card-header"><h3 className="card-title">🔗 Social Media Links</h3></div>
              <div className="social-section">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label"><span className="social-icon facebook">📘</span> Facebook</label>
                    <input type="url" name="social_facebook" className="form-input" value={siteSettings.social_facebook} onChange={handleSiteSettingChange} placeholder="https://facebook.com/yourpage" />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><span className="social-icon instagram">📷</span> Instagram</label>
                    <input type="url" name="social_instagram" className="form-input" value={siteSettings.social_instagram} onChange={handleSiteSettingChange} placeholder="https://instagram.com/yourprofile" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label"><span className="social-icon twitter">🐦</span> Twitter</label>
                    <input type="url" name="social_twitter" className="form-input" value={siteSettings.social_twitter} onChange={handleSiteSettingChange} placeholder="https://twitter.com/yourprofile" />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><span className="social-icon linkedin">💼</span> LinkedIn</label>
                    <input type="url" name="social_linkedin" className="form-input" value={siteSettings.social_linkedin} onChange={handleSiteSettingChange} placeholder="https://linkedin.com/company/yourcompany" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label"><span className="social-icon youtube">📺</span> YouTube</label>
                  <input type="url" name="social_youtube" className="form-input" value={siteSettings.social_youtube} onChange={handleSiteSettingChange} placeholder="https://youtube.com/@yourchannel" />
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="card-header"><h3 className="card-title">📜 Terms and Conditions</h3></div>
              <div className="terms-section">
                <div className="form-group">
                  <label className="form-label">Registration Terms & Conditions</label>
                  <textarea name="terms_and_conditions" className="form-input form-textarea-large" value={siteSettings.terms_and_conditions} onChange={handleSiteSettingChange} placeholder="Enter the terms and conditions that users must accept during registration..." rows="8" />
                  <span className="form-hint">These terms will be shown to users during registration. They must accept these terms to create an account.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards + Audit Log */}
          <div className="info-cards">
            <div className="card info-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="info-card-icon">👥</div>
              <h4>Team Income</h4>
              <p>Per-rank tables (8 levels each) — configure on each product. Upline earns by the <strong>purchaser's</strong> rank table across all 8 levels, as long as the upline's own package is active.</p>
            </div>

            <div className="card info-card highlight animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="info-card-icon">🏧</div>
              <h4>Withdrawal Window</h4>
              <p>Min <strong>{fmt(settings.withdrawal_min_amount)}</strong>. Requests accepted <strong>Fridays, {settings.withdrawal_start_time}–{settings.withdrawal_end_time}</strong> ({settings.withdrawal_timezone}).</p>
            </div>

            <div className="card info-card animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <div className="info-card-icon">✂️</div>
              <h4>Withdrawal Split</h4>
              <p>Admin charge <strong>{settings.withdrawal_admin_charge_percent}%</strong>, payout <strong>{100 - settings.withdrawal_admin_charge_percent}%</strong>.</p>
            </div>

            <div className="card info-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="info-card-icon">💳</div>
              <h4>Payment Methods</h4>
              <p>
                Razorpay <strong>{originalPayment?.razorpayEnabled ? 'ON' : 'OFF'}</strong> · QR <strong>{originalPayment?.qrEnabled ? 'ON' : 'OFF'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Settings Audit Log */}
        <div className="card audit-log-card animate-fade-in" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h3 className="card-title">🧾 Settings Audit Log</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => fetchAuditLogs(auditPage)} disabled={auditLoading}>Refresh</button>
          </div>
          <div className="table-container">
            {auditLoading ? (
              <p className="text-muted">Loading…</p>
            ) : auditLogs.length > 0 ? (
              <table className="table">
                <thead>
                  <tr><th>When</th><th>Admin</th><th>Setting</th><th>Old Value</th><th>New Value</th><th>IP</th></tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="text-muted datetime-cell">{formatDateTime(log.created_at)}</td>
                      <td><div className="user-cell"><span className="user-name">{log.admin_name || '—'}</span><span className="user-email">{log.admin_email || ''}</span></div></td>
                      <td className="font-mono">{log.setting_key}</td>
                      <td className="text-muted">{log.previous_value ?? '—'}</td>
                      <td className="text-primary font-semibold">{log.new_value ?? '—'}</td>
                      <td className="text-muted text-sm">{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted">No setting changes recorded yet.</p>
            )}
          </div>
          <Pagination page={auditPage} totalPages={auditTotalPages} total={auditTotal} onChange={(p) => { setAuditPage(p); fetchAuditLogs(p); }} />
        </div>
      </div>

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
        .admin-settings-page { max-width: 1100px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .settings-grid { display: grid; grid-template-columns: 1fr 300px; gap: 1.5rem; }
        .settings-main { display: flex; flex-direction: column; gap: 1.5rem; }

        .setting-section { padding: 1rem 0; border-top: 1px solid var(--gray-100); }
        .setting-section:first-child { border-top: none; padding-top: 0; }
        .payment-off-warning { background: #fef3c7; color: #92400e; }
        .qr-settings { display: flex; gap: 1.25rem; flex-wrap: wrap; margin: 1rem 0; }
        .qr-settings-preview {
          width: 160px; height: 160px; flex-shrink: 0;
          border: 1px dashed var(--gray-300, #d1d5db); border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: #fff; overflow: hidden; font-size: 0.8rem; color: var(--gray-500, #6b7280);
        }
        .qr-settings-preview img { width: 100%; height: 100%; object-fit: contain; }
        .qr-settings-fields { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 0.5rem; }
        .qr-upload-btn { align-self: flex-start; cursor: pointer; }
        .setting-section-title { font-size: 0.95rem; font-weight: 600; color: var(--gray-900); margin: 0 0 0.75rem; }
        .toggle-block { margin-bottom: 0.75rem; }
        .setting-hint { font-size: 0.8125rem; color: var(--gray-600); background: var(--gray-50); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); margin-top: 0.5rem; }
        .levels-inputs { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 0.75rem; }

        .branding-section { padding: 0.5rem 0; }
        .logo-upload-area { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--gray-100); }
        .logo-preview { width: 120px; height: 120px; border-radius: var(--radius-xl); overflow: hidden; border: 2px dashed var(--gray-200); display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; background: var(--gray-50); }
        .logo-preview img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }
        .remove-logo { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; background: rgba(239, 68, 68, 0.9); color: white; border: none; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; }
        .logo-preview:hover .remove-logo { opacity: 1; }
        .logo-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: var(--gray-400); }
        .placeholder-icon { font-size: 2rem; }
        .placeholder-text { font-size: 0.75rem; }
        .logo-upload-actions { display: flex; flex-direction: column; justify-content: center; gap: 0.5rem; }
        .upload-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.25rem; background: var(--primary-50); color: var(--primary-700); border: 1px solid var(--primary-200); border-radius: var(--radius-lg); font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .upload-btn:hover { background: var(--primary-100); border-color: var(--primary-300); }
        .upload-hint { font-size: 0.75rem; color: var(--gray-500); margin: 0; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .form-hint { display: block; font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem; }
        .form-textarea { resize: vertical; min-height: 60px; }
        .form-textarea-large { min-height: 200px; font-size: 0.875rem; line-height: 1.6; }
        .social-icon { margin-right: 0.5rem; }
        .contact-section, .social-section, .terms-section { padding: 0.5rem 0; }

        .toggle-label { display: flex; align-items: flex-start; gap: 1rem; cursor: pointer; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-lg); transition: background 0.2s; }
        .toggle-label:hover { background: var(--gray-100); }
        .toggle-wrapper { position: relative; width: 48px; height: 26px; flex-shrink: 0; }
        .toggle-input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--gray-300); transition: 0.3s; border-radius: 26px; }
        .toggle-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; border-radius: 50%; box-shadow: var(--shadow-sm); }
        .toggle-input:checked + .toggle-slider { background-color: var(--accent-500); }
        .toggle-input:checked + .toggle-slider:before { transform: translateX(22px); }
        .toggle-content { flex: 1; }
        .toggle-title { display: block; font-weight: 600; color: var(--gray-900); margin-bottom: 0.25rem; }
        .toggle-desc { display: block; font-size: 0.8125rem; color: var(--gray-500); }
        .form-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--gray-200); }

        .info-cards { display: flex; flex-direction: column; gap: 1rem; }
        .info-card { padding: 1.25rem; }
        .info-card-icon { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .info-card h4 { font-size: 0.875rem; font-weight: 600; color: var(--gray-900); margin: 0 0 0.5rem 0; }
        .info-card p { font-size: 0.8125rem; color: var(--gray-600); margin: 0; line-height: 1.5; }
        .info-card.highlight { background: linear-gradient(135deg, var(--accent-50), var(--primary-50)); border-color: var(--accent-200); }

        .audit-log-card { max-width: 100%; }
        .audit-log-card .card-header { display: flex; justify-content: space-between; align-items: center; }
        .user-cell { display: flex; flex-direction: column; }
        .user-name { font-weight: 500; color: #1f2937; }
        .user-email { font-size: 0.75rem; color: #6b7280; }
        .font-mono { font-family: monospace; }
        .datetime-cell { font-size: 0.8125rem; white-space: nowrap; }
        .text-muted { color: #6b7280; }
        .text-primary { color: #4f46e5; }
        .text-sm { font-size: 0.75rem; }
        .font-semibold { font-weight: 600; }

        @media (max-width: 1024px) {
          .settings-grid { grid-template-columns: 1fr; }
          .info-cards { flex-direction: row; flex-wrap: wrap; }
          .info-card { flex: 1; min-width: 200px; }
        }
        @media (max-width: 640px) {
          .logo-upload-area { flex-direction: column; align-items: center; text-align: center; }
          .form-row { grid-template-columns: 1fr; }
          .info-cards { flex-direction: column; }
          .info-card { min-width: auto; }
        }
      `}</style>
    </AdminLayout>
  );
};

export default AdminSettings;