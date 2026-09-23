import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://admin.blisswell.in/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data), // data = { user_id, password }
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  validateReferralCode: (code) => api.get(`/auth/validate-referral/${code}`),
  validatePAN: (pan) => api.get(`/auth/validate-pan/${pan}`)
};

// User API
export const userAPI = {
  getDashboard: () => api.get('/user/dashboard'),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  uploadProfileImage: (formData) => api.post('/user/profile/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getKYC: () => api.get('/user/kyc'),
  submitKYC: (data) => api.post('/user/kyc', data),
  getReferrals: (page) => api.get(`/user/referrals${page ? `?page=${page}` : ''}`),
  getReferralSummary: () => api.get('/user/referrals/summary'),
  getReferralPurchases: (id) => api.get(`/user/referrals/${id}/purchases`),
  getDownlineTeam: (page, filters) => api.get(`/user/team/downline?page=${page}`, { params: filters }),
  // Level income + withdrawals (rank/repurchase model)
  getEarnings: () => api.get('/user/earnings'),
  getEarningsBreakdown: () => api.get('/user/earnings/breakdown'),
  getTeamIncome: () => api.get('/user/team-income'),
  getTeamIncomeHistory: (page, source = '') => api.get(`/user/team-income/history?page=${page}${source ? `&source=${source}` : ''}`),
  getWalletTransactions: (page) => api.get(`/user/wallet/transactions?page=${page}`)
};

// Withdrawal API (user-initiated)
export const withdrawalAPI = {
  request: (amount) => api.post('/withdrawals', { amount }),
  getMyWithdrawals: (page) => api.get(`/withdrawals${page ? `?page=${page}` : ''}`),
  getWithdrawalById: (id) => api.get(`/withdrawals/${id}`),
  getConfig: () => api.get('/withdrawals/config')
};

// Wallet API
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (page) => api.get(`/wallet/transactions?page=${page}`),
  createDepositOrder: (amount) => api.post('/wallet/deposit/order', { amount }),
  verifyPayment: (data) => api.post('/wallet/deposit/verify', data)
};

// Contact API (public)
export const contactAPI = {
  submit: (data) => api.post('/contact', data)
};

// Order API
export const orderAPI = {
  getProducts: () => api.get('/orders/products'),
  purchaseProduct: (productId, designName) => api.post('/orders/purchase', { product_id: productId, design_name: designName || null }),
  getMyOrders: (page) => api.get(`/orders/my-orders?page=${page}`),
  getOrderDetails: (id) => api.get(`/orders/${id}`),
  // Direct payment endpoints
  createPaymentOrder: (productId, designName) => api.post('/orders/create-payment-order', { product_id: productId, design_name: designName || null }),
  verifyAndPurchase: (data) => api.post('/orders/verify-and-purchase', data),
  recordCancelledPayment: (data) => api.post('/orders/record-cancelled', data),
  recordFailedPayment: (data) => api.post('/orders/record-failed', data),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (page, filters) => api.get(`/admin/users?page=${page}`, { params: filters }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  toggleUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  approvePAN: (id) => api.put(`/admin/users/${id}/approve-pan`),
  loginAsUser: (id) => api.post(`/admin/users/${id}/login-as`),
  searchUsers: (query) => api.get(`/admin/users/search?query=${query}`),
  addWalletBalance: (data) => api.post('/admin/wallet/deposit', data),
  getOrders: (page, filters) => api.get(`/admin/orders?page=${page}`, { params: filters }),
  updateOrderStatus: (id, status) => api.put(`/admin/orders/${id}/status`, { status }),
  getProducts: () => api.get('/admin/products'),
  createProduct: (data) => api.post('/admin/products', data),
  updateProduct: (id, data) => api.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`),
  runAutoRepurchase: (userId) => api.post('/admin/auto-repurchase/run', { user_id: userId }),
  uploadProductImage: (formData) => api.post('/admin/products/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // Reports (new income model)
  getSalesReport: (start, end) => api.get(`/admin/reports/sales?start_date=${start}&end_date=${end}`),
  getTeamIncomeReport: (page, filters) => api.get(`/admin/reports/team-income?page=${page}`, { params: filters }),
  getWithdrawalReport: (page, filters) => api.get(`/admin/reports/withdrawals?page=${page}`, { params: filters }),
  getUserEarningsReport: (page, filters) => api.get(`/admin/reports/user-earnings?page=${page}`, { params: filters }),
  getReferralReport: (page, filters) => api.get(`/admin/reports/referrals?page=${page}`, { params: filters }),
  getWalletReport: (page, filters) => api.get(`/admin/reports/wallet?page=${page}`, { params: filters }),
  getUserFinancialReport: (page, filters) => api.get(`/admin/reports/user-financial?page=${page}`, { params: filters }),
  getRankReport: (page, filters) => api.get(`/admin/reports/ranks?page=${page}`, { params: filters }),
  // User detailed report (active users list + single-user complete history)
  getUserReportList: (page, filters) => api.get(`/admin/reports/user-list?page=${page}`, { params: filters }),
  getUserDetailReport: (userId) => api.get(`/admin/reports/user-detail/${userId}`),
  // Withdrawal processing (admin)
  getAllWithdrawals: (page, filters) => api.get(`/withdrawals/admin/all?page=${page}`, { params: filters }),
  processWithdrawal: (id) => api.put(`/withdrawals/admin/${id}/process`),
  rejectWithdrawal: (id, reason) => api.put(`/withdrawals/admin/${id}/reject`, { reason }),
  reverseWithdrawal: (id) => api.put(`/withdrawals/admin/${id}/reverse`),
  // Settings (income settings + audit log)
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  getSettingsAuditLogs: (page) => api.get(`/admin/settings/audit${page ? `?page=${page}` : ''}`),
  getSiteSettings: () => api.get('/admin/site-settings'),
  updateSiteSettings: (data) => api.put('/admin/site-settings', data),
  uploadLogoImage: (formData) => api.post('/admin/site-settings/upload-logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  // KYC Management
  getKYCSubmissions: (page, filters) => api.get(`/admin/kyc?page=${page}`, { params: filters }),
  getUserKYC: (userId) => api.get(`/admin/kyc/user/${userId}`),
  approveKYC: (id) => api.put(`/admin/kyc/${id}/approve`),
  rejectKYC: (id, reason) => api.put(`/admin/kyc/${id}/reject`, { reason }),
  updateKYC: (id, data) => api.put(`/admin/kyc/${id}`, data),
  // User Management
  updateUserDetails: (userId, data) => api.put(`/admin/users/${userId}/details`, data),
  updateUserGST: (userId, gstNumber) => api.put(`/admin/users/${userId}/gst`, { gst_number: gstNumber }),
  // Invoice Migration
  migrateInvoices: () => api.post('/admin/migrate-invoices')
};

// Site Settings API (public)
export const siteAPI = {
  getSettings: () => api.get('/settings/site')
};

// Gallery API (public)
export const galleryAPI = {
  getImages: () => api.get('/gallery'),
  getCategories: () => api.get('/gallery/categories')
};

// Support Tickets API
export const ticketAPI = {
  createTicket: (data) => api.post('/tickets', data),
  getUserTickets: () => api.get('/tickets/my'),
  getTicketById: (id) => api.get(`/tickets/${id}`),
  addMessage: (id, message) => api.post(`/tickets/${id}/message`, { message }),
  closeTicket: (id) => api.put(`/tickets/${id}/close`),
  // Admin
  getAllTickets: (page, filters) => api.get(`/tickets/admin/all?page=${page}`, { params: filters }),
  updateTicketStatus: (id, status) => api.put(`/tickets/admin/${id}/status`, { status })
};

export default api;