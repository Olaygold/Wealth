// src/services/adminApi.js
import api from './api'; // Your existing axios instance

const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  updateUserStatus: (userId, data) => api.put(`/admin/users/${userId}/status`, data),

  // Transactions
  getTransactions: (params) => api.get('/admin/transactions', { params }),

  // Withdrawals
  getPendingWithdrawals: () => api.get('/admin/withdrawals/pending'),
  processWithdrawal: (transactionId, data) => api.put(`/admin/withdrawals/${transactionId}`, data),

  // Deposits
  getAmountMismatches: () => api.get('/admin/deposits/mismatches'),
  approveMismatch: (reference, data) => api.post(`/admin/deposits/approve-mismatch/${reference}`, data),

  // Rounds
  getRounds: (params) => api.get('/admin/rounds', { params }),
  getRoundDetails: (roundId) => api.get(`/admin/rounds/${roundId}/details`),
  cancelRound: (roundId, data) => api.put(`/admin/rounds/${roundId}/cancel`, data),

  // Settings
  getSettings: () => api.get('/admin/settings')
};

export default adminApi;
