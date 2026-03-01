
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
        message: 'All payment accounts are currently busy. Please try again in 1 minute.'
      });
    }

    console.log('✅ Assigned virtual account:', virtualAccount.accountNumber);

    // Generate unique reference
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(4).toString('hex').toUpperCase();
    const reference = `WTH-${timestamp}-${randomHash}`;

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
        // Bank account details
        accountNumber: virtualAccount.accountNumber,
        accountName: virtualAccount.accountName,
        bankName: virtualAccount.bankName,
        
        // Amount to transfer
        amount: depositAmount,
        amountFormatted: `₦${depositAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        
        reference: reference,
        expiresAt: pendingDeposit.expiresAt,
        expiresIn: '30 minutes',
        
        // Instructions
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

    // Validate event type
    if (event !== 'PAYMENT_NOTIFICATION') {
      console.log(`ℹ️ Ignoring event: ${event}`);
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Event ignored' });
    }

    // Validate transaction type
    if (data.type !== 'RESERVED_ACCOUNT_TRANSACTION') {
      console.log(`ℹ️ Ignoring type: ${data.type}`);
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Type ignored' });
    }

    console.log('📥 Processing payment...');

    // Extract payment data
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
      
      // Check if already completed (duplicate webhook)
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
        if (timeSince < 60000) { // Within 1 minute
          console.log('⚠️ Duplicate webhook (already processed)');
          await dbTransaction.commit();
          return res.json({ success: true, message: 'Already processed' });
        }
      }

      // Log unmatched payment
      console.log('⚠️ UNMATCHED PAYMENT:', {
        account: account_number,
        amount: receivedAmount,
        aspfiyRef: aspfiyReference,
        reason: 'No pending deposit found'
      });

      await dbTransaction.commit();
      return res.json({ success: true, message: 'No pending deposit' });
    }

    // ✅ FOUND PENDING DEPOSIT - Now verify amount matches!
    const expectedAmount = parseFloat(pendingDeposit.amount);
    const amountDifference = Math.abs(receivedAmount - expectedAmount);
    const tolerance = 1; // ±1 naira tolerance for rounding

    console.log('✅ Match found:', {
      reference: pendingDeposit.reference,
      userId: pendingDeposit.userId,
      expectedAmount: expectedAmount,
      receivedAmount: receivedAmount,
      difference: amountDifference
    });

    // ✅ CHECK IF AMOUNTS MATCH (with tolerance)
    if (amountDifference > tolerance) {
      console.error('❌ AMOUNT MISMATCH!');
      console.error(`   Expected: ₦${expectedAmount}`);
      console.error(`   Received: ₦${receivedAmount}`);
      console.error(`   Difference: ₦${amountDifference}`);
      
      // Flag for manual review
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

      // ⚠️ DO NOT CREDIT - needs manual review
      console.log('⚠️ Flagged for manual review - Admin approval required');
      return res.json({ 
        success: true, 
        message: 'Amount mismatch - flagged for review' 
      });
    }

    // ✅ AMOUNTS MATCH - Continue with crediting
    console.log('✅ Amount verified - proceeding to credit wallet');

    // Lock the deposit
    await pendingDeposit.reload({
      lock: dbTransaction.LOCK.UPDATE,
      transaction: dbTransaction
    });

    // Idempotency check
    if (pendingDeposit.status === 'completed') {
      console.log('⚠️ Already completed');
      await dbTransaction.commit();
      return res.json({ success: true, message: 'Already processed' });
    }

    // ===== GET USER AND WALLET =====
    const user = await User.findByPk(pendingDeposit.userId, {
      include: [{ model: Wallet, as: 'wallet' }],
      transaction: dbTransaction
    });

    if (!user?.wallet) {
      console.error('❌ Wallet not found for user:', pendingDeposit.userId);
      await dbTransaction.rollback();
      return res.status(500).json({ success: false, message: 'Wallet not found' });
    }

    // ===== CREDIT WALLET =====
    // 🎉 NO FEES - User receives exactly what they deposited!
    const amountToCredit = expectedAmount; // Use expected amount (same as received since they match)
    const balanceBefore = parseFloat(user.wallet.nairaBalance) || 0;
    const balanceAfter = balanceBefore + amountToCredit;

    await user.wallet.update({
      nairaBalance: balanceAfter,
      totalDeposited: parseFloat(user.wallet.totalDeposited || 0) + amountToCredit
    }, { transaction: dbTransaction });

    console.log(`💰 Wallet: ₦${balanceBefore} → ₦${balanceAfter}`);

    // ===== UPDATE PENDING DEPOSIT =====
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

    // ===== UPDATE TRANSACTION =====
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

    // Check if flagged for review
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
        accountNumber: pendingDeposit.virtualAccount.accountNumber,
        accountName: pendingDeposit.virtualAccount.accountName,
        bankName: pendingDeposit.virtualAccount.bankName,
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
        accountNumber: pendingDeposit.virtualAccount.accountNumber,
        accountName: pendingDeposit.virtualAccount.accountName,
        bankName: pendingDeposit.virtualAccount.bankName,
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
      message: 'Deposit cancelled. You can now initiate a new deposit.'
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

    // ✅ CONVERT TO NUMBER IMMEDIATELY!
    const withdrawAmount = parseFloat(amount);

    // Validate amount
    if (!validateAmount(withdrawAmount) || withdrawAmount < 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal is ₦100'
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

    // Validate account number
    if (!/^\d{10}$/.test(accountNumber)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Account number must be 10 digits'
      });
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

    const user = await User.findByPk(req.user.id);
    const reference = generateReference('WTH');
    const balanceBefore = parseFloat(wallet.nairaBalance);
    const currentTotalWithdrawn = parseFloat(wallet.totalWithdrawn || 0);

    // Create withdrawal
    await Transaction.create({
      userId: user.id,
      type: 'withdrawal',
      method: 'naira',
      amount: withdrawAmount, // ✅ NUMBER
      currency: 'NGN',
      status: 'pending',
      reference,
      description: `Withdrawal to ${accountName} - ${accountNumber}`,
      metadata: { bankCode, accountNumber, accountName },
      balanceBefore
    }, { transaction });

    // ✅ DEDUCT FROM WALLET (ALL NUMBERS!)
    await wallet.update({
      nairaBalance: balanceBefore - withdrawAmount,
      totalWithdrawn: currentTotalWithdrawn + withdrawAmount // ✅ BOTH ARE NUMBERS!
    }, { transaction });

    await transaction.commit();

    console.log('✅ Withdrawal created:', reference);

    res.json({
      success: true,
      message: 'Withdrawal request submitted. Processing within 24 hours.',
      data: {
        reference,
        amount: withdrawAmount,
        status: 'pending',
        accountNumber,
        accountName,
        bankCode,
        estimatedCompletion: '24 hours'
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Withdrawal error:', error);
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

    // Filter only those requiring manual review
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
            id: d.user.id,
            username: d.user.username,
            email: d.user.email,
            phone: d.user.phoneNumber
          },
          account: {
            number: d.virtualAccount.accountNumber,
            name: d.virtualAccount.accountName,
            bank: d.virtualAccount.bankName
          },
          expectedAmount: d.amount,
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
    const { creditAmount } = req.body; // Admin decides what to credit

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

    // Credit the wallet
    const balanceBefore = parseFloat(wallet.nairaBalance) || 0;
    const balanceAfter = balanceBefore + creditAmount;

    await wallet.update({
      nairaBalance: balanceAfter,
      totalDeposited: parseFloat(wallet.totalDeposited || 0) + creditAmount
    }, { transaction });

    // Update pending deposit
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

    // Update transaction
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

    // Send notification
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
  getBalance,
  initiateNairaDeposit,
  handleAspfiyWebhook,
  checkDepositStatus,
  getPendingDeposit,
  cancelPendingDeposit,
  requestWithdrawal,
  getTransactions,
  cleanupExpiredDeposits,
  getAmountMismatches,
  approveAmountMismatch
};
