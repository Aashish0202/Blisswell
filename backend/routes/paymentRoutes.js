const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { uploadPaymentProof, uploadPaymentQr } = require('../middleware/upload');

// Run a multer middleware, turning its errors (size/type) into a 400.
const withUpload = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large' : err.message;
      return res.status(400).json({ message });
    }
    next();
  });
};

router.use(verifyToken);

// User endpoints
router.get('/config', paymentController.getPaymentConfig);
router.post('/qr', withUpload(uploadPaymentProof.single('screenshot')), paymentController.submitQrPayment);
router.get('/qr/mine', paymentController.getMyQrPayments);

// Admin endpoints
router.get('/admin/qr', isAdmin, paymentController.adminListQrPayments);
router.put('/admin/qr/:id/approve', isAdmin, paymentController.adminApproveQrPayment);
router.put('/admin/qr/:id/reject', isAdmin, paymentController.adminRejectQrPayment);
router.get('/admin/settings', isAdmin, paymentController.adminGetPaymentSettings);
router.put('/admin/settings', isAdmin, paymentController.adminUpdatePaymentSettings);
router.post('/admin/settings/upload-qr', isAdmin, withUpload(uploadPaymentQr.single('image')), paymentController.adminUploadPaymentQr);

module.exports = router;
