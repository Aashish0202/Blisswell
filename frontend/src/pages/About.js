import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '../components/SiteSettingsProvider';
import { galleryAPI } from '../utils/api';

const About = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [missionImage, setMissionImage] = useState(null);
  const { siteName } = useSiteSettings();

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    fetchMissionImage();
  }, []);

  const fetchMissionImage = async () => {
    try {
      const response = await galleryAPI.getImages();
      const images = response.data?.images || [];
      // Find a good image for mission section (prefer Diamond collection)
      const missionImg = images.find(img =>
        img.image_url && (img.title?.toLowerCase().includes('diamond') || img.title?.toLowerCase().includes('marvel'))
      ) || images[0];
      if (missionImg) {
        setMissionImage(missionImg.image_url);
      }
    } catch (error) {
      console.error('Failed to fetch mission image:', error);
    }
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    const baseUrl = (process.env.REACT_APP_API_URL).replace('/api', '');
    return `${baseUrl}${image}`;
  };

  return (
    <div className="about-wrapper">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-bg-elements">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className={`about-hero-content ${isVisible ? 'visible' : ''}`}>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            <span>Our Story</span>
          </div>
          <h1 className="hero-title">
            <span className="title-serif">Crafting Comfort</span>
            <span className="title-accent">Since Day One</span>
          </h1>
          <p className="hero-subtitle">
            We believe everyone deserves the luxury of premium sleep. That's why we craft
            bedsheets that transform ordinary nights into extraordinary experiences.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-grid">
            <div className="mission-content">
              <span className="section-label">Our Mission</span>
              <h2 className="section-title">Redefining What Quality Means</h2>
              <p className="section-text">
                At {siteName || 'Blisswell'}, we're not just making bedsheets — we're crafting
                experiences. Every thread is carefully selected, every design thoughtfully curated,
                and every product rigorously tested to ensure it meets our exacting standards.
              </p>
              <p className="section-text">
                Our mission is simple: bring hotel-grade luxury to every home at fair prices,
                while creating opportunities for our community to grow together.
              </p>
              <div className="mission-values">
                <div className="value-item">
                  <div className="value-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <div className="value-text">
                    <strong>Premium Quality</strong>
                    <span>Only the finest materials</span>
                  </div>
                </div>
                <div className="value-item">
                  <div className="value-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div className="value-text">
                    <strong>Community First</strong>
                    <span>Growing together</span>
                  </div>
                </div>
                <div className="value-item">
                  <div className="value-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div className="value-text">
                    <strong>Trust & Transparency</strong>
                    <span>Honest practices always</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mission-visual">
              <div className="visual-card">
                <div className="visual-badge">Est. 2024</div>
                <div className="visual-image">
                  {missionImage ? (
                    <img src={getImageUrl(missionImage)} alt="Our Products" />
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
            <div className="stat-card">
              <div className="stat-number">10K+</div>
              <div className="stat-label">Happy Customers</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">50+</div>
              <div className="stat-label">Premium Designs</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">100%</div>
              <div className="stat-label">Cotton Quality</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">500+</div>
              <div className="stat-label">5-Star Reviews</div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Story Section */}
      <section className="story-section">
        <div className="container">
          <div className="story-header">
            <span className="section-label">Our Journey</span>
            <h2 className="section-title">From Vision to Reality</h2>
          </div>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-year">The Beginning</div>
                <h3>A Simple Idea</h3>
                <p>Started with a vision to make premium bedding accessible to everyone. We noticed a gap in the market — luxury bedsheets were either too expensive or poor quality.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-year">The Research</div>
                <h3>Finding the Perfect Cotton</h3>
                <p>Spent months sourcing the finest long-staple cotton from trusted farms. Every thread counts when you're crafting perfection.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-year">The Launch</div>
                <h3>{siteName || 'Blisswell'} is Born</h3>
                <p>Launched our first collection with a unique referral program. We wanted to reward our customers for sharing their love for quality.</p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-year">Today</div>
                <h3>Growing Together</h3>
                <p>Thousands of happy homes later, we continue to innovate and expand our collection while staying true to our core values.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <div className="values-header">
            <span className="section-label">What We Stand For</span>
            <h2 className="section-title">Our Core Values</h2>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon-large">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>Excellence</h3>
              <p>We never compromise on quality. Every product undergoes rigorous testing before reaching your home.</p>
            </div>
            <div className="value-card">
              <div className="value-icon-large">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <h3>Passion</h3>
              <p>We're passionate about what we do. Our love for quality textiles drives everything we create.</p>
            </div>
            <div className="value-card">
              <div className="value-icon-large">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Community</h3>
              <p>We believe in growing together. Our referral program helps families earn while they sleep comfortably.</p>
            </div>
            <div className="value-card">
              <div className="value-icon-large">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3>Integrity</h3>
              <p>Honest pricing, transparent practices. No hidden costs, no compromises — just pure quality.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Experience the Difference</h2>
            <p>Join thousands of happy customers who've transformed their sleep experience.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn btn-white">
                <span>Shop Collection</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link to="/contact" className="btn btn-outline-white">Get in Touch</Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');

        .about-wrapper {
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
        .about-hero {
          position: relative;
          min-height: 70vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
          overflow: hidden;
          padding: 4rem 1.5rem;
        }

        .about-bg-elements {
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
          width: 500px;
          height: 500px;
          background: rgba(37, 99, 235, 0.08);
          top: -100px;
          right: -100px;
        }

        .glow-2 {
          width: 400px;
          height: 400px;
          background: rgba(5, 150, 105, 0.06);
          bottom: -100px;
          left: -100px;
        }

        .about-hero-content {
          position: relative;
          text-align: center;
          max-width: 800px;
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .about-hero-content.visible {
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
          font-size: clamp(3rem, 6vw, 4.5rem);
          font-weight: 500;
          color: #0a0a0a;
        }

        .title-accent {
          display: block;
          font-size: clamp(3rem, 6vw, 4.5rem);
          font-weight: 500;
          background: linear-gradient(135deg, #2563eb, #059669);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: #525252;
          line-height: 1.8;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Section Styles */
        .section-label {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          color: #2563eb;
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
          color: #0a0a0a;
          margin: 0 0 1rem 0;
          line-height: 1.2;
        }

        .section-text {
          font-size: 1.0625rem;
          color: #525252;
          line-height: 1.8;
          margin: 0 0 1.5rem 0;
        }

        /* Mission Section */
        .mission-section {
          padding: 5rem 0;
          background: #fff;
        }

        .mission-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .mission-values {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 2rem;
        }

        .value-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #fafafa;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .value-item:hover {
          background: #f5f5f5;
        }

        .value-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border-radius: 12px;
          color: #2563eb;
          flex-shrink: 0;
        }

        .value-text strong {
          display: block;
          font-size: 0.9375rem;
          color: #0a0a0a;
        }

        .value-text span {
          font-size: 0.8125rem;
          color: #737373;
        }

        .mission-visual {
          display: flex;
          justify-content: center;
        }

        .visual-card {
          position: relative;
        }

        .visual-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          padding: 0.5rem 1rem;
          background: #0a0a0a;
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 100px;
          z-index: 10;
        }

        .visual-image {
          width: 400px;
          height: 500px;
          background: linear-gradient(135deg, #f5f5f5, #e5e5e5);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6rem;
          color: #2563eb;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .visual-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 24px;
        }

        /* Stats Section */
        .stats-section {
          padding: 4rem 0;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }

        .stat-card {
          text-align: center;
          padding: 2rem;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .stat-number {
          font-size: 3rem;
          font-weight: 700;
          color: #0a0a0a;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9375rem;
          color: #737373;
        }

        /* Story Section */
        .story-section {
          padding: 5rem 0;
          background: #fff;
        }

        .story-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .timeline {
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 20px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e5e5e5;
        }

        .timeline-item {
          position: relative;
          padding-left: 60px;
          padding-bottom: 3rem;
        }

        .timeline-item:last-child {
          padding-bottom: 0;
        }

        .timeline-marker {
          position: absolute;
          left: 12px;
          top: 8px;
          width: 18px;
          height: 18px;
          background: #2563eb;
          border-radius: 50%;
          border: 3px solid #fff;
          box-shadow: 0 0 0 3px #dbeafe;
        }

        .timeline-content {
          background: #fafafa;
          padding: 1.5rem;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .timeline-content:hover {
          background: #f5f5f5;
        }

        .timeline-year {
          font-size: 0.75rem;
          font-weight: 600;
          color: #2563eb;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .timeline-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 0.5rem 0;
        }

        .timeline-content p {
          font-size: 0.9375rem;
          color: #525252;
          margin: 0;
          line-height: 1.6;
        }

        /* Values Section */
        .values-section {
          padding: 5rem 0;
          background: #fafafa;
        }

        .values-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }

        .value-card {
          background: #fff;
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .value-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }

        .value-icon-large {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border-radius: 16px;
          color: #2563eb;
          margin: 0 auto 1.25rem;
        }

        .value-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 0.75rem 0;
        }

        .value-card p {
          font-size: 0.9375rem;
          color: #525252;
          margin: 0;
          line-height: 1.6;
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

        .btn-outline-white {
          background: transparent;
          color: #fff;
          border: 1.5px solid rgba(255,255,255,0.3);
        }

        .btn-outline-white:hover {
          background: rgba(255,255,255,0.1);
          border-color: #fff;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .mission-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .mission-visual {
            order: -1;
          }

          .visual-image {
            width: 100%;
            max-width: 400px;
            height: 400px;
          }

          .values-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .about-hero {
            min-height: auto;
            padding: 3rem 1.5rem;
          }

          .title-serif,
          .title-accent {
            font-size: 2.5rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stat-number {
            font-size: 2.25rem;
          }

          .values-grid {
            grid-template-columns: 1fr;
          }

          .timeline::before {
            left: 15px;
          }

          .timeline-item {
            padding-left: 50px;
          }

          .timeline-marker {
            left: 7px;
            width: 16px;
            height: 16px;
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

export default About;