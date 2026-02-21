const { Wallet, Transaction, User } = require('../models');
const { validateAmount } = require('../utils/validators');
const { generateReference } = require('../utils/helpers');
const { sequelize } = require('../config/database');
const axios = require('axios');

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
const getBalance = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id }
    });

    res.json({
      success: true,
      data: {
        nairaBalance: wallet.nairaBalance,
        cryptoBalance: wallet.cryptoBalance,
        lockedBalance: wallet.lockedBalance,
        availableBalance: parseFloat(wallet.nairaBalance) - parseFloat(wallet.lockedBalance),
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        totalWon: wallet.totalWon,
        totalLost: wallet.totalLost
      }
    });

  } catch (error) {
    console.error('Get balance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get balance',
      error: error.message
    });
  }
};

// @desc    Initialize Naira deposit (Paystack)
// @route   POST /api/wallet/deposit/naira
// @access  Private
const initiateNairaDeposit = async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate amount
    if (!validateAmount(amount) || amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum deposit is ₦100'
      });
    }

    const user = await User.findByPk(req.user.id);
    const reference = generateReference('DEP');

    // Create pending transaction
    const transaction = await Transaction.create({
      userId: user.id,
      type: 'deposit',
      method: 'naira',
      amount,
      currency: 'NGN',
      status: 'pending',
      reference,
      description: `Naira deposit of ₦${amount}`
    });

    // Initialize Paystack payment
    try {
      const paystackResponse = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        {
          email: user.email,
          amount: amount * 100, // Paystack expects amount in kobo
          reference,
          callback_url: `${process.env.CLIENT_URL}/wallet/deposit/verify`,
          metadata: {
            user_id: user.id,
            transaction_id: transaction.id
          }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      res.json({
        success: true,
        message: 'Payment initialized',
        data: {
          authorizationUrl: paystackResponse.data.data.authorization_url,
          reference,
          amount
        }
      });

    } catch (paystackError) {
      // Update transaction as failed
      await transaction.update({ status: 'failed' });

      console.error('Paystack error:', paystackError.response?.data || paystackError.message);
      
      return res.status(500).json({
        success: false,
        message: 'Payment gateway error',
        error: paystackError.response?.data?.message || 'Failed to initialize payment'
      });
    }

  } catch (error) {
    console.error('Initiate deposit error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate deposit',
      error: error.message
    });
  }
};

// @desc    Verify Naira deposit (Paystack callback)
// @route   GET /api/wallet/deposit/verify/:reference
// @access  Private
const verifyNairaDeposit = async (req, res) => {
  const dbTransaction = await sequelize.transaction();
  
  try {
    const { reference } = req.params;

    // Find transaction
    const transaction = await Transaction.findOne({
      where: { reference }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified'
      });
    }

    // Verify with Paystack
    try {
      const paystackResponse = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      const paymentData = paystackResponse.data.data;

      if (paymentData.status === 'success') {
        const amount = paymentData.amount / 100; // Convert from kobo to naira

        // Get wallet
        const wallet = await Wallet.findOne({
          where: { userId: transaction.userId }
        });

        const balanceBefore = parseFloat(wallet.nairaBalance);
        const balanceAfter = balanceBefore + amount;

        // Update wallet
        await wallet.update({
          nairaBalance: balanceAfter,
          totalDeposited: parseFloat(wallet.totalDeposited) + amount
        }, { transaction: dbTransaction });

        // Update transaction
        await transaction.update({
          status: 'completed',
          balanceBefore,
          balanceAfter,
          metadata: paymentData
        }, { transaction: dbTransaction });

        await dbTransaction.commit();

        // Emit balance update via socket
        const io = req.app.get('io');
        io.to(transaction.userId).emit('balance_update', {
          nairaBalance: balanceAfter
        });

        res.json({
          success: true,
          message: 'Deposit successful',
          data: {
            amount,
            newBalance: balanceAfter
          }
        });

      } else {
        await transaction.update({ status: 'failed' }, { transaction: dbTransaction });
        await dbTransaction.commit();

        res.status(400).json({
          success: false,
          message: 'Payment verification failed'
        });
      }

    } catch (paystackError) {
      await dbTransaction.rollback();
      console.error('Paystack verification error:', paystackError.message);
      
      return res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error: paystackError.response?.data?.message || 'Verification error'
      });
    }

  } catch (error) {
    await dbTransaction.rollback();
    console.error('Verify deposit error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to verify deposit',
      error: error.message
    });
  }
};

// @desc    Request withdrawal
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { amount, bankCode, accountNumber, accountName } = req.body;

    // Validate amount
    if (!validateAmount(amount) || amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal is ₦1,000'
      });
    }

    // Validate bank details
    if (!bankCode || !accountNumber || !accountName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bank details'
      });
    }

    // Get wallet
    const wallet = await Wallet.findOne({
      where: { userId: req.user.id }
    });

    const availableBalance = parseFloat(wallet.nairaBalance) - parseFloat(wallet.lockedBalance);

    // Check if user has sufficient balance
    if (amount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance',
        data: {
          requested: amount,
          available: availableBalance
        }
      });
    }

    // Check KYC status
    const user = await User.findByPk(req.user.id);
    if (user.kycStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Please complete KYC verification to withdraw'
      });
    }

    const reference = generateReference('WTH');
    const balanceBefore = parseFloat(wallet.nairaBalance);

    // Create withdrawal transaction
    const withdrawalTransaction = await Transaction.create({
      userId: user.id,
      type: 'withdrawal',
      method: 'naira',
      amount,
      currency: 'NGN',
      status: 'pending',
      reference,
      description: `Withdrawal request of ₦${amount}`,
      metadata: {
        bankCode,
        accountNumber,
        accountName
      },
      balanceBefore
    }, { transaction });

    // Deduct from wallet (will be in pending state)
    await wallet.update({
      nairaBalance: balanceBefore - amount,
      totalWithdrawn: parseFloat(wallet.totalWithdrawn) + amount
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Withdrawal request submitted. Processing within 24 hours.',
      data: {
        reference,
        amount,
        status: 'pending'
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Request withdrawal error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to request withdrawal',
      error: error.message
    });
  }
};

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
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.rows,
        pagination: {
          total: transactions.count,
          page: parseInt(page),
          pages: Math.ceil(transactions.count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
};

module.exports = {
  getBalance,
  initiateNairaDeposit,
  verifyNairaDeposit,
  requestWithdrawal,
  getTransactions
};
