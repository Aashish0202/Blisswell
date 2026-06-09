import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const PaymentSecurityDisclaimer = () => {
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
            <span className="title-serif">Payment Security</span>
            <span className="title-accent">Disclaimer</span>
          </h1>
          <p className="hero-subtitle">
            Your security is our priority
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
                <a href="#security-measures" className="nav-item">Security Measures</a>
                <a href="#customer-responsibility" className="nav-item">Customer Responsibility</a>
                <a href="#official-channels" className="nav-item">Official Channels</a>
                <a href="#suspicious-activity" className="nav-item">Suspicious Activity</a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              <div id="introduction" className="content-block">
                <p className="intro-text">
                  {siteName || 'Blisswell'} is committed to ensuring secure online transactions for all our customers. This disclaimer outlines our security practices and your responsibilities when making payments on our platform.
                </p>
              </div>

              <div id="security-measures" className="content-block">
                <h2>Security Measures</h2>
                <p>
                  {siteName || 'Blisswell'} uses commercially reasonable security measures and trusted third-party payment gateways to facilitate secure online transactions. However, the Company does not store complete debit/credit card details, CVV numbers, internet banking credentials, or UPI PINs on its servers unless specifically permitted under applicable laws and security standards.
                </p>
              </div>

              <div id="customer-responsibility" className="content-block">
                <h2>Customer Responsibility</h2>
                <p>
                  Customers are solely responsible for maintaining the confidentiality of their account credentials, passwords, OTPs, and payment-related information. The Company shall not be liable for any unauthorized transaction, fraud, hacking, phishing attack, or financial loss resulting from:
                </p>
                <ul>
                  <li>Customer negligence or unauthorized disclosure of confidential information</li>
                  <li>Use of unsecured devices, networks, or third-party applications</li>
                  <li>Transactions conducted through fake websites, fraudulent links, or unauthorized payment requests</li>
                  <li>Any event beyond the reasonable control of the Company, including cyber-attacks, technical failures, or force majeure events</li>
                </ul>
              </div>

              <div id="official-channels" className="content-block">
                <h2>Official Payment Channels</h2>
                <p>
                  Customers are advised to verify that all payments are made only through {siteName || 'Blisswell'}'s official website, mobile application, or authorized payment channels.
                </p>
                <div className="highlight-box">
                  <strong>Important:</strong> {siteName || 'Blisswell'} never requests OTPs, PINs, passwords, or banking credentials through calls, emails, text messages, or social media platforms.
                </div>
              </div>

              <div id="suspicious-activity" className="content-block">
                <h2>Reporting Suspicious Activity</h2>
                <p>
                  In the event of any suspicious activity or unauthorized transaction, customers should immediately:
                </p>
                <ul>
                  <li>Notify their respective bank/payment service provider</li>
                  <li>Contact {siteName || 'Blisswell'}'s official customer support team without delay</li>
                </ul>
                <p>
                  Prompt reporting helps protect your account and prevents further unauthorized transactions.
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
          margin: 1rem 0;
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

export default PaymentSecurityDisclaimer;