import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI, galleryAPI } from '../utils/api';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [heroImage, setHeroImage] = useState(null);
  const [whyImage, setWhyImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const { siteName, siteLogo, siteTagline } = useSiteSettings();

  useEffect(() => {
    fetchProducts();
    fetchHeroImage();
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await orderAPI.getProducts();
      console.log(response.data)
      setProducts(response.data?.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeroImage = async () => {
    try {
      const response = await galleryAPI.getImages();
      const images = response.data?.images || [];
      // Find a good image for hero section (prefer MARVEL collection)
      const heroImg = images.find(img =>
        img.image_url && img.title?.toLowerCase().includes('marvel')
      ) || images[0];
      if (heroImg) {
        setHeroImage(heroImg.image_url);
      }
      // Find a different image for "Why Blisswell" section (prefer Diamond collection)
      const whyImg = images.find(img =>
        img.image_url && img.title?.toLowerCase().includes('diamond') && img.id !== heroImg?.id
      ) || images.find(img => img.id !== heroImg?.id) || images[1];
      if (whyImg) {
        setWhyImage(whyImg.image_url);
      }
    } catch (error) {
      console.error('Failed to fetch hero image:', error);
    }
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    // const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      const baseUrl = (process.env.REACT_APP_API_URL).replace('/api', '');

    return `${baseUrl}${image}`;
  };

  return (
    <div className="home-wrapper">
      {/* Premium Hero Section */}
      <section className="hero-premium">
        <div className="hero-bg-elements">
          <div className="hero-glow hero-glow-1"></div>
          <div className="hero-glow hero-glow-2"></div>
          <div className="hero-pattern"></div>
        </div>

        <div className="hero-container">
          {/* Content Side */}
          <div className={`hero-content-side ${isVisible ? 'visible' : ''}`}>
            <div className="hero-eyebrow">
              <span className="eyebrow-dot"></span>
              <span>Introducing the Collection</span>
            </div>

            <h1 className="hero-headline">
              <span className="headline-serif">Where Comfort</span>
              <span className="headline-accent">Meets Elegance</span>
            </h1>

            <p className="hero-body">
              Handcrafted from 100% long-staple cotton. Each thread woven with precision,
              each design crafted for those who appreciate the art of living well.
            </p>

            <div className="hero-cta-group">
              <Link to="/register" className="cta-primary">
                <span>Shop Premium Collection</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link to="/register" className="cta-secondary">
                <span>Become a Partner & Earn</span>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="hero-trust-row">
              <div className="trust-pill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span>4.9/5 Rating</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-pill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>10,000+ Happy Homes</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-pill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="3" width="15" height="13" rx="2"/>
                  <path d="M16 8h4a2 2 0 012 2v7a2 2 0 01-2 2H8a2 2 0 01-2-2v-3"/>
                </svg>
                <span>Free Shipping</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-pill">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>7-Day Returns</span>
              </div>
            </div>
          </div>

          {/* Product Side */}
          <div className={`hero-product-side ${isVisible ? 'visible' : ''}`}>
            <div className="product-showcase">
              {/* Premium Badge */}
              <div className="premium-badge">
                <div className="badge-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="badge-content">
                  <span className="badge-title">100% Long-Staple Cotton</span>
                  <span className="badge-subtitle">Hotel Grade Quality</span>
                </div>
              </div>

              {/* Main Image */}
              <div className="product-image-wrapper">
                {products[0]?.image ? (
                  <img src={getImageUrl(products[0].image)} alt="Premium Bedsheet" />
                ) : heroImage ? (
                  <img src={getImageUrl(heroImage)} alt="Premium Bedsheet" />
                ) : (
                  <div className="product-placeholder">
                    <span className="placeholder-icon">✦</span>
                    <span className="placeholder-text">Premium Collection</span>
                  </div>
                )}
                <div className="image-glow"></div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="features-premium">
        <div className="features-container">
          <div className="feature-item">
            <div className="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <div className="feature-content">
              <strong>Premium Shipping</strong>
              <span>Free on orders above ₹999</span>
            </div>
          </div>
          <div className="feature-divider"></div>
          <div className="feature-item">
            <div className="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className="feature-content">
              <strong>Easy Returns</strong>
              <span>7-day hassle-free returns</span>
            </div>
          </div>
          <div className="feature-divider"></div>
          <div className="feature-item">
            <div className="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="feature-content">
              <strong>Secure Checkout</strong>
              <span>100% encrypted payment</span>
            </div>
          </div>
          <div className="feature-divider"></div>
          <div className="feature-item">
            <div className="feature-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="feature-content">
              <strong>Dedicated Support</strong>
              <span>24/7 customer assistance</span>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="products-section" id="products">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Our Collection</span>
            <h2 className="section-title">Premium Bedsheets</h2>
            <p className="section-subtitle">Handcrafted with premium cotton for ultimate comfort and style</p>
          </div>

          {loading ? (
            <div className="products-loading">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-card"></div>)}
            </div>
          ) : products.length > 0 ? (
            <div className="products-grid">
              {products.map((product, index) => {
                return (
                  <div key={product.id} className="product-card">
                    <div className="product-image-container">
                      {product.image ? (
                        <img src={getImageUrl(product.image)} alt={product.name} />
                      ) : (
                        <div className="product-placeholder">
                          <span>✦</span>
                        </div>
                      )}
                      <div className="product-actions-overlay">
                        <Link to="/register" className="btn-quick">Quick View</Link>
                      </div>
                      <div className="product-badges">
                        {index === 0 && <span className="badge bestseller">Bestseller</span>}
                        {product.is_active && <span className="badge instock">In Stock</span>}
                      </div>
                      <button className="wishlist-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                    </div>
                    <div className="product-content">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-desc">{product.description || 'Premium quality bedsheets crafted with 100% cotton for ultimate comfort.'}</p>
                      <div className="product-features">
                        <span>✓ 100% Cotton</span>
                        <span>✓ 2 Pillow Covers</span>
                      </div>
                      <div className="product-pricing">
                        <div className="price-block">
                          <span className="current-price">₹{parseFloat(product.price).toLocaleString()}</span>
                          <span className="price-note">Inclusive of all taxes</span>
                        </div>
                        <Link to="/register" className="btn-add">Add to Cart</Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-products">
              <span className="no-products-icon">✦</span>
              <h3>Products Coming Soon</h3>
              <p>We're curating the best bedsheets for you. Stay tuned!</p>
            </div>
          )}

          <div className="products-cta">
            <Link to="/register" className="btn btn-secondary-large">
              <span>View Full Collection</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="why-section">
        <div className="container">
          <div className="why-grid">
            <div className="why-content">
              <span className="section-label">Why Blisswell</span>
              <h2 className="section-title">Crafted for Those Who Value Quality</h2>
              <p className="section-text">
                Every thread tells a story of craftsmanship. We source only the finest long-staple cotton,
                weave it with precision, and deliver luxury that transforms your sleep experience.
              </p>
              <div className="quality-features">
                <div className="q-feature">
                  <div className="q-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div className="q-text">
                    <strong>Long-Staple Cotton</strong>
                    <span>Exceptionally soft and durable</span>
                  </div>
                </div>
                <div className="q-feature">
                  <div className="q-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div className="q-text">
                    <strong>Easy Care</strong>
                    <span>Machine washable & fade resistant</span>
                  </div>
                </div>
                <div className="q-feature">
                  <div className="q-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div className="q-text">
                    <strong>Premium Finish</strong>
                    <span>Durable stitching & elegant designs</span>
                  </div>
                </div>
                <div className="q-feature">
                  <div className="q-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div className="q-text">
                    <strong>All Sizes</strong>
                    <span>Available in all standard sizes</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="why-image">
              <div className="image-card">
                <div className="card-badge">Premium</div>
                <div className="card-image">
                  {whyImage ? (
                    <img src={getImageUrl(whyImage)} alt="Premium Bedsheet" />
                  ) : (
                    <span>✦</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>  

      {/* Stats Section */}
      {/* <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Happy Homes</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Premium Designs</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Cotton Quality</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">5-Star Reviews</div>
            </div>
          </div>
        </div>
      </section> */}

      {/* How It Works */}
      <section className="process-section">
        <div className="container">
          <div className="section-header center">
            <span className="section-label">Simple Steps</span>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Start your journey to better sleep and earning opportunities</p>
          </div>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h3>Create Account</h3>
              <p>Register with basic details to get started</p>
            </div>
            <div className="step-connector">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="4" width="22" height="16" rx="2"/>
                  <path d="M1 10h22"/>
                </svg>
              </div>
              <h3>Add Funds</h3>
              <p>Deposit money to your secure wallet</p>
            </div>
            <div className="step-connector">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </div>
              <h3>Shop Premium</h3>
              <p>Purchase quality bedsheets online</p>
            </div>
            <div className="step-connector">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <div className="step-card">
              <div className="step-number">04</div>
              <div className="step-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3>Earn Monthly</h3>
              <p>Refer friends & earn monthly income</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section className="testimonials-section">
        <div className="container">
          <div className="section-header center">
            <span className="section-label">Testimonials</span>
            <h2 className="section-title">What Our Customers Say</h2>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-stars">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="testimonial-text">"The quality is exceptional. Soft, comfortable, and looks beautiful in my bedroom. Worth every rupee."</p>
              <div className="testimonial-author">
                <div className="author-avatar">R</div>
                <div className="author-info">
                  <strong>Rajesh Kumar</strong>
                  <span>Mumbai, Maharashtra</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card featured">
              <div className="testimonial-stars">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="testimonial-text">"Fast delivery and excellent customer service. The referral program is a great bonus - earned ₹12,000 already!"</p>
              <div className="testimonial-author">
                <div className="author-avatar">P</div>
                <div className="author-info">
                  <strong>Priya Sharma</strong>
                  <span>Delhi</span>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-stars">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p className="testimonial-text">"Premium quality at affordable prices. I've recommended to all my friends and family!"</p>
              <div className="testimonial-author">
                <div className="author-avatar">A</div>
                <div className="author-info">
                  <strong>Amit Patel</strong>
                  <span>Ahmedabad, Gujarat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <div className="cta-badge">Limited Time Offer</div>
            <h2>Experience Premium Sleep Today</h2>
            <p>Join thousands of happy customers enjoying luxury comfort and exclusive earning opportunities.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-white">
                <span>Shop Premium Collection</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link to="/login" className="btn btn-outline-white">Already a member? Login</Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        /* ============================================
           BLISSWELL - PREMIUM LIFESTYLE BRAND
           Apple-Level Design System
           ============================================ */

        /* CSS Variables for Luxury Design Tokens */
        :root {
          --color-bg-primary: #fafafa;
          --color-bg-secondary: #ffffff;
          --color-bg-dark: #0a0a0a;
          --color-text-primary: #0a0a0a;
          --color-text-secondary: #525252;
          --color-text-muted: #737373;
          --color-accent: #2563eb;
          --color-accent-light: #dbeafe;
          --color-success: #059669;
          --color-success-light: #d1fae5;
          --color-border: #e5e5e5;
          --color-border-light: #f5f5f5;
          --font-serif: 'Playfair Display', 'Times New Roman', Georgia, serif;
          --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
          --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
          --shadow-lg: 0 20px 40px rgba(0,0,0,0.12);
          --shadow-xl: 0 40px 80px rgba(0,0,0,0.16);
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 20px;
          --radius-xl: 28px;
          --transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          --transition-smooth: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .home-wrapper {
          font-family: var(--font-sans);
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          line-height: 1.6;
          overflow-x: hidden;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* ============================================
           PREMIUM HERO SECTION
           ============================================ */

        .hero-premium {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #fafafa 100%);
          overflow: hidden;
        }

        /* Background Elements */
        .hero-bg-elements {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .hero-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
        }

        .hero-glow-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, transparent 70%);
          top: -200px;
          right: -100px;
        }

        .hero-glow-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(5, 150, 105, 0.06) 0%, transparent 70%);
          bottom: -100px;
          left: -100px;
        }

        .hero-pattern {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0);
          background-size: 40px 40px;
        }

        /* Hero Container */
        .hero-container {
          position: relative;
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 2rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
          width: 100%;
        }

        /* Content Side */
        .hero-content-side {
          opacity: 0;
          transform: translateX(-40px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hero-content-side.visible {
          opacity: 1;
          transform: translateX(0);
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(37, 99, 235, 0.08);
          border-radius: 100px;
          margin-bottom: 1.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-accent);
          letter-spacing: 0.02em;
        }

        .eyebrow-dot {
          width: 6px;
          height: 6px;
          background: var(--color-accent);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        /* Typography - Luxury Serif Headlines */
        .hero-headline {
          font-family: var(--font-serif);
          margin: 0 0 1.5rem 0;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .headline-serif {
          display: block;
          font-size: clamp(3rem, 6vw, 4.5rem);
          font-weight: 500;
          color: var(--color-text-primary);
        }

        .headline-accent {
          display: block;
          font-size: clamp(3rem, 6vw, 4.5rem);
          font-weight: 500;
          background: linear-gradient(135deg, #2563eb 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-body {
          font-size: 1.125rem;
          color: var(--color-text-secondary);
          line-height: 1.8;
          margin: 0 0 2.5rem 0;
          max-width: 480px;
        }

        /* CTA Group */
        .hero-cta-group {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 3rem;
        }

        .cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: var(--color-bg-dark);
          color: #fff;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: var(--radius-lg);
          transition: all var(--transition-fast);
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        }

        .cta-primary svg {
          transition: transform var(--transition-fast);
        }

        .cta-primary:hover svg {
          transform: translateX(4px);
        }

        .cta-secondary {
          display: inline-flex;
          align-items: center;
          padding: 1rem 2rem;
          background: transparent;
          color: var(--color-text-primary);
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: none;
          border-radius: var(--radius-lg);
          border: 1.5px solid var(--color-border);
          transition: all var(--transition-fast);
        }

        .cta-secondary:hover {
          background: var(--color-bg-secondary);
          border-color: var(--color-text-primary);
        }

        /* Trust Row */
        .hero-trust-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .trust-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: var(--color-bg-secondary);
          border-radius: 100px;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border-light);
        }

        .trust-pill svg {
          color: var(--color-accent);
        }

        .trust-divider {
          width: 1px;
          height: 16px;
          background: var(--color-border);
        }

        /* Product Side */
        .hero-product-side {
          opacity: 0;
          transform: translateX(40px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          transition-delay: 0.2s;
        }

        .hero-product-side.visible {
          opacity: 1;
          transform: translateX(0);
        }

        .product-showcase {
          position: relative;
        }

        /* Premium Badge */
        .premium-badge {
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 10;
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .badge-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          border-radius: 10px;
          color: #fff;
        }

        .badge-content {
          display: flex;
          flex-direction: column;
        }

        .badge-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .badge-subtitle {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          letter-spacing: 0.02em;
        }

        /* Product Image */
        .product-image-wrapper {
          position: relative;
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-xl);
        }

        .product-image-wrapper img {
          width: 100%;
          height: auto;
          display: block;
          transition: transform var(--transition-smooth);
        }

        .product-image-wrapper:hover img {
          transform: scale(1.02);
        }

        .product-placeholder {
          aspect-ratio: 4/3;
          background: linear-gradient(135deg, #f5f5f5, #e5e5e5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .placeholder-icon {
          font-size: 3rem;
          color: var(--color-accent);
        }

        .placeholder-text {
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .image-glow {
          position: absolute;
          inset: -20px;
          background: radial-gradient(circle at center, rgba(37, 99, 235, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Price Card */
        .price-card {
          position: absolute;
          bottom: 2rem;
          right: 0;
          padding: 1.25rem 1.75rem;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          border: 1px solid rgba(255,255,255,0.5);
          animation: float 6s ease-in-out infinite;
          animation-delay: 1s;
        }

        .price-label {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .price-amount {
          display: flex;
          align-items: baseline;
        }

        .currency {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1;
        }

        .price-note {
          font-size: 0.6875rem;
          color: var(--color-success);
          margin-top: 0.25rem;
        }

        /* ============================================
           FEATURES BAR
           ============================================ */

        .features-premium {
          background: var(--color-bg-dark);
          padding: 1.25rem 0;
        }

        .features-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .feature-icon-wrap {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #fff;
        }

        .feature-content {
          color: #fff;
        }

        .feature-content strong {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .feature-content span {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
        }

        .feature-divider {
          width: 1px;
          height: 40px;
          background: rgba(255,255,255,0.15);
          margin: 0 0.5rem;
        }

        /* ============================================
           PRODUCTS SECTION
           ============================================ */

        .products-section {
          padding: 5rem 0;
          background: #f9fafb;
        }

        .section-header {
          margin-bottom: 3rem;
        }

        .section-header.center {
          text-align: center;
        }

        .section-label {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, var(--color-accent-light), #eff6ff);
          color: var(--color-accent);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-radius: 100px;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.75rem 0;
          line-height: 1.2;
        }

        .section-subtitle {
          font-size: 1.0625rem;
          color: var(--color-text-secondary);
          max-width: 600px;
          margin: 0 auto;
        }

        .section-text {
          font-size: 1.0625rem;
          color: var(--color-text-secondary);
          line-height: 1.7;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .product-card {
          background: #fff;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-smooth);
        }

        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg);
        }

        .product-image-container {
          position: relative;
          aspect-ratio: 4/3;
          background: #f5f5f5;
          overflow: hidden;
        }

        .product-image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .product-card:hover .product-image-container img {
          transform: scale(1.05);
        }

        .product-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          color: var(--color-accent);
        }

        .product-actions-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .product-card:hover .product-actions-overlay {
          opacity: 1;
        }

        .btn-quick {
          padding: 0.875rem 1.75rem;
          background: #fff;
          color: var(--color-text-primary);
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: var(--radius-md);
          transform: translateY(10px);
          transition: all var(--transition-fast);
        }

        .product-card:hover .btn-quick {
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

        .badge.instock {
          background: var(--color-success-light);
          color: var(--color-success);
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
          box-shadow: var(--shadow-md);
          transition: all var(--transition-fast);
        }

        .wishlist-btn:hover {
          background: #fef2f2;
        }

        .wishlist-btn:hover svg {
          stroke: #ef4444;
        }

        .product-content {
          padding: 1.5rem;
        }

        .product-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem 0;
        }

        .product-desc {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 1rem 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-features {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .product-features span {
          font-size: 0.75rem;
          color: var(--color-success);
          background: var(--color-success-light);
          padding: 0.25rem 0.625rem;
          border-radius: 100px;
        }

        .product-pricing {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 0;
          border-top: 1px solid var(--color-border-light);
          border-bottom: 1px solid var(--color-border-light);
          margin-bottom: 1rem;
        }

        .current-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .price-note {
          display: block;
          font-size: 0.6875rem;
          color: var(--color-text-muted);
        }

        .btn-add {
          padding: 0.75rem 1.5rem;
          background: var(--color-bg-dark);
          color: #fff;
          font-size: 0.8125rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .btn-add:hover {
          background: #1f1f1f;
        }

        .products-cta {
          text-align: center;
          margin-top: 2rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 2rem;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: var(--radius-lg);
          transition: all var(--transition-fast);
        }

        .btn-secondary-large {
          background: var(--color-bg-dark);
          color: #fff;
        }

        .btn-secondary-large:hover {
          background: #1f1f1f;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }

        .btn-white {
          background: #fff;
          color: var(--color-text-primary);
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

        /* ============================================
           WHY SECTION
           ============================================ */

        .why-section {
          padding: 5rem 0;
          background: #fff;
        }

        .why-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .quality-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-top: 2rem;
        }

        .q-feature {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .q-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-success-light);
          border-radius: var(--radius-md);
          color: var(--color-success);
          flex-shrink: 0;
        }

        .q-text strong {
          display: block;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          margin-bottom: 0.25rem;
        }

        .q-text span {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
        }

        .why-image {
          display: flex;
          justify-content: center;
        }

        .image-card {
          position: relative;
        }

        .card-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          background: var(--color-bg-dark);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 100px;
          z-index: 10;
        }

        .card-image {
          width: 400px;
          height: 500px;
          background: linear-gradient(135deg, #f5f5f5, #e5e5e5);
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6rem;
          color: var(--color-accent);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: var(--radius-xl);
        }

        /* ============================================
           STATS SECTION
           ============================================ */

        .stats-section {
          padding: 4rem 0;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 3rem;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9375rem;
          color: var(--color-text-muted);
        }

        /* ============================================
           PROCESS SECTION
           ============================================ */

        .process-section {
          padding: 5rem 0;
          background: #fff;
        }

        .steps-container {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .step-card {
          flex: 1;
          min-width: 200px;
          max-width: 280px;
          text-align: center;
          padding: 2rem;
          background: #fafafa;
          border-radius: var(--radius-lg);
          transition: all var(--transition-fast);
        }

        .step-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .step-number {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-accent);
          margin-bottom: 1rem;
        }

        .step-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-accent-light);
          border-radius: var(--radius-lg);
          color: var(--color-accent);
        }

        .step-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem 0;
        }

        .step-card p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }

        .step-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-border);
          margin-top: 4rem;
        }

        /* ============================================
           TESTIMONIALS SECTION
           ============================================ */

        .testimonials-section {
          padding: 5rem 0;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .testimonial-card {
          padding: 2rem;
          background: #fff;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          transition: all var(--transition-fast);
        }

        .testimonial-card:hover {
          transform: translateY(-5px);
          box-shadow: var(--shadow-md);
        }

        .testimonial-card.featured {
          background: linear-gradient(135deg, #1a1a1a, #333);
          color: #fff;
        }

        .testimonial-card.featured .testimonial-text,
        .testimonial-card.featured .author-info span {
          color: rgba(255,255,255,0.8);
        }

        .testimonial-card.featured .author-info strong {
          color: #fff;
        }

        .testimonial-card.featured .author-avatar {
          background: linear-gradient(135deg, var(--color-accent), var(--color-success));
        }

        .testimonial-stars {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 1rem;
          color: #fbbf24;
        }

        .testimonial-text {
          font-size: 1rem;
          line-height: 1.7;
          color: var(--color-text-secondary);
          margin: 0 0 1.5rem 0;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .author-avatar {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-accent-light), #dbeafe);
          border-radius: 50%;
          font-weight: 600;
          color: var(--color-accent);
        }

        .author-info strong {
          display: block;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
        }

        .author-info span {
          display: block;
          font-size: 0.8125rem;
          color: var(--color-text-muted);
        }

        /* ============================================
           CTA SECTION
           ============================================ */

        .cta-section {
          padding: 6rem 0;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          position: relative;
          overflow: hidden;
        }

        .cta-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0);
          background-size: 40px 40px;
        }

        .cta-content {
          position: relative;
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
          color: #1a1a1a;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-radius: 100px;
          margin-bottom: 1.5rem;
        }

        .cta-section h2 {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 700;
          color: #fff;
          margin: 0 0 1rem 0;
          line-height: 1.2;
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

        /* Loading & Empty States */
        .products-loading {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .skeleton-card {
          aspect-ratio: 3/4;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: var(--radius-lg);
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .no-products {
          text-align: center;
          padding: 4rem 2rem;
        }

        .no-products-icon {
          font-size: 4rem;
          color: var(--color-accent);
          display: block;
          margin-bottom: 1rem;
        }

        .no-products h3 {
          font-size: 1.5rem;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem 0;
        }

        .no-products p {
          color: var(--color-text-muted);
          margin: 0;
        }

        /* ============================================
           RESPONSIVE DESIGN
           ============================================ */

        @media (max-width: 1024px) {
          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 2rem 1.5rem;
          }

          /* On tablet: image first, content second */
          .hero-content-side {
            order: 2;
          }

          .hero-product-side {
            order: 1;
            max-width: 500px;
            margin: 0 auto;
          }

          .hero-body {
            max-width: 100%;
          }

          .hero-cta-group {
            justify-content: center;
          }

          .hero-trust-row {
            justify-content: center;
          }

          .why-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .why-image {
            order: -1;
          }

          .card-image {
            width: 100%;
            max-width: 400px;
            height: 400px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .testimonials-grid {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin: 0 auto;
          }
        }

        @media (max-width: 768px) {
          .hero-premium {
            min-height: auto;
            padding: 2rem 0;
          }

          /* On mobile: content first, image second */
          .hero-content-side {
            order: 1 !important;
          }

          .hero-product-side {
            order: 2 !important;
            margin-top: 2rem;
          }

          .headline-serif,
          .headline-accent {
            font-size: 2.5rem;
          }

          .hero-cta-group {
            flex-direction: column;
            align-items: stretch;
          }

          .cta-primary,
          .cta-secondary {
            justify-content: center;
          }

          .hero-trust-row {
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
          }

          .trust-divider {
            display: none;
          }

          .features-container {
            flex-direction: column;
            align-items: flex-start;
          }

          .feature-divider {
            display: none;
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .quality-features {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          .stat-number {
            font-size: 2.25rem;
          }

          .steps-container {
            flex-direction: column;
            align-items: center;
          }

          .step-connector {
            display: none;
          }

          .step-card {
            max-width: 100%;
          }
        }

        @media (max-width: 480px) {
          .headline-serif,
          .headline-accent {
            font-size: 2rem;
          }

          .hero-body {
            font-size: 1rem;
          }

          .premium-badge {
            position: relative;
            margin-bottom: 1rem;
            left: auto;
            top: auto;
          }

          .price-card {
            position: relative;
            bottom: auto;
            right: auto;
            margin-top: 1rem;
          }

          .cta-buttons {
            flex-direction: column;
          }

          .cta-buttons .btn {
            width: 100%;
            justify-content: center;
          }
        }

        /* Add Google Fonts link */
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default Home;