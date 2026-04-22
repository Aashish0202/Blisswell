import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const Contact = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const {
    siteName,
    contact_phone,
    contact_email,
    contact_address,
    social_facebook,
    social_instagram,
    social_twitter,
    social_linkedin
  } = useSiteSettings();

  // Parse address for display
  const addressLines = (contact_address || 'BUSINESS PLAZA, A WING, SHOP NO -409, AADGOAN NAKA PANCHAWATI NASHIK, PIN - 422003, MAHARASHTRA').split(',').map(line => line.trim());
  const displayPhone = contact_phone || '+91 98765 43210';
  const displayEmail = contact_email || 'info@blisswell.in';

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="contact-wrapper">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="hero-bg-elements">
          <div className="glow glow-1"></div>
          <div className="glow glow-2"></div>
        </div>
        <div className={`hero-content ${isVisible ? 'visible' : ''}`}>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            <span>Get in Touch</span>
          </div>
          <h1 className="hero-title">
            <span className="title-serif">We'd Love to</span>
            <span className="title-accent">Hear From You</span>
          </h1>
          <p className="hero-subtitle">
            Have questions about our products or partnership opportunities?
            We're here to help you every step of the way.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Info */}
            <div className="contact-info">
              <h2>Contact Information</h2>
              <p>Fill out the form and our team will get back to you within 24 hours.</p>

              <div className="info-cards">
                <div className="info-card">
                  <div className="info-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <div className="info-content">
                    <strong>Phone</strong>
                    <span>{displayPhone}</span>
                    <span>Mon-Sat 9am to 6pm</span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div className="info-content">
                    <strong>Email</strong>
                    <span>{displayEmail}</span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div className="info-content">
                    <strong>Address</strong>
                    {addressLines.map((line, index) => (
                      <span key={index}>{line}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="social-section">
                <h3>Follow Us</h3>
                <div className="social-links">
                  {social_facebook && (
                    <a href={social_facebook} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </a>
                  )}
                  {social_instagram && (
                    <a href={social_instagram} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    </a>
                  )}
                  {social_twitter && (
                    <a href={social_twitter} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Twitter">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                      </svg>
                    </a>
                  )}
                  {social_linkedin && (
                    <a href={social_linkedin} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-wrapper">
              <form onSubmit={handleSubmit} className="contact-form">
                <h2>Send a Message</h2>

                {submitted && (
                  <div className="success-message">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>Thank you! We'll get back to you soon.</span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subject">Subject</label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select a subject</option>
                      <option value="product">Product Inquiry</option>
                      <option value="order">Order Support</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    rows="5"
                    required
                  ></textarea>
                </div>

                <button type="submit" className="submit-btn">
                  <span>Send Message</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section">
        <div className="map-container">
          <div className="map-placeholder">
            <div className="map-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h3>Visit Our Store</h3>
            <p>BUSINESS PLAZA, A WING, SHOP NO -409, AADGOAN NAKA PANCHAWATI NASHIK</p>
            <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="btn-directions">
              <span>Get Directions</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <div className="faq-header">
            <span className="section-label">FAQ</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-grid">
            <div className="faq-item">
              <div className="faq-question">
                <h3>What is the material of your bedsheets?</h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              <p className="faq-answer">All our bedsheets are made from 100% long-staple cotton, sourced from premium cotton farms. This ensures exceptional softness, durability, and breathability.</p>
            </div>
            <div className="faq-item">
              <div className="faq-question">
                <h3>How does the referral program work?</h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              <p className="faq-answer">When you purchase a product, you become eligible for our referral program. For every friend you refer who makes a purchase, you earn a monthly incentive for a fixed duration.</p>
            </div>
            <div className="faq-item">
              <div className="faq-question">
                <h3>What is your return policy?</h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              <p className="faq-answer">We offer a 7-day hassle-free return policy. If you're not satisfied with your purchase, you can return it within 7 days for a full refund. The product must be unused and in original packaging.</p>
            </div>
            <div className="faq-item">
              <div className="faq-question">
                <h3>Do you offer free shipping?</h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
              <p className="faq-answer">Yes! We offer free shipping on all orders above ₹999. For orders below this amount, a nominal shipping fee applies. We deliver across India.</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');

        .contact-wrapper {
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
        .contact-hero {
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

        /* Contact Section */
        .contact-section {
          padding: 5rem 0;
        }

        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 4rem;
        }

        .contact-info h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 0.75rem 0;
        }

        .contact-info > p {
          color: #525252;
          margin: 0 0 2rem 0;
        }

        .info-cards {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }

        .info-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .info-icon {
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

        .info-content strong {
          display: block;
          font-size: 0.9375rem;
          color: #0a0a0a;
          margin-bottom: 0.25rem;
        }

        .info-content span {
          display: block;
          font-size: 0.875rem;
          color: #525252;
        }

        .social-section {
          margin-top: 2rem;
        }

        .social-section h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 1rem 0;
        }

        .social-links {
          display: flex;
          gap: 0.75rem;
        }

        .social-link {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-radius: 12px;
          color: #525252;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }

        .social-link:hover {
          background: #2563eb;
          color: #fff;
          transform: translateY(-2px);
        }

        /* Contact Form */
        .contact-form-wrapper {
          background: #fff;
          border-radius: 24px;
          padding: 2.5rem;
          box-shadow: 0 10px 40px rgba(0,0,0,0.08);
        }

        .contact-form h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 1.5rem 0;
        }

        .success-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #d1fae5;
          color: #059669;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #0a0a0a;
          margin-bottom: 0.5rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.875rem 1rem;
          font-size: 0.9375rem;
          color: #0a0a0a;
          background: #fafafa;
          border: 1.5px solid #e5e5e5;
          border-radius: 12px;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-group textarea {
          resize: vertical;
          min-height: 120px;
        }

        .submit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1rem 2rem;
          background: #0a0a0a;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .submit-btn:hover {
          background: #1a1a1a;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        /* Map Section */
        .map-section {
          padding: 0;
        }

        .map-container {
          background: linear-gradient(135deg, #f5f5f5, #e5e5e5);
          height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-placeholder {
          text-align: center;
        }

        .map-icon {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-radius: 50%;
          color: #2563eb;
          margin: 0 auto 1.5rem;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .map-placeholder h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 0.5rem 0;
        }

        .map-placeholder p {
          color: #525252;
          margin: 0 0 1.5rem 0;
        }

        .btn-directions {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          background: #0a0a0a;
          color: #fff;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .btn-directions:hover {
          background: #1a1a1a;
          transform: translateY(-2px);
        }

        /* FAQ Section */
        .faq-section {
          padding: 5rem 0;
          background: #fff;
        }

        .faq-header {
          text-align: center;
          margin-bottom: 3rem;
        }

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
          font-size: clamp(2rem, 4vw, 2.5rem);
          font-weight: 700;
          color: #0a0a0a;
          margin: 0;
        }

        .faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .faq-item {
          background: #fafafa;
          padding: 1.5rem;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .faq-item:hover {
          background: #f5f5f5;
        }

        .faq-question {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .faq-question h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #0a0a0a;
          margin: 0 0 0.75rem 0;
        }

        .faq-question svg {
          flex-shrink: 0;
          color: #525252;
          margin-top: 0.25rem;
        }

        .faq-answer {
          font-size: 0.9375rem;
          color: #525252;
          line-height: 1.6;
          margin: 0;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .contact-grid {
            grid-template-columns: 1fr;
          }

          .faq-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .contact-hero {
            min-height: auto;
            padding: 3rem 1.5rem;
          }

          .title-serif,
          .title-accent {
            font-size: 2rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .contact-form-wrapper {
            padding: 1.5rem;
          }

          .map-container {
            height: 300px;
          }
        }
      `}</style>
    </div>
  );
};

export default Contact;