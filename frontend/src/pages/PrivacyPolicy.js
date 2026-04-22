import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const PrivacyPolicy = () => {
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
            <span className="title-serif">Privacy</span>
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
                <a href="#information" className="nav-item">Information We Collect</a>
                <a href="#cookies" className="nav-item">Cookies</a>
                <a href="#security" className="nav-item">Security</a>
                <a href="#linking" className="nav-item">Linking to Website</a>
                <a href="#children" className="nav-item">Children's Privacy</a>
                <a href="#changes" className="nav-item">Policy Changes</a>
                <a href="#intellectual" className="nav-item">Intellectual Property</a>
                <a href="#contact" className="nav-item">Contact Us</a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              <div className="content-block">
                <p className="intro-text">
                  This privacy policy is an electronic record in the form of electronic contract formed under the Information Technology Act 2000 and the rules made there under and the amended provisions pertaining to electronic documents / records in various statutes as amended by the Information Technology Act, 2000. This privacy policy does not require any physical, electronic, or digital signature.
                </p>
                <p>
                  This privacy policy is a legally binding document between you and {siteName || 'Blisswell'}. The terms of this privacy policy will be effective upon your acceptance of the same (directly or indirectly in electronic form) and will govern the relationship between you and M/s {siteName || 'Blisswell'} for your use of website: www.blisswell.in.
                </p>
                <p>
                  This document is published and shall be construed in accordance with the provisions of the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data of Information) Rules, 2011 under Information Technology Act, 2000 that require publishing of the privacy policy for collection, use storage and transfer of sensitive personal data or information.
                </p>
                <p className="highlight-box">
                  <strong>Please read this privacy policy carefully.</strong> By using the website, you indicate that you understand, agree and consent to this privacy policy. If you do not agree with the terms of this privacy policy, please do not use this website. You hereby provide your unconditional consent or agreements to the {siteName || 'Blisswell'} as provided under section 43A and section 72A of Information Technology Act, 2000.
                </p>
              </div>

              <div id="information" className="content-block">
                <h2>What Information We Collect and How We Use It</h2>
                <p>The information that we collect on our website comes under two general categories:</p>
                <ul>
                  <li><strong>Personally Identifiable Information</strong></li>
                  <li><strong>Aggregate Information</strong></li>
                </ul>

                <h3>Personally Identifiable Information</h3>
                <p>
                  This refers to information that lets us know who you are or things specifically about you. To avail certain services on our website, Customers are required to provide certain information for the registration process namely:
                </p>
                <ul>
                  <li>Name</li>
                  <li>Email address</li>
                  <li>Sex</li>
                  <li>Age</li>
                  <li>PIN code</li>
                  <li>Credit card or debit card details</li>
                  <li>Medical records and history</li>
                  <li>Sexual orientation</li>
                  <li>Biometric information</li>
                  <li>Password</li>
                  <li>Occupation, interests, and the like</li>
                </ul>
                <p>
                  The Information as supplied by the Customers enables us to improve our website and provide you the most user-friendly experience. All required information is service dependent and we may use the above said information to, maintain, protect, and improve our services (including advertising services) and for developing new services.
                </p>
                <p>
                  Such information will not be considered as sensitive if it is freely available and accessible in the public domain or is furnished under the Right to Information Act, 2005 or any other law for the time being in force.
                </p>

                <h3>Aggregate Information</h3>
                <p>
                  This refers to information that does not distinguish you as a particular individual. This information includes your browser and operating system type, your IP address, URL (Uniform Source Locator) of the website that directed you to our site and any search terms you enter on our site.
                </p>
                <p>
                  Such information is aggregated by our web server to monitor the activities on the website and evaluate its performance. This helps us improve the features and functions on the website to provide you a satisfactory user experience. We might compile, publish, store, collect, promote, disclose, or use any Aggregate Information.
                </p>
                <p>
                  We generally do not correlate any Personally Identifiable Information with Aggregate Information. In case we do this, it will be protected as per the terms mentioned for Personally Identifiable Information in this Privacy Policy.
                </p>
              </div>

              <div id="cookies" className="content-block">
                <h2>Cookies</h2>
                <p>
                  {siteName || 'Blisswell'} through this website uses "cookies" to enable you to sign in into our services and to help personalize your online experience. As you browse, we may install cookies (tiny text files stored on your hard disk by a web page server) in your browser.
                </p>
                <p>
                  Cookies cannot harm your computer and they do not contain any personally identifiable information. One of the primary purposes of cookies is to store your preferences and other information on your computer in order to save your time by eliminating the need to repeatedly enter the same information and to display your personalized content on your later visits to website.
                </p>
                <p>Cookies also help us to improve our website and to deliver a better and more personalized service. Among other things, they enable us:</p>
                <ul>
                  <li>To estimate our audience size and usage pattern</li>
                  <li>To store information about your preferences, and so allow us to customize our website according to your individual interests</li>
                  <li>To increase the speed of your searches</li>
                  <li>To recognize you when you return to our website</li>
                </ul>
              </div>

              <div id="security" className="content-block">
                <h2>Security</h2>
                <p>
                  We are committed to ensuring that your information is secure. In order to prevent unauthorized access or disclosure, we have put in place suitable physical, electronic, and managerial procedures to safeguard and secure the information we collect online.
                </p>
                <p>
                  It is your sole responsibility to safeguard the password created for your online account. In case you suspect that your password has been compromised, contact {siteName || 'Blisswell'} via email at <strong>servicesblisswell@gmail.com</strong> as soon as possible.
                </p>
                <p>
                  Since your Customer / Direct Seller account and password are specific to you, you take full responsibility for any and all activity conducted on our site with your ID and password.
                </p>
              </div>

              <div id="linking" className="content-block">
                <h2>Linking to this Website</h2>
                <p>
                  Our website may include links to other websites that may be of interest to you. However, once you use these links to exit our site, please be aware that we do not have any control over these other websites.
                </p>
                <p>
                  Consequently, we cannot take responsibility for the protection and privacy of any information you provide while visiting such websites. These external websites are not governed by this privacy statement. We recommend exercising caution and reviewing the privacy statement applicable to the specific website you are visiting.
                </p>
              </div>

              <div id="children" className="content-block">
                <h2>Children's Privacy Protection</h2>
                <p>
                  The {siteName || 'Blisswell'} website, www.blisswell.in, is not intended for or directed towards children under the age of 18 years. We do not intentionally collect Personally Identifiable Information from children, and if we come across any such data on our site, we will promptly delete it.
                </p>
                <p>
                  Our website is designed for use by individuals who are 18 years of age or older.
                </p>
              </div>

              <div id="changes" className="content-block">
                <h2>Changes to this Statement</h2>
                <p>
                  Please check frequently for any updates or changes in this privacy policy before using this website or submitting any Personally Identifiable Information on this website. By using this website, you acknowledge acceptance of this Privacy Statement in effect at the time of use.
                </p>
              </div>

              <div id="intellectual" className="content-block">
                <h2>Intellectual Property and Use of Content on the Website</h2>
                <p>
                  {siteName || 'Blisswell'} website www.blisswell.in and the content on the same are protected by intellectual property rights, including copyrights, trade names and trademarks, including the Name, logo, are owned by {siteName || 'Blisswell'} or used by {siteName || 'Blisswell'} under a license or with permission from the owner of such rights.
                </p>
                <p>
                  The content protected by such intellectual property rights includes the design, layout, look, appearance, visuals, photographs; images, articles, stories, and other content on {siteName || 'Blisswell'} website www.blisswell.in.
                </p>
                <p>
                  The content on {siteName || 'Blisswell'} website www.blisswell.in may only be reproduced, distributed, published, or otherwise used only after prior written consent from the authorized signatory of {siteName || 'Blisswell'}.
                </p>
              </div>

              <div id="contact" className="content-block">
                <h2>How to Contact Us</h2>
                <p>
                  In accordance with Information Technology Act 2000, any person who is a user of this website may contact us with any questions or concerns regarding this privacy policy or the handling of your personal information.
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
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <span>Website: www.blisswell.in</span>
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
          margin: 1rem 0;
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

export default PrivacyPolicy;