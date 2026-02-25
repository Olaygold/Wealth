// src/services/adminService.js
import api from './api';

const adminService = {
  // ==================== DASHBOARD ====================
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response;
  },

  // ==================== USERS ====================
  getAllUsers: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/users?${queryString}`);
    return response;
  },

  getUserDetails: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response;
  },

  updateUserStatus: async (userId, data) => {
    const response = await api.put(`/admin/users/${userId}/status`, data);
    return response;
  },

  // ==================== TRANSACTIONS ====================
  getAllTransactions: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/transactions?${queryString}`);
    return response;
  },

  // ==================== WITHDRAWALS ====================
  getPendingWithdrawals: async () => {
    const response = await api.get('/admin/withdrawals/pending');
    return response;
  },

  processWithdrawal: async (transactionId, data) => {
    const response = await api.put(`/admin/withdrawals/${transactionId}`, data);
    return response;
  },

  // ==================== DEPOSITS ====================
  getAmountMismatches: async () => {
    const response = await api.get('/admin/deposits/mismatches');
    return response;
  },

  approveMismatch: async (reference, data) => {
    const response = await api.post(`/admin/deposits/approve-mismatch/${reference}`, data);
    return response;
  },

  // ==================== ROUNDS ====================
  getAllRounds: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await api.get(`/admin/rounds?${queryString}`);
    return response;
  },

  getRoundDetails: async (roundId) => {
    const response = await api.get(`/admin/rounds/${roundId}/details`);
    return response;
  },

  cancelRound: async (roundId, data) => {
    const response = await api.put(`/admin/rounds/${roundId}/cancel`, data);
    return response;
  },

  // ==================== SETTINGS ====================
  getSettings: async () => {
    const response = await api.get('/admin/settings');
    return response;
  },
};

export default adminService;
