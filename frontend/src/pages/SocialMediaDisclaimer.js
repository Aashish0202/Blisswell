import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const SocialMediaDisclaimer = () => {
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
            <span className="title-serif">Social Media</span>
            <span className="title-accent">Disclaimer</span>
          </h1>
          <p className="hero-subtitle">
            Official communications and information guidelines
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
                <a href="#official-accounts" className="nav-item">Official Accounts</a>
                <a href="#unauthorized-content" className="nav-item">Unauthorized Content</a>
                <a href="#confidential-info" className="nav-item">Confidential Info</a>
                <a href="#enforcement" className="nav-item">Enforcement</a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              <div id="introduction" className="content-block">
                <p className="intro-text">
                  {siteName || 'Blisswell'} maintains official social media accounts for customer engagement. This disclaimer outlines guidelines for interacting with our brand on social media platforms and protects you from potential fraud.
                </p>
              </div>

              <div id="official-accounts" className="content-block">
                <h2>Official Social Media Accounts</h2>
                <p>
                  The Company maintains official social media accounts solely for informational, promotional, and customer engagement purposes. Any information, offers, announcements, or communications published on the Company's verified social media platforms shall be subject to the Company's official terms, policies, and applicable laws.
                </p>
                <p>
                  We encourage customers to follow our verified accounts for updates, promotions, and announcements related to our products and services.
                </p>
              </div>

              <div id="unauthorized-content" className="content-block">
                <h2>Unauthorized Accounts & Content</h2>
                <p>
                  Users are advised not to rely upon any information circulated through unofficial pages, groups, channels, or accounts claiming association with the Company. The Company shall not be responsible or liable for any loss, damage, fraud, misrepresentation, or unauthorized transaction arising from interactions with fake, unauthorized, or third-party social media accounts.
                </p>
                <div className="highlight-box warning">
                  <strong>Warning:</strong> Always verify that you are interacting with {siteName || 'Blisswell'}'s official verified accounts before engaging with any content or responding to offers.
                </div>
              </div>

              <div id="confidential-info" className="content-block">
                <h2>Confidential Information</h2>
                <p>
                  Customers and users are strictly advised not to share confidential or sensitive information through social media platforms, comments, direct messages, or any unofficial communication channels. This includes, but is not limited to:
                </p>
                <ul>
                  <li>Passwords and login credentials</li>
                  <li>One-Time Passwords (OTPs)</li>
                  <li>CVV details and card numbers</li>
                  <li>Banking credentials</li>
                  <li>Personal financial information</li>
                  <li>Identity documents or numbers</li>
                </ul>
                <p>
                  {siteName || 'Blisswell'} will never request such information through social media platforms.
                </p>
              </div>

              <div id="enforcement" className="content-block">
                <h2>Enforcement & Legal Action</h2>
                <p>
                  The Company reserves the right to remove, restrict, report, or take appropriate legal action against any misleading, defamatory, fraudulent, abusive, or unauthorized content or activity relating to its brand, products, services, or reputation on social media platforms.
                </p>
                <p>
                  If you encounter any suspicious or unauthorized accounts claiming to represent {siteName || 'Blisswell'}, please report them to us immediately through our official customer support channels.
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

        .highlight-box.warning {
          background: #fef3c7;
          border-left-color: #f59e0b;
          color: #92400e !important;
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

export default SocialMediaDisclaimer;