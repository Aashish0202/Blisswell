import React, { useState, useEffect } from 'react';
import { useSiteSettings } from '../components/SiteSettingsProvider';

const ShippingPolicy = () => {
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
            <span className="title-serif">Shipping</span>
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
                <a href="#pickup" className="nav-item">Pickup from Outlet</a>
                <a href="#home-delivery" className="nav-item">Home Delivery</a>
                <a href="#payment" className="nav-item">Payment Methods</a>
                <a href="#delivery-charges" className="nav-item">Delivery Charges</a>
                <a href="#delivery-time" className="nav-item">Delivery Time</a>
                <a href="#delivery-process" className="nav-item">Delivery Process</a>
                <a href="#governing-law" className="nav-item">Governing Law</a>
              </nav>
            </aside>

            {/* Main Content */}
            <main className="main-content">
              <div className="content-block">
                <p className="intro-text">
                  Orders may be placed online on website of M/s {siteName || 'Blisswell'} at www.blisswell.in or picked up from {siteName || 'Blisswell'}'s office and / or from any of the franchisee outlet. Details are given below:
                </p>
              </div>

              <div id="pickup" className="content-block">
                <h2>Pickup from Office or Franchisee Outlet</h2>
                <p>Pickup orders can be placed at any of the outlet. Payment options for Pickup Orders can be Cash, Demand Draft, Credit Card and Debit Card.</p>

                <h3>Pickup Hours for All Outlets</h3>
                <ul>
                  <li><strong>Monday to Friday:</strong> 10:00 a.m. - 06:00 p.m.</li>
                  <li><strong>Saturday:</strong> 10:00 a.m. - 01:30 p.m.</li>
                  <li><strong>Sunday:</strong> Closed</li>
                </ul>
                <p>
                  Please refer to website: www.blisswell.in or for any latest updates and future information.
                </p>
              </div>

              <div id="home-delivery" className="content-block">
                <h2>Home Delivery</h2>
                <p>
                  Home Delivery orders can be placed for providing easy access & convenience on website: www.blisswell.in or by placing the order at office / franchisee office.
                </p>
              </div>

              <div id="payment" className="content-block">
                <h2>Payment</h2>
                <p>Payment mode options for these orders can be:</p>

                <h3>Orders Placed at Office</h3>
                <ul>
                  <li>Cash</li>
                  <li>Debit Card or Credit Card</li>
                  <li>Other Online Payments through Wallets</li>
                </ul>

                <h3>Online Orders</h3>
                <ul>
                  <li>Credit Card</li>
                  <li>Debit Card</li>
                  <li>Net Banking or Account Transfers through RTGS, NEFT or IMPS</li>
                  <li>Other Online Payments through Wallets</li>
                </ul>
              </div>

              <div id="delivery-charges" className="content-block">
                <h2>Charges for Home Delivery Orders</h2>
                <p>
                  Please note that delivery charges are determined at checkout and constitute the final fees for delivering goods to the customer.
                </p>
                <p className="highlight-box">
                  <strong>Important:</strong> The shipments are in perfect condition when the carrier takes possession of the same. By signing "received" on the delivery note, the recipient(s) acknowledges that the order was received in satisfactory condition.
                </p>
                <p>
                  <strong>Do not sign in the event of damages or product shortages.</strong> Hidden damages discovered after the carrier has left and all other discrepancies must be notified within <strong>twenty-four (24) hours</strong> of receipt of shipment.
                </p>
                <p>
                  Failure to notify {siteName || 'Blisswell'} for any shipping discrepancy or damage within twenty-four (24) hours of receipt of the shipment will cancel Customer(s) right to request a correction and shall be considered deemed acceptance of the products.
                </p>
              </div>

              <div id="delivery-time" className="content-block">
                <h2>Delivery Time</h2>
                <ul>
                  <li>Orders placed are typically shipped the very next business day</li>
                  <li>Orders placed on Saturday after 2:30 pm will be shipped on the following Monday</li>
                  <li>Delivery time will vary according to the location of Customer(s)</li>
                  <li>The average time for delivery is between <strong>2 – 7 days</strong></li>
                  <li>Delivery of products may not happen on Sundays or on major holidays as per the policy of the delivery partner</li>
                </ul>
              </div>

              <div id="delivery-process" className="content-block">
                <h2>Delivery of the Product</h2>
                <p>
                  There are various delivery models for delivery of purchased product to the Customers, as decided by {siteName || 'Blisswell'}. The risk of any damage, loss, or deterioration of the Products during the course or delivery or during transit shall be on M/s {siteName || 'Blisswell'} and not on the Customer.
                </p>
                <p>
                  {siteName || 'Blisswell'} represents and warrants that the products being delivered are not faulty and are exactly those products which are listed and advertised on the website and purchased by the Customer and meet all descriptions and specifications as provided on the Website: www.blisswell.in.
                </p>

                <h3>Address Verification</h3>
                <p>
                  Customer shipping address; pin code will be verified with the database of website before they proceed to pay for their purchase. In the event order is not serviceable by logistic service providers or the delivery address is not located in an area that is covered under the order confirmation form, Customers may provide an alternate shipping address on which the Product can be delivered by the logistics service provider.
                </p>

                <p className="highlight-box" style={{ background: '#fef3c7', borderLeftColor: '#f59e0b', color: '#92400e' }}>
                  <strong>Note:</strong> There is no guaranteed dispatch time and any information about the dispatch should not be relied upon as such. Therefore, time is not the essence of the bi-partite contract between the Customers and {siteName || 'Blisswell'} for purchase and sale of product on or through the Website. However, the product shall not be delivered to the Customer unless he / she makes the full and final payment.
                </p>

                <h3>Customer Obligations</h3>
                <p>
                  Customer shall be bound to take delivery of the Products purchased by him / her that are said to be in a deliverable state. Where Customer neglects or refuses to accept the delivery of the Products ordered by him / her, the Customer may be liable to {siteName || 'Blisswell'} for such non-acceptance. {siteName || 'Blisswell'} at its own discretion may call up the Customer to evaluate the reason of non-acceptance of the product.
                </p>

                <h3>Transfer of Title and Risk</h3>
                <ul>
                  <li>The title in the products and other rights and interest in the products shall directly pass on to the Customer from {siteName || 'Blisswell'} upon delivery of such Product and upon full payment of price of the Product</li>
                  <li>Upon delivery, the Customer are deemed to have accepted the Products</li>
                  <li>The risk of loss shall pass on to the Customer upon delivery of Product</li>
                  <li>Before accepting delivery of any Product, the Customer shall reasonably ensure that the Product's packaging is not damaged or tampered</li>
                </ul>
              </div>

              <div id="governing-law" className="content-block">
                <h2>Governing Law</h2>
                <p>
                  Any dispute(s) between Customer or its nominee(s) and {siteName || 'Blisswell'}, arising from this Policy, shall be referred to the sole arbitrator (appointed by {siteName || 'Blisswell'}) and same shall be adjudicated by such Arbitrator as per provisions of Arbitration Conciliation Act, 1996.
                </p>
                <p>
                  However, all proceedings shall come within the jurisdiction of <strong>District Courts in Nasik (Maharashtra, India)</strong> only and such arbitration proceedings shall be held in district courts of Nasik (Maharashtra, India) only.
                </p>
                <p>
                  The final decision of the Arbitrator would be binding upon both the parties. Any breach of this covenant by the Customer will make him liable for damages and legal costs to the {siteName || 'Blisswell'}.
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

export default ShippingPolicy;