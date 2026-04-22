import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const ReturnExchangePolicy = () => {
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
            <span className="title-serif">Return / Exchange</span>
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
                <a href="#eligibility" className="nav-item">Eligibility</a>
                <a href="#return-period" className="nav-item">Return Period</a>
                <a href="#process" className="nav-item">Return Process</a>
                <a href="#conditions" className="nav-item">Return Conditions</a>
                <a href="#shipping" className="nav-item">Return Shipping</a>
                <a href="#inspection" className="nav-item">Inspection & Refund</a>
                <a href="#contact" className="nav-item">Contact Us</a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              <div className="content-block">
                <p className="intro-text">
                  This Return / Exchange Policy outlines the procedures and terms for returns and exchanges of products purchased from {siteName || 'Blisswell'}. Please read this policy carefully before making a purchase. By engaging with our products and services, you agree to the terms outlined herein.
                </p>
              </div>

              <div id="eligibility" className="content-block">
                <h2>Eligibility for Return / Exchanges</h2>
                <p>We accept return / exchanges under the following circumstances:</p>
                <ul>
                  <li>Defective or damaged products</li>
                  <li>Incorrect products received</li>
                  <li>Products not meeting quality expectations</li>
                  <li>Only regular priced items may be refunded, sale items cannot be refunded</li>
                  <li>If the item in question was marked as a gift when purchased and shipped directly to you, you will receive a gift credit for the value of your return</li>
                </ul>
              </div>

              <div id="return-period" className="content-block">
                <h2>Return / Exchange Period</h2>
                <p>
                  We offer return and / or exchange within the first <strong>07 days</strong> of your receipt of product. If 07 days have passed since receipt of the product, you will not be offered a return and / or exchange of any kind.
                </p>
              </div>

              <div id="process" className="content-block">
                <h2>Return / Exchange Process</h2>
                <p>To initiate a return / exchange, follow these steps:</p>
                <ol>
                  <li>Contact our customer support team at <strong>servicesblisswell@gmail.com</strong> or <strong>9011166599</strong></li>
                  <li>Provide your order number, product details, and reason for return / exchange</li>
                  <li>Our customer support team will guide you through the process and provide necessary instructions</li>
                </ol>
              </div>

              <div id="conditions" className="content-block">
                <h2>Return / Exchange Conditions</h2>
                <p>
                  In case of any dissatisfaction, manufacturing or packaging defect, Customers can return / exchange the product. The Customer must contact the Company from whom they had purchased the same, within <strong>07 days</strong> from the date of receipt of the product.
                </p>
                <p>They have to give a reason and return the said products along with the original customer order receipt copy / invoice.</p>

                <h3>Documents Required for Returning Products</h3>
                <ul>
                  <li>Product Return Form</li>
                  <li>Reason for return</li>
                  <li>Copy of Invoice</li>
                  <li>Products to be returned</li>
                </ul>

                <h3>Product Condition Requirements</h3>
                <ul>
                  <li>The product must be returned in its original packaging, along with all accessories and tags</li>
                  <li>The product must be unused and in the same condition as and when received</li>
                  <li>This policy does not apply to products that have been intentionally damaged or misused</li>
                  <li>Proof of purchase (order confirmation) is required for processing returns / exchanges</li>
                </ul>
              </div>

              <div id="shipping" className="content-block">
                <h2>Return Shipping</h2>
                <ul>
                  <li><strong>For defective, damaged, or incorrect products:</strong> Company will arrange return shipping and cover associated costs</li>
                  <li><strong>For products returned for reasons other than defects:</strong> The customer is responsible for return shipping costs</li>
                </ul>
              </div>

              <div id="inspection" className="content-block">
                <h2>Inspection and Return / Exchange</h2>
                <p>
                  Once the returned product is received and inspected, we will process the return or exchange. Refunds will be issued using the original payment method.
                </p>
                <p className="highlight-box">
                  <strong>Note:</strong> Please allow <strong>20 days</strong> for the refund to reflect in your account.
                </p>
              </div>

              <div id="policy-updates" className="content-block">
                <h2>Policy Updates</h2>
                <p>
                  We reserve the right to update this Return / Exchange Policy as needed. Any changes will be posted on our website, and the revised date will indicate the last update.
                </p>
              </div>

              <div id="contact" className="content-block">
                <h2>Contact Information</h2>
                <p>
                  For any questions, concerns, or requests related to returns or exchanges, please contact our customer support team:
                </p>
                <div className="contact-info">
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>servicesblisswell@gmail.com</span>
                  </div>
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    <span>9011166599</span>
                  </div>
                </div>
              </div>

              <div className="content-block">
                <p className="highlight-box" style={{ background: '#f0fdf4', borderLeftColor: '#059669', color: '#166534' }}>
                  By engaging with {siteName || 'Blisswell'} products and services, you acknowledge and agree to the terms outlined in this Return Policy.
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

        .content-block ul,
        .content-block ol {
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

export default ReturnExchangePolicy;