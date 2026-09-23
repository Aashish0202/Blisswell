const { v4: uuidv4 } = require('uuid');

// Generate unique referral code (format: BSW000000)
const generateReferralCode = async (pool) => {
  // Keep generating until we find a unique code
  let code;
  let exists = true;

  while (exists) {
    // Generate 6-digit number padded with zeros
    const num = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    code = `BSW${num}`;

    // Check if code already exists
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE referral_code = ?',
      [code]
    );
    exists = rows.length > 0;
  }

  return code;
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Validate PAN format
const validatePAN = (pan) => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
};

// Validate mobile number
const validateMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

// Generate order number (legacy)
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
};

// Allocate the next sequential invoice number: BSW + 1000000 + running seq
// (BSW1000001, BSW1000002, ...). MUST be called inside the transaction that
// CONFIRMS the payment — the counter row is locked FOR UPDATE so concurrent
// confirmations stay strictly sequential, and the allocation rolls back with
// the payment if it fails. Never call this for pending/failed payments.
const allocateInvoiceNumber = async (connection) => {
  const [rows] = await connection.execute(
    'SELECT next_seq FROM invoice_counter WHERE id = 1 FOR UPDATE'
  );
  const seq = rows[0].next_seq;
  await connection.execute(
    'UPDATE invoice_counter SET next_seq = next_seq + 1 WHERE id = 1'
  );
  return `BSW${1000000 + seq}`;
};

// Calculate pagination
const calculatePagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

// Format date
const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  if (format === 'DD-MM-YYYY') return `${day}-${month}-${year}`;
  return `${year}-${month}-${day}`;
};

module.exports = {
  generateReferralCode,
  formatCurrency,
  validatePAN,
  validateMobile,
  generateOrderNumber,
  allocateInvoiceNumber,
  calculatePagination,
  formatDate
};