import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const CancellationPolicy = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { siteName } = useSiteSettings();

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className="policy-wrapper">
      {/* Hero Section */}
      <section className="policy-hero">
        <div className="hero-bg-elements">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className={`hero-content ${isVisible ? 'visible' : ''}`}>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            <span>Legal</span>
          </div>
          <h1 className="hero-title">
            <span className="title-serif">Cancellation</span>
            <span className="title-accent">Policy</span>
          </h1>
          <p className="hero-subtitle">
            Last updated: April 2024
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="content-section">
        <div className="container">
          <div className="content-grid">
            {/* Sidebar Navigation */}
            <aside className="sidebar">
              <nav className="sidebar-nav">
                <a href="#introduction" className="nav-item active">Introduction</a>
                <a href="#cancellation-window" className="nav-item">Cancellation Window</a>
                <a href="#cancellation-process" className="nav-item">Cancellation Process</a>
                <a href="#refunds" className="nav-item">Refunds for Cancelled Orders</a>
                <a href="#late-cancellation" className="nav-item">Late Cancellation</a>
                <a href="#contact" className="nav-item">Contact Us</a>
                <a href="#policy-changes" className="nav-item">Policy Changes</a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              <div className="content-block">
                <p className="intro-text">
                  At {siteName || 'Blisswell'}, we understand that circumstances can change, and sometimes you may need to cancel an order. We aim to make the cancellation process as smooth and convenient as possible. This Cancellation Policy outlines the terms and conditions regarding order cancellations. By shopping with us, you agree to adhere to these policies.
                </p>
              </div>

              <div id="cancellation-window" className="content-block">
                <h2>Cancellation Window</h2>
                <p>
                  You may request the cancellation of your order within <strong>48 hours</strong> of placing it. We recommend reviewing your order carefully during this time to ensure it meets your requirements.
                </p>
              </div>

              <div id="cancellation-process" className="content-block">
                <h2>Cancellation Process</h2>
                <p>To cancel an order, please follow these steps:</p>
                <ul>
                  <li>Contact our customer support team at <strong>9011166599</strong> as soon as possible</li>
                  <li>Provide your <strong>order number</strong></li>
                  <li>State the <strong>reason for cancellation</strong></li>
                </ul>
              </div>

              <div id="refunds" className="content-block">
                <h2>Refunds for Cancelled Orders</h2>
                <p>
                  If your cancellation request is made within the specified cancellation window, we will process a <strong>full refund</strong> to your original payment method.
                </p>
                <p className="highlight-box">
                  <strong>Note:</strong> Refunds may take <strong>20 business days</strong> to reflect in your account, depending on your financial institution's policies.
                </p>
              </div>

              <div id="late-cancellation" className="content-block">
                <h2>Late Cancellation</h2>
                <p>
                  If you request a cancellation after the specified cancellation window, <strong>no refund will be issued</strong>.
                </p>
              </div>

              <div id="contact" className="content-block">
                <h2>Contact Us</h2>
                <p>
                  If you have any questions or concerns regarding our Cancellation Policy or need assistance with cancelling an order, please contact our customer support team:
                </p>
                <div className="contact-info">
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <span>Website: www.blisswell.in</span>
                  </div>
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    <span>Phone: 9011166599</span>
                  </div>
                </div>
                <p style={{ marginTop: '1rem' }}>
                  We are here to assist you with any cancellation-related inquiries.
                </p>
              </div>

              <div id="policy-changes" className="content-block">
                <h2>Policy Changes</h2>
                <p>
                  {siteName || 'Blisswell'} reserves the right to update this Cancellation Policy. Any changes will be posted on our website, and we encourage you to review this policy periodically.
                </p>
              </div>

              <div className="content-block">
                <h2>Thank You for Shopping with {siteName || 'Blisswell'}</h2>
                <p>
                  We appreciate your trust in {siteName || 'Blisswell'} for your shopping needs. We strive to provide excellent service and a hassle-free shopping experience. If you have any questions or need further assistance, please do not hesitate to contact us.
                </p>
              </div>
            </main>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');

        .policy-wrapper {
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
        .policy-hero {
          position: relative;
          min-height: 40vh;
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
        }

        .hero-title {
          font-family: 'Playfair Display', Georgia, serif;
          margin: 0 0 1rem 0;
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
          font-size: 1rem;
          color: #525252;
        }

        /* Content Section */
        .content-section {
          padding: 4rem 0;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 4rem;
        }

        /* Sidebar */
        .sidebar {
          position: sticky;
          top: 100px;
          height: fit-content;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .nav-item {
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #525252;
          text-decoration: none;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .nav-item:hover,
        .nav-item.active {
          background: #fff;
          color: #0a0a0a;
          font-weight: 500;
        }

        .nav-item.active {
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        /* Main Content */
        .main-content {
          max-width: 720px;
        }

        .content-block {
          margin-bottom: 3rem;
          padding-bottom: 3rem;
          border-bottom: 1px solid #e5e5e5;
        }

        .content-block:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .intro-text {
          font-size: 1.125rem;
          color: #525252;
          line-height: 1.8;
        }

        .content-block h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 1.5rem 0;
        }

        .content-block h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 1.5rem 0 0.75rem 0;
        }

        .content-block p {
          font-size: 1rem;
          color: #525252;
          line-height: 1.7;
          margin: 0 0 1rem 0;
        }

        .content-block ul {
          margin: 0 0 1rem 0;
          padding-left: 1.5rem;
        }

        .content-block li {
          font-size: 1rem;
          color: #525252;
          line-height: 1.7;
          margin-bottom: 0.5rem;
        }

        .content-block li strong {
          color: #0a0a0a;
        }

        .highlight-box {
          padding: 1rem 1.25rem;
          background: #dbeafe;
          border-left: 4px solid #2563eb;
          border-radius: 0 8px 8px 0;
          color: #1e40af !important;
        }

        /* Contact Info */
        .contact-info {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e5e5e5;
        }

        .contact-item svg {
          flex-shrink: 0;
          color: #2563eb;
          margin-top: 0.125rem;
        }

        .contact-item span {
          font-size: 0.9375rem;
          color: #525252;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .sidebar {
            position: relative;
            top: auto;
          }

          .sidebar-nav {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .nav-item {
            padding: 0.5rem 1rem;
            font-size: 0.8125rem;
          }
        }

        @media (max-width: 768px) {
          .policy-hero {
            min-height: auto;
            padding: 3rem 1.5rem;
          }

          .title-serif,
          .title-accent {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CancellationPolicy;