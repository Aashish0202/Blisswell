import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import DashboardLayout from '../../components/DashboardLayout';
import { useSiteSettings } from '../../components/SiteSettingsProvider';
import { userAPI } from '../../utils/api';
import html2pdf from 'html2pdf.js';

const IdCard = () => {
  const { user } = useSelector((state) => state.auth);
  const { siteName, siteLogo, siteTagline } = useSiteSettings();
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userAPI.getProfile();
        if (response.data.user?.profile_image) {
          setProfileImage(response.data.user.profile_image);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, []);

  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) return siteLogo;
      // Use API URL from environment
      const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      return `${baseUrl}${siteLogo}`;
    }
    return null;
  };

  const getProfileImageUrl = () => {
    if (profileImage) {
      if (profileImage.startsWith('http')) return profileImage;
      // Use API URL from environment
      const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      return `${baseUrl}${profileImage}`;
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://blisswell.in&bgcolor=ffffff`;

  const downloadAsImage = async () => {
    setDownloading(true);
    try {
      const element = cardRef.current;
      const opt = {
        margin: 0,
        filename: `${siteName || 'Blisswell'}_ID_Card_${user?.referral_code || 'user'}.png`,
        image: { type: 'png', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', allowTaint: true },
        jsPDF: { enabled: false }
      };
      const canvas = await html2pdf().set(opt).from(element).toCanvas().outputImg();
      const link = document.createElement('a');
      link.download = `${siteName || 'Blisswell'}_ID_Card_${user?.referral_code || 'user'}.png`;
      link.href = canvas.src;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsPDF = async () => {
    setDownloading(true);
    try {
      const element = cardRef.current;
      const opt = {
        margin: 0,
        filename: `${siteName || 'Blisswell'}_ID_Card_${user?.referral_code || 'user'}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', allowTaint: true },
        jsPDF: { unit: 'mm', format: [200, 120], orientation: 'landscape' }
      };
      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const logoUrl = getLogoUrl();
  const profileUrl = getProfileImageUrl();

  return (
    <DashboardLayout>
      <div className="id-card-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">My ID Card</h1>
            <p className="page-subtitle">View and download your digital ID card</p>
          </div>
        </div>

        {/* Mobile Card Info - Shows user details prominently on mobile */}
        <div className="mobile-info-section">
          <div className="mobile-info-header">
            <div className="mobile-avatar">
              {profileUrl ? (
                <img src={profileUrl} alt="Profile" onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <div className="mobile-info-name">
              <h2>{user?.name || 'User'}</h2>
              <span className={`mobile-status ${user?.has_active_package ? 'active' : 'inactive'}`}>
                {user?.has_active_package ? 'Active Member' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="mobile-info-grid">
            <div className="mobile-info-item">
              <span className="mobile-label">ID Number</span>
              <span className="mobile-value highlight">{user?.referral_code || 'N/A'}</span>
            </div>
            <div className="mobile-info-item">
              <span className="mobile-label">Mobile</span>
              <span className="mobile-value">{user?.mobile || 'N/A'}</span>
            </div>
            <div className="mobile-info-item">
              <span className="mobile-label">Email</span>
              <span className="mobile-value">{user?.email || 'N/A'}</span>
            </div>
            <div className="mobile-info-item">
              <span className="mobile-label">Member Since</span>
              <span className="mobile-value">{formatDate(user?.created_at)}</span>
            </div>
            <div className="mobile-info-item">
              <span className="mobile-label">Valid Until</span>
              <span className="mobile-value">Lifetime</span>
            </div>
          </div>
        </div>

        <div className="card-preview-container">
          <div className="card-wrapper" ref={cardRef}>
            {/* Front Card */}
            <div className="id-card front-card">
              <div className="card-header">
                <div className="logo-section">
                  <div className="logo-wrapper">
                    {logoUrl ? (
                      <img src={logoUrl} alt={siteName} className="card-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : null}
                    <div className="logo-placeholder" style={{ display: logoUrl ? 'none' : 'flex' }}>
                      <span>{siteName?.charAt(0) || 'B'}</span>
                    </div>
                  </div>
                  <div className="brand-info">
                    <h2 className="brand-name">{siteName || 'Blisswell'}</h2>
                    <p className="brand-tagline">{siteTagline || 'Premium Bed Sheets'}</p>
                  </div>
                </div>
                <div className="card-badge">MEMBER</div>
              </div>

              <div className="card-body">
                <div className="photo-section">
                  <div className="photo-circle">
                    {profileUrl ? (
                      <img src={profileUrl} alt="Profile" className="photo-image" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span className="photo-initial">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div className="photo-label">Photo</div>
                </div>

                <div className="details-section">
                  <div className="detail-row name-row">
                    <span className="detail-value name">{user?.name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">ID No:</span>
                    <span className="detail-value">{user?.referral_code || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Mobile:</span>
                    <span className="detail-value">{user?.mobile || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value email-value">{user?.email || 'N/A'}</span>
                  </div>
                </div>

                <div className="qr-section">
                  <img src={qrCodeUrl} alt="QR Code" className="qr-image" />
                  <span className="qr-label">blisswell.in</span>
                </div>
              </div>

              <div className="status-section">
                <span className={`status-badge ${user?.has_active_package ? 'active' : 'inactive'}`}>
                  {user?.has_active_package ? 'Active Member' : 'Inactive'}
                </span>
              </div>

              <div className="card-footer">
                <div className="footer-item">
                  <span className="footer-label">Member Since</span>
                  <span className="footer-value">{formatDate(user?.created_at)}</span>
                </div>
                <div className="footer-divider"></div>
                <div className="footer-item">
                  <span className="footer-label">Valid Until</span>
                  <span className="footer-value">Lifetime</span>
                </div>
              </div>
            </div>

            {/* Back Card */}
            <div className="id-card back-card">
              <div className="back-header">
                <div className="logo-section-center">
                  <div className="logo-wrapper-small">
                    {logoUrl ? (
                      <img src={logoUrl} alt={siteName} className="back-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : null}
                    <div className="logo-placeholder-back" style={{ display: logoUrl ? 'none' : 'flex' }}>
                      <span>{siteName?.charAt(0) || 'B'}</span>
                    </div>
                  </div>
                  <h3>{siteName || 'Blisswell'}</h3>
                </div>
                <p className="terms-title">Terms & Conditions</p>
              </div>

              <div className="back-content">
                <ul className="terms-list">
                  <li>This ID card is property of {siteName || 'Blisswell'}.</li>
                  <li>If found, please return to the address mentioned below.</li>
                  <li>This card is non-transferable and for personal use only.</li>
                  <li>Valid for authorized purchases under the membership scheme.</li>
                  <li>Subject to all terms and conditions of the company.</li>
                </ul>
              </div>

              <div className="back-footer">
                <div className="contact-info">
                  <p><strong>Website:</strong> www.blisswell.in</p>
                  <p><strong>Email:</strong> support@blisswell.in</p>
                </div>
                <div className="back-qr">
                  <img src={qrCodeUrl} alt="QR Code" className="back-qr-image" />
                </div>
              </div>
            </div>
          </div>

          <div className="download-actions">
            <button className="btn btn-primary" onClick={downloadAsImage} disabled={downloading}>
              {downloading ? 'Processing...' : 'Download as Image (PNG)'}
            </button>
            <button className="btn btn-secondary" onClick={downloadAsPDF} disabled={downloading}>
              {downloading ? 'Processing...' : 'Download as PDF'}
            </button>
          </div>
        </div>

        <div className="instructions-card">
          <h3>Instructions</h3>
          <ul>
            <li>Your ID Card contains your unique referral code which can be used for sharing.</li>
            <li>Download your ID card as an image (PNG) or PDF format.</li>
            <li>Share your ID card digitally for verification purposes.</li>
            <li>Keep your ID card safe and do not share with unauthorized persons.</li>
          </ul>
        </div>
      </div>

      <style>{`
        .id-card-page {
          max-width: 100%;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 1.5rem;
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--gray-900, #1f2937);
          margin-bottom: 0.25rem;
        }

        .page-subtitle {
          color: var(--gray-500, #6b7280);
          font-size: 0.875rem;
          margin: 0;
        }

        /* Mobile Info Section - Hidden on desktop */
        .mobile-info-section {
          display: none;
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }

        .mobile-info-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .mobile-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1F4D4A, #3d8b7a);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .mobile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .mobile-avatar span {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .mobile-info-name h2 {
          margin: 0 0 0.25rem 0;
          font-size: 1.25rem;
          color: #1f2937;
        }

        .mobile-status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .mobile-status.active {
          background: rgba(34, 197, 94, 0.15);
          color: #059669;
        }

        .mobile-status.inactive {
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
        }

        .mobile-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }

        .mobile-info-item {
          background: #f9fafb;
          padding: 0.75rem;
          border-radius: 8px;
        }

        .mobile-label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }

        .mobile-value {
          display: block;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1f2937;
          word-break: break-word;
        }

        .mobile-value.highlight {
          color: #1F4D4A;
        }

        /* Card Preview Container */
        .card-preview-container {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
          overflow-x: auto;
        }

        .card-wrapper {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        /* ID Card Styles */
        .id-card {
          width: 340px;
          height: 215px;
          border-radius: 12px;
          overflow: hidden;
          font-family: 'Segoe UI', Arial, sans-serif;
          position: relative;
          flex-shrink: 0;
        }

        /* Front Card */
        .front-card {
          background: linear-gradient(145deg, #1F4D4A 0%, #2d6a5e 50%, #3d8b7a 100%);
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-wrapper {
          position: relative;
          width: 40px;
          height: 40px;
        }

        .card-logo {
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: white;
          padding: 3px;
          object-fit: contain;
          position: absolute;
          top: 0;
          left: 0;
        }

        .logo-placeholder {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1F4D4A;
        }

        .brand-info {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          color: white;
          font-size: 0.9rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
        }

        .brand-tagline {
          color: rgba(255,255,255,0.75);
          font-size: 0.6rem;
          margin: 0;
          line-height: 1.2;
        }

        .card-badge {
          background: rgba(170, 140, 74, 0.3);
          color: #F1D187;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.55rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid rgba(170, 140, 74, 0.5);
        }

        .card-body {
          display: flex;
          gap: 12px;
          flex: 1;
          align-items: flex-start;
        }

        .photo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }

        .photo-circle {
          width: 60px;
          height: 60px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border: 2px solid rgba(170, 140, 74, 0.4);
          overflow: hidden;
        }

        .photo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-initial {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1F4D4A;
        }

        .photo-label {
          font-size: 0.45rem;
          color: rgba(255,255,255,0.6);
          text-transform: uppercase;
        }

        .details-section {
          flex: 1;
          min-width: 0;
        }

        .detail-row {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 3px;
        }

        .name-row {
          margin-bottom: 5px;
        }

        .detail-label {
          color: rgba(255,255,255,0.7);
          font-size: 0.55rem;
          font-weight: 500;
          min-width: 38px;
          flex-shrink: 0;
        }

        .detail-value {
          color: white;
          font-size: 0.65rem;
          font-weight: 500;
          word-break: break-word;
        }

        .detail-value.name {
          font-size: 0.85rem;
          font-weight: 700;
        }

        .email-value {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 85px;
        }

        .qr-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .qr-image {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          background: white;
          padding: 2px;
        }

        .qr-label {
          font-size: 0.45rem;
          color: rgba(255,255,255,0.8);
        }

        .status-section {
          margin: 6px 0;
        }

        .status-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.5rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: rgba(34, 197, 94, 0.25);
          color: #4ade80;
          border: 1px solid rgba(34, 197, 94, 0.4);
        }

        .status-badge.inactive {
          background: rgba(239, 68, 68, 0.25);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .card-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.12);
          padding: 6px 10px;
          border-radius: 6px;
          margin-top: auto;
        }

        .footer-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .footer-label {
          color: rgba(255,255,255,0.6);
          font-size: 0.45rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .footer-value {
          color: white;
          font-size: 0.6rem;
          font-weight: 600;
        }

        .footer-divider {
          width: 1px;
          height: 24px;
          background: rgba(255,255,255,0.25);
        }

        /* Back Card */
        .back-card {
          background: linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
        }

        .back-header {
          text-align: center;
          padding-bottom: 6px;
          margin-bottom: 4px;
          border-bottom: 1px solid rgba(31, 77, 74, 0.15);
        }

        .logo-section-center {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-bottom: 2px;
        }

        .logo-wrapper-small {
          width: 22px;
          height: 22px;
          position: relative;
        }

        .back-logo {
          width: 22px;
          height: 22px;
          border-radius: 4px;
          object-fit: contain;
          background: white;
          padding: 2px;
        }

        .logo-placeholder-back {
          width: 22px;
          height: 22px;
          background: linear-gradient(145deg, #1F4D4A, #3d8b7a);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 0.7rem;
        }

        .back-header h3 {
          color: #1F4D4A;
          font-size: 0.75rem;
          font-weight: 700;
          margin: 0;
        }

        .terms-title {
          color: #64748b;
          font-size: 0.45rem;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .back-content {
          flex: 1;
        }

        .terms-list {
          margin: 0;
          padding-left: 12px;
          color: #475569;
          font-size: 0.45rem;
          line-height: 1.4;
        }

        .terms-list li {
          margin-bottom: 1px;
        }

        .back-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 6px;
          border-top: 1px solid rgba(31, 77, 74, 0.15);
          margin-top: auto;
        }

        .contact-info p {
          margin: 0;
          font-size: 0.45rem;
          color: #64748b;
          line-height: 1.3;
        }

        .contact-info strong {
          color: #334155;
        }

        .back-qr {
          display: flex;
          align-items: center;
        }

        .back-qr-image {
          width: 32px;
          height: 32px;
          border-radius: 3px;
        }

        /* Download Buttons */
        .download-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-width: 180px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #1F4D4A 0%, #3d8b7a 100%);
          color: white;
        }

        .btn-primary:hover {
          box-shadow: 0 4px 12px rgba(31, 77, 74, 0.4);
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: white;
          color: #1F4D4A;
          border: 2px solid #1F4D4A;
        }

        .btn-secondary:hover {
          background: #1F4D4A;
          color: white;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Instructions Card */
        .instructions-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid #e5e7eb;
        }

        .instructions-card h3 {
          color: #1f2937;
          font-size: 1rem;
          margin: 0 0 0.75rem 0;
        }

        .instructions-card ul {
          margin: 0;
          padding-left: 1.25rem;
          color: #4b5563;
          font-size: 0.875rem;
          line-height: 1.7;
        }

        .instructions-card li {
          margin-bottom: 0.25rem;
        }

        /* Tablet Responsive */
        @media (max-width: 768px) {
          .card-wrapper {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }

          .id-card {
            width: 100%;
            max-width: 340px;
          }

          .download-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }

          .card-preview-container {
            padding: 1rem;
          }
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .page-header {
            margin-bottom: 1rem;
          }

          .page-title {
            font-size: 1.25rem;
          }

          /* Show mobile info section */
          .mobile-info-section {
            display: block;
          }

          .card-preview-container {
            padding: 0.75rem;
            border-radius: 12px;
            margin-bottom: 1rem;
          }

          .id-card {
            transform: scale(0.9);
            transform-origin: top center;
          }

          .download-actions {
            margin-top: 0.5rem;
          }

          .btn {
            padding: 0.6rem 1rem;
            font-size: 0.8rem;
            min-width: auto;
          }

          .instructions-card {
            padding: 1rem;
          }

          .instructions-card h3 {
            font-size: 0.9rem;
          }

          .instructions-card ul {
            font-size: 0.8rem;
          }
        }

        /* Extra small screens */
        @media (max-width: 360px) {
          .id-card {
            transform: scale(0.8);
          }

          .mobile-info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default IdCard;