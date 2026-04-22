const Razorpay = require('razorpay');
require('dotenv').config();

// Initialize Razorpay only if valid credentials are provided
let razorpay = null;

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

// Check if credentials are valid (not placeholder values)
const hasValidCredentials = keyId &&
  keySecret &&
  !keyId.includes('test_1234567890') &&
  !keySecret.includes('your_razorpay');

if (hasValidCredentials) {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
} else {
  console.warn('⚠️  Razorpay credentials not configured. Payment features will be disabled.');
  console.warn('   Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file.');
}

module.exports = razorpay;