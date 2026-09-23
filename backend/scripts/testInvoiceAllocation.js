// Smoke test: allocating inside a transaction that rolls back must NOT
// consume a sequential invoice number (this is the core guarantee).
const pool = require('../config/db');
const { allocateInvoiceNumber } = require('../utils/helpers');

(async () => {
  const conn = await pool.getConnection();
  try {
    const [[before]] = await conn.execute('SELECT next_seq FROM invoice_counter WHERE id = 1');

    await conn.beginTransaction();
    const num1 = await allocateInvoiceNumber(conn);
    const num2 = await allocateInvoiceNumber(conn);
    console.log('allocated inside tx:', num1, num2);
    await conn.rollback();

    const [[after]] = await conn.execute('SELECT next_seq FROM invoice_counter WHERE id = 1');
    console.log(`counter before=${before.next_seq} after rollback=${after.next_seq}`);
    console.log(after.next_seq === before.next_seq ? 'PASS: rollback does not burn numbers' : 'FAIL: counter advanced');

    // Now allocate for real (committed) to prove sequential issuance
    await conn.beginTransaction();
    const num3 = await allocateInvoiceNumber(conn);
    await conn.commit();
    console.log('committed allocation:', num3);
    await conn.execute('UPDATE invoice_counter SET next_seq = ? WHERE id = 1', [before.next_seq]);
    console.log(`counter restored to ${before.next_seq}`);
  } finally {
    conn.release();
    process.exit(0);
  }
})().catch(e => { console.error('ERR', e); process.exit(1); });