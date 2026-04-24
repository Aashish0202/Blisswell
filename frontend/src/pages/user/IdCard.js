import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import DashboardLayout from '../../components/DashboardLayout';
import { useSiteSettings } from '../../components/SiteSettingsProvider';
import { userAPI } from '../../utils/api';
import html2pdf from 'html2pdf.js';

// Get base URL for images
const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace('/api', '');
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return 'https://admin.blisswell.in';
};

const BASE_URL = getBaseUrl();

const IdCard = () => {
  const { user } = useSelector((state) => state.auth);
  const { siteName, siteLogo, siteTagline } = useSiteSettings();
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  // Base64 versions of images for PDF generation
  const [logoBase64, setLogoBase64] = useState(null);
  const [profileBase64, setProfileBase64] = useState(null);
  const [qrBase64, setQrBase64] = useState(null);
  const [loadingImages, setLoadingImages] = useState(true);

  // ========== Convert image URL to base64 using Canvas (Frontend-only) ==========
  const convertImageToBase64 = useCallback(async (imagePath) => {
    if (!imagePath) {
      console.log('No image path provided');
      return null;
    }

    // If already base64, return as is
    if (imagePath.startsWith('data:')) {
      return imagePath;
    }

    // Extract path from URL if it's a full URL
    let imageUrl = imagePath;
    if (imagePath.startsWith('http')) {
      // If running locally but image URL is production, try to use local instead
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal && imagePath.includes('admin.blisswell.in')) {
        // Convert production URL to local path, then to local URL
        const url = new URL(imagePath);
        imageUrl = `${BASE_URL}${url.pathname}`;
        console.log('Converted production URL to local:', imageUrl);
      } else {
        // Use the URL as is
        imageUrl = imagePath;
      }
    } else {
      // It's a path, construct full URL
      imageUrl = `${BASE_URL}${imagePath}`;
    }

    console.log('Converting image to base64:', imageUrl);

    // Try multiple methods to get the image
    const methods = [
      // Method 1: Direct fetch with CORS
      async () => {
        const response = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        return blobToBase64(blob);
      },
      // Method 2: Canvas approach with crossOrigin
      async () => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
              resolve(dataUrl);
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error('Canvas crossOrigin failed'));
          // Add cache-busting param
          img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
        });
      },
      // Method 3: Canvas without crossOrigin
      async () => {
        return new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.95));
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = () => reject(new Error('Canvas no-cors failed'));
          img.src = imageUrl;
        });
      }
    ];

    // Try each method
    for (let i = 0; i < methods.length; i++) {
      try {
        const result = await methods[i]();
        console.log(`Method ${i + 1} succeeded, base64 length:`, result?.length);
        return result;
      } catch (err) {
        console.log(`Method ${i + 1} failed:`, err.message);
      }
    }

    console.error('All methods failed for image:', imageUrl);
    return null;
  }, []);

  // Helper: Convert Blob to Base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // ========== Fetch QR code from external API ==========
  const fetchQRCode = useCallback(async () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://blisswell.in&bgcolor=ffffff`;
    console.log('Fetching QR code...');

    try {
      const response = await fetch(qrUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('QR fetch failed');
      const blob = await response.blob();
      return blobToBase64(blob);
    } catch (err) {
      console.error('QR fetch error:', err);
      return null;
    }
  }, []);

  // ========== Fetch user profile ==========
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userAPI.getProfile();
        console.log('Profile response:', response.data);
        if (response.data.user?.profile_image) {
          console.log('Profile image path:', response.data.user.profile_image);
          setProfileImage(response.data.user.profile_image);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, []);

  // ========== Safety timeout to prevent infinite loading ==========
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loadingImages) {
        console.log('Safety timeout reached, stopping image loading');
        setLoadingImages(false);
      }
    }, 5000);

    return () => clearTimeout(safetyTimeout);
  }, [loadingImages]);

  // ========== Load all images as base64 ==========
  useEffect(() => {
    const loadImagesAsBase64 = async () => {
      // Wait for site settings to load
      if (!siteLogo && !profileImage) {
        console.log('Waiting for images...');
        // Set a timeout to prevent infinite loading
        const timeout = setTimeout(() => {
          setLoadingImages(false);
        }, 3000);
        return () => clearTimeout(timeout);
      }

      setLoadingImages(true);
      console.log('Loading images as base64...');
      console.log('siteLogo:', siteLogo);
      console.log('profileImage:', profileImage);

      try {
        // Load logo
        if (siteLogo) {
          const logo = await convertImageToBase64(siteLogo);
          if (logo) {
            setLogoBase64(logo);
            console.log('Logo converted to base64');
          } else {
            console.log('Logo conversion failed, will use URL fallback');
          }
        }

        // Load profile image
        if (profileImage) {
          const profile = await convertImageToBase64(profileImage);
          if (profile) {
            setProfileBase64(profile);
            console.log('Profile converted to base64');
          } else {
            console.log('Profile conversion failed, will use URL fallback');
          }
        }

        // Load QR code
        const qr = await fetchQRCode();
        if (qr) {
          setQrBase64(qr);
          console.log('QR code loaded');
        }
      } catch (err) {
        console.error('Error loading images:', err);
      } finally {
        setLoadingImages(false);
        console.log('Image loading complete');
      }
    };

    loadImagesAsBase64();
  }, [siteLogo, profileImage, convertImageToBase64, fetchQRCode]);

  // ========== Helper functions for image URLs ==========

  const truncateEmail = (email) => {
    if (!email) return 'N/A';
    const [user, domain] = email.split('@');
    return user.length > 6 ? `${user.slice(0, 6)}...@${domain}` : email;
  };

  const getLogoUrl = () => {
    if (siteLogo) {
      if (siteLogo.startsWith('http')) return siteLogo;
      return `${BASE_URL}${siteLogo}`;
    }
    return null;
  };

  const getProfileImageUrl = () => {
    if (profileImage) {
      if (profileImage.startsWith('http')) return profileImage;
      return `${BASE_URL}${profileImage}`;
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // QR code URL for fallback
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://blisswell.in&bgcolor=ffffff`;

  // ========== PRINT ID CARD ==========
  const handlePrint = () => {
    // Wait for images to load if still loading
    if (loadingImages) {
      alert('Please wait for images to load completely.');
      return;
    }

    // Trigger browser print dialog
    window.print();
  };

  // ========== DOWNLOAD AS IMAGE (PNG) ==========
  const downloadAsImage = async () => {
    if (loadingImages) {
      alert('Please wait for images to load completely.');
      return;
    }

    setDownloading(true);
    try {
      console.log('Starting PNG download...');

      const element = cardRef.current;
      if (!element) {
        console.error('Card ref not found');
        return;
      }

      // Wait for all images in the element to load
      await waitForAllImagesToLoad(element);

      const opt = {
        margin: 0,
        filename: `${siteName || 'Blisswell'}_ID_Card_${user?.referral_code || 'user'}.png`,
        image: { type: 'png', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 15000,
          onclone: async (clonedDoc) => {
            // Convert all images to base64 in the cloned document
            await convertImagesToBase64InClone(clonedDoc, element);
          }
        },
        jsPDF: { enabled: false }
      };

      const canvas = await html2pdf().set(opt).from(element).toCanvas().outputImg();

      const link = document.createElement('a');
      link.download = `${siteName || 'Blisswell'}_ID_Card_${user?.referral_code || 'user'}.png`;
      link.href = canvas.src;
      link.click();
      console.log('PNG download complete');
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // ========== DOWNLOAD AS PDF ==========
  const downloadAsPDF = async () => {
    if (loadingImages) {
      alert('Please wait for images to load completely.');
      return;
    }

    setDownloading(true);
    try {
      console.log('Starting PDF download...');

      const element = cardRef.current;
      if (!element) {
        console.error('Card ref not found');
        return;
      }

      // Wait for all images in the element to load
      await waitForAllImagesToLoad(element);

      const opt = {
        margin: 0,
        filename: `${siteName || 'Blisswell'}_ID_Card_${user?.referral_code || 'user'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 15000,
          onclone: async (clonedDoc) => {
            // Convert all images to base64 in the cloned document
            await convertImagesToBase64InClone(clonedDoc, element);
          }
        },
        jsPDF: { unit: 'mm', format: [200, 120], orientation: 'landscape' }
      };

      await html2pdf().set(opt).from(element).save();
      console.log('PDF download complete');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // ========== Helper: Wait for all images to load ==========
  const waitForAllImagesToLoad = (element) => {
    const images = element.querySelectorAll('img');
    const promises = Array.from(images).map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Resolve anyway to not block
        // Set crossOrigin for external images
        if (!img.src.startsWith('data:') && !img.src.startsWith('blob:')) {
          img.crossOrigin = 'anonymous';
        }
      });
    });
    return Promise.all(promises);
  };

  // ========== Convert a single image element to base64 and return it ==========
  const convertImgElementToBase64 = async (imgElement) => {
    const src = imgElement.src;
    if (!src || src.startsWith('data:')) {
      return src; // Already base64 or no src
    }

    console.log('Converting image to base64:', src.substring(0, 80));

    // Check if image is same-origin (no need for CORS)
    const isSameOrigin = src.startsWith(window.location.origin) ||
                         (window.location.hostname === 'localhost' && src.includes('localhost'));

    // Method 1: Try fetch with CORS (works if server has CORS headers)
    try {
      const response = await fetch(src, { mode: 'cors', credentials: 'omit' });
      if (response.ok) {
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        console.log('Fetch conversion successful');
        return base64;
      }
    } catch (err) {
      console.log('Fetch CORS failed:', err.message);
    }

    // Method 2: Canvas with crossOrigin (for CORS-enabled servers)
    const canvasResult = await new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png', 1.0));
        } catch (err) {
          console.log('Canvas with crossOrigin failed:', err.message);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.log('Image load with crossOrigin failed');
        resolve(null);
      };
      img.src = src + (src.includes('?') ? '&' : '?') + '_cb=' + Date.now();
    });

    if (canvasResult) {
      console.log('Canvas with crossOrigin successful');
      return canvasResult;
    }

    // Method 3: Canvas without crossOrigin (only works for same-origin)
    if (isSameOrigin) {
      const sameOriginResult = await new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png', 1.0));
          } catch (err) {
            console.log('Same-origin canvas failed:', err.message);
            resolve(null);
          }
        };
        img.onerror = () => {
          console.log('Same-origin image load failed');
          resolve(null);
        };
        img.src = src;
      });

      if (sameOriginResult) {
        console.log('Same-origin canvas successful');
        return sameOriginResult;
      }
    }

    // Method 4: If the image element is already loaded and we can draw it
    if (imgElement.complete && imgElement.naturalWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgElement, 0, 0);
        const result = canvas.toDataURL('image/png', 1.0);
        console.log('Direct element draw successful');
        return result;
      } catch (err) {
        console.log('Direct canvas draw failed (likely tainted canvas):', err.message);
      }
    }

    console.warn('All conversion methods failed for:', src.substring(0, 50));
    return null;
  };

  // ========== Create a clone with all images converted to base64 ==========
  // This function is used by html2pdf's onclone callback
  const convertImagesToBase64InClone = async (clonedDoc, originalElement) => {
    const clonedImages = clonedDoc.querySelectorAll('img');
    const originalImages = originalElement.querySelectorAll('img');

    console.log(`Converting ${clonedImages.length} images in cloned document...`);

    for (let i = 0; i < clonedImages.length; i++) {
      const clonedImg = clonedImages[i];
      const originalImg = originalImages[i];

      // Skip if already base64
      if (clonedImg.src.startsWith('data:')) {
        console.log(`Image ${i + 1}: already base64`);
        continue;
      }

      // Try to convert using pre-loaded base64 first (most reliable)
      const imgClass = clonedImg.className || '';
      const imgSrc = originalImg?.src || '';

      if ((imgClass.includes('card-logo') || imgClass.includes('back-logo')) && logoBase64) {
        clonedImg.src = logoBase64;
        console.log(`Image ${i + 1}: using pre-loaded logo base64`);
      } else if ((imgClass.includes('photo-image') || imgClass.includes('avatar-image')) && profileBase64) {
        clonedImg.src = profileBase64;
        console.log(`Image ${i + 1}: using pre-loaded profile base64`);
      } else if ((imgClass.includes('qr-image') || imgClass.includes('back-qr-image')) && qrBase64) {
        clonedImg.src = qrBase64;
        console.log(`Image ${i + 1}: using pre-loaded QR base64`);
      } else if (originalImg) {
        // Try converting the original image
        const base64 = await convertImgElementToBase64(originalImg);
        if (base64) {
          clonedImg.src = base64;
          console.log(`Image ${i + 1}: converted via convertImgElementToBase64`);
        } else {
          console.warn(`Image ${i + 1}: could not convert to base64`);
        }
      }
    }

    // Wait for images to load in clone
    await new Promise((resolve) => {
      const imgs = clonedDoc.querySelectorAll('img');
      let loaded = 0;
      const total = imgs.length;

      if (total === 0) {
        resolve();
        return;
      }

      const checkLoaded = () => {
        loaded++;
        if (loaded === total) resolve();
      };

      imgs.forEach((img) => {
        if (img.complete && img.naturalHeight !== 0) {
          checkLoaded();
        } else {
          img.onload = checkLoaded;
          img.onerror = checkLoaded;
        }
      });

      // Timeout after 3 seconds
      setTimeout(resolve, 3000);
    });

    console.log('All images processed in clone');
  };

  const logoUrl = getLogoUrl();
  const profileUrl = getProfileImageUrl();

  // Use base64 images for rendering (these are pre-loaded and CORS-safe)
  const displayLogo = logoBase64 || logoUrl;
  const displayProfile = profileBase64 || profileUrl;
  const displayQR = qrBase64 || qrCodeUrl;

  return (
    <DashboardLayout>
      <div className="id-card-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">My ID Card</h1>
            <p className="page-subtitle">View and download your digital ID card</p>
          </div>
          {loadingImages && (
            <div className="loading-indicator">
              <span className="loading-spinner"></span>
              Loading images...
            </div>
          )}
        </div>

        {/* Mobile Card Info - Shows user details prominently on mobile */}
        <div className="mobile-info-section">
          <div className="mobile-info-header">
            <div className="mobile-avatar">
              {displayProfile ? (
                <img src={displayProfile} alt="Profile" />
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
<span className="mobile-value">{truncateEmail(user?.email)}</span>
            </div>
            {/* <div className="mobile-info-item">
              <span className="mobile-label">Member Since</span>
              <span className="mobile-value">{formatDate(user?.created_at)}</span>
            </div>
            <div className="mobile-info-item">
              <span className="mobile-label">Valid Until</span>
              <span className="mobile-value">Lifetime</span>
            </div> */}
          </div>
        </div>

        <div className="card-preview-container">
          <div className="card-wrapper" ref={cardRef}>
            {/* Front Card */}
            <div className="id-card front-card">
              <div className="card-header">
                <div className="logo-section">
                  <div className="logo-wrapper">
                    {displayLogo ? (
                      <img src={displayLogo} alt={siteName} className="card-logo" />
                    ) : null}
                    <div className="logo-placeholder" style={{ display: displayLogo ? 'none' : 'flex' }}>
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
                    {displayProfile ? (
                      <img src={displayProfile} alt="Profile" className="photo-image" />
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
                  <img src={displayQR} alt="QR Code" className="qr-image" />
                  <span className="qr-label">blisswell.in</span>
                </div>
              </div>

              {/* <div className="status-section">
                <span className={`status-badge ${user?.has_active_package ? 'active' : 'inactive'}`}>
                  {user?.has_active_package ? 'Active Member' : 'Inactive'}
                </span>
              </div> */}

              <div className="card-footer">
                <div className="footer-item ">
                  <span className="footer-label ">Member Since</span>
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
                    {displayLogo ? (
                      <img src={displayLogo} alt={siteName} className="back-logo" />
                    ) : null}
                    <div className="logo-placeholder-back" style={{ display: displayLogo ? 'none' : 'flex' }}>
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
<img src={displayQR} alt="QR Code" className="back-qr-image" />                </div>
              </div>
            </div>
          </div>

          <div className="download-actions">
            {/* <button className="btn btn-primary" onClick={downloadAsImage} disabled={downloading || loadingImages}>
              {downloading ? 'Processing...' : loadingImages ? 'Loading Images...' : 'Download as Image (PNG)'}
            </button>
            <button className="btn btn-secondary" onClick={downloadAsPDF} disabled={downloading || loadingImages}>
              {downloading ? 'Processing...' : loadingImages ? 'Loading Images...' : 'Download as PDF'}
            </button> */}
            <button className="btn btn-print" onClick={handlePrint} disabled={loadingImages}>
              {loadingImages ? 'Loading Images...' : 'Save as PDF'}
            </button>
          </div>
        </div>

        <div className="instructions-card">
          <h3>Instructions</h3>
          <ul>
            <li>Your ID Card contains your unique referral code which can be used for sharing.</li>
            <li>Download your ID card as an image (PNG), PDF format, or use Print to save as PDF.</li>
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
.mobile-value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px; /* Adjust based on your layout */
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
          margin-top: 15px;
        }
/* Default (mobile) */
.card-footer {
  margin-top: 15px;
}

/* iPad Mini (768px) */

/* iPad Air (768px - 820px) */
@media (min-width: 768px) and (max-width: 820px) {
  .card-footer {
    margin-top: 5px; /* Adjust this */
  }
}

/* iPad Pro (1024px) */
@media (min-width: 821px) and (max-width: 1024px) {
  .card-footer {
    margin-top: 5px;
  }
}

/* XL screens (1280px+) */
@media (min-width: 1280px) {
  .card-footer {
    margin-top: 5px;
  }
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
          color: green;
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

        /* Print button style */
        .btn-print {
          background: #fff;
          color: #1F4D4A;
          border: 2px solid #1F4D4A;
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-width: 180px;
        }

        .btn-print:hover {
          background: #f0fdf4;
          box-shadow: 0 4px 12px rgba(31, 77, 74, 0.2);
        }

        .btn-print:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Print styles - hide everything except ID card */
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }

          /* Show only the card wrapper and its contents */
          .card-wrapper,
          .card-wrapper * {
            visibility: visible;
          }

          /* Position the card at the top of the page */
          .card-wrapper {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
            padding: 20px;
          }

          /* Ensure cards display properly */
          .id-card {
            transform: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Ensure background colors print */
          .front-card,
          .back-card {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide page header, mobile info, instructions, download buttons */
          .page-header,
          .mobile-info-section,
          .instructions-card,
          .download-actions,
          .loading-indicator {
            display: none !important;
          }

          /* Remove padding and margins */
          .card-preview-container {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }

          .id-card-page {
            padding: 0 !important;
            margin: 0 !important;
          }

          /* Ensure images print */
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
};

export default IdCard;