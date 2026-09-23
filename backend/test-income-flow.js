// End-to-end smoke test for the new income model.
// Run: node test-income-flow.js   (backend must be running on :5000)
const BASE = 'http://localhost:5000/api';

async function j(path, opts = {}) {
  const res = await fetch(BASE + path, opts);
  let body;
  try { body = await res.json(); } catch { body = { _raw: await res.text() }; }
  return { status: res.status, body };
}
function auth(token, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  return opts;
}

const stamp = () => Date.now();
let adminToken, aToken, bToken;
let A = {}, B = {};

(async () => {
  console.log('\n=== 1. Admin login ===');
  let r = await j('/auth/login', auth(null, 'POST', { user_id: 'ADMIN001', password: 'admin123' }));
  console.log(r.status, JSON.stringify(r.body).slice(0, 120));
  adminToken = r.body.token;

  console.log('\n=== 2. Register user A (no referrer) ===');
  r = await j('/auth/register', auth(null, 'POST', {
    name: 'User A', email: `a${stamp()}@test.com`, mobile: `9${String(stamp()).slice(-9)}`,
    state: 'Maharashtra', address: '123 Test St, Nashik',
    pan_number: 'ABCDE1234F', password: 'pass123', terms_accepted: 'true', ref: 'ADMIN001'
  }));
  console.log(r.status, JSON.stringify(r.body).slice(0, 200));
  A.id = r.body.user && r.body.user.id;
  A.referral_code = r.body.user && r.body.user.referral_code;
  A.password = 'pass123';

  console.log('\n=== 3. Login A ===');
  r = await j('/auth/login', auth(null, 'POST', { user_id: A.referral_code, password: 'pass123' }));
  console.log(r.status, JSON.stringify(r.body).slice(0, 120));
  aToken = r.body.token;

  console.log('\n=== 4. A cashback state (before purchase) ===');
  r = await j('/cashback/state', auth(aToken));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\n=== 5. Admin deposits 1000 to A ===');
  r = await j('/admin/wallet/deposit', auth(adminToken, 'POST', { userId: A.id, amount: 1000 }));
  console.log(r.status, JSON.stringify(r.body).slice(0, 120));

  console.log('\n=== 6. A purchases Door Mat (wallet) ===');
  r = await j('/orders/purchase', auth(aToken, 'POST', { product_id: 1 }));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\n=== 7. A cashback state (after purchase) ===');
  r = await j('/cashback/state', auth(aToken));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\n=== 8. A claims cashback (1st) ===');
  r = await j('/cashback/claim', auth(aToken, 'POST'));
  console.log(r.status, JSON.stringify(r.body));
  console.log('\n=== 8b. A claims cashback (2nd, same day → idempotent) ===');
  r = await j('/cashback/claim', auth(aToken, 'POST'));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\n=== 9. Register user B (referred by A) ===');
  r = await j('/auth/register', auth(null, 'POST', {
    name: 'User B', email: `b${stamp()}@test.com`, mobile: `8${String(stamp()).slice(-9)}`,
    state: 'Maharashtra', address: '456 Test St, Nashik',
    pan_number: 'ABCDE5678J', password: 'pass123', terms_accepted: 'true', ref: A.referral_code
  }));
  console.log(r.status, JSON.stringify(r.body).slice(0, 200));
  B.id = r.body.user && r.body.user.id;
  B.referral_code = r.body.user && r.body.user.referral_code;

  console.log('\n=== 10. Login B ===');
  r = await j('/auth/login', auth(null, 'POST', { user_id: B.referral_code, password: 'pass123' }));
  console.log(r.status, JSON.stringify(r.body).slice(0, 120));
  bToken = r.body.token;

  console.log('\n=== 11. Admin deposits 1000 to B ===');
  r = await j('/admin/wallet/deposit', auth(adminToken, 'POST', { userId: B.id, amount: 1000 }));
  console.log(r.status, JSON.stringify(r.body).slice(0, 120));

  console.log('\n=== 12. B purchases Door Mat → team income to A (L1=100) ===');
  r = await j('/orders/purchase', auth(bToken, 'POST', { product_id: 1 }));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\n=== 13. A team-income summary ===');
  r = await j('/user/team-income', auth(aToken));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\n=== 14. A earnings breakdown ===');
  r = await j('/user/earnings/breakdown', auth(aToken));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\n=== 15. A dashboard ===');
  r = await j('/user/dashboard', auth(aToken));
  console.log(r.status, JSON.stringify(r.body).slice(0, 600));

  console.log('\n=== 16. A withdrawal request (likely outside 7-10 AM IST → 403) ===');
  r = await j('/withdrawals', auth(aToken, 'POST', { amount: 200 }));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\n=== 17. A my withdrawals ===');
  r = await j('/withdrawals', auth(aToken));
  console.log(r.status, JSON.stringify(r.body));

  console.log('\nDONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });