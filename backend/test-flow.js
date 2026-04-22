const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000/api';

// Test data
const testUsers = [];
let adminToken = '';
let productData = null;

// Helper function for API calls
async function api(endpoint, method = 'GET', body = null, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return response.json();
}

async function runTest() {
  console.log('🚀 Starting Full System Test\n');
  console.log('=' .repeat(60));

  // Step 1: Admin Login
  console.log('\n📋 Step 1: Admin Login');
  const adminLogin = await api('/auth/login', 'POST', { 
    user_id: 'ADMIN001', 
    password: 'admin123' 
  });
  
  if (!adminLogin.token) {
    console.error('❌ Admin login failed:', adminLogin);
    return;
  }
  adminToken = adminLogin.token;
  console.log('✅ Admin logged in successfully');

  // Step 2: Get Products
  console.log('\n📋 Step 2: Getting Products');
  const products = await api('/orders/products');
  if (!products.products || products.products.length === 0) {
    console.error('❌ No products found');
    return;
  }
  productData = products.products[0];
  console.log(`✅ Found product: ${productData.name} - ₹${productData.price}`);

  // Step 3: Register 10 users in referral chain
  console.log('\n📋 Step 3: Registering 10 Users (Referral Chain)');
  
  let previousReferralCode = 'ADMIN001'; // First user referred by admin
  
  for (let i = 1; i <= 10; i++) {
    const userData = {
      name: `TestUser${i}`,
      email: `testuser${i}@test.com`,
      mobile: `98765432${String(i).padStart(2, '0')}`,
      password: 'Test@123456',
      ref: previousReferralCode,
      terms_accepted: true
    };

    const regResult = await api('/auth/register', 'POST', userData);
    
    if (regResult.message && regResult.message.includes('successful')) {
      console.log(`✅ User ${i}: ${userData.name} registered (Ref: ${previousReferralCode})`);
      testUsers.push({
        ...userData,
        referral_code: regResult.user.referral_code,
        id: regResult.user.id
      });
      previousReferralCode = regResult.user.referral_code;
    } else {
      console.log(`❌ User ${i} registration failed:`, regResult.message);
    }
    
    // Small delay between registrations
    await new Promise(r => setTimeout(r, 100));
  }

  // Step 4: Login each user and get tokens
  console.log('\n📋 Step 4: Logging in Users');
  
  for (let i = 0; i < testUsers.length; i++) {
    const loginResult = await api('/auth/login', 'POST', {
      user_id: testUsers[i].referral_code,
      password: testUsers[i].password
    });
    
    if (loginResult.token) {
      testUsers[i].token = loginResult.token;
      console.log(`✅ User ${i + 1}: ${testUsers[i].name} logged in`);
    } else {
      console.log(`❌ User ${i + 1} login failed:`, loginResult.message);
    }
  }

  // Step 5: Add wallet balance to each user (Admin action)
  console.log('\n📋 Step 5: Adding ₹2800 Wallet Balance to Each User');
  
  for (let i = 0; i < testUsers.length; i++) {
    const depositResult = await api('/admin/wallet/deposit', 'POST', {
      user_id: testUsers[i].id,
      amount: 2800,
      description: 'Test deposit'
    }, adminToken);
    
    if (depositResult.message && depositResult.message.includes('success')) {
      console.log(`✅ User ${i + 1}: ${testUsers[i].name} - ₹2800 added to wallet`);
    } else {
      console.log(`❌ User ${i + 1} deposit failed:`, depositResult.message);
    }
  }

  // Step 6: Each user purchases the product
  console.log('\n📋 Step 6: Each User Purchases Product');
  
  for (let i = 0; i < testUsers.length; i++) {
    if (!testUsers[i].token) continue;
    
    const purchaseResult = await api('/orders/purchase', 'POST', {
      product_id: productData.id,
      payment_type: 'wallet'
    }, testUsers[i].token);
    
    if (purchaseResult.message && purchaseResult.message.includes('success')) {
      console.log(`✅ User ${i + 1}: ${testUsers[i].name} purchased ${productData.name}`);
      console.log(`   Order ID: ${purchaseResult.order?.id || purchaseResult.order_id}`);
    } else {
      console.log(`❌ User ${i + 1} purchase failed:`, purchaseResult.message);
    }
    
    await new Promise(r => setTimeout(r, 100));
  }

  // Step 7: Check Admin Dashboard Stats
  console.log('\n📋 Step 7: Checking Admin Dashboard Stats');
  const dashboard = await api('/admin/dashboard', 'GET', null, adminToken);
  
  console.log('\n📊 Dashboard Stats:');
  console.log(`   Total Users: ${dashboard.users?.total || 'N/A'}`);
  console.log(`   Active Users: ${dashboard.users?.active || 'N/A'}`);
  console.log(`   Total Orders: ${dashboard.orders?.total || 'N/A'}`);
  console.log(`   Total Sales: ₹${dashboard.orders?.total_sales || 'N/A'}`);
  console.log(`   Active Salary Cycles: ${dashboard.cycles?.active || 'N/A'}`);

  // Step 8: Check Salary Reports
  console.log('\n📋 Step 8: Checking Salary Reports');
  const salaryReport = await api('/admin/reports/salary?year=2026', 'GET', null, adminToken);
  
  if (salaryReport.data) {
    console.log('✅ Salary Report Generated');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Users Registered: ${testUsers.length}`);
  console.log(`✅ Product: ${productData.name} @ ₹${productData.price}`);
  console.log(`✅ Salary Duration: ${productData.salary_duration} months`);
  console.log(`✅ Salary Amount: ₹${productData.salary_amount}/month`);
  console.log('\n📋 Referral Chain:');
  testUsers.forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.name} (${user.referral_code})`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed! Check Admin Panel for reports.');
  console.log('='.repeat(60));
}

runTest().catch(console.error);
