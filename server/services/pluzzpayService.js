// services/pluzzpayService.js
const axios = require('axios');

const PLUZZPAY_API_URL = process.env.PLUZZPAY_API_URL || 'https://pluzzpay.com/api/v1';
const PLUZZPAY_API_KEY = process.env.PLUZZPAY_API_KEY;

class PluzzPayService {
  constructor() {
    this.client = axios.create({
      baseURL: PLUZZPAY_API_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': PLUZZPAY_API_KEY
      },
      timeout: 30000
    });
  }

  /**
   * Get list of supported banks
   */
  async getBanks() {
    try {
      const response = await this.client.get('/bank-transfer.php', {
        params: { action: 'getBanks' }
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to get banks');
      }

      return response.data.data.banks;
    } catch (error) {
      console.error('❌ PluzzPay getBanks error:', error.message);
      throw new Error('Failed to fetch banks list');
    }
  }

  /**
   * Verify account number and get account name
   */
  async verifyAccount(accountNumber, bankCode) {
    try {
      const response = await this.client.post('/bank-transfer.php', {
        action: 'lookup',
        accountNumber,
        bankCode
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Account verification failed');
      }

      return {
        accountName: response.data.data.account_name,
        accountNumber: response.data.data.account_number,
        bankCode: response.data.data.bank_code
      };
    } catch (error) {
      console.error('❌ PluzzPay verifyAccount error:', error.message);
      throw new Error(error.response?.data?.message || 'Account verification failed');
    }
  }

  /**
   * Process bank transfer (withdrawal)
   */
  async transfer(accountNumber, bankCode, amount, narration = 'Withdrawal') {
    try {
      const response = await this.client.post('/bank-transfer.php', {
        action: 'transfer',
        accountNumber,
        bankCode,
        amount: parseFloat(amount),
        narration: narration.substring(0, 50) // Max 50 chars
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Transfer failed');
      }

      return {
        success: true,
        reference: response.data.data.reference,
        sessionId: response.data.data.session_id,
        amount: response.data.data.amount,
        fee: response.data.data.fee || 0,
        status: response.data.data.status
      };
    } catch (error) {
      console.error('❌ PluzzPay transfer error:', error.message);
      throw new Error(error.response?.data?.message || 'Transfer failed');
    }
  }

  /**
   * Check transfer status
   */
  async checkTransferStatus(reference) {
    try {
      const response = await this.client.get('/bank-transfer.php', {
        params: {
          action: 'status',
          reference
        }
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Status check failed');
      }

      return response.data.data;
    } catch (error) {
      console.error('❌ PluzzPay status check error:', error.message);
      throw new Error('Failed to check transfer status');
    }
  }
}

module.exports = new PluzzPayService();
