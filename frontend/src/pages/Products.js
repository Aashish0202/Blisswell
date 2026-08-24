import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderAPI } from '../utils/api';

// Image Slider Component for products with multiple images
const ImageSlider = ({ images, getImageUrl, alt }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (images && images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 2000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <div className="image-slider">
      <img
        src={getImageUrl(images[currentIndex])}
        alt={alt}
        onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="40">✦</text></svg>' }}
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

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  const matchesFilter = (product, f) => {
    if (f === 'All') return true;
    const hay = `${product.name || ''} ${product.description || ''}`.toLowerCase();
    if (f === 'Cotton') return hay.includes('cotton');
    if (f === 'Premium') return hay.includes('premium');
    if (f === 'Bestseller') return !!(product.is_bestseller || product.bestseller) || hay.includes('bestseller');
    return true;
  };

  const filteredProducts = products.filter(p => matchesFilter(p, filter));

  useEffect(() => {
    fetchProducts();
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await orderAPI.getProducts();
      console.log('API URL:', process.env.REACT_APP_API_URL);
      console.log('Products response:', response.data);
      response.data?.products?.forEach(p => {
        console.log(`Product: ${p.name}, images:`, p.images, 'type:', typeof p.images);
      });
      setProducts(response.data?.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    // Always send visitors to signup — pricing is hidden on the website
    navigate('/register');
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    return `${baseUrl}${image}`;
  };

  const getProductImages = (product) => {
    // Handle both new images array and legacy single image
    if (product.images) {
      // If it's already an array
      if (Array.isArray(product.images) && product.images.length > 0) {
        console.log(`Product ${product.name}: Found ${product.images.length} images`);
        return product.images;
      }
      // If it's a JSON string, parse it
      if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(`Product ${product.name}: Parsed ${parsed.length} images from string`);
            return parsed;
          }
        } catch (e) {
          console.error('Failed to parse images:', e);
        }
      }
    }
    if (product.image) {
      console.log(`Product ${product.name}: Using single image fallback`);
      return [product.image];
    }
    console.log(`Product ${product.name}: No images found`);
    return [];
  };

  return (
    <div className="products-page-wrapper">
      {/* Hero Section */}
      <section className="products-hero">
        <div className="hero-bg-elements">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className={`hero-content ${isVisible ? 'visible' : ''}`}>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            <span>Our Collection</span>
          </div>
          <h1 className="hero-title">
            <span className="title-serif">Premium Bedsheets</span>
            <span className="title-accent">Crafted for Comfort</span>
          </h1>
          <p className="hero-subtitle">
            Discover our curated collection of handpicked bedsheets, each crafted with
            100% long-staple cotton for the ultimate sleep experience.
          </p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="filter-bar">
        <div className="container">
          <div className="filter-content">
            <div className="results-count">
              <strong>{filteredProducts.length}</strong> Products
            </div>
            <div className="filter-tags">
              {['All', 'Cotton', 'Premium', 'Bestseller'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`filter-tag ${filter === tag ? 'active' : ''}`}
                  onClick={() => setFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="products-section">
        <div className="container">
          {loading ? (
            <div className="products-loading">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-image"></div>
                  <div className="skeleton-content">
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="products-grid">
              {filteredProducts.map((product, index) => {
                const productImages = getProductImages(product);
                const hasMultipleImages = productImages.length > 1;
                console.log(`Rendering ${product.name}: ${productImages.length} images, hasMultiple: ${hasMultipleImages}`);
                return (
                  <div key={product.id} className="product-card">
                    <div className="product-image-container">
                      {productImages.length > 0 ? (
                        hasMultipleImages ? (
                          <ImageSlider images={productImages} getImageUrl={getImageUrl} alt={product.name} />
                        ) : (
                          <img src={getImageUrl(productImages[0])} alt={product.name} />
                        )
                      ) : (
                        <div className="product-placeholder">
                          <span>✦</span>
                        </div>
                      )}
                      <div className="product-overlay">
                        <Link to="/register" className="btn-view">View Details</Link>
                      </div>
                      <div className="product-badges">
                        {index === 0 && <span className="badge bestseller">Bestseller</span>}
                        {index === 1 && <span className="badge new">New</span>}
                        <span className="badge instock">In Stock</span>
                      </div>
                      <button className="wishlist-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                    </div>
                    <div className="product-content">
                      <div className="product-category">Premium Cotton</div>
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-desc">{product.description || 'Handcrafted with premium long-staple cotton for ultimate comfort and elegance.'}</p>
                      <div className="product-features">
                        <span className="feature">100% Cotton</span>
                        <span className="feature">2 Pillow Covers</span>
                        <span className="feature">Hotel Grade</span>
                      </div>
                      <div className="product-footer">
                        <button className="btn-add-to-cart" onClick={handleBuyNow}>
                          <span>Buy Now</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : products.length > 0 ? (
            <div className="no-products">
              <div className="no-products-icon">✦</div>
              <h3>No {filter !== 'All' ? filter.toLowerCase() : ''} products found</h3>
              <p>Try a different filter.</p>
              <button type="button" className="btn btn-primary" onClick={() => setFilter('All')}>View All</button>
            </div>
          ) : (
            <div className="no-products">
              <div className="no-products-icon">✦</div>
              <h3>Products Coming Soon</h3>
              <p>We're curating the finest bedsheets for you. Stay tuned!</p>
              <Link to="/register" className="btn btn-primary">Get Notified</Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>Premium Quality</h3>
              <p>100% long-staple cotton sourced from the finest farms</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="3" width="15" height="13" rx="2"/>
                  <path d="M16 8h4a2 2 0 012 2v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-3"/>
                </svg>
              </div>
              <h3>Free Shipping</h3>
              <p>Free delivery on all orders</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3>Easy Returns</h3>
              <p>7-day hassle-free return policy</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3>Secure Payment</h3>
              <p>100% secure payment gateway</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <div className="cta-badge">Partner Program</div>
            <h2>Earn While You Sleep</h2>
            <p>Join our referral program and earn daily incentive for every friend you refer. Start building your passive income today.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-white">
                <span>Join Now</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link to="/about" className="btn btn-outline-white">Learn More</Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');

        .products-page-wrapper {
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
        .products-hero {
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

        /* Filter Bar */
        .filter-bar {
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          padding: 1rem 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .filter-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .results-count {
          font-size: 0.9375rem;
          color: #525252;
        }

        .results-count strong {
          color: #0a0a0a;
        }

        .filter-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-tag {
          padding: 0.5rem 1rem;
          font-size: 0.8125rem;
          font-weight: 500;
          font-family: inherit;
          color: #525252;
          background: #f5f5f5;
          border: none;
          border-radius: 100px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-tag:hover,
        .filter-tag.active {
          background: #0a0a0a;
          color: #fff;
        }

        /* Products Section */
        .products-section {
          padding: 3rem 0;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        .product-card {
          position: relative;
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 10px 30px rgba(0,0,0,0.05);
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }

        /* Thick gradient border (always on) — masked ring follows the rounded corners */
        .product-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(135deg, #2563eb, #059669);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          pointer-events: none;
          z-index: 3;
          transition: padding 0.2s ease;
        }

        .product-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 24px 48px rgba(37, 99, 235, 0.14), 0 8px 20px rgba(0, 0, 0, 0.08);
        }

        .product-card:hover::before {
          padding: 2.75px;
        }

        .product-image-container {
          position: relative;
          aspect-ratio: 1/1;
          background: #f5f5f5;
          overflow: hidden;
        }

        /* Soft depth gradient at the bottom of the image on hover */
        .product-image-container::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 55%, rgba(0, 0, 0, 0.18));
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        .product-card:hover .product-image-container::after {
          opacity: 1;
        }

        .product-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s ease;
        }

        .product-card:hover .product-image-container img {
          transform: scale(1.07);
        }

        .product-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          color: #2563eb;
          background: linear-gradient(135deg, #f5f5f5, #e5e5e5);
        }

        .product-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .product-card:hover .product-overlay {
          opacity: 1;
        }

        .btn-view {
          padding: 0.875rem 1.75rem;
          background: #fff;
          color: #0a0a0a;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: 12px;
          transform: translateY(10px);
          transition: all 0.3s ease;
        }

        .product-card:hover .btn-view {
          transform: translateY(0);
        }

        .product-badges {
          position: absolute;
          top: 1rem;
          left: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .badge {
          padding: 0.375rem 0.875rem;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 100px;
        }

        .badge.bestseller {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
        }

        .badge.new {
          background: linear-gradient(135deg, #059669, #047857);
          color: #fff;
        }

        .badge.instock {
          background: #d1fae5;
          color: #059669;
        }

        .wishlist-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 44px;
          height: 44px;
          background: #fff;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .wishlist-btn:hover {
          background: #fef2f2;
        }

        .wishlist-btn:hover svg {
          stroke: #ef4444;
          fill: #fef2f2;
        }

        .product-content {
          padding: 1.25rem;
        }

        .product-category {
          font-size: 0.6875rem;
          font-weight: 700;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.4rem;
        }

        .product-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: #0a0a0a;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.01em;
          transition: color 0.2s ease;
        }

        .product-card:hover .product-name {
          color: #2563eb;
        }

        .product-desc {
          font-size: 0.875rem;
          color: #525252;
          margin: 0 0 1rem 0;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-features {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .feature {
          display: inline-flex;
          align-items: center;
          font-size: 0.6875rem;
          font-weight: 600;
          color: #059669;
          background: #d1fae5;
          padding: 0.3rem 0.7rem;
          border-radius: 100px;
          border: 1px solid rgba(5, 150, 105, 0.18);
        }

        .product-footer {
          display: flex;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid #f5f5f5;
        }

        .current-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0a0a0a;
        }

        .price-note {
          display: block;
          font-size: 0.6875rem;
          color: #737373;
        }

        .btn-add-to-cart {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.85rem 1.5rem;
          background: linear-gradient(135deg, #2563eb, #059669);
          color: #fff;
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-decoration: none;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.28);
          transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
        }

        .btn-add-to-cart:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.38);
          filter: brightness(1.05);
        }

        .btn-add-to-cart svg {
          transition: transform 0.3s ease;
        }

        .btn-add-to-cart:hover svg {
          transform: translateX(4px);
        }

        /* Loading */
        .products-loading {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 2rem;
        }

        .skeleton-card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
        }

        .skeleton-image {
          aspect-ratio: 4/3;
          background: linear-gradient(90deg, #f5f5f5 25%, #e5e5e5 50%, #f5f5f5 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }

        .skeleton-content {
          padding: 1.5rem;
        }

        .skeleton-text {
          height: 16px;
          background: #f5f5f5;
          border-radius: 4px;
          margin-bottom: 0.5rem;
        }

        .skeleton-text.short {
          width: 60%;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* No Products */
        .no-products {
          text-align: center;
          padding: 4rem 2rem;
        }

        .no-products-icon {
          font-size: 4rem;
          color: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          background: #dbeafe;
          border-radius: 50%;
          margin: 0 auto 1.5rem;
        }

        .no-products h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 0.5rem 0;
        }

        .no-products p {
          color: #525252;
          margin: 0 0 1.5rem 0;
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

        .btn-primary {
          background: #0a0a0a;
          color: #fff;
        }

        .btn-primary:hover {
          background: #1a1a1a;
          transform: translateY(-2px);
        }

        /* Features Section */
        .features-section {
          padding: 4rem 0;
          background: #fff;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }

        .feature-card {
          text-align: center;
          padding: 2rem;
        }

        .feature-icon {
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

        .feature-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 0.5rem 0;
        }

        .feature-card p {
          font-size: 0.875rem;
          color: #525252;
          margin: 0;
        }

        /* CTA Section */
        .cta-section {
          padding: 6rem 0;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          position: relative;
        }

        .cta-content {
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #0a0a0a;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 100px;
          margin-bottom: 1.5rem;
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

        .cta-buttons {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn-white {
          background: #fff;
          color: #0a0a0a;
        }

        .btn-white:hover {
          background: #f9fafb;
          transform: translateY(-2px);
        }

        .btn-outline-white {
          background: transparent;
          color: #fff;
          border: 1.5px solid rgba(255,255,255,0.3);
        }

        .btn-outline-white:hover {
          background: rgba(255,255,255,0.1);
          border-color: #fff;
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

        /* Responsive */
        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          /* Clearer card separation on mobile so each product reads as its own card */
          .product-card {
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }

          .product-card::before {
            padding: 2.5px;
          }

          .products-hero {
            min-height: auto;
            padding: 3rem 1.5rem;
          }

          .title-serif,
          .title-accent {
            font-size: 2rem;
          }

          .filter-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .feature-card {
            padding: 1.5rem;
          }

          .cta-buttons {
            flex-direction: column;
          }

          .cta-buttons .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Products;