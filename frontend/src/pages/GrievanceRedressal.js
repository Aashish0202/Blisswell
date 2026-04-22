import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const GrievanceRedressal = () => {
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
            <span className="title-serif">Grievance</span>
            <span className="title-accent">Redressal</span>
          </h1>
          <p className="hero-subtitle">
            Mechanism for Grievance Redressal
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
                <a href="#compliance" className="nav-item">Compliance</a>
                <a href="#grievance-process" className="nav-item">Grievance Process</a>
                <a href="#tracking" className="nav-item">Tracking System</a>
                <a href="#officer" className="nav-item">Grievance Officer</a>
                <a href="#resolution" className="nav-item">Resolution Timeline</a>
                <a href="#escalation" className="nav-item">Escalation</a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              <div className="content-block">
                <p className="intro-text">
                  M/s {siteName || 'Blisswell'} has a diplomatic approach towards the Consumers and takes all precautions to offer the best services to them. However, in case of unavoidable circumstances company has devised a perfect system to solve the problems that Consumers may face.
                </p>
              </div>

              <div id="compliance" className="content-block">
                <h2>Compliance</h2>
                <p>
                  {siteName || 'Blisswell'} complies with the:
                </p>
                <ul>
                  <li><strong>Consumer Protection (E-Commerce) Rules, 2020</strong></li>
                  <li><strong>Consumer Protection Act, 2019</strong></li>
                </ul>
              </div>

              <div id="grievance-process" className="content-block">
                <h2>Grievance Process</h2>
                <p>
                  {siteName || 'Blisswell'} maintains a register to keep the track of Grievances received from Consumer in either of the mentioned modes:
                </p>
                <ul>
                  <li>Calls</li>
                  <li>Written Application</li>
                  <li>E-mail</li>
                  <li>Walk-in</li>
                  <li>Online Grievance Cell</li>
                </ul>
                <p>
                  Each Grievance is numbered (to facilitate easy tracking), acknowledged within <strong>48 hours</strong> of its receipt at the Grievance Redressal Cell and {siteName || 'Blisswell'} records the time taken to resolve it.
                </p>
              </div>

              <div id="tracking" className="content-block">
                <h2>Tracking System</h2>
                <p>
                  Grievances received are fed into the internal Grievance software. A <strong>unique track ID</strong> is generated against all the Grievances and is intimated to the Consumers on their registered E-mail ID and Mobile Number within 48 hours of its receipt at the {siteName || 'Blisswell'}'s end.
                </p>
                <p className="highlight-box">
                  <strong>Important:</strong> Consumers need to keep the unique track ID secure with them in order to track and follow-up the outcome.
                </p>
              </div>

              <div id="officer" className="content-block">
                <h2>Grievance Redressal Officer</h2>
                <p>
                  {siteName || 'Blisswell'} has appointed the following person as the Grievance Redressal Officer:
                </p>
                <div className="officer-card">
                  <div className="officer-detail">
                    <span className="label">Name:</span>
                    <span className="value">Mr. Akash Ramdas Chavhanke</span>
                  </div>
                  <div className="officer-detail">
                    <span className="label">E-Mail:</span>
                    <span className="value">akashchavhanke4@gmail.com</span>
                  </div>
                  <div className="officer-detail">
                    <span className="label">Contact No:</span>
                    <span className="value">9579702793</span>
                  </div>
                </div>
              </div>

              <div id="resolution" className="content-block">
                <h2>Resolution Timeline</h2>
                <p>
                  The Grievance Redressal Officer will redress the grievance within <strong>30 days</strong> from the date of receipt of Grievance.
                </p>
                <p>
                  In case there is a delay of more than 30 days in resolving the issue, he / she will inform the Consumers with reason of delay on their registered E-mail ID.
                </p>
              </div>

              <div id="escalation" className="content-block">
                <h2>Escalation</h2>
                <p>
                  In case the Consumer is still not satisfied with the resolution offered, he / she can approach:
                </p>
                <ul>
                  <li><strong>National Consumer Helpline</strong> - for effective mediation / resolution</li>
                  <li><strong>State Consumer Helpline</strong> - for effective mediation / resolution</li>
                  <li><strong>Consumer Forum / Court</strong> - of appropriate jurisdiction</li>
                </ul>
              </div>

              <div className="content-block">
                <h2>Contact Grievance Redressal Officer</h2>
                <div className="contact-info">
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>Mr. Akash Ramdas Chavhanke</span>
                  </div>
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span>akashchavhanke4@gmail.com</span>
                  </div>
                  <div className="contact-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    <span>9579702793</span>
                  </div>
                </div>
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

        /* Officer Card */
        .officer-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1rem 0;
        }

        .officer-detail {
          display: flex;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f5f5f5;
        }

        .officer-detail:last-child {
          border-bottom: none;
        }

        .officer-detail .label {
          font-weight: 600;
          color: #0a0a0a;
          width: 120px;
          flex-shrink: 0;
        }

        .officer-detail .value {
          color: #525252;
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

          .officer-detail {
            flex-direction: column;
            gap: 0.25rem;
          }

          .officer-detail .label {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default GrievanceRedressal;