const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const salaryController = require('../controllers/salaryController');
const Gallery = require('../models/Gallery');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { uploadProductImage, uploadLogoImage, uploadGalleryImage } = require('../middleware/upload');

// All routes are protected and admin only
router.use(verifyToken);
router.use(isAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// User Management
router.get('/users', adminController.getUsers);
router.get('/users/search', adminController.searchUsersForDeposit);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id/status', adminController.toggleUserStatus);
router.put('/users/:id/approve-pan', adminController.approvePAN);
router.put('/users/:id/gst', adminController.updateUserGST);
router.put('/users/:id/details', adminController.updateUserDetails);
router.post('/users/:id/login-as', adminController.loginAsUser);
router.post('/wallet/deposit', adminController.addWalletBalance);

// KYC Management
router.get('/kyc', adminController.getKYCSubmissions);
router.get('/kyc/user/:userId', adminController.getUserKYC);
router.put('/kyc/:id/approve', adminController.approveKYC);
router.put('/kyc/:id/reject', adminController.rejectKYC);
router.put('/kyc/:id', adminController.updateKYC);

// Order Management
router.get('/orders', adminController.getOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.post('/orders/expire', adminController.expireStuckOrders);

// Product Management
router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/upload-image', uploadProductImage.single('image'), adminController.uploadProductImage);

// Salary Management
router.get('/salary/cycles', adminController.getSalaryCycles);
router.get('/salary/payouts', adminController.getPayouts);
router.get('/salary/payouts-with-kyc', adminController.getPayoutsWithKYC);
router.get('/salary/payouts/export-excel', adminController.exportPayoutsExcel);
router.put('/salary/payouts/bulk', adminController.bulkUpdatePayouts);
router.put('/salary/payouts/:id', adminController.updatePayoutStatus);
router.get('/salary/daily-summary', salaryController.getDailyClosingSummary);
router.post('/salary/run-closing', salaryController.triggerDailyClosing);

// Reports
router.get('/reports/sales', adminController.getSalesReport);
router.get('/reports/salary', adminController.getSalaryReport);
router.get('/reports/liability', adminController.getLiabilityReport);
router.get('/reports/referrals', adminController.getReferralReport);
router.get('/reports/wallet', adminController.getWalletReport);
router.get('/reports/user-financial', adminController.getUserFinancialReport);
router.get('/reports/business-bonus', adminController.getBusinessBonusReport);

// Business Bonus Management
router.get('/bonus/payouts', adminController.getBonusPayouts);
router.get('/bonus/payouts/export-excel', adminController.exportBonusPayoutsExcel);
router.put('/bonus/payouts/:id', adminController.updateBonusPayoutStatus);
router.post('/bonus/recalculate', adminController.recalculateBonuses);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Site Settings (logo, name, etc.)
router.get('/site-settings', adminController.getSiteSettings);
router.put('/site-settings', adminController.updateSiteSettings);
router.post('/site-settings/upload-logo', uploadLogoImage.single('logo'), adminController.uploadLogoImage);

// Gallery Management
router.get('/gallery', async (req, res) => {
  try {
    const { page = 1, limit = 50, category, is_active } = req.query;
    const filters = {};
    if (category) filters.category = category;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const images = await Gallery.getAll(parseInt(page), parseInt(limit), filters);
    const total = await Gallery.count(filters);
    res.json({ images, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/gallery', async (req, res) => {
  try {
    const { title, description, category, image_url, display_order, is_active } = req.body;

    if (!title || !category || !image_url) {
      return res.status(400).json({ message: 'Title, category, and image are required' });
    }

    const id = await Gallery.create({
      title,
      description,
      category,
      image_url,
      display_order: display_order || 0,
      is_active: is_active !== undefined ? is_active : true
    });

    const image = await Gallery.findById(id);
    res.status(201).json({ message: 'Gallery image added', image });
  } catch (error) {
    console.error('Create gallery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/gallery/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, image_url, display_order, is_active } = req.body;

    const existing = await Gallery.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    await Gallery.update(id, updateData);
    const image = await Gallery.findById(id);
    res.json({ message: 'Gallery image updated', image });
  } catch (error) {
    console.error('Update gallery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/gallery/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Gallery.findById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }

    await Gallery.delete(id);
    res.json({ message: 'Gallery image deleted' });
  } catch (error) {
    console.error('Delete gallery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/gallery/upload-image', uploadGalleryImage.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }
  const imageUrl = `/uploads/gallery/${req.file.filename}`;
  res.json({ image_url: imageUrl });
});

// Migrate invoice numbers to new format (BSW1000001XX)
router.post('/migrate-invoices', async (req, res) => {
  const pool = require('../config/db');
  const connection = await pool.getConnection();

  try {
    console.log('Starting invoice number migration...');

    const [orders] = await connection.execute(
      `SELECT id, user_id, order_number, created_at FROM orders ORDER BY created_at ASC, id ASC`
    );

    if (orders.length === 0) {
      connection.release();
      return res.json({ success: true, message: 'No orders to migrate', count: 0 });
    }

    await connection.beginTransaction();

    const baseNumber = 1000000;
    const updates = [];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const paddedUserId = order.user_id.toString().padStart(2, '0');
      const newInvoiceNumber = `BSW1000000${paddedUserId}`;

      await connection.execute(
        'UPDATE orders SET order_number = ? WHERE id = ?',
        [newInvoiceNumber, order.id]
      );

      updates.push({
        id: order.id,
        old: order.order_number,
        new: newInvoiceNumber
      });
    }

    await connection.commit();
    connection.release();

    console.log(`Migration completed: ${orders.length} orders updated`);
    res.json({
      success: true,
      message: `Successfully migrated ${orders.length} orders`,
      count: orders.length,
      updates: updates.slice(0, 10) // Show first 10 as sample
    });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Migration error:', error);
    res.status(500).json({ success: false, message: 'Migration failed', error: error.message });
  }
});

module.exports = router;