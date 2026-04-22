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
  getReferrals: () => api.get('/user/referrals'),
  getSalaryCycles: (page) => api.get(`/user/salary-cycles?page=${page}`),
  getPayouts: (page) => api.get(`/user/payouts?page=${page}`),
  getWalletTransactions: (page) => api.get(`/user/wallet/transactions?page=${page}`)
};

// Wallet API
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (page) => api.get(`/wallet/transactions?page=${page}`),
  createDepositOrder: (amount) => api.post('/wallet/deposit/order', { amount }),
  verifyPayment: (data) => api.post('/wallet/deposit/verify', data)
};

// Order API
export const orderAPI = {
  getProducts: () => api.get('/orders/products'),
  purchaseProduct: (productId) => api.post('/orders/purchase', { product_id: productId }),
  getMyOrders: (page) => api.get(`/orders/my-orders?page=${page}`),
  getOrderDetails: (id) => api.get(`/orders/${id}`)
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
  uploadProductImage: (formData) => api.post('/admin/products/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getSalaryCycles: (page, filters) => api.get(`/admin/salary/cycles?page=${page}`, { params: filters }),
  getPayouts: (page, filters) => api.get(`/admin/salary/payouts?page=${page}`, { params: filters }),
  getPayoutsWithKYC: (filters) => api.get('/admin/salary/payouts-with-kyc', { params: filters }),
  exportPayoutsExcel: (filters) => api.get('/admin/salary/payouts/export-excel', { params: filters, responseType: 'blob' }),
  updatePayoutStatus: (id, status) => api.put(`/admin/salary/payouts/${id}`, { status }),
  bulkUpdatePayouts: (ids, status) => api.put('/admin/salary/payouts/bulk', { payout_ids: ids, status }),
  getMonthlySummary: (month, year) => api.get(`/admin/salary/monthly-summary?month=${month}&year=${year}`),
  runClosing: () => api.post('/admin/salary/run-closing'),
  getSalesReport: (start, end) => api.get(`/admin/reports/sales?start_date=${start}&end_date=${end}`),
  getSalaryReport: (year) => api.get(`/admin/reports/salary?year=${year}`),
  getLiabilityReport: () => api.get('/admin/reports/liability'),
  getReferralReport: (page, filters) => api.get(`/admin/reports/referrals?page=${page}`, { params: filters }),
  getWalletReport: (page, filters) => api.get(`/admin/reports/wallet?page=${page}`, { params: filters }),
  getUserFinancialReport: (page, filters) => api.get(`/admin/reports/user-financial?page=${page}`, { params: filters }),
  getBusinessBonusReport: (page, filters) => api.get(`/admin/reports/business-bonus?page=${page}`, { params: filters }),
  getBonusPayouts: (filters) => api.get('/admin/bonus/payouts', { params: filters }),
  updateBonusPayoutStatus: (id, status) => api.put(`/admin/bonus/payouts/${id}`, { status }),
  recalculateBonuses: () => api.post('/admin/bonus/recalculate'),
  exportBonusPayoutsExcel: (filters) => api.get('/admin/bonus/payouts/export-excel', { params: filters, responseType: 'blob' }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
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
  updateKYC: (id, data) => api.put(`/admin/kyc/${id}`, data)
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