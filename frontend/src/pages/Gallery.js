import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const API_URL = process.env.REACT_APP_API_URL;

const Gallery = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { siteName } = useSiteSettings();

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch(`${API_URL}/gallery`);
      const data = await response.json();
      setImages(data.images || []);
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from images
  const categories = [
    { id: 'all', label: 'All' },
    ...Array.from(new Set(images.map(img => img.category))).map(cat => ({
      id: cat,
      label: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')
    }))
  ];

  const filteredImages = activeCategory === 'all'
    ? images.filter(img => img.is_active)
    : images.filter(img => img.category === activeCategory && img.is_active);

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };

  return (
    <div className="gallery-wrapper">
      {/* Hero Section */}
      <section className="gallery-hero">
        <div className="hero-bg-elements">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className={`hero-content ${isVisible ? 'visible' : ''}`}>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            <span>Our Gallery</span>
          </div>
          <h1 className="hero-title">
            <span className="title-serif">Inspiration for</span>
            <span className="title-accent">Your Space</span>
          </h1>
          <p className="hero-subtitle">
            Explore how {siteName || 'Blisswell'} bedsheets transform bedrooms into
            luxurious retreats. Get inspired by real customer spaces.
          </p>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="gallery-section">
        <div className="container">
          {/* Category Filter */}
          <div className="gallery-filter">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`filter-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          {loading ? (
            <div className="gallery-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="gallery-item skeleton">
                  <div className="skeleton-image"></div>
                </div>
              ))}
            </div>
          ) : filteredImages.length > 0 ? (
            <div className="gallery-grid">
              {filteredImages.map((item, index) => (
                <div
                  key={item.id}
                  className={`gallery-item ${index % 5 === 0 ? 'large' : ''}`}
                  onClick={() => setSelectedImage(item)}
                >
                  <div className="gallery-image">
                    {item.image_url ? (
                      <img src={getImageUrl(item.image_url)} alt={item.title} />
                    ) : (
                      <div className="image-placeholder">
                        <span>✦</span>
                      </div>
                    )}
                    <div className="gallery-overlay">
                      <div className="overlay-content">
                        <h3>{item.title}</h3>
                        <p>{item.description || 'Premium Collection'}</p>
                        <span className="view-btn">View</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-gallery">
              <span className="empty-icon">🖼️</span>
              <h3>No images yet</h3>
              <p>Check back soon for our gallery updates!</p>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <button className="lightbox-close" onClick={() => setSelectedImage(null)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <div className="lightbox-image">
              {selectedImage.image_url ? (
                <img src={getImageUrl(selectedImage.image_url)} alt={selectedImage.title} />
              ) : (
                <div className="image-placeholder large">
                  <span>✦</span>
                </div>
              )}
            </div>
            <div className="lightbox-info">
              <h2>{selectedImage.title}</h2>
              <p>{selectedImage.description || 'Premium Collection'}</p>
              <div className="lightbox-tags">
                <span className="tag">{selectedImage.category}</span>
                <span className="tag">Premium Cotton</span>
                <span className="tag">100% Natural</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Section */}
      {/* <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="stat-number">500+</div>
              <div className="stat-label">5-Star Reviews</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div className="stat-number">10K+</div>
              <div className="stat-label">Happy Homes</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="3" width="15" height="13" rx="2"/>
                  <path d="M16 8h4a2 2 0 012 2v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-3"/>
                </svg>
              </div>
              <div className="stat-number">50+</div>
              <div className="stat-label">Designs</div>
            </div>
            <div className="stat-item">
              <div className="stat-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className="stat-number">Pan India</div>
              <div className="stat-label">Delivery</div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Instagram Section */}
      <section className="instagram-section">
        <div className="container">
          <div className="instagram-content">
            <div className="instagram-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </div>
            <h2>Follow Us on Instagram</h2>
            <p>Tag us with <strong>#BlisswellHome</strong> for a chance to be featured</p>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="btn-follow">
              <span>@blisswellhome</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Bedroom?</h2>
            <p>Explore our collection and find the perfect bedsheets for your space.</p>
            <a href="/products" className="btn btn-white">
              <span>Shop Collection</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');

        .gallery-wrapper {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #fafafa;
          color: #0a0a0a;
          line-height: 1.6;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* Hero */
        .gallery-hero {
          position: relative;
          min-height: 50vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
          overflow: hidden;
          padding: 4rem 1.5rem;
        }

        .hero-bg-elements {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
        }

        .glow-1 {
          width: 400px;
          height: 400px;
          background: rgba(37, 99, 235, 0.08);
          top: -50px;
          right: -50px;
        }

        .glow-2 {
          width: 300px;
          height: 300px;
          background: rgba(5, 150, 105, 0.06);
          bottom: -50px;
          left: -50px;
        }

        .hero-content {
          position: relative;
          text-align: center;
          max-width: 700px;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hero-content.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(37, 99, 235, 0.08);
          border-radius: 100px;
          margin-bottom: 1.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #2563eb;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          background: #2563eb;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          margin: 0 0 1.5rem 0;
          line-height: 1.1;
        }

        .title-serif {
          display: block;
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 500;
          color: #0a0a0a;
        }

        .title-accent {
          display: block;
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 500;
          background: linear-gradient(135deg, #2563eb, #059669);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.125rem;
          color: #525252;
          line-height: 1.8;
          max-width: 500px;
          margin: 0 auto;
        }

        /* Gallery Section */
        .gallery-section {
          padding: 3rem 0;
        }

        .gallery-filter {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 0.75rem 1.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #525252;
          background: #fff;
          border: 1.5px solid #e5e5e5;
          border-radius: 100px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-btn:hover,
        .filter-btn.active {
          background: #0a0a0a;
          color: #fff;
          border-color: #0a0a0a;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .gallery-item {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.4s ease;
        }

        .gallery-item:hover {
          transform: translateY(-5px);
        }

        .gallery-item.large {
          grid-column: span 2;
          grid-row: span 2;
        }

        .gallery-image {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 250px;
        }

        .gallery-item.large .gallery-image {
          min-height: 520px;
        }

        .gallery-image img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #f5f5f5, #e5e5e5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          color: #2563eb;
        }

        .gallery-item.large .image-placeholder {
          font-size: 5rem;
        }

        .gallery-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%);
          display: flex;
          align-items: flex-end;
          padding: 1.5rem;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .gallery-item:hover .gallery-overlay {
          opacity: 1;
        }

        .overlay-content {
          color: #fff;
        }

        .overlay-content h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
        }

        .overlay-content p {
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.8);
          margin: 0 0 0.75rem 0;
        }

        .view-btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(255,255,255,0.2);
          border-radius: 100px;
          transition: background 0.3s ease;
        }

        .gallery-item:hover .view-btn {
          background: #fff;
          color: #0a0a0a;
        }

        /* Empty State */
        .empty-gallery {
          text-align: center;
          padding: 4rem 2rem;
          background: white;
          border-radius: 16px;
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }

        .empty-gallery h3 {
          font-size: 1.25rem;
          color: #0a0a0a;
          margin: 0 0 0.5rem 0;
        }

        .empty-gallery p {
          color: #525252;
          margin: 0;
        }

        /* Skeleton */
        .skeleton-image {
          width: 100%;
          height: 100%;
          min-height: 250px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Lightbox */
        .lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .lightbox-close {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: 50%;
          color: #fff;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .lightbox-close:hover {
          background: rgba(255,255,255,0.2);
        }

        .lightbox-content {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 2rem;
          max-width: 1000px;
          max-height: 80vh;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .lightbox-image {
          flex: 1;
          min-height: 400px;
        }

        .lightbox-image img {
          width: 100%;
          height: 100%;
          min-height: 400px;
          object-fit: contain;
          border-radius: 16px;
        }

        .image-placeholder.large {
          width: 100%;
          height: 100%;
          min-height: 400px;
          border-radius: 16px;
          font-size: 6rem;
        }

        .lightbox-info {
          background: #fff;
          padding: 2rem;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .lightbox-info h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 0.5rem 0;
        }

        .lightbox-info p {
          font-size: 1rem;
          color: #525252;
          margin: 0 0 1.5rem 0;
          line-height: 1.6;
        }

        .lightbox-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          padding: 0.375rem 0.875rem;
          font-size: 0.75rem;
          font-weight: 500;
          background: #f5f5f5;
          color: #525252;
          border-radius: 100px;
        }

        /* Stats Section */
        .stats-section {
          padding: 4rem 0;
          background: #fff;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }

        .stat-item {
          text-align: center;
        }

        .stat-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border-radius: 16px;
          color: #2563eb;
          margin: 0 auto 1rem;
        }

        .stat-number {
          font-size: 2.25rem;
          font-weight: 700;
          color: #0a0a0a;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #525252;
        }

        /* Instagram Section */
        .instagram-section {
          padding: 5rem 0;
          background: linear-gradient(135deg, #fafafa, #f5f5f5);
        }

        .instagram-content {
          text-align: center;
        }

        .instagram-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
          border-radius: 20px;
          color: #fff;
          margin: 0 auto 1.5rem;
        }

        .instagram-content h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 2rem;
          font-weight: 500;
          color: #0a0a0a;
          margin: 0 0 0.5rem 0;
        }

        .instagram-content p {
          font-size: 1rem;
          color: #525252;
          margin: 0 0 1.5rem 0;
        }

        .btn-follow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          background: #0a0a0a;
          color: #fff;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .btn-follow:hover {
          background: #1a1a1a;
          transform: translateY(-2px);
        }

        /* CTA Section */
        .cta-section {
          padding: 6rem 0;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        }

        .cta-content {
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-section h2 {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 500;
          color: #fff;
          margin: 0 0 1rem 0;
        }

        .cta-section p {
          font-size: 1.125rem;
          color: rgba(255,255,255,0.7);
          margin: 0 0 2rem 0;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .btn-white {
          background: #fff;
          color: #0a0a0a;
        }

        .btn-white:hover {
          background: #f9fafb;
          transform: translateY(-2px);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .gallery-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .gallery-item.large {
            grid-column: span 2;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .lightbox-content {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .gallery-hero {
            min-height: auto;
            padding: 3rem 1.5rem;
          }

          .title-serif,
          .title-accent {
            font-size: 2rem;
          }

          .gallery-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          .gallery-item.large {
            grid-column: span 2;
            grid-row: span 1;
          }

          .gallery-item.large .gallery-image {
            min-height: 250px;
          }

          .gallery-item.large .image-placeholder {
            font-size: 3rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          .stat-number {
            font-size: 1.75rem;
          }

          .lightbox {
            padding: 1rem;
          }

          .lightbox-info {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Gallery;