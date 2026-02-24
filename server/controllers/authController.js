
const { User, Wallet } = require('../models');
const { generateToken } = require('../middleware/auth');
const { sequelize } = require('../config/database');

const crypto = require('crypto');
const nodemailer = require('nodemailer');
// ========== VALIDATION HELPERS ==========
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username) => {
  // 3-30 characters, alphanumeric and underscore only
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
};

const validatePhoneNumber = (phone) => {
  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // Must start with 0 and be exactly 11 digits
  if (!cleanPhone.startsWith('0')) return false;
  if (cleanPhone.length !== 11) return false;
  if (!/^\d+$/.test(cleanPhone)) return false;
  
  return true;
};

const validateFullName = (name) => {
  if (!name || name.trim().length < 3) return false;
  if (name.trim().length > 100) return false;
  // Only letters and spaces
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) return false;
  return true;
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { username, email, password, fullName, phoneNumber, referralCode } = req.body;

    console.log('📝 Registration attempt:', { username, email, fullName, phoneNumber });

    // ===== REQUIRED FIELDS VALIDATION =====
    if (!username || !email || !password || !fullName || !phoneNumber) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: username, email, password, full name, and phone number'
      });
    }

    // ===== FULL NAME VALIDATION =====
    if (!validateFullName(fullName)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Full name must be 3-100 characters and contain only letters and spaces'
      });
    }

    // ===== PHONE NUMBER VALIDATION =====
    // Clean phone number
    const cleanPhoneNumber = phoneNumber.replace(/[\s-]/g, '');

    if (!cleanPhoneNumber.startsWith('0')) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Phone number must start with 0'
      });
    }

    if (cleanPhoneNumber.length !== 11) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 11 digits'
      });
    }

    if (!/^\d+$/.test(cleanPhoneNumber)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Phone number can only contain digits'
      });
    }

    // ===== EMAIL VALIDATION =====
    if (!validateEmail(email)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // ===== USERNAME VALIDATION =====
    if (!validateUsername(username)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Username must be 3-30 characters and can only contain letters, numbers, and underscores'
      });
    }

    // ===== PASSWORD VALIDATION =====
    if (!validatePassword(password)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // ===== CHECK IF USER EXISTS =====
    const existingUser = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
          { phoneNumber: cleanPhoneNumber }
        ]
      }
    });

    if (existingUser) {
      await transaction.rollback();
      
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
      if (existingUser.username.toLowerCase() === username.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
      if (existingUser.phoneNumber === cleanPhoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already registered'
        });
      }
    }

    // ===== CHECK REFERRAL CODE =====
    let referrerId = null;
    if (referralCode && referralCode.trim()) {
      const referrer = await User.findOne({
        where: { referralCode: referralCode.trim().toUpperCase() }
      });

      if (!referrer) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }

      referrerId = referrer.id;
    }

    // ===== CREATE USER =====
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password, // Will be hashed by beforeCreate hook
      fullName: fullName.trim(),
      phoneNumber: cleanPhoneNumber,
      referredBy: referrerId
    }, { transaction });

    // ===== CREATE WALLET =====
    await Wallet.create({
      userId: user.id
    }, { transaction });

    await transaction.commit();

    console.log('✅ User registered successfully:', user.username);

    // ===== GENERATE TOKEN =====
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Wealth.',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          referralCode: user.referralCode,
          isVerified: user.isVerified
        },
        token
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Registration error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0] || 'Validation error',
        errors: messages
      });
    }

    // Handle unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path || 'field';
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Find user by email or username
    const user = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername.toLowerCase() }
        ]
      },
      include: [{
        model: Wallet,
        as: 'wallet'
      }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/username or password'
      });
    }

    // Update last login
    await user.update({ lastLogin: new Date() });

    // Generate token
    const token = generateToken(user.id);

    console.log('✅ User logged in:', user.username);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          kycStatus: user.kycStatus,
          referralCode: user.referralCode
        },
        wallet: user.wallet ? {
          nairaBalance: parseFloat(user.wallet.nairaBalance) || 0,
          cryptoBalance: parseFloat(user.wallet.cryptoBalance) || 0,
          lockedBalance: parseFloat(user.wallet.lockedBalance) || 0
        } : null,
        token
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        as: 'wallet'
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isVerified: user.isVerified,
          kycStatus: user.kycStatus,
          referralCode: user.referralCode,
          createdAt: user.createdAt
        },
        wallet: user.wallet ? {
          nairaBalance: parseFloat(user.wallet.nairaBalance) || 0,
          cryptoBalance: parseFloat(user.wallet.cryptoBalance) || 0,
          lockedBalance: parseFloat(user.wallet.lockedBalance) || 0,
          totalDeposited: parseFloat(user.wallet.totalDeposited) || 0,
          totalWithdrawn: parseFloat(user.wallet.totalWithdrawn) || 0,
          totalWon: parseFloat(user.wallet.totalWon) || 0,
          totalLost: parseFloat(user.wallet.totalLost) || 0
        } : null
      }
    });

  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = {};

    if (fullName) {
      if (!validateFullName(fullName)) {
        return res.status(400).json({
          success: false,
          message: 'Full name must be 3-100 characters and contain only letters and spaces'
        });
      }
      updateData.fullName = fullName.trim();
    }

    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
      
      if (!validatePhoneNumber(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Phone number must start with 0 and be exactly 11 digits'
        });
      }

      // Check if phone is already used by another user
      const existingPhone = await User.findOne({
        where: { 
          phoneNumber: cleanPhone,
          id: { [sequelize.Sequelize.Op.ne]: user.id }
        }
      });

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'This phone number is already registered to another account'
        });
      }

      updateData.phoneNumber = cleanPhone;
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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: 'Please provide current password and new password'
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get referral stats
// @route   GET /api/auth/referrals
// @access  Private
const getReferrals = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{
        model: User,
        as: 'referrals',
        attributes: ['id', 'username', 'createdAt']
      }]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        totalReferrals: user.referrals?.length || 0,
        referrals: user.referrals || []
      }
    });

  } catch (error) {
    console.error('Get referrals error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get referrals',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};



// ========== EMAIL TRANSPORTER ==========
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// @desc    Forgot password - Send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    // Don't reveal if email exists or not (security)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save to user
    await user.update({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: resetTokenExpiry
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    // Send email
    try {
      const transporter = createTransporter();

      await transporter.sendMail({
        from: `"Wealth Trading" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Password Reset Request - Wealth Trading',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #6366f1; margin: 0;">Wealth Trading</h1>
            </div>
            
            <div style="background: #1e293b; border-radius: 16px; padding: 30px; color: #fff;">
              <h2 style="margin-top: 0;">Password Reset Request</h2>
              
              <p style="color: #94a3b8;">Hi ${user.fullName || user.username},</p>
              
              <p style="color: #94a3b8;">
                You requested to reset your password. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(to right, #6366f1, #8b5cf6); 
                          color: white; 
                          padding: 14px 30px; 
                          border-radius: 8px; 
                          text-decoration: none; 
                          font-weight: bold;
                          display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #94a3b8; font-size: 14px;">
                This link will expire in <strong>30 minutes</strong>.
              </p>
              
              <p style="color: #94a3b8; font-size: 14px;">
                If you didn't request this, please ignore this email. Your password will remain unchanged.
              </p>
              
              <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;" />
              
              <p style="color: #64748b; font-size: 12px; text-align: center;">
                © 2024 Wealth Trading. All rights reserved.
              </p>
            </div>
          </div>
        `
      });

      console.log('✅ Password reset email sent to:', user.email);

    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      
      // Clear the reset token if email fails
      await user.update({
        passwordResetToken: null,
        passwordResetExpires: null
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a reset link'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide token and new password'
      });
    }

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      });
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpires: {
          [sequelize.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token. Please request a new reset link.'
      });
    }

    // Update password and clear reset token
    await user.update({
      password: password, // Will be hashed by beforeUpdate hook
      passwordResetToken: null,
      passwordResetExpires: null
    });

    console.log('✅ Password reset successful for:', user.email);

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
};

// Add to exports
module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getReferrals,
  forgotPassword,    // ADD THIS
  resetPassword      // ADD THIS
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getReferrals
};
