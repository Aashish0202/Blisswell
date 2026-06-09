const pool = require('../config/db');
const { generateInvoiceNumber } = require('../utils/helpers');

async function testInvoiceGeneration() {
  const connection = await pool.getConnection();

  try {
    // Test invoice number generation for different users
    const userIds = [1, 2, 3, 15];

    console.log('Testing invoice number generation...\n');

    for (const userId of userIds) {
      const invoiceNumber = await generateInvoiceNumber(connection, userId);
      console.log(`User ${userId} would get invoice: ${invoiceNumber}`);
    }

    // Show current orders count
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM orders');
    console.log(`\nCurrent total orders: ${rows[0].count}`);
    console.log(`Next invoice would be: BSW${1000000 + rows[0].count + 1}XX`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

testInvoiceGeneration();