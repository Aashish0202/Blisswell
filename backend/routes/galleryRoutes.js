const express = require('express');
const router = express.Router();
const Gallery = require('../models/Gallery');

// Get all active gallery images (public)
router.get('/', async (req, res) => {
  try {
    const images = await Gallery.getActive();
    res.json({ images });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get gallery categories (public)
router.get('/categories', async (req, res) => {
  try {
    const categories = await Gallery.getCategories();
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;