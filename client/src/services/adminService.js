
// src/services/adminService.js
import api from './api';

/**
 * Admin Service
 * Handles all admin API calls
 * 
 * All methods return: { success: boolean, data: {...}, message?: string }
 */
const adminService = {
  
  // =====================================================
  // DASHBOARD
  // =====================================================
  
  /**
   * Get admin dashboard statistics
   * @returns {Promise} Dashboard stats including users, financials, rounds, bets, pending actions
   */
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/dashboard');
      return response;
    } catch (error) {
      console.error('Admin Dashboard Error:', error);
      throw error;
    }
  },

  // =====================================================
  // USER MANAGEMENT
  // =====================================================
  
  /**
   * Get all users with optional filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} params.search - Search by username/email
   * @param {string} params.status - Filter by status: 'active' | 'inactive'
   * @param {string} params.kycStatus - Filter by KYC: 'pending' | 'approved' | 'rejected'
   * @param {string} params.sortBy - Sort field (default: 'createdAt')
   * @param {string} params.order - Sort order: 'ASC' | 'DESC'
   */
  getAllUsers: async (params = {}) => {
    try {
      // Clean up params - remove empty values
      const cleanParams = Object.entries(params)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await api.get(`/admin/users${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Get Users Error:', error);
      throw error;
    }
  },

  /**
   * Get detailed user information
   * @param {string} userId - User UUID
   */
  getUserDetails: async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response;
    } catch (error) {
      console.error('Get User Details Error:', error);
      throw error;
    }
  },

  /**
   * Update user status (activate/deactivate, KYC status)
   * @param {string} userId - User UUID
   * @param {Object} data - Update data
   * @param {boolean} data.isActive - Account active status
   * @param {string} data.kycStatus - KYC status: 'pending' | 'approved' | 'rejected'
   * @param {string} data.reason - Reason for the change
   */
  updateUserStatus: async (userId, data) => {
    try {
      const response = await api.put(`/admin/users/${userId}/status`, data);
      return response;
    } catch (error) {
      console.error('Update User Status Error:', error);
      throw error;
    }
  },

  /**
   * Credit user wallet (manual balance adjustment)
   * @param {string} userId - User UUID
   * @param {Object} data - Credit data
   * @param {number} data.amount - Amount to credit
   * @param {string} data.reason - Reason for credit
   */
  creditUserWallet: async (userId, data) => {
    try {
      const response = await api.post(`/admin/users/${userId}/credit`, data);
      return response;
    } catch (error) {
      console.error('Credit User Wallet Error:', error);
      throw error;
    }
  },

  /**
   * Debit user wallet (manual balance adjustment)
   * @param {string} userId - User UUID
   * @param {Object} data - Debit data
   * @param {number} data.amount - Amount to debit
   * @param {string} data.reason - Reason for debit
   */
  debitUserWallet: async (userId, data) => {
    try {
      const response = await api.post(`/admin/users/${userId}/debit`, data);
      return response;
    } catch (error) {
      console.error('Debit User Wallet Error:', error);
      throw error;
    }
  },

  /**
   * Search users (for upgrading to influencer)
   * @param {string} query
   */
  searchUsers: async (query) => {
    try {
      const data = await api.get(`/admin/users/search?q=${encodeURIComponent(query)}`);
      return data;
    } catch (error) {
      console.error('Search Users Error:', error);
      throw error;
    }
  },

  // =====================================================
  // TRANSACTIONS
  // =====================================================
  
  /**
   * Get all transactions with filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.type - Transaction type: 'deposit' | 'withdrawal' | 'bet_place' | 'bet_win' | 'bet_loss' | 'fee' | 'refund'
   * @param {string} params.status - Status: 'pending' | 'completed' | 'failed' | 'cancelled'
   * @param {string} params.userId - Filter by user ID
   * @param {string} params.startDate - Start date (ISO string)
   * @param {string} params.endDate - End date (ISO string)
   */
  getAllTransactions: async (params = {}) => {
    try {
      const cleanParams = Object.entries(params)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await api.get(`/admin/transactions${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Get Transactions Error:', error);
      throw error;
    }
  },

  /**
   * Get transaction details
   * @param {string} transactionId - Transaction UUID
   */
  getTransactionDetails: async (transactionId) => {
    try {
      const response = await api.get(`/admin/transactions/${transactionId}`);
      return response;
    } catch (error) {
      console.error('Get Transaction Details Error:', error);
      throw error;
    }
  },

  // =====================================================
  // WITHDRAWALS
  // =====================================================
  
  /**
   * Get all pending withdrawal requests
   */
  getPendingWithdrawals: async () => {
    try {
      const response = await api.get('/admin/withdrawals/pending');
      return response;
    } catch (error) {
      console.error('Get Pending Withdrawals Error:', error);
      throw error;
    }
  },

  /**
   * Get all withdrawals with filters
   * @param {Object} params - Query parameters
   */
  getAllWithdrawals: async (params = {}) => {
    try {
      const cleanParams = Object.entries(params)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await api.get(`/admin/withdrawals${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Get All Withdrawals Error:', error);
      throw error;
    }
  },

  /**
   * Process (approve/reject) a withdrawal
   * @param {string} transactionId - Transaction UUID
   * @param {Object} data - Process data
   * @param {string} data.action - 'approve' | 'reject'
   * @param {string} data.reason - Reason (required for rejection)
   */
  processWithdrawal: async (transactionId, data) => {
    try {
      const response = await api.put(`/admin/withdrawals/${transactionId}`, data);
      return response;
    } catch (error) {
      console.error('Process Withdrawal Error:', error);
      throw error;
    }
  },

  /**
   * Approve a withdrawal
   * @param {string} transactionId - Transaction UUID
   * @param {string} reason - Optional reason
   */
  approveWithdrawal: async (transactionId, reason = '') => {
    return adminService.processWithdrawal(transactionId, { 
      action: 'approve', 
      reason 
    });
  },

  /**
   * Reject a withdrawal
   * @param {string} transactionId - Transaction UUID
   * @param {string} reason - Rejection reason (required)
   */
  rejectWithdrawal: async (transactionId, reason) => {
    if (!reason) {
      throw new Error('Rejection reason is required');
    }
    return adminService.processWithdrawal(transactionId, { 
      action: 'reject', 
      reason 
    });
  },

  // =====================================================
  // DEPOSITS
  // =====================================================
  
  /**
   * Get deposits with amount mismatches (need manual review)
   */
  getAmountMismatches: async () => {
    try {
      const response = await api.get('/admin/deposits/mismatches');
      return response;
    } catch (error) {
      console.error('Get Amount Mismatches Error:', error);
      throw error;
    }
  },

  /**
   * Manually approve a deposit with amount mismatch
   * @param {string} reference - Deposit reference
   * @param {Object} data - Approval data
   * @param {number} data.creditAmount - Amount to credit to user
   */
  approveMismatch: async (reference, data) => {
    try {
      const response = await api.post(`/admin/deposits/approve-mismatch/${reference}`, data);
      return response;
    } catch (error) {
      console.error('Approve Mismatch Error:', error);
      throw error;
    }
  },

  /**
   * Reject a deposit with amount mismatch
   * @param {string} reference - Deposit reference
   * @param {Object} data - Rejection data
   * @param {string} data.reason - Rejection reason
   */
  rejectMismatch: async (reference, data) => {
    try {
      const response = await api.post(`/admin/deposits/reject-mismatch/${reference}`, data);
      return response;
    } catch (error) {
      console.error('Reject Mismatch Error:', error);
      throw error;
    }
  },

  /**
   * Get all deposits
   * @param {Object} params - Query parameters
   */
  getAllDeposits: async (params = {}) => {
    try {
      const cleanParams = Object.entries(params)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await api.get(`/admin/deposits${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Get All Deposits Error:', error);
      throw error;
    }
  },

  // =====================================================
  // ROUNDS
  // =====================================================
  
  /**
   * Get all rounds with filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.status - Filter by status: 'upcoming' | 'active' | 'locked' | 'completed' | 'cancelled'
   */
  getAllRounds: async (params = {}) => {
    try {
      const cleanParams = Object.entries(params)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await api.get(`/admin/rounds${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Get Rounds Error:', error);
      throw error;
    }
  },

  /**
   * Get detailed round information with all bets
   * @param {string} roundId - Round UUID
   */
  getRoundDetails: async (roundId) => {
    try {
      const response = await api.get(`/admin/rounds/${roundId}/details`);
      return response;
    } catch (error) {
      console.error('Get Round Details Error:', error);
      throw error;
    }
  },

  /**
   * Cancel a round (emergency action - refunds all bets)
   * @param {string} roundId - Round UUID
   * @param {Object} data - Cancel data
   * @param {string} data.reason - Reason for cancellation
   */
  cancelRound: async (roundId, data) => {
    try {
      if (!data.reason) {
        throw new Error('Cancellation reason is required');
      }
      const response = await api.put(`/admin/rounds/${roundId}/cancel`, data);
      return response;
    } catch (error) {
      console.error('Cancel Round Error:', error);
      throw error;
    }
  },

  // =====================================================
  // INFLUENCER MANAGEMENT
  // =====================================================

  /**
   * Get all influencers
   * @param {Object} params - { page, limit }
   */
  getAllInfluencers: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const data = await api.get(`/admin/influencers${queryString ? `?${queryString}` : ''}`);
      return data;
    } catch (error) {
      console.error('Get Influencers Error:', error);
      throw error;
    }
  },

  /**
   * Get influencer details
   * @param {string} userId
   */
  getInfluencerDetails: async (userId) => {
    try {
      const data = await api.get(`/admin/influencers/${userId}`);
      return data;
    } catch (error) {
      console.error('Get Influencer Details Error:', error);
      throw error;
    }
  },

  /**
   * Upgrade user to influencer
   * @param {string} userId
   * @param {number} percentage (1-10)
   */
  upgradeToInfluencer: async (userId, percentage) => {
    try {
      const data = await api.post(`/admin/influencers/${userId}`, { percentage });
      return data;
    } catch (error) {
      console.error('Upgrade to Influencer Error:', error);
      throw error;
    }
  },

  /**
   * Update influencer percentage
   * @param {string} userId
   * @param {number} percentage (1-10)
   */
  updateInfluencerPercentage: async (userId, percentage) => {
    try {
      const data = await api.put(`/admin/influencers/${userId}`, { percentage });
      return data;
    } catch (error) {
      console.error('Update Influencer Error:', error);
      throw error;
    }
  },

  /**
   * Downgrade influencer to normal
   * @param {string} userId
   */
  downgradeInfluencer: async (userId) => {
    try {
      const data = await api.delete(`/admin/influencers/${userId}`);
      return data;
    } catch (error) {
      console.error('Downgrade Influencer Error:', error);
      throw error;
    }
  },

  /**
   * Get platform referral stats
   */
  getReferralStats: async () => {
    try {
      const data = await api.get('/admin/referrals/stats');
      return data;
    } catch (error) {
      console.error('Get Referral Stats Error:', error);
      throw error;
    }
  },

  // =====================================================
  // SETTINGS
  // =====================================================
  
  /**
   * Get platform settings
   */
  getSettings: async () => {
    try {
      const response = await api.get('/admin/settings');
      return response;
    } catch (error) {
      console.error('Get Settings Error:', error);
      throw error;
    }
  },

  /**
   * Update platform settings
   * @param {Object} data - Settings to update
   */
  updateSettings: async (data) => {
    try {
      const response = await api.put('/admin/settings', data);
      return response;
    } catch (error) {
      console.error('Update Settings Error:', error);
      throw error;
    }
  },

  // =====================================================
  // BETS (Optional - if you need bet management)
  // =====================================================
  
  /**
   * Get all bets with filters
   * @param {Object} params - Query parameters
   */
  getAllBets: async (params = {}) => {
    try {
      const cleanParams = Object.entries(params)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const queryString = new URLSearchParams(cleanParams).toString();
      const response = await api.get(`/admin/bets${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Get Bets Error:', error);
      throw error;
    }
  },

  // =====================================================
  // REPORTS (Optional)
  // =====================================================
  
  /**
   * Get financial report
   * @param {Object} params - Date range and filters
   */
  getFinancialReport: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/reports/financial${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Get Financial Report Error:', error);
      throw error;
    }
  },

  /**
   * Get user activity report
   * @param {Object} params - Date range and filters
   */
  getUserActivityReport: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/reports/users${queryString ? `?${queryString}` : ''}`);
      return response;
    } catch (error) {
      console.error('Get User Activity Report Error:', error);
      throw error;
    }
  },

  // =====================================================
  // SYSTEM (Optional)
  // =====================================================
  
  /**
   * Get system health status
   */
  getSystemHealth: async () => {
    try {
      const response = await api.get('/admin/system/health');
      return response;
    } catch (error) {
      console.error('Get System Health Error:', error);
      throw error;
    }
  },

  /**
   * Clear system cache
   */
  clearCache: async () => {
    try {
      const response = await api.post('/admin/system/clear-cache');
      return response;
    } catch (error) {
      console.error('Clear Cache Error:', error);
      throw error;
    }
  }
};

export default adminService;
