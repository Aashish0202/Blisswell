const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const ensureDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create directories on startup
ensureDirectory('uploads/products/');
ensureDirectory('uploads/logos/');
ensureDirectory('uploads/gallery/');
ensureDirectory('uploads/profiles/');
ensureDirectory('uploads/banners/');
ensureDirectory('uploads/payment-proofs/');
ensureDirectory('uploads/payment-qr/');

// Storage configuration for product images
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage configuration for logo images
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/logos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg\+xml|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/svg+xml';

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, svg)'), false);
  }
};

// Product upload middleware
const uploadProductImage = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: imageFilter
});

// Logo upload middleware
const uploadLogoImage = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size for logos
  },
  fileFilter: imageFilter
});

// Storage configuration for gallery images
const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/gallery/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Gallery upload middleware
const uploadGalleryImage = multer({
  storage: galleryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: imageFilter
});

// Storage configuration for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profiles/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Profile upload middleware
const uploadProfileImage = multer({
  storage: profileStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size for profiles
  },
  fileFilter: imageFilter
});

// Storage configuration for offer banner images
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/banners/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Offer banner upload middleware
const uploadBannerImage = multer({
  storage: bannerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: imageFilter
});

// Raster-only filter for payment screenshots / QR codes (no SVG — these are
// served from /uploads and SVG can carry script).
const rasterImageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (/^\.(jpe?g|png|webp)$/.test(ext) && /^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG or WEBP images are allowed'), false);
  }
};

// Storage for QR payment screenshots — unguessable names, since /uploads is public
const paymentProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payment-proofs/');
  },
  filename: (req, file, cb) => {
    cb(null, 'proof-' + crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase());
  }
});

const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: rasterImageFilter
});

// Storage for the admin's static payment QR code
const paymentQrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/payment-qr/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'qr-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const uploadPaymentQr = multer({
  storage: paymentQrStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: rasterImageFilter
});

module.exports = {
  uploadPaymentProof,
  uploadPaymentQr,
  uploadProductImage,
  uploadBannerImage,
  uploadLogoImage,
  uploadGalleryImage,
  uploadProfileImage
};