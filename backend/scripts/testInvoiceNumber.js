const pool = require('../config/db');

// Read-only preview of the invoice counter — does NOT allocate (allocating
// outside a confirm transaction would burn sequential numbers).
async function testInvoiceNumber() {
  const connection = await pool.getConnection();

  try {
    const [[counter]] = await connection.execute(
      'SELECT next_seq FROM invoice_counter WHERE id = 1'
    );
    console.log(`Next invoice number would be: BSW${1000000 + counter.next_seq}`);

    const [rows] = await connection.execute(
      `SELECT status, COUNT(*) as count, COUNT(order_number) as with_invoice
       FROM orders GROUP BY status`
    );
    console.log('\nOrders by status:');
    rows.forEach(r => console.log(`  ${r.status}: ${r.count} (${r.with_invoice} invoiced)`));
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

testInvoiceNumber();