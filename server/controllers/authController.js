
const { User, Wallet } = require('../models');
const { generateToken } = require('../middleware/auth');
const { 
  validateEmail, 
  validateUsername, 
  validatePassword,
  validatePhoneNumber 
} = require('../utils/validators');
const { sequelize } = require('../config/database');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { username, email, password, fullName, phoneNumber, referralCode } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password'
      });
    }

    // Validate email
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate username
    if (!validateUsername(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-50 alphanumeric characters'
      });
    }

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase and number'
      });
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email },
          { username }
        ]
      }
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: userExists.email === email 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Check referral code if provided
    let referrerId = null;
    if (referralCode) {
      const referrer = await User.findOne({
        where: { referralCode }
      });

      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }

      referrerId = referrer.id;
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      fullName,
      phoneNumber,
      referredBy: referrerId
    }, { transaction });

    // Create wallet for user with initial balance for testing
    const wallet = await Wallet.create({
      userId: user.id,
      nairaBalance: 10000.00, // Give ₦10,000 initial balance for testing
      cryptoBalance: 0.00
    }, { transaction });

    await transaction.commit();

    // Generate token
    const token = generateToken(user.id);

    // Return user with wallet nested inside
    const responseData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      referralCode: user.referralCode,
      isVerified: user.isVerified,
      role: user.role,
      wallet: {
        id: wallet.id,
        nairaBalance: parseFloat(wallet.nairaBalance),
        cryptoBalance: parseFloat(wallet.cryptoBalance),
        lockedBalance: parseFloat(wallet.lockedBalance)
      }
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: responseData,
      token
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Register error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Validation
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password'
      });
    }

    // Find user by email or username with wallet
    const user = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      },
      include: [{
        model: Wallet,
        as: 'wallet',
        attributes: ['id', 'nairaBalance', 'cryptoBalance', 'lockedBalance', 'totalWon', 'totalLost', 'totalDeposited', 'totalWithdrawn']
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id);

    // Return user with wallet nested inside (CRITICAL FIX)
    const responseData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      kycStatus: user.kycStatus,
      referralCode: user.referralCode,
      wallet: {
        id: user.wallet.id,
        nairaBalance: parseFloat(user.wallet.nairaBalance),
        cryptoBalance: parseFloat(user.wallet.cryptoBalance),
        lockedBalance: parseFloat(user.wallet.lockedBalance),
        totalWon: parseFloat(user.wallet.totalWon),
        totalLost: parseFloat(user.wallet.totalLost),
        totalDeposited: parseFloat(user.wallet.totalDeposited),
        totalWithdrawn: parseFloat(user.wallet.totalWithdrawn)
      }
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: responseData,
      token
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Wallet,
        as: 'wallet',
        attributes: ['id', 'nairaBalance', 'cryptoBalance', 'lockedBalance', 'totalWon', 'totalLost', 'totalDeposited', 'totalWithdrawn']
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user with wallet nested inside (CRITICAL FIX)
    const responseData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isVerified: user.isVerified,
      kycStatus: user.kycStatus,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      wallet: {
        id: user.wallet.id,
        nairaBalance: parseFloat(user.wallet.nairaBalance),
        cryptoBalance: parseFloat(user.wallet.cryptoBalance),
        lockedBalance: parseFloat(user.wallet.lockedBalance),
        totalWon: parseFloat(user.wallet.totalWon),
        totalLost: parseFloat(user.wallet.totalLost),
        totalDeposited: parseFloat(user.wallet.totalDeposited),
        totalWithdrawn: parseFloat(user.wallet.totalWithdrawn)
      }
    };

    res.json({
      success: true,
      user: responseData
    });

  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber } = req.body;
    const user = await User.findByPk(req.user.id);

    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (phoneNumber) {
      if (!validatePhoneNumber(phoneNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
      updateData.phoneNumber = phoneNumber;
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with uppercase, lowercase and number'
      });
    }

    const user = await User.findByPk(req.user.id);

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({ password: newPassword });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

// @desc    Get referral stats
// @route   GET /api/auth/referrals
// @access  Private
const getReferrals = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    // Count referrals
    const referralCount = await User.count({
      where: { referredBy: user.id }
    });

    const referrals = await User.findAll({
      where: { referredBy: user.id },
      attributes: ['id', 'username', 'createdAt']
    });

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        totalReferrals: referralCount,
        referrals
      }
    });

  } catch (error) {
    console.error('Get referrals error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get referrals',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getReferrals
};
