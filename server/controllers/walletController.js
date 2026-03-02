
// controllers/walletController.js
const { Wallet, Transaction, User, VirtualAccount, PendingDeposit, BankAccount } = require('../models');
const { validateAmount } = require('../utils/validators');
const { generateReference } = require('../utils/helpers');
const { sequelize } = require('../config/database');
const crypto = require('crypto');
const axios = require('axios');

// =====================================================
// PLUZZPAY SERVICE
// =====================================================

const PLUZZPAY_API_URL = process.env.PLUZZPAY_API_URL || 'https://pluzzpay.com/api/v1';
const PLUZZPAY_API_KEY = process.env.PLUZZPAY_API_KEY;

const pluzzpayClient = axios.create({
  baseURL: PLUZZPAY_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': PLUZZPAY_API_KEY
  },
  timeout: 30000
});

// PluzzPay API Functions
const pluzzpayService = {
  // Get list of banks
  async getBanks() {
    try {
      const response = await pluzzpayClient.get('/bank-transfer.php', {
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
  },

  // Verify account number
  async verifyAccount(accountNumber, bankCode) {
    try {
      const response = await pluzzpayClient.post('/bank-transfer.php', {
        action: 'lookup',
        accountNumber,
        bankCode
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Account verification failed');
      }

      return {
        accountName: response.data.data.account_name,
        accountNumber: response.data.data.account_number || accountNumber,
        bankCode: response.data.data.bank_code || bankCode
      };
    } catch (error) {
      console.error('❌ PluzzPay verifyAccount error:', error.message);
      throw new Error(error.response?.data?.message || 'Account verification failed');
    }
  },

  // Process bank transfer
  async transfer(accountNumber, bankCode, amount, narration = 'Withdrawal') {
    try {
      const response = await pluzzpayClient.post('/bank-transfer.php', {
        action: 'transfer',
        accountNumber,
        bankCode,
        amount: parseFloat(amount),
        narration: narration.substring(0, 50)
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
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Verify Aspfiy webhook signature
 */
const verifyAspfiySignature = (receivedSignature, secretKey) => {
  const expectedSignature = crypto
    .createHash('md5')
    .update(secretKey)
    .digest('hex');
  
  return receivedSignature === expectedSignature;
};

/**
 * Verify PluzzPay webhook signature
 */
const verifyPluzzPaySignature = (signature, rawBody, apiKey) => {
  const expected = crypto
    .createHmac('sha256', apiKey)
    .update(rawBody)
    .digest('hex');
  
  return signature === expected;
};

// =====================================================
// WALLET BALANCE
// =====================================================

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
const getBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id }
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      data: {
        nairaBalance: parseFloat(wallet.nairaBalance) || 0,
        cryptoBalance: parseFloat(wallet.cryptoBalance) || 0,
        lockedBalance: parseFloat(wallet.lockedBalance) || 0,
        availableBalance: parseFloat(wallet.nairaBalance) - parseFloat(wallet.lockedBalance),
        totalDeposited: parseFloat(wallet.totalDeposited) || 0,
        totalWithdrawn: parseFloat(wallet.totalWithdrawn) || 0,
        totalWon: parseFloat(wallet.totalWon) || 0,
        totalLost: parseFloat(wallet.totalLost) || 0
      }
    });

  } catch (error) {
    console.error('❌ Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get balance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// GET BANKS LIST
// =====================================================

// @desc    Get list of banks from PluzzPay
// @route   GET /api/wallet/banks
// @access  Private
const getBanksList = async (req, res) => {
  try {
    const banks = await pluzzpayService.getBanks();

    res.json({
      success: true,
      data: {
        banks: banks.map(bank => ({
          code: bank.code,
          name: bank.name
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get banks error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get banks list'
    });
  }
};

// =====================================================
// VERIFY BANK ACCOUNT
// =====================================================

// @desc    Verify bank account and save to DB
// @route   POST /api/wallet/verify-account
// @access  Private
const verifyBankAccount = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { accountNumber, bankCode } = req.body;

    // Validate input
    if (!accountNumber || !bankCode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Account number and bank code are required'
      });
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Account number must be 10 digits'
      });
    }

    // Check if already exists
    const existingAccount = await BankAccount.findOne({
      where: {
        userId: req.user.id,
        accountNumber,
        bankCode
      }
    });

    if (existingAccount) {
      await transaction.rollback();
      return res.json({
        success: true,
        message: 'Account already saved',
        data: {
          id: existingAccount.id,
          accountNumber: existingAccount.accountNumber,
          accountName: existingAccount.accountName,
          bankCode: existingAccount.bankCode,
          bankName: existingAccount.bankName,
          isDefault: existingAccount.isDefault,
          isExisting: true
        }
      });
    }

    // Verify with PluzzPay
    console.log('🔍 Verifying account:', accountNumber, bankCode);
    const verificationResult = await pluzzpayService.verifyAccount(accountNumber, bankCode);

    // Get bank name from banks list
    let bankName = 'Unknown Bank';
    try {
      const banks = await pluzzpayService.getBanks();
      const bank = banks.find(b => b.code === bankCode);
      if (bank) bankName = bank.name;
    } catch (e) {
      console.log('⚠️ Could not fetch bank name');
    }

    // Check if this is user's first account (make it default)
    const accountCount = await BankAccount.count({
      where: { userId: req.user.id }
    });

    // Save to database
    const savedAccount = await BankAccount.create({
      userId: req.user.id,
      accountNumber,
      accountName: verificationResult.accountName,
      bankCode,
      bankName,
      isVerified: true,
      verifiedAt: new Date(),
      isDefault: accountCount === 0 // First account is default
    }, { transaction });

    await transaction.commit();

    console.log('✅ Account verified and saved:', savedAccount.id);

    res.json({
      success: true,
      message: 'Account verified and saved successfully',
      data: {
        id: savedAccount.id,
        accountNumber: savedAccount.accountNumber,
        accountName: savedAccount.accountName,
        bankCode: savedAccount.bankCode,
        bankName: savedAccount.bankName,
        isDefault: savedAccount.isDefault,
        isExisting: false
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Verify account error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Account verification failed'
    });
  }
};

// =====================================================
// GET SAVED BANK ACCOUNTS
// =====================================================

// @desc    Get user's saved bank accounts
// @route   GET /api/wallet/accounts
// @access  Private
const getSavedAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.findAll({
      where: { userId: req.user.id },
      order: [
        ['isDefault', 'DESC'],
        ['lastUsedAt', 'DESC NULLS LAST'],
        ['createdAt', 'DESC']
      ]
    });

    res.json({
      success: true,
      data: {
        accounts: accounts.map(acc => ({
          id: acc.id,
          accountNumber: acc.accountNumber,
          accountName: acc.accountName,
          bankCode: acc.bankCode,
          bankName: acc.bankName,
          isDefault: acc.isDefault,
          isVerified: acc.isVerified,
          lastUsedAt: acc.lastUsedAt,
          createdAt: acc.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get saved accounts'
    });
  }
};

// =====================================================
// SET DEFAULT ACCOUNT
// =====================================================

// @desc    Set default bank account
// @route   PUT /api/wallet/accounts/:id/default
// @access  Private
const setDefaultAccount = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Remove current default
    await BankAccount.update(
      { isDefault: false },
      {
        where: { userId: req.user.id },
        transaction
      }
    );

    // Set new default
    const [updated] = await BankAccount.update(
      { isDefault: true },
      {
        where: {
          id,
          userId: req.user.id
        },
        transaction
      }
    );

    if (!updated) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Default account updated'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Set default error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default account'
    });
  }
};

// =====================================================
// DELETE BANK ACCOUNT
// =====================================================

// @desc    Delete saved bank account
// @route   DELETE /api/wallet/accounts/:id
// @access  Private
const deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await BankAccount.findOne({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const wasDefault = account.isDefault;

    await account.destroy();

    // If deleted account was default, set another as default
    if (wasDefault) {
      const nextAccount = await BankAccount.findOne({
        where: { userId: req.user.id },
        order: [['lastUsedAt', 'DESC NULLS LAST'], ['createdAt', 'DESC']]
      });

      if (nextAccount) {
        await nextAccount.update({ isDefault: true });
      }
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};

// =====================================================
// INITIATE NAIRA DEPOSIT (ASPFIY VIRTUAL ACCOUNT)
// =====================================================

// @desc    Initialize Naira deposit (Aspfiy Virtual Account)
// @route   POST /api/wallet/deposit/naira
// @access  Private
const initiateNairaDeposit = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { amount } = req.body;

    console.log('💰 Deposit request from user:', req.user.id, 'Amount:', amount);

    // Validate amount
    if (!validateAmount(amount) || amount < 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Minimum deposit is ₦100'
      });
    }

    // Maximum deposit limit
    if (amount > 5000000) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Maximum deposit is ₦5,000,000'
      });
    }

    // ✅ CHECK: User can only have ONE pending deposit at a time
    const existingPending = await PendingDeposit.findOne({
      where: {
        userId: req.user.id,
        status: 'pending',
        expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      include: [{
        model: VirtualAccount,
        as: 'virtualAccount'
      }]
    });

    if (existingPending) {
      await transaction.rollback();
      
      const timeRemaining = Math.max(0, Math.round((new Date(existingPending.expiresAt) - new Date()) / 1000 / 60));
      
      return res.status(400).json({
        success: false,
        message: 'You already have a pending deposit. Please complete it or wait for it to expire.',
        data: {
          reference: existingPending.reference,
          amount: parseFloat(existingPending.amount),
          accountNumber: existingPending.virtualAccount?.accountNumber,
          accountName: existingPending.virtualAccount?.accountName,
          bankName: existingPending.virtualAccount?.bankName,
          expiresAt: existingPending.expiresAt,
          expiresIn: `${timeRemaining} minutes`
        }
      });
    }

    // ✅ GET NEXT AVAILABLE VIRTUAL ACCOUNT (Round-Robin)
    // Only get accounts that don't have active pending deposits
    const virtualAccount = await VirtualAccount.findOne({
      where: { 
        isActive: true,
        id: {
          [sequelize.Sequelize.Op.notIn]: sequelize.literal(`(
            SELECT "virtualAccountId" FROM "pending_deposits" 
            WHERE status = 'pending' 
            AND "expiresAt" > NOW()
          )`)
        }
      },
      order: [
        [sequelize.literal('COALESCE("lastAssignedAt", \'1970-01-01\'::timestamp)'), 'ASC'],
        ['totalUsage', 'ASC'],
        ['id', 'ASC']
      ],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!virtualAccount) {
      await transaction.rollback();
      console.error('❌ No virtual accounts available');
      return res.status(503).json({
        success: false,
        message: 'All payment accounts are currently busy. Please try again in a few minutes.'
      });
    }

    console.log('✅ Assigned virtual account:', virtualAccount.accountNumber);

    // Generate unique reference
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(4).toString('hex').toUpperCase();
    const reference = `DEP-${timestamp}-${randomHash}`;

    const depositAmount = parseFloat(amount);

    // ✅ CREATE PENDING DEPOSIT
    const pendingDeposit = await PendingDeposit.create({
      userId: req.user.id,
      virtualAccountId: virtualAccount.id,
      amount: depositAmount,
      reference,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    }, { transaction });

    // ✅ UPDATE VIRTUAL ACCOUNT USAGE
    await virtualAccount.update({
      lastAssignedAt: new Date(),
      totalUsage: sequelize.literal('"totalUsage" + 1')
    }, { transaction });

    // ✅ CREATE TRANSACTION RECORD
    await Transaction.create({
      userId: req.user.id,
      type: 'deposit',
      method: 'naira',
      amount: depositAmount,
      currency: 'NGN',
      status: 'pending',
      reference,
      description: `Deposit via ${virtualAccount.bankName}`,
      metadata: {
        virtualAccountId: virtualAccount.id,
        pendingDepositId: pendingDeposit.id,
        accountNumber: virtualAccount.accountNumber,
        bankName: virtualAccount.bankName
      }
    }, { transaction });

    await transaction.commit();

    console.log('✅ Deposit initialized:', reference);

    res.json({
      success: true,
      message: 'Deposit instructions generated',
      data: {
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        bankName: virtualAccount.bankName,
        amount: depositAmount,
        amountFormatted: `₦${depositAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        reference: reference,
        expiresAt: pendingDeposit.expiresAt,
        expiresIn: '30 minutes',
        instructions: [
          `Transfer EXACTLY ₦${depositAmount.toLocaleString()} to the account above`,
          `Use your bank app or USSD`,
          `Your wallet will be credited automatically within 2 minutes`,
          `This deposit session expires in 30 minutes`
        ],
        warnings: [
          `⚠️ IMPORTANT: Transfer EXACTLY ₦${depositAmount.toLocaleString()}`,
          `⚠️ Sending wrong amount will require manual review`,
          `⚠️ Do not transfer from a third-party account`,
          `🎉 NO FEES - You receive 100% of your deposit!`
        ]
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Initiate deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate deposit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// ASPFIY WEBHOOK HANDLER
// =====================================================

// @desc    Aspfiy Webhook Handler
// @route   POST /api/wallet/webhook/aspfiy
// @access  Public (but signature verified)
const handleAspfiyWebhook = async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  
  try {
    const webhookTimestamp = new Date().toISOString();
    console.log('📨 ====== ASPFIY WEBHOOK RECEIVED ======');
    console.log('📨 Time:', webhookTimestamp);
    console.log('📨 Body:', JSON.stringify(req.body, null, 2));

    // ===== VERIFY WEBHOOK SIGNATURE =====
    const receivedSignature = req.headers['x-wiaxy-signature'];
    
    if (!receivedSignature) {
      console.error('❌ Missing signature');
      await dbTransaction.rollback();
      return res.status(401).json({ success: false, message: 'Missing signature' });
    }

    const secretKey = process.env.ASPFIY_SECRET_KEY;
    
    if (!secretKey) {
      console.error('❌ ASPFIY_SECRET_KEY not configured');
      await dbTransaction.rollback();
      return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }

    if (!verifyAspfiySignature(receivedSignature, secretKey)) {
      console.error('❌ Invalid signature');
      await dbTransaction.rollback();
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    console.log('✅ Signature verified');

    // ===== EXTRACT WEBHOOK DATA =====
    const { event, data } = req.body;

    if (event !== 'PAYMENT_NOTIFICATION') {
      console.log(`ℹ️ Ignoring event: ${event}`);
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Event ignored' });
    }

    if (data.type !== 'RESERVED_ACCOUNT_TRANSACTION') {
      console.log(`ℹ️ Ignoring type: ${data.type}`);
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Type ignored' });
    }

    console.log('📥 Processing payment...');

    const {
      reference: aspfiyReference,
      merchant_reference,
      wiaxy_ref: interBankReference,
      amount,
      account: { account_number },
      customer = {}
    } = data;

    const receivedAmount = parseFloat(amount);
    const payerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown';

    console.log('💰 Payment:', {
      account: account_number,
      amount: receivedAmount,
      payer: payerName,
      ref: aspfiyReference
    });

    // ===== FIND VIRTUAL ACCOUNT =====
    const virtualAccount = await VirtualAccount.findOne({
      where: { accountNumber: account_number },
      transaction: dbTransaction
    });

    if (!virtualAccount) {
      console.error('❌ Unknown account:', account_number);
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Unknown account' });
    }

    console.log('✅ Account found:', virtualAccount.id);

    // ===== FIND PENDING DEPOSIT =====
    const pendingDeposit = await PendingDeposit.findOne({
      where: {
        virtualAccountId: virtualAccount.id,
        status: 'pending',
        expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      order: [['createdAt', 'ASC']],
      transaction: dbTransaction
    });

    if (!pendingDeposit) {
      console.error('❌ No pending deposit on this account');
      
      const recentCompleted = await PendingDeposit.findOne({
        where: {
          virtualAccountId: virtualAccount.id,
          status: 'completed'
        },
        order: [['completedAt', 'DESC']],
        transaction: dbTransaction
      });

      if (recentCompleted) {
        const timeSince = Date.now() - new Date(recentCompleted.completedAt).getTime();
        if (timeSince < 60000) {
          console.log('⚠️ Duplicate webhook (already processed)');
          await dbTransaction.commit();
          return res.json({ success: true, message: 'Already processed' });
        }
      }

      console.log('⚠️ UNMATCHED PAYMENT:', {
        account: account_number,
        amount: receivedAmount,
        aspfiyRef: aspfiyReference,
        reason: 'No pending deposit found'
      });

      await dbTransaction.commit();
      return res.json({ success: true, message: 'No pending deposit' });
    }

    const expectedAmount = parseFloat(pendingDeposit.amount);
    const amountDifference = Math.abs(receivedAmount - expectedAmount);
    const tolerance = 1;

    console.log('✅ Match found:', {
      reference: pendingDeposit.reference,
      userId: pendingDeposit.userId,
      expectedAmount: expectedAmount,
      receivedAmount: receivedAmount,
      difference: amountDifference
    });

    if (amountDifference > tolerance) {
      console.error('❌ AMOUNT MISMATCH!');
      console.error(`   Expected: ₦${expectedAmount}`);
      console.error(`   Received: ₦${receivedAmount}`);
      console.error(`   Difference: ₦${amountDifference}`);
      
      await pendingDeposit.update({
        webhookData: {
          status: 'amount_mismatch',
          expectedAmount,
          receivedAmount,
          amountDifference,
          aspfiyReference,
          interBankReference,
          merchant_reference,
          payer: payerName,
          receivedAt: webhookTimestamp,
          rawPayload: req.body,
          requiresManualReview: true
        }
      }, { transaction: dbTransaction });

      await dbTransaction.commit();

      console.log('⚠️ Flagged for manual review - Admin approval required');
      return res.json({ 
        success: true, 
        message: 'Amount mismatch - flagged for review' 
      });
    }

    console.log('✅ Amount verified - proceeding to credit wallet');

    await pendingDeposit.reload({
      lock: dbTransaction.LOCK.UPDATE,
      transaction: dbTransaction
    });

    if (pendingDeposit.status === 'completed') {
      console.log('⚠️ Already completed');
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Already processed' });
    }

    const user = await User.findByPk(pendingDeposit.userId, {
      include: [{ model: Wallet, as: 'wallet' }],
      transaction: dbTransaction
    });

    if (!user?.wallet) {
      console.error('❌ Wallet not found for user:', pendingDeposit.userId);
      await dbTransaction.rollback();
      return res.status(500).json({ success: false, message: 'Wallet not found' });
    }

    const amountToCredit = expectedAmount;
    const balanceBefore = parseFloat(user.wallet.nairaBalance) || 0;
    const balanceAfter = balanceBefore + amountToCredit;

    await user.wallet.update({
      nairaBalance: balanceAfter,
      totalDeposited: parseFloat(user.wallet.totalDeposited || 0) + amountToCredit
    }, { transaction: dbTransaction });

    console.log(`💰 Wallet: ₦${balanceBefore} → ₦${balanceAfter}`);

    await pendingDeposit.update({
      status: 'completed',
      completedAt: new Date(),
      webhookData: {
        aspfiyReference,
        interBankReference,
        merchant_reference,
        payer: payerName,
        receivedAmount,
        receivedAt: webhookTimestamp,
        rawPayload: req.body,
        autoApproved: true
      }
    }, { transaction: dbTransaction });

    await Transaction.update({
      status: 'completed',
      balanceBefore,
      balanceAfter,
      metadata: {
        virtualAccountId: virtualAccount.id,
        aspfiyReference,
        interBankReference,
        payer: payerName,
        amountCredited: amountToCredit,
        processedAt: new Date(),
        noFeesCharged: true,
        autoApproved: true
      }
    }, {
      where: { reference: pendingDeposit.reference },
      transaction: dbTransaction
    });

    await dbTransaction.commit();

    console.log('✅✅✅ DEPOSIT COMPLETED ✅✅✅');
    console.log(`   User: ${pendingDeposit.userId}`);
    console.log(`   Amount: ₦${amountToCredit}`);
    console.log(`   Balance: ₦${balanceAfter}`);
    console.log('✅✅✅ =========================');

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${pendingDeposit.userId}`).emit('deposit_confirmed', {
        amount: amountToCredit,
        newBalance: balanceAfter,
        reference: pendingDeposit.reference,
        timestamp: new Date(),
        message: `Your deposit of ₦${amountToCredit.toLocaleString()} has been confirmed! 🎉`
      });
      console.log('📤 Real-time notification sent');
    }

    res.status(200).json({ 
      success: true, 
      message: 'Processed',
      reference: pendingDeposit.reference
    });

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌ WEBHOOK ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(200).json({
      success: false,
      message: 'Processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
};

// =====================================================
// PLUZZPAY WEBHOOK HANDLER (For withdrawal confirmations)
// =====================================================

// @desc    PluzzPay Webhook Handler
// @route   POST /api/wallet/webhook/pluzzpay
// @access  Public (but signature verified)
const handlePluzzPayWebhook = async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  
  try {
    const webhookTimestamp = new Date().toISOString();
    console.log('📨 ====== PLUZZPAY WEBHOOK RECEIVED ======');
    console.log('📨 Time:', webhookTimestamp);
    console.log('📨 Body:', JSON.stringify(req.body, null, 2));

    // Verify signature
    const signature = req.headers['x-pluzzpay-verification'];
    const rawBody = JSON.stringify(req.body);
    
    if (!signature) {
      console.error('❌ Missing PluzzPay signature');
      await dbTransaction.rollback();
      return res.status(401).json({ success: false, message: 'Missing signature' });
    }

    if (!verifyPluzzPaySignature(signature, rawBody, PLUZZPAY_API_KEY)) {
      console.error('❌ Invalid PluzzPay signature');
      await dbTransaction.rollback();
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { event_type, transaction_reference, amount_paid, settled_amount } = req.body;

    // Handle bank transfer completion
    if (event_type === 'bank_transfer.completed') {
      console.log('✅ Bank transfer completed:', transaction_reference);

      // Find the withdrawal transaction
      const withdrawalTx = await Transaction.findOne({
        where: {
          type: 'withdrawal',
          status: 'processing'
        },
        transaction: dbTransaction
      });

      if (withdrawalTx && withdrawalTx.metadata?.pluzzpayReference === transaction_reference) {
        await withdrawalTx.update({
          status: 'completed',
          metadata: {
            ...withdrawalTx.metadata,
            webhookConfirmed: true,
            confirmedAt: new Date(),
            amountPaid: amount_paid,
            settledAmount: settled_amount
          }
        }, { transaction: dbTransaction });

        console.log('✅ Withdrawal confirmed via webhook');

        // Send notification
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${withdrawalTx.userId}`).emit('withdrawal_confirmed', {
            reference: withdrawalTx.reference,
            amount: parseFloat(withdrawalTx.amount),
            message: `Your withdrawal has been confirmed! 💸`
          });
        }
      }
    }

    await dbTransaction.commit();
    res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌ PluzzPay webhook error:', error);
    res.status(200).json({ success: false, message: 'Processing failed' });
  }
};

// =====================================================
// CHECK DEPOSIT STATUS
// =====================================================

// @desc    Check deposit status
// @route   GET /api/wallet/deposit/status/:reference
// @access  Private
const checkDepositStatus = async (req, res) => {
  try {
    const { reference } = req.params;

    const pendingDeposit = await PendingDeposit.findOne({
      where: {
        reference,
        userId: req.user.id
      },
      include: [{
        model: VirtualAccount,
        as: 'virtualAccount'
      }]
    });

    if (!pendingDeposit) {
      return res.status(404).json({
        success: false,
        message: 'Deposit not found'
      });
    }

    const now = new Date();
    const expiresAt = new Date(pendingDeposit.expiresAt);
    const isExpired = now > expiresAt && pendingDeposit.status === 'pending';
    const timeRemaining = Math.max(0, Math.round((expiresAt - now) / 1000 / 60));

    if (isExpired && pendingDeposit.status === 'pending') {
      await pendingDeposit.update({ status: 'expired' });
      await Transaction.update(
        { status: 'expired' },
        { where: { reference } }
      );
    }

    const requiresReview = pendingDeposit.webhookData?.requiresManualReview === true;

    res.json({
      success: true,
      data: {
        reference: pendingDeposit.reference,
        amount: parseFloat(pendingDeposit.amount),
        status: isExpired ? 'expired' : pendingDeposit.status,
        isExpired,
        requiresManualReview: requiresReview,
        timeRemaining: timeRemaining > 0 ? `${timeRemaining} minutes` : 'Expired',
        accountNumber: pendingDeposit.virtualAccount?.accountNumber,
        accountName: pendingDeposit.virtualAccount?.accountName,
        bankName: pendingDeposit.virtualAccount?.bankName,
        expiresAt: pendingDeposit.expiresAt,
        completedAt: pendingDeposit.completedAt,
        createdAt: pendingDeposit.createdAt,
        ...(requiresReview && {
          mismatchInfo: {
            expectedAmount: pendingDeposit.webhookData.expectedAmount,
            receivedAmount: pendingDeposit.webhookData.receivedAmount,
            difference: pendingDeposit.webhookData.amountDifference,
            message: 'Amount mismatch detected. Contact support for assistance.'
          }
        })
      }
    });

  } catch (error) {
    console.error('❌ Check status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// GET PENDING DEPOSIT
// =====================================================

// @desc    Get user's current pending deposit
// @route   GET /api/wallet/deposit/pending
// @access  Private
const getPendingDeposit = async (req, res) => {
  try {
    const pendingDeposit = await PendingDeposit.findOne({
      where: {
        userId: req.user.id,
        status: 'pending',
        expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() }
      },
      include: [{
        model: VirtualAccount,
        as: 'virtualAccount'
      }]
    });

    if (!pendingDeposit) {
      return res.json({
        success: true,
        data: null,
        message: 'No pending deposit'
      });
    }

    const timeRemaining = Math.max(0, Math.round((new Date(pendingDeposit.expiresAt) - new Date()) / 1000 / 60));
    const requiresReview = pendingDeposit.webhookData?.requiresManualReview === true;

    res.json({
      success: true,
      data: {
        reference: pendingDeposit.reference,
        amount: parseFloat(pendingDeposit.amount),
        accountNumber: pendingDeposit.virtualAccount?.accountNumber,
        accountName: pendingDeposit.virtualAccount?.accountName,
        bankName: pendingDeposit.virtualAccount?.bankName,
        expiresAt: pendingDeposit.expiresAt,
        timeRemaining: `${timeRemaining} minutes`,
        createdAt: pendingDeposit.createdAt,
        requiresManualReview: requiresReview,
        ...(requiresReview && {
          mismatchInfo: {
            expectedAmount: pendingDeposit.webhookData.expectedAmount,
            receivedAmount: pendingDeposit.webhookData.receivedAmount,
            message: 'Amount mismatch - awaiting admin review'
          }
        })
      }
    });

  } catch (error) {
    console.error('❌ Get pending deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending deposit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// CANCEL PENDING DEPOSIT (FREES UP VIRTUAL ACCOUNT)
// =====================================================

// @desc    Cancel pending deposit
// @route   POST /api/wallet/deposit/cancel/:reference
// @access  Private
const cancelPendingDeposit = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { reference } = req.params;

    const pendingDeposit = await PendingDeposit.findOne({
      where: {
        reference,
        userId: req.user.id,
        status: 'pending'
      },
      include: [{
        model: VirtualAccount,
        as: 'virtualAccount'
      }],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!pendingDeposit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Pending deposit not found or already processed'
      });
    }

    // ✅ UPDATE PENDING DEPOSIT TO CANCELLED
    await pendingDeposit.update({
      status: 'cancelled',
      cancelledAt: new Date()
    }, { transaction });

    // ✅ UPDATE TRANSACTION TO CANCELLED
    await Transaction.update({
      status: 'cancelled',
      metadata: sequelize.literal(`metadata || '{"cancelledAt": "${new Date().toISOString()}", "cancelledBy": "user"}'::jsonb`)
    }, {
      where: { reference },
      transaction
    });

    await transaction.commit();

    console.log('✅ Deposit cancelled:', reference);
    console.log('✅ Virtual account freed:', pendingDeposit.virtualAccount?.accountNumber);

    res.json({
      success: true,
      message: 'Deposit cancelled successfully. You can now initiate a new deposit.',
      data: {
        reference,
        freedAccount: pendingDeposit.virtualAccount?.accountNumber
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Cancel deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel deposit',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// REQUEST WITHDRAWAL (WITH SAVED ACCOUNTS)
// =====================================================

// @desc    Request withdrawal
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { amount, accountId } = req.body;

    const withdrawAmount = parseFloat(amount);

    // Validate amount
    if (!validateAmount(withdrawAmount) || withdrawAmount < 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal is ₦100'
      });
    }

    // Maximum withdrawal
    if (withdrawAmount > 5000000) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Maximum withdrawal is ₦5,000,000'
      });
    }

    // Get bank account
    let bankAccount;
    
    if (accountId) {
      // Use saved account
      bankAccount = await BankAccount.findOne({
        where: {
          id: accountId,
          userId: req.user.id
        },
        transaction
      });

      if (!bankAccount) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Bank account not found. Please add a bank account first.'
        });
      }
    } else {
      // Get default account
      bankAccount = await BankAccount.findOne({
        where: {
          userId: req.user.id,
          isDefault: true
        },
        transaction
      });

      if (!bankAccount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No bank account found. Please add a bank account first.'
        });
      }
    }

    // Get wallet
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!wallet) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const availableBalance = parseFloat(wallet.nairaBalance) - parseFloat(wallet.lockedBalance || 0);

    if (withdrawAmount > availableBalance) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: {
          requested: withdrawAmount,
          available: availableBalance.toFixed(2)
        }
      });
    }

    // Check for pending withdrawal
    const pendingWithdrawal = await Transaction.findOne({
      where: {
        userId: req.user.id,
        type: 'withdrawal',
        status: ['pending', 'processing']
      },
      transaction
    });

    if (pendingWithdrawal) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'You already have a pending withdrawal. Please wait for it to complete.',
        data: {
          reference: pendingWithdrawal.reference,
          amount: parseFloat(pendingWithdrawal.amount),
          status: pendingWithdrawal.status
        }
      });
    }

    const reference = generateReference('WTH');
    const balanceBefore = parseFloat(wallet.nairaBalance);

    // Create withdrawal transaction
    await Transaction.create({
      userId: req.user.id,
      type: 'withdrawal',
      method: 'naira',
      amount: withdrawAmount,
      currency: 'NGN',
      status: 'pending',
      reference,
      description: `Withdrawal to ${bankAccount.accountName} - ${bankAccount.bankName}`,
      metadata: {
        bankAccountId: bankAccount.id,
        bankCode: bankAccount.bankCode,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        bankName: bankAccount.bankName
      },
      balanceBefore
    }, { transaction });

    // Deduct from wallet
    await wallet.update({
      nairaBalance: balanceBefore - withdrawAmount,
      totalWithdrawn: parseFloat(wallet.totalWithdrawn || 0) + withdrawAmount
    }, { transaction });

    // Update last used
    await bankAccount.update({
      lastUsedAt: new Date()
    }, { transaction });

    await transaction.commit();

    console.log('✅ Withdrawal request created:', reference);

    res.json({
      success: true,
      message: 'Withdrawal request submitted. Processing will be done shortly.',
      data: {
        reference,
        amount: withdrawAmount,
        status: 'pending',
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        bankName: bankAccount.bankName
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Withdrawal request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request withdrawal',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// GET TRANSACTION HISTORY
// =====================================================

// @desc    Get transaction history
// @route   GET /api/wallet/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;

    const where = { userId: req.user.id };
    
    if (type) where.type = type;
    if (status) where.status = status;

    const transactions = await Transaction.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit), 100),
      offset: (Math.max(parseInt(page), 1) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.rows.map(t => ({
          id: t.id,
          type: t.type,
          method: t.method,
          amount: parseFloat(t.amount),
          currency: t.currency,
          status: t.status,
          reference: t.reference,
          description: t.description,
          balanceBefore: t.balanceBefore ? parseFloat(t.balanceBefore) : null,
          balanceAfter: t.balanceAfter ? parseFloat(t.balanceAfter) : null,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        })),
        pagination: {
          total: transactions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(transactions.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// ADMIN: GET PENDING WITHDRAWALS
// =====================================================

// @desc    Get all pending withdrawals (Admin)
// @route   GET /api/wallet/admin/pending-withdrawals
// @access  Admin
const getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Transaction.findAll({
      where: {
        type: 'withdrawal',
        status: 'pending'
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'phoneNumber']
      }],
      order: [['createdAt', 'ASC']],
      limit: 100
    });

    res.json({
      success: true,
      data: {
        count: withdrawals.length,
        totalAmount: withdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0),
        withdrawals: withdrawals.map(w => ({
          id: w.id,
          reference: w.reference,
          amount: parseFloat(w.amount),
          user: {
            id: w.user?.id,
            username: w.user?.username,
            email: w.user?.email,
            phone: w.user?.phoneNumber
          },
          bankDetails: {
            accountNumber: w.metadata?.accountNumber,
            accountName: w.metadata?.accountName,
            bankName: w.metadata?.bankName,
            bankCode: w.metadata?.bankCode
          },
          createdAt: w.createdAt,
          description: w.description
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get pending withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending withdrawals'
    });
  }
};

// =====================================================
// ADMIN: AUTO-APPROVE WITHDRAWAL
// =====================================================

// @desc    Admin approves withdrawal (auto-processes via PluzzPay)
// @route   POST /api/wallet/admin/approve-withdrawal/:reference
// @access  Admin
const approveWithdrawal = async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  
  try {
    const { reference } = req.params;

    // Get withdrawal transaction
    const withdrawalTx = await Transaction.findOne({
      where: {
        reference,
        type: 'withdrawal',
        status: 'pending'
      },
      include: [{
        model: User,
        as: 'user'
      }],
      lock: dbTransaction.LOCK.UPDATE,
      transaction: dbTransaction
    });

    if (!withdrawalTx) {
      await dbTransaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found or already processed'
      });
    }

    const { accountNumber, bankCode, accountName, bankName } = withdrawalTx.metadata;
    const amount = parseFloat(withdrawalTx.amount);

    console.log('🚀 Processing withdrawal:', reference);
    console.log('   Amount: ₦' + amount);
    console.log('   To:', accountName, '-', accountNumber, '-', bankName);

    // Update status to processing
    await withdrawalTx.update({
      status: 'processing',
      metadata: {
        ...withdrawalTx.metadata,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        processingStarted: new Date()
      }
    }, { transaction: dbTransaction });

    await dbTransaction.commit();

    // 🚀 PROCESS VIA PLUZZPAY (outside transaction)
    let pluzzpayResult;
    try {
      pluzzpayResult = await pluzzpayService.transfer(
        accountNumber,
        bankCode,
        amount,
        `WTH-${reference}`
      );

      console.log('✅ PluzzPay response:', pluzzpayResult);

    } catch (pluzzpayError) {
      console.error('❌ PluzzPay transfer failed:', pluzzpayError.message);

      // Refund transaction
      const refundTransaction = await sequelize.transaction();
      
      try {
        // Update transaction to failed
        await Transaction.update({
          status: 'failed',
          metadata: sequelize.literal(`metadata || '${JSON.stringify({
            failedAt: new Date(),
            failureReason: pluzzpayError.message
          })}'::jsonb`)
        }, {
          where: { reference },
          transaction: refundTransaction
        });

        // Refund user wallet
        const wallet = await Wallet.findOne({ 
          where: { userId: withdrawalTx.userId },
          transaction: refundTransaction 
        });
        
        if (wallet) {
          await wallet.update({
            nairaBalance: parseFloat(wallet.nairaBalance) + amount,
            totalWithdrawn: Math.max(0, parseFloat(wallet.totalWithdrawn) - amount)
          }, { transaction: refundTransaction });
        }

        await refundTransaction.commit();
        console.log('✅ User refunded:', amount);

      } catch (refundError) {
        await refundTransaction.rollback();
        console.error('❌ Refund failed:', refundError);
      }

      return res.status(400).json({
        success: false,
        message: 'Transfer failed: ' + pluzzpayError.message,
        refunded: true
      });
    }

    // ✅ SUCCESS - Update transaction
    await Transaction.update({
      status: 'completed',
      balanceAfter: withdrawalTx.balanceBefore - amount,
      metadata: sequelize.literal(`metadata || '${JSON.stringify({
        completedAt: new Date(),
        pluzzpayReference: pluzzpayResult.reference,
        pluzzpaySessionId: pluzzpayResult.sessionId,
        transferFee: pluzzpayResult.fee || 0,
        pluzzpayStatus: pluzzpayResult.status
      })}'::jsonb`)
    }, {
      where: { reference }
    });

    console.log('✅✅✅ WITHDRAWAL COMPLETED ✅✅✅');
    console.log('   Reference:', reference);
    console.log('   PluzzPay Ref:', pluzzpayResult.reference);
    console.log('   Amount: ₦' + amount);

    // Send notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${withdrawalTx.userId}`).emit('withdrawal_completed', {
        reference,
        amount,
        accountName,
        bankName,
        message: `Your withdrawal of ₦${amount.toLocaleString()} has been sent! 💸`
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal approved and processed successfully',
      data: {
        reference,
        amount,
        pluzzpayReference: pluzzpayResult.reference,
        status: 'completed',
        accountName,
        accountNumber,
        bankName
      }
    });

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌ Approve withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve withdrawal',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// =====================================================
// ADMIN: REJECT WITHDRAWAL
// =====================================================

// @desc    Admin rejects withdrawal (refunds user)
// @route   POST /api/wallet/admin/reject-withdrawal/:reference
// @access  Admin
const rejectWithdrawal = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { reference } = req.params;
    const { reason } = req.body;

    const withdrawalTx = await Transaction.findOne({
      where: {
        reference,
        type: 'withdrawal',
        status: 'pending'
      },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!withdrawalTx) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Withdrawal not found or already processed'
      });
    }

    const amount = parseFloat(withdrawalTx.amount);

    // Update transaction to rejected
    await withdrawalTx.update({
      status: 'rejected',
      metadata: {
        ...withdrawalTx.metadata,
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectionReason: reason || 'Rejected by admin'
      }
    }, { transaction });

    // Refund user wallet
    const wallet = await Wallet.findOne({
      where: { userId: withdrawalTx.userId },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (wallet) {
      await wallet.update({
        nairaBalance: parseFloat(wallet.nairaBalance) + amount,
        totalWithdrawn: Math.max(0, parseFloat(wallet.totalWithdrawn) - amount)
      }, { transaction });
    }

    await transaction.commit();

    console.log('✅ Withdrawal rejected and refunded:', reference);

    // Send notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${withdrawalTx.userId}`).emit('withdrawal_rejected', {
        reference,
        amount,
        reason: reason || 'Rejected by admin',
        message: `Your withdrawal of ₦${amount.toLocaleString()} was rejected. Amount has been refunded.`
      });
    }

    res.json({
      success: true,
      message: 'Withdrawal rejected and amount refunded',
      data: {
        reference,
        refundedAmount: amount,
        reason: reason || 'Rejected by admin'
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Reject withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject withdrawal'
    });
  }
};

// =====================================================
// ADMIN: BULK APPROVE WITHDRAWALS
// =====================================================

// @desc    Admin bulk approves withdrawals
// @route   POST /api/wallet/admin/bulk-approve
// @access  Admin
const bulkApproveWithdrawals = async (req, res) => {
  try {
    const { references } = req.body;

    if (!references || !Array.isArray(references) || references.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of withdrawal references'
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const reference of references) {
      try {
        // Process each withdrawal
        const dbTransaction = await sequelize.transaction();

        const withdrawalTx = await Transaction.findOne({
          where: {
            reference,
            type: 'withdrawal',
            status: 'pending'
          },
          lock: dbTransaction.LOCK.UPDATE,
          transaction: dbTransaction
        });

        if (!withdrawalTx) {
          await dbTransaction.rollback();
          results.failed.push({ reference, error: 'Not found or already processed' });
          continue;
        }

        const { accountNumber, bankCode, accountName } = withdrawalTx.metadata;
        const amount = parseFloat(withdrawalTx.amount);

        // Update to processing
        await withdrawalTx.update({
          status: 'processing',
          metadata: {
            ...withdrawalTx.metadata,
            approvedBy: req.user.id,
            approvedAt: new Date()
          }
        }, { transaction: dbTransaction });

        await dbTransaction.commit();

        // Process via PluzzPay
        try {
          const pluzzpayResult = await pluzzpayService.transfer(
            accountNumber,
            bankCode,
            amount,
            `WTH-${reference}`
          );

          // Update to completed
          await Transaction.update({
            status: 'completed',
            metadata: sequelize.literal(`metadata || '${JSON.stringify({
              completedAt: new Date(),
              pluzzpayReference: pluzzpayResult.reference
            })}'::jsonb`)
          }, { where: { reference } });

          results.successful.push({
            reference,
            amount,
            pluzzpayRef: pluzzpayResult.reference
          });

          // Send notification
          const io = req.app.get('io');
          if (io) {
            io.to(`user_${withdrawalTx.userId}`).emit('withdrawal_completed', {
              reference,
              amount,
              message: `Your withdrawal of ₦${amount.toLocaleString()} has been sent! 💸`
            });
          }

        } catch (pluzzpayError) {
          // Refund on failure
          const wallet = await Wallet.findOne({ where: { userId: withdrawalTx.userId } });
          if (wallet) {
            await wallet.update({
              nairaBalance: parseFloat(wallet.nairaBalance) + amount,
              totalWithdrawn: Math.max(0, parseFloat(wallet.totalWithdrawn) - amount)
            });
          }

          await Transaction.update({
            status: 'failed',
            metadata: sequelize.literal(`metadata || '${JSON.stringify({
              failedAt: new Date(),
              failureReason: pluzzpayError.message
            })}'::jsonb`)
          }, { where: { reference } });

          results.failed.push({ reference, error: pluzzpayError.message, refunded: true });
        }

      } catch (error) {
        results.failed.push({ reference, error: error.message });
      }
    }

    console.log('✅ Bulk approval completed:', results);

    res.json({
      success: true,
      message: `Processed ${references.length} withdrawals`,
      data: {
        totalProcessed: references.length,
        successful: results.successful.length,
        failed: results.failed.length,
        results
      }
    });

  } catch (error) {
    console.error('❌ Bulk approve error:', error);
    res.status(500).json({
      success: false,
      message: 'Bulk approval failed'
    });
  }
};

// =====================================================
// ADMIN: GET AMOUNT MISMATCHES
// =====================================================

// @desc    Get deposits with amount mismatch (Admin only)
// @route   GET /api/wallet/admin/mismatches
// @access  Admin
const getAmountMismatches = async (req, res) => {
  try {
    const mismatches = await PendingDeposit.findAll({
      where: {
        status: 'pending',
        webhookData: {
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'phoneNumber']
        },
        {
          model: VirtualAccount,
          as: 'virtualAccount',
          attributes: ['accountNumber', 'accountName', 'bankName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100
    });

    const flaggedDeposits = mismatches.filter(deposit => 
      deposit.webhookData?.requiresManualReview === true
    );

    res.json({
      success: true,
      data: {
        count: flaggedDeposits.length,
        deposits: flaggedDeposits.map(d => ({
          reference: d.reference,
          user: {
            id: d.user?.id,
            username: d.user?.username,
            email: d.user?.email,
            phone: d.user?.phoneNumber
          },
          account: {
            number: d.virtualAccount?.accountNumber,
            name: d.virtualAccount?.accountName,
            bank: d.virtualAccount?.bankName
          },
          expectedAmount: parseFloat(d.amount),
          receivedAmount: d.webhookData?.receivedAmount,
          difference: d.webhookData?.amountDifference,
          payer: d.webhookData?.payer,
          aspfiyRef: d.webhookData?.aspfiyReference,
          createdAt: d.createdAt,
          webhookReceivedAt: d.webhookData?.receivedAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Get mismatches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mismatches'
    });
  }
};

// =====================================================
// ADMIN: APPROVE AMOUNT MISMATCH
// =====================================================

// @desc    Manually approve amount mismatch (Admin only)
// @route   POST /api/wallet/admin/approve-mismatch/:reference
// @access  Admin
const approveAmountMismatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { reference } = req.params;
    const { creditAmount } = req.body;

    if (!creditAmount || creditAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid credit amount'
      });
    }

    const pendingDeposit = await PendingDeposit.findOne({
      where: { reference },
      include: [
        {
          model: User,
          as: 'user',
          include: [{ model: Wallet, as: 'wallet' }]
        }
      ],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!pendingDeposit) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Deposit not found'
      });
    }

    const wallet = pendingDeposit.user?.wallet;
    if (!wallet) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const balanceBefore = parseFloat(wallet.nairaBalance) || 0;
    const balanceAfter = balanceBefore + creditAmount;

    await wallet.update({
      nairaBalance: balanceAfter,
      totalDeposited: parseFloat(wallet.totalDeposited || 0) + creditAmount
    }, { transaction });

    await pendingDeposit.update({
      status: 'completed',
      completedAt: new Date(),
      webhookData: {
        ...pendingDeposit.webhookData,
        manuallyApproved: true,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        creditedAmount: creditAmount
      }
    }, { transaction });

    await Transaction.update({
      status: 'completed',
      balanceBefore,
      balanceAfter,
      amount: creditAmount,
      metadata: {
        manuallyApproved: true,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        originalAmount: pendingDeposit.amount,
        receivedAmount: pendingDeposit.webhookData?.receivedAmount,
        creditedAmount: creditAmount,
        reason: 'Amount mismatch - manually approved'
      }
    }, {
      where: { reference },
      transaction
    });

    await transaction.commit();

    console.log('✅ Manual approval:', reference, 'Amount:', creditAmount);

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${pendingDeposit.userId}`).emit('deposit_confirmed', {
        amount: creditAmount,
        newBalance: balanceAfter,
        reference: pendingDeposit.reference,
        message: `Your deposit of ₦${creditAmount.toLocaleString()} has been approved! 🎉`
      });
    }

    res.json({
      success: true,
      message: 'Deposit manually approved and credited',
      data: {
        reference,
        creditedAmount: creditAmount,
        newBalance: balanceAfter,
        userId: pendingDeposit.userId
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Manual approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve deposit'
    });
  }
};

// =====================================================
// CLEANUP EXPIRED DEPOSITS
// =====================================================

// @desc    Cleanup expired deposits (cron job)
// @route   POST /api/wallet/cleanup/expired
// @access  Internal
const cleanupExpiredDeposits = async () => {
  try {
    const result = await PendingDeposit.update(
      { status: 'expired' },
      {
        where: {
          status: 'pending',
          expiresAt: { [sequelize.Sequelize.Op.lt]: new Date() }
        }
      }
    );

    // Also update related transactions
    await Transaction.update(
      { status: 'expired' },
      {
        where: {
          type: 'deposit',
          status: 'pending',
          createdAt: { [sequelize.Sequelize.Op.lt]: new Date(Date.now() - 30 * 60 * 1000) }
        }
      }
    );

    console.log(`🧹 Cleaned up ${result[0]} expired deposits`);
    return result[0];

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    throw error;
  }
};

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  // Wallet
  getBalance,
  
  // Banks & Accounts
  getBanksList,
  verifyBankAccount,
  getSavedAccounts,
  setDefaultAccount,
  deleteBankAccount,
  
  // Deposits
  initiateNairaDeposit,
  handleAspfiyWebhook,
  handlePluzzPayWebhook,
  checkDepositStatus,
  getPendingDeposit,
  cancelPendingDeposit,
  
  // Withdrawals
  requestWithdrawal,
  
  // Transactions
  getTransactions,
  
  // Admin - Withdrawals
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
  bulkApproveWithdrawals,
  
  // Admin - Deposits
  getAmountMismatches,
  approveAmountMismatch,
  
  // Cleanup
  cleanupExpiredDeposits
};
