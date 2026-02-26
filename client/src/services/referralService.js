// src/services/referralService.js
import api from './api';

/**
 * Referral Service
 * Handles all referral-related API calls
 */
const referralService = {
  
  // =====================================================
  // USER REFERRAL ENDPOINTS
  // =====================================================
  
  /**
   * Get full referral dashboard
   * @returns {Promise} Dashboard with stats, users, earnings
   */
  getDashboard: async () => {
    try {
      const data = await api.get('/referrals/dashboard');
      return data;
    } catch (error) {
      console.error('Get Referral Dashboard Error:', error);
      throw error;
    }
  },

  /**
   * Get referral link only
   * @returns {Promise} { referralCode, referralLink, referralType, percentage }
   */
  getReferralLink: async () => {
    try {
      const data = await api.get('/referrals/link');
      return data;
    } catch (error) {
      console.error('Get Referral Link Error:', error);
      throw error;
    }
  },

  /**
   * Withdraw referral balance to main wallet
   * @param {number} amount - Amount to withdraw
   * @returns {Promise}
   */
  withdrawToWallet: async (amount) => {
    try {
      const data = await api.post('/referrals/withdraw', { amount });
      return data;
    } catch (error) {
      console.error('Withdraw Referral Balance Error:', error);
      throw error;
    }
  },

  /**
   * Get paginated referral earnings
   * @param {Object} params - { page, limit, type }
   * @returns {Promise}
   */
  getEarnings: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const data = await api.get(`/referrals/earnings${queryString ? `?${queryString}` : ''}`);
      return data;
    } catch (error) {
      console.error('Get Referral Earnings Error:', error);
      throw error;
    }
  },

  /**
   * Get paginated referred users
   * @param {Object} params - { page, limit }
   * @returns {Promise}
   */
  getReferredUsers: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const data = await api.get(`/referrals/users${queryString ? `?${queryString}` : ''}`);
      return data;
    } catch (error) {
      console.error('Get Referred Users Error:', error);
      throw error;
    }
  },

  /**
   * Validate referral code (for registration)
   * @param {string} code - Referral code
   * @returns {Promise}
   */
  validateCode: async (code) => {
    try {
      const data = await api.get(`/auth/validate-referral/${code}`);
      return data;
    } catch (error) {
      console.error('Validate Referral Code Error:', error);
      throw error;
    }
  }
};

export default referralService;
