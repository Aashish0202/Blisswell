import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userAPI } from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith('http')) return image;
  const baseUrl = API_URL.replace('/api', '');
  return `${baseUrl}${image}`;
};

const BannerLink = ({ url, text }) => {
  const label = text || 'View Offer';
  if (/^https?:\/\//i.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="offer-banner-btn">{label}</a>
    );
  }
  return <Link to={url.startsWith('/') ? url : `/${url}`} className="offer-banner-btn">{label}</Link>;
};

// Admin-managed offer banners, shown at the top of the user dashboard only
// while they are inside their scheduled window (filtered server-side).
const OfferBanners = () => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    userAPI.getOfferBanners()
      .then((res) => setBanners(res.data?.banners || []))
      .catch((err) => console.error('Offer banners fetch error:', err));
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="offer-banners">
      {banners.map((banner) => (
        <div key={banner.id} className={`offer-banner ${banner.image_url ? 'has-image' : ''}`}>
          {banner.image_url && (
            <img src={getImageUrl(banner.image_url)} alt={banner.title} className="offer-banner-img" />
          )}
          <div className="offer-banner-content">
            <div className="offer-banner-text">
              <h3 className="offer-banner-title">{banner.title}</h3>
              {banner.message && <p className="offer-banner-message">{banner.message}</p>}
            </div>
            {banner.link_url && <BannerLink url={banner.link_url} text={banner.link_text} />}
          </div>
        </div>
      ))}

      <style>{`
        .offer-banners {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .offer-banner {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius-xl, 16px);
          background: linear-gradient(135deg, var(--primary-600, #4f46e5), var(--accent-600, #0d9488));
          color: white;
          box-shadow: var(--shadow-card);
        }

        /* Height follows the uploaded image's own aspect ratio — never cropped */
        .offer-banner-img {
          display: block;
          width: 100%;
          height: auto;
        }

        .offer-banner-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
        }

        .offer-banner-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: white;
        }

        .offer-banner-message {
          margin: 0.25rem 0 0;
          font-size: 0.9rem;
          opacity: 0.92;
          white-space: pre-line;
        }

        .offer-banner-btn {
          flex-shrink: 0;
          padding: 0.5rem 1.125rem;
          border-radius: var(--radius-full, 999px);
          background: white;
          color: var(--primary-700, #4338ca);
          font-weight: 600;
          font-size: 0.875rem;
          text-decoration: none;
          white-space: nowrap;
        }

        .offer-banner-btn:hover {
          background: var(--gray-100, #f3f4f6);
        }

        @media (max-width: 640px) {
          .offer-banner-content {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default OfferBanners;
