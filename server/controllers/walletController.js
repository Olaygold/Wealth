
// controllers/walletController.js
const { Wallet, Transaction, User, VirtualAccount, PendingDeposit } = require('../models');
const { validateAmount } = require('../utils/validators');
const { generateReference } = require('../utils/helpers');
const { sequelize } = require('../config/database');
const crypto = require('crypto');

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Verify Aspfiy webhook signature
 * Aspfiy uses MD5 hash of secret key in x-wiaxy-signature header
 */
const verifyAspfiySignature = (receivedSignature, secretKey) => {
  const expectedSignature = crypto
    .createHash('md5')
    .update(secretKey)
    .digest('hex');
  
  return receivedSignature === expectedSignature;
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

    // Check for existing pending deposit
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
      
      return res.status(400).json({
        success: false,
        message: 'You already have a pending deposit. Please complete it or wait for it to expire.',
        data: {
          reference: existingPending.reference,
          amount: parseFloat(existingPending.originalAmount),
          accountNumber: existingPending.virtualAccount?.accountNumber,
          accountName: existingPending.virtualAccount?.accountName,
          bankName: existingPending.virtualAccount?.bankName,
          expiresAt: existingPending.expiresAt,
          expiresIn: Math.max(0, Math.round((new Date(existingPending.expiresAt) - new Date()) / 1000 / 60)) + ' minutes'
        }
      });
    }

    // Get next available virtual account (ROUND-ROBIN with row-level locking)
    const virtualAccount = await VirtualAccount.findOne({
      where: { isActive: true },
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
        message: 'Service temporarily unavailable. Please try again in a few moments.'
      });
    }

    console.log('✅ Assigned virtual account:', virtualAccount.accountNumber);

    // Generate unique reference
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(4).toString('hex').toUpperCase();
    const reference = `WTH-${timestamp}-${randomHash}`;

    const depositAmount = parseFloat(amount);

    // Create pending deposit
    const pendingDeposit = await PendingDeposit.create({
      userId: req.user.id,
      virtualAccountId: virtualAccount.id,
      amount: depositAmount,
      originalAmount: depositAmount,
      reference,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
    }, { transaction });

    // Update virtual account usage
    await virtualAccount.update({
      lastAssignedAt: new Date(),
      totalUsage: sequelize.literal('"totalUsage" + 1')
    }, { transaction });

    // Create transaction record
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

    console.log('✅ Deposit initialized successfully:', reference);

    res.json({
      success: true,
      message: 'Deposit instructions generated',
      data: {
        // Bank details to display to user
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        bankName: virtualAccount.bankName,
        
        // User transfers exact amount
        amount: depositAmount,
        amountFormatted: `₦${depositAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        
        reference: reference,
        expiresAt: pendingDeposit.expiresAt,
        expiresIn: '30 minutes',
        
        // Instructions for user
        instructions: [
          `Transfer ₦${depositAmount.toLocaleString()} to the account above`,
          `Transfer from your personal bank account only`,
          `Your wallet will be credited automatically within 2 minutes`,
          `This deposit session expires in 30 minutes`
        ],

        // Warnings
        warnings: [
          `⚠️ Transfer ₦${depositAmount.toLocaleString()} to the account shown above`,
          'Do not transfer from a third-party account',
          '🎉 NO FEES - You get 100% of what you deposit!'
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

    // ===== SECURITY: Verify webhook signature =====
    const receivedSignature = req.headers['x-wiaxy-signature'];
    
    if (!receivedSignature) {
      console.error('❌ No x-wiaxy-signature in webhook request');
      await dbTransaction.rollback();
      return res.status(401).json({ 
        success: false, 
        message: 'Missing signature' 
      });
    }

    const secretKey = process.env.ASPFIY_SECRET_KEY;
    
    if (!secretKey) {
      console.error('❌ ASPFIY_SECRET_KEY not configured');
      await dbTransaction.rollback();
      return res.status(500).json({ 
        success: false, 
        message: 'Webhook secret not configured' 
      });
    }

    // Verify signature (MD5 of secret key)
    if (!verifyAspfiySignature(receivedSignature, secretKey)) {
      console.error('❌ Invalid webhook signature');
      await dbTransaction.rollback();
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature' 
      });
    }

    console.log('✅ Webhook signature verified');

    // ===== EXTRACT DATA =====
    const { event, data } = req.body;

    // Validate event type
    if (event !== 'PAYMENT_NOTIFICATION') {
      console.log(`ℹ️ Ignoring event: ${event}`);
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Event ignored' });
    }

    // Validate transaction type
    if (data.type !== 'RESERVED_ACCOUNT_TRANSACTION') {
      console.log(`ℹ️ Ignoring transaction type: ${data.type}`);
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Transaction type ignored' });
    }

    console.log('📥 Processing RESERVED_ACCOUNT_TRANSACTION');

    // Extract webhook data
    const {
      reference: aspfiyReference,
      merchant_reference,
      wiaxy_ref: interBankReference,
      amount,
      account: { account_number },
      payer = {},
      customer = {}
    } = data;

    const receivedAmount = parseFloat(amount);
    const payerFirstName = customer.firstName || payer.first_name || '';
    const payerLastName = customer.lastName || payer.last_name || '';

    console.log('📥 Payment details:');
    console.log('   Account:', account_number);
    console.log('   Amount: ₦' + receivedAmount);
    console.log('   Payer:', `${payerFirstName} ${payerLastName}`);
    console.log('   Aspfiy Ref:', aspfiyReference);

    // ===== FIND VIRTUAL ACCOUNT =====
    const virtualAccount = await VirtualAccount.findOne({
      where: { accountNumber: account_number },
      transaction: dbTransaction
    });

    if (!virtualAccount) {
      console.error('❌ Unknown virtual account:', account_number);
      console.log('⚠️ UNMATCHED - UNKNOWN ACCOUNT:', account_number);
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Unknown account' });
    }

    console.log('✅ Virtual account found:', virtualAccount.id);

    // ===== FIND MATCHING PENDING DEPOSIT =====
    // Match by virtual account + amount (±1 tolerance) + not expired
    const pendingDeposit = await PendingDeposit.findOne({
      where: {
        virtualAccountId: virtualAccount.id,
        status: 'pending',
        expiresAt: { [sequelize.Sequelize.Op.gt]: new Date() },
        originalAmount: {
          [sequelize.Sequelize.Op.between]: [receivedAmount - 1, receivedAmount + 1]
        }
      },
      order: [['createdAt', 'ASC']], // FIFO - oldest pending first
      transaction: dbTransaction
    });

    if (!pendingDeposit) {
      console.error('❌ No matching pending deposit');
      
      // Check if it's a duplicate (already completed)
      const completedDeposit = await PendingDeposit.findOne({
        where: {
          virtualAccountId: virtualAccount.id,
          status: 'completed',
          originalAmount: {
            [sequelize.Sequelize.Op.between]: [receivedAmount - 1, receivedAmount + 1]
          }
        },
        order: [['completedAt', 'DESC']],
        transaction: dbTransaction
      });

      if (completedDeposit) {
        const timeDiff = Date.now() - new Date(completedDeposit.completedAt).getTime();
        if (timeDiff < 60000) {
          console.log('⚠️ Duplicate webhook - already processed');
          await dbTransaction.commit();
          return res.json({ success: true, message: 'Already processed' });
        }
      }

      // Log unmatched deposit
      console.log('⚠️ UNMATCHED DEPOSIT:', JSON.stringify({
        virtualAccountId: virtualAccount.id,
        account_number,
        amount: receivedAmount,
        aspfiyReference,
        timestamp: webhookTimestamp
      }, null, 2));

      await dbTransaction.commit();
      return res.json({ success: true, message: 'No matching deposit' });
    }

    // Lock the pending deposit
    await pendingDeposit.reload({
      lock: dbTransaction.LOCK.UPDATE,
      transaction: dbTransaction
    });

    console.log('✅ Matching deposit found:');
    console.log('   Reference:', pendingDeposit.reference);
    console.log('   User ID:', pendingDeposit.userId);
    console.log('   Amount to credit: ₦' + pendingDeposit.originalAmount);

    // ===== IDEMPOTENCY CHECK =====
    if (pendingDeposit.status === 'completed') {
      console.log('⚠️ Deposit already completed (idempotency check)');
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Already processed' });
    }

    // ===== GET USER AND WALLET =====
    const user = await User.findByPk(pendingDeposit.userId, {
      include: [{ model: Wallet, as: 'wallet' }],
      transaction: dbTransaction
    });

    const wallet = user?.wallet;
    
    if (!wallet) {
      console.error('❌ Wallet not found for user:', pendingDeposit.userId);
      await dbTransaction.rollback();
      return res.status(500).json({ success: false, message: 'Wallet not found' });
    }

    // ===== CREDIT USER WALLET (NO FEES) =====
    const amountToCredit = parseFloat(pendingDeposit.originalAmount);
    const balanceBefore = parseFloat(wallet.nairaBalance) || 0;
    const balanceAfter = balanceBefore + amountToCredit;

    await wallet.update({
      nairaBalance: balanceAfter,
      totalDeposited: parseFloat(wallet.totalDeposited || 0) + amountToCredit
    }, { transaction: dbTransaction });

    console.log(`✅ Wallet updated: ₦${balanceBefore.toFixed(2)} → ₦${balanceAfter.toFixed(2)}`);

    // ===== UPDATE PENDING DEPOSIT =====
    await pendingDeposit.update({
      status: 'completed',
      completedAt: new Date(),
      webhookData: {
        aspfiyReference,
        interBankReference,
        merchant_reference,
        payer: { firstName: payerFirstName, lastName: payerLastName },
        receivedAt: webhookTimestamp,
        rawPayload: req.body
      }
    }, { transaction: dbTransaction });

    // ===== UPDATE TRANSACTION =====
    await Transaction.update({
      status: 'completed',
      balanceBefore,
      balanceAfter,
      metadata: {
        virtualAccountId: virtualAccount.id,
        aspfiyReference,
        interBankReference,
        merchant_reference,
        payer: {
          name: `${payerFirstName} ${payerLastName}`
        },
        processedAt: new Date(),
        amountCredited: amountToCredit,
        noFeesCharged: true
      }
    }, {
      where: { reference: pendingDeposit.reference },
      transaction: dbTransaction
    });

    await dbTransaction.commit();

    console.log('✅✅✅ ====== DEPOSIT COMPLETED ======');
    console.log(`✅ Amount Credited: ₦${amountToCredit.toFixed(2)}`);
    console.log(`✅ User: ${pendingDeposit.userId}`);
    console.log(`✅ New Balance: ₦${balanceAfter.toFixed(2)}`);
    console.log('✅✅✅ ================================');

    // ===== REAL-TIME NOTIFICATION =====
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${pendingDeposit.userId}`).emit('deposit_confirmed', {
        amount: amountToCredit,
        newBalance: balanceAfter,
        reference: pendingDeposit.reference,
        timestamp: new Date(),
        message: `Your deposit of ₦${amountToCredit.toLocaleString()} has been confirmed! 🎉`
      });
      console.log('📤 Real-time notification sent to user');
    }

    // ===== RESPOND TO ASPFIY =====
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      reference: pendingDeposit.reference
    });

  } catch (error) {
    await dbTransaction.rollback();
    console.error('❌❌❌ WEBHOOK ERROR:', error);
    console.error('Stack:', error.stack);
    
    // Still respond 200 to prevent Aspfiy retries
    res.status(200).json({
      success: false,
      message: 'Webhook processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
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

    // Auto-expire if needed
    if (isExpired && pendingDeposit.status === 'pending') {
      await pendingDeposit.update({ status: 'expired' });
      await Transaction.update(
        { status: 'expired' },
        { where: { reference } }
      );
    }

    res.json({
      success: true,
      data: {
        reference: pendingDeposit.reference,
        amount: parseFloat(pendingDeposit.originalAmount),
        status: isExpired ? 'expired' : pendingDeposit.status,
        isExpired,
        timeRemaining: timeRemaining > 0 ? `${timeRemaining} minutes` : 'Expired',
        accountNumber: pendingDeposit.virtualAccount.accountNumber,
        accountName: pendingDeposit.virtualAccount.accountName,
        bankName: pendingDeposit.virtualAccount.bankName,
        expiresAt: pendingDeposit.expiresAt,
        completedAt: pendingDeposit.completedAt,
        createdAt: pendingDeposit.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Check deposit status error:', error);
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

// @desc    Get user's current pending deposit (if any)
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

    res.json({
      success: true,
      data: {
        reference: pendingDeposit.reference,
        amount: parseFloat(pendingDeposit.originalAmount),
        accountNumber: pendingDeposit.virtualAccount.accountNumber,
        accountName: pendingDeposit.virtualAccount.accountName,
        bankName: pendingDeposit.virtualAccount.bankName,
        expiresAt: pendingDeposit.expiresAt,
        timeRemaining: `${timeRemaining} minutes`,
        createdAt: pendingDeposit.createdAt
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
// CANCEL PENDING DEPOSIT
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

    await pendingDeposit.update({
      status: 'cancelled'
    }, { transaction });

    await Transaction.update({
      status: 'cancelled'
    }, {
      where: { reference },
      transaction
    });

    await transaction.commit();

    console.log('✅ Deposit cancelled:', reference);

    res.json({
      success: true,
      message: 'Deposit cancelled successfully. You can now initiate a new deposit.'
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
// REQUEST WITHDRAWAL
// =====================================================

// @desc    Request withdrawal
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { amount, bankCode, accountNumber, accountName } = req.body;

    // Validate amount
    if (!validateAmount(amount) || amount < 1000) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal is ₦1,000'
      });
    }

    // Validate bank details
    if (!bankCode || !accountNumber || !accountName) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Please provide complete bank details'
      });
    }

    // Validate account number format
    if (!/^\d{10}$/.test(accountNumber)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Account number must be 10 digits'
      });
    }

    // Get wallet with lock
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

    // Check sufficient balance
    if (amount > availableBalance) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: {
          requested: amount,
          available: availableBalance.toFixed(2)
        }
      });
    }

    const user = await User.findByPk(req.user.id);
    const reference = generateReference('WTH');
    const balanceBefore = parseFloat(wallet.nairaBalance);

    // Create withdrawal transaction
    await Transaction.create({
      userId: user.id,
      type: 'withdrawal',
      method: 'naira',
      amount,
      currency: 'NGN',
      status: 'pending',
      reference,
      description: `Withdrawal to ${accountName} - ${accountNumber}`,
      metadata: {
        bankCode,
        accountNumber,
        accountName
      },
      balanceBefore
    }, { transaction });

    // Deduct from wallet
    await wallet.update({
      nairaBalance: balanceBefore - amount,
      totalWithdrawn: parseFloat(wallet.totalWithdrawn || 0) + amount
    }, { transaction });

    await transaction.commit();

    console.log('✅ Withdrawal request created:', reference);

    res.json({
      success: true,
      message: 'Withdrawal request submitted. Processing within 24 hours.',
      data: {
        reference,
        amount,
        status: 'pending',
        accountNumber,
        accountName,
        bankCode,
        estimatedCompletion: '24 hours'
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Request withdrawal error:', error);
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
// ADMIN: GET UNMATCHED DEPOSITS
// =====================================================

// @desc    Get unmatched deposits (Admin only)
// @route   GET /api/wallet/admin/unmatched
// @access  Admin
const getUnmatchedDeposits = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        count: 0,
        deposits: [],
        message: 'Unmatched deposits are logged to console. Check server logs.'
      }
    });
  } catch (error) {
    console.error('❌ Get unmatched deposits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unmatched deposits'
    });
  }
};

// =====================================================
// CLEANUP: EXPIRE OLD PENDING DEPOSITS
// =====================================================

// @desc    Cleanup expired pending deposits
// @route   POST /api/wallet/cleanup/expired
// @access  Internal/Cron
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

    console.log(`🧹 Cleaned up ${result[0]} expired pending deposits`);
    return result[0];

  } catch (error) {
    console.error('❌ Cleanup expired deposits error:', error);
    throw error;
  }
};

// =====================================================
// EXPORTS
// =====================================================
module.exports = {
  getBalance,
  initiateNairaDeposit,
  handleAspfiyWebhook,
  checkDepositStatus,
  getPendingDeposit,
  cancelPendingDeposit,
  requestWithdrawal,
  getTransactions,
  getUnmatchedDeposits,
  cleanupExpiredDeposits
};
