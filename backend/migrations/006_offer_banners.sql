-- Offer banners shown at the top of the user dashboard during start_at..end_at.
-- Idempotent: the server also runs this CREATE on startup (OfferBanner.ensureTable).
CREATE TABLE IF NOT EXISTS offer_banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  image_url VARCHAR(500),
  link_url VARCHAR(500),
  link_text VARCHAR(100),
  start_at DATETIME NOT NULL,
  end_at DATETIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_offer_banners_window (is_active, start_at, end_at)
);
