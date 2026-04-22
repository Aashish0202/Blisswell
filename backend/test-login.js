/**
 * Test Login and Dashboard Data
 *
 * Run: node test-login.js <user_id1> <password1> <user_id2> <password2>
 * Example: node test-login.js BSW511510 password123 BSW423648 password456
 */

const axios = require('axios');

const API_URL = process.env.REACT_APP_API_URL || 'https://admin.blisswell.in/api';

// Disable caching
axios.defaults.headers.common['Cache-Control'] = 'no-cache';
axios.defaults.headers.common['Pragma'] = 'no-cache';
axios.defaults.headers.common['Expires'] = '0';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testUserLogin(userId, password, label) {
  log('cyan', `\n${'='.repeat(60)}`);
  log('cyan', `TESTING: ${label} (${userId})`);
  log('cyan', '='.repeat(60));

  try {
    // Step 1: Login
    log('yellow', `\n[STEP 1] Logging in as ${userId}...`);
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      user_id: userId,
      password: password
    });

    const token = loginResponse.data.token;
    const loginUser = loginResponse.data.user;

    log('green', `✓ Login successful`);
    log('blue', `  Login Response User:`);
    log('blue', `    - ID: ${loginUser.id}`);
    log('blue', `    - Name: ${loginUser.name}`);
    log('blue', `    - Email: ${loginUser.email}`);
    log('blue', `    - Referral Code: ${loginUser.referral_code}`);

    // Step 2: Get Dashboard (with token)
    log('yellow', `\n[STEP 2] Fetching dashboard with token...`);
    const dashboardResponse = await axios.get(`${API_URL}/user/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const dashboardUser = dashboardResponse.data.user;
    log('green', `✓ Dashboard fetched`);
    log('blue', `  Dashboard Response User:`);
    log('blue', `    - Name: ${dashboardUser.name}`);
    log('blue', `    - Email: ${dashboardUser.email}`);
    log('blue', `    - Referral Code: ${dashboardUser.referral_code}`);

    // Step 3: Compare
    log('yellow', `\n[STEP 3] Comparing data...`);

    const nameMatch = loginUser.name === dashboardUser.name;
    const emailMatch = loginUser.email === dashboardUser.email;
    const codeMatch = loginUser.referral_code === dashboardUser.referral_code;

    if (nameMatch && emailMatch && codeMatch) {
      log('green', `✓ USER DATA MATCHES - Correct!`);
      return { success: true, user: loginUser };
    } else {
      log('red', `✗ USER DATA MISMATCH - PROBLEM!`);
      log('red', `  Login Name: ${loginUser.name}`);
      log('red', `  Dashboard Name: ${dashboardUser.name}`);
      log('red', `  Login Email: ${loginUser.email}`);
      log('red', `  Dashboard Email: ${dashboardUser.email}`);
      log('red', `  Login Code: ${loginUser.referral_code}`);
      log('red', `  Dashboard Code: ${dashboardUser.referral_code}`);
      return {
        success: false,
        loginUser,
        dashboardUser
      };
    }

  } catch (error) {
    log('red', `✗ Error: ${error.message}`);
    if (error.response) {
      log('red', `  Status: ${error.response.status}`);
      log('red', `  Data: ${JSON.stringify(error.response.data)}`);
    }
    return { success: false, error: error.message };
  }
}

async function runTest() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    log('yellow', 'Usage: node test-login.js <user_id1> <password1> <user_id2> <password2>');
    log('yellow', 'Example: node test-login.js BSW511510 password1 BSW423648 password2');
    return;
  }

  const [user1Id, user1Pass, user2Id, user2Pass] = args;

  // Test User 1
  const result1 = await testUserLogin(user1Id, user1Pass, 'USER 1');

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test User 2
  const result2 = await testUserLogin(user2Id, user2Pass, 'USER 2');

  // Summary
  log('cyan', `\n${'='.repeat(60)}`);
  log('cyan', 'SUMMARY');
  log('cyan', '='.repeat(60));

  if (result1.success && result2.success) {
    log('green', '✓ ALL TESTS PASSED - Authentication working correctly!');
  } else {
    log('red', '✗ TESTS FAILED - There is a data mismatch issue');

    if (!result1.success && result1.loginUser && result1.dashboardUser) {
      log('red', `\n  User 1 (${user1Id}):`);
      log('red', `    Login returned: ${result1.loginUser.name} (${result1.loginUser.referral_code})`);
      log('red', `    Dashboard returned: ${result1.dashboardUser.name} (${result1.dashboardUser.referral_code})`);
    }

    if (!result2.success && result2.loginUser && result2.dashboardUser) {
      log('red', `\n  User 2 (${user2Id}):`);
      log('red', `    Login returned: ${result2.loginUser.name} (${result2.loginUser.referral_code})`);
      log('red', `    Dashboard returned: ${result2.dashboardUser.name} (${result2.dashboardUser.referral_code})`);
    }

    log('yellow', '\nPossible causes:');
    log('yellow', '1. Backend not restarted with new code');
    log('yellow', '2. CDN/Cloudflare caching API responses');
    log('yellow', '3. Browser caching old responses');
    log('yellow', '4. Database connection pooling issue');
  }

  log('cyan', '='.repeat(60));
}

runTest().catch(console.error);