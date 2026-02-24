
const { User, Wallet } = require('../models');
const { generateToken } = require('../middleware/auth');
const { sequelize } = require('../config/database');
const crypto = require('crypto');
const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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

// ========== EMAIL SERVICE ==========
const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Wealth Trading <onboarding@resend.dev>',
      to: [userEmail],
      subject: 'Password Reset Request - Wealth Trading',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="text-align: center; padding-bottom: 30px;">
                      <h1 style="color: #6366f1; margin: 0; font-size: 32px; font-weight: bold;">
                        Wealth Trading
                      </h1>
                    </td>
                  </tr>

                  <!-- Main Content Card -->
                  <tr>
                    <td style="background: linear-gradient(to bottom, #1e293b, #0f172a); border-radius: 16px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                      
                      <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                        Password Reset Request
                      </h2>
                      
                      <p style="color: #e2e8f0; margin: 0 0 16px 0; font-size: 16px; line-height: 1.6;">
                        Hi <strong style="color: #ffffff;">${userName}</strong>,
                      </p>
                      
                      <p style="color: #cbd5e1; margin: 0 0 24px 0; font-size: 15px; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password:
                      </p>
                      
                      <!-- CTA Button -->
                      <table role="presentation" style="margin: 30px 0; width: 100%;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" 
                               style="display: inline-block; 
                                      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                                      color: #ffffff; 
                                      text-decoration: none; 
                                      padding: 16px 40px; 
                                      border-radius: 8px; 
                                      font-weight: 600; 
                                      font-size: 16px;
                                      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                                      transition: all 0.3s ease;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Security Info -->
                      <div style="background: rgba(239, 68, 68, 0.1); 
                                  border-left: 4px solid #ef4444; 
                                  padding: 16px; 
                                  margin: 24px 0; 
                                  border-radius: 4px;">
                        <p style="color: #fca5a5; margin: 0; font-size: 14px; font-weight: 600;">
                          ⏱️ This link expires in <strong style="color: #ffffff;">30 minutes</strong>
                        </p>
                      </div>
                      
                      <p style="color: #94a3b8; margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">
                        If you didn't request this password reset, please ignore this email or contact our support team if you have concerns. Your password will remain unchanged.
                      </p>

                      <!-- Alternative Link -->
                      <p style="color: #64748b; margin: 24px 0 0 0; font-size: 13px; line-height: 1.6;">
                        If the button doesn't work, copy and paste this link into your browser:
                      </p>
                      <p style="color: #6366f1; 
                                margin: 8px 0 0 0; 
                                font-size: 12px; 
                                word-break: break-all; 
                                background: rgba(99, 102, 241, 0.1); 
                                padding: 12px; 
                                border-radius: 6px;">
                        ${resetUrl}
                      </p>
                      
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding-top: 30px; text-align: center;">
                      <p style="color: #64748b; margin: 0 0 8px 0; font-size: 13px;">
                        Need help? Contact us at 
                        <a href="mailto:support@wealthtrading.com" 
                           style="color: #6366f1; text-decoration: none;">
                          support@wealthtrading.com
                        </a>
                      </p>
                      <p style="color: #475569; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} Wealth Trading. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    console.log('✅ Password reset email sent successfully. Email ID:', data.id);
    return data;

  } catch (err) {
    console.error('❌ Failed to send password reset email:', err);
    throw err;
  }
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

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase() }
    });

    // SECURITY: Don't reveal if email exists or not
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a reset link'
      });
    }

    // Generate reset token (raw token sent to user, hash stored in DB)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save hashed token to database
    await user.update({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: resetTokenExpiry
    });

    // Send email via Resend
    try {
      await sendPasswordResetEmail(user.email, user.fullName || user.username, resetToken);
      
      console.log('✅ Password reset email sent to:', user.email);

    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      
      // Rollback: Clear the reset token if email fails
      await user.update({
        passwordResetToken: null,
        passwordResetExpires: null
      });

      return res.status(503).json({
        success: false,
        message: 'Unable to send reset email at this time. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a reset link'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: 'Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token and expiry
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
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  getReferrals,
  forgotPassword,
  resetPassword
};
