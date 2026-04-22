/**
 * Authentication Test Script
 * Run this to test if login and user data are correctly isolated
 *
 * Usage: node test-auth.js <email1> <password1> <email2> <password2>
 * Or use referral codes: node test-auth.js <referral_code1> <password1> <referral_code2> <password2>
 */

const axios = require('axios');

const API_URL = process.env.REACT_APP_API_URL || 'https://admin.blisswell.in/api';

// Disable caching for axios
axios.defaults.headers.common['Cache-Control'] = 'no-cache';
axios.defaults.headers.common['Pragma'] = 'no-cache';
axios.defaults.headers.common['Expires'] = '0';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAuth() {
  try {
    log('cyan', '='.repeat(60));
    log('cyan', 'AUTHENTICATION ISOLATION TEST');
    log('cyan', '='.repeat(60));
    log('blue', `API URL: ${API_URL}`);
    log('blue', `Time: ${new Date().toISOString()}`);
    log('cyan', '-'.repeat(60));

    // Test 1: Health Check
    log('yellow', '\n[TEST 1] Health Check...');
    try {
      const health = await axios.get(`${API_URL}/health`);
      log('green', `✓ Server is running`);
      log('blue', `  Status: ${health.data.status}`);
      log('blue', `  Environment: ${health.data.environment}`);
    } catch (err) {
      log('red', `✗ Server health check failed: ${err.message}`);
      return;
    }

    // Test 2: Check Cache Headers
    log('yellow', '\n[TEST 2] Checking Cache Headers...');
    try {
      const response = await axios.get(`${API_URL}/health`, { validateStatus: () => true });
      const headers = response.headers;

      const cacheControl = headers['cache-control'] || 'NOT SET';
      const pragma = headers['pragma'] || 'NOT SET';
      const expires = headers['expires'] || 'NOT SET';

      log('blue', `  Cache-Control: ${cacheControl}`);
      log('blue', `  Pragma: ${pragma}`);
      log('blue', `  Expires: ${expires}`);

      if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) {
        log('green', `✓ Cache headers are properly set`);
      } else {
        log('red', `✗ Cache headers may allow caching - THIS IS A PROBLEM!`);
        log('yellow', `  The server needs to restart to apply the new cache headers.`);
      }
    } catch (err) {
      log('red', `✗ Header check failed: ${err.message}`);
    }

    // Test 3: Site Settings (Public endpoint)
    log('yellow', '\n[TEST 3] Testing Public Endpoint (Site Settings)...');
    try {
      const settings = await axios.get(`${API_URL}/settings/site`);
      log('green', `✓ Site settings retrieved`);
      log('blue', `  Site Name: ${settings.data.settings?.site_name || 'N/A'}`);
    } catch (err) {
      log('red', `✗ Site settings failed: ${err.response?.data?.message || err.message}`);
    }

    log('cyan', '\n' + '='.repeat(60));
    log('cyan', 'MANUAL TESTING INSTRUCTIONS');
    log('cyan', '='.repeat(60));
    log('yellow', '\nTo test authentication isolation:');
    log('blue', '1. Open browser in INCOGNITO/PRIVATE mode');
    log('blue', '2. Go to the login page');
    log('blue', '3. Open Developer Tools (F12) → Network tab');
    log('blue', '4. Check "Disable cache" in Network tab');
    log('blue', '5. Login as User A');
    log('blue', '6. Note the user data returned (name, email, referral_code)');
    log('blue', '7. Logout');
    log('blue', '8. Clear browser cache (Ctrl+Shift+Delete)');
    log('blue', '9. Login as User B (different account)');
    log('blue', '10. Check if the user data is different from User A');

    log('cyan', '\n' + '-'.repeat(60));
    log('yellow', '\nIf you still see wrong user data:');
    log('red', '\n1. RESTART THE BACKEND SERVER');
    log('blue', '   pm2 restart all');
    log('blue', '   OR: sudo systemctl restart blisswell');
    log('blue', '   OR: pkill -f "node server.js" && cd /path/to/backend && node server.js &');

    log('red', '\n2. CLEAR CDN/CLOUDFLARE CACHE');
    log('blue', '   If using Cloudflare: Purge all cache');
    log('blue', '   If using nginx: Check nginx configuration');

    log('red', '\n3. CHECK FOR REVERSE PROXY CACHING');
    log('blue', '   nginx config should NOT have proxy_cache for /api/');

    log('cyan', '\n' + '='.repeat(60));

  } catch (error) {
    log('red', `Test failed: ${error.message}`);
  }
}

// Test login with specific credentials if provided
async function testLogin(userA_id, userA_pass, userB_id, userB_pass) {
  log('cyan', '\n' + '='.repeat(60));
  log('cyan', 'TESTING LOGIN WITH PROVIDED CREDENTIALS');
  log('cyan', '='.repeat(60));

  try {
    // Login User A
    log('yellow', `\n[USER A] Logging in with: ${userA_id}`);
    const loginA = await axios.post(`${API_URL}/auth/login`, {
      user_id: userA_id,
      password: userA_pass
    });

    const tokenA = loginA.data.token;
    const userA = loginA.data.user;

    log('green', `✓ User A logged in`);
    log('blue', `  ID: ${userA.id}`);
    log('blue', `  Name: ${userA.name}`);
    log('blue', `  Email: ${userA.email}`);
    log('blue', `  Referral Code: ${userA.referral_code}`);

    // Get User A's dashboard
    log('yellow', `\n[USER A] Fetching dashboard...`);
    const dashA = await axios.get(`${API_URL}/user/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    log('blue', `  Dashboard User Name: ${dashA.data.user?.name}`);
    log('blue', `  Dashboard User Email: ${dashA.data.user?.email}`);
    log('blue', `  Dashboard Referral Code: ${dashA.data.user?.referral_code}`);

    // Validate User A data matches
    if (dashA.data.user?.name === userA.name && dashA.data.user?.email === userA.email) {
      log('green', `✓ User A dashboard data matches login data`);
    } else {
      log('red', `✗ User A dashboard data DOES NOT match login data!`);
      log('red', `  Expected: ${userA.name} (${userA.email})`);
      log('red', `  Got: ${dashA.data.user?.name} (${dashA.data.user?.email})`);
    }

    // Login User B
    log('yellow', `\n[USER B] Logging in with: ${userB_id}`);
    const loginB = await axios.post(`${API_URL}/auth/login`, {
      user_id: userB_id,
      password: userB_pass
    });

    const tokenB = loginB.data.token;
    const userB = loginB.data.user;

    log('green', `✓ User B logged in`);
    log('blue', `  ID: ${userB.id}`);
    log('blue', `  Name: ${userB.name}`);
    log('blue', `  Email: ${userB.email}`);
    log('blue', `  Referral Code: ${userB.referral_code}`);

    // Get User B's dashboard
    log('yellow', `\n[USER B] Fetching dashboard...`);
    const dashB = await axios.get(`${API_URL}/user/dashboard`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    log('blue', `  Dashboard User Name: ${dashB.data.user?.name}`);
    log('blue', `  Dashboard User Email: ${dashB.data.user?.email}`);
    log('blue', `  Dashboard Referral Code: ${dashB.data.user?.referral_code}`);

    // Validate User B data matches
    if (dashB.data.user?.name === userB.name && dashB.data.user?.email === userB.email) {
      log('green', `✓ User B dashboard data matches login data`);
    } else {
      log('red', `✗ User B dashboard data DOES NOT match login data!`);
      log('red', `  Expected: ${userB.name} (${userB.email})`);
      log('red', `  Got: ${dashB.data.user?.name} (${dashB.data.user?.email})`);
    }

    // Cross-check: User A's token should NOT give User B's data
    log('yellow', `\n[CROSS-CHECK] Verifying token isolation...`);

    // Fetch User A's dashboard again with User A's token
    const dashA2 = await axios.get(`${API_URL}/user/dashboard`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    if (dashA2.data.user?.name === userA.name && dashA2.data.user?.email === userA.email) {
      log('green', `✓ User A's token still returns User A's data (correct)`);
    } else {
      log('red', `✗ User A's token returns WRONG data!`);
      log('red', `  Expected: ${userA.name}`);
      log('red', `  Got: ${dashA2.data.user?.name}`);
    }

    // Fetch User B's dashboard again with User B's token
    const dashB2 = await axios.get(`${API_URL}/user/dashboard`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    if (dashB2.data.user?.name === userB.name && dashB2.data.user?.email === userB.email) {
      log('green', `✓ User B's token still returns User B's data (correct)`);
    } else {
      log('red', `✗ User B's token returns WRONG data!`);
      log('red', `  Expected: ${userB.name}`);
      log('red', `  Got: ${dashB2.data.user?.name}`);
    }

    log('cyan', '\n' + '='.repeat(60));
    log('green', '✓ ALL TESTS PASSED - Authentication working correctly!');
    log('cyan', '='.repeat(60));

  } catch (error) {
    log('red', `\n✗ TEST FAILED: ${error.message}`);
    if (error.response) {
      log('red', `  Status: ${error.response.status}`);
      log('red', `  Data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Run tests
const args = process.argv.slice(2);
if (args.length >= 4) {
  // Run with provided credentials
  testLogin(args[0], args[1], args[2], args[3]);
} else {
  // Run basic tests
  testAuth();
}