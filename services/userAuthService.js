const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');
const OtpVerification = require('../models/OtpVerification');
const { sendOTP: sendSMSOTP } = require('./smsService');
const { sendOTPEmail } = require('./emailService');

class UserAuthService {
  /**
   * Generate a 6-digit OTP
   */
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP via SMS and/or Email
   */
  static async sendOTP(phone, otp, email = null, userName = null) {
    let results = {
      sms: { success: false, message: 'Not sent' },
      email: { success: false, message: 'Not sent' }
    };

    // Send OTP via SMS if phone is provided
    if (phone) {
      try {
        results.sms = await sendSMSOTP(phone, otp);
        console.log(`📱 OTP sent via SMS to ${phone}: ${results.sms.success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error('❌ SMS sending error:', error.message);
        results.sms = { success: false, message: error.message };
      }
    }

    // Send OTP via Email if email is provided
    if (email) {
      try {
        results.email = await sendOTPEmail(email, otp, userName);
        console.log(`📧 OTP sent via Email to ${email}: ${results.email.success ? 'Success' : 'Failed'}`);
      } catch (error) {
        console.error('❌ Email sending error:', error.message);
        results.email = { success: false, message: error.message };
      }
    }

    // Return success if at least one method worked
    const overallSuccess = results.sms.success || results.email.success;
    
    return {
      success: overallSuccess,
      results,
      message: overallSuccess ? 'OTP sent successfully' : 'Failed to send OTP via all methods'
    };
  }

  /**
   * Create OTP verification record
   */
  static async createOTPVerification(userId, phone, email = null, userName = null) {
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const otpVerification = await OtpVerification.create({
      user_id: userId,
      otp: otp,
      expires_at: expiresAt,
      is_used: false
    });

    // Send OTP via SMS and/or Email
    const sendResult = await this.sendOTP(phone, otp, email, userName);
    
    if (!sendResult.success) {
      console.warn('⚠️  OTP created but sending failed:', sendResult.message);
    }

    return otpVerification;
  }

  /**
   * User signup with email and password
   */
  static async signupWithEmail(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Check if phone is already taken
      if (userData.phone) {
        const existingPhoneUser = await User.findByPhone(userData.phone);
        if (existingPhoneUser) {
          throw new Error('User with this phone number already exists');
        }
      }

      // Create user with email verification
      const user = await User.create({
        id: uuidv4(),
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        phone: userData.phone || null,
        password: userData.password,
        role: userData.role || 'customer',
        is_verified: false, // Email verification required
        email_verified_at: null,
        phone_verified_at: null
      });

      // Generate JWT token
      const token = this.generateJWT(user);

      return {
        success: true,
        message: 'User registered successfully. Please verify your email.',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            is_verified: user.is_verified
          },
          token
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * User signup with phone number (OTP verification)
   */
  static async signupWithPhone(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findByPhone(userData.phone);
      if (existingUser) {
        throw new Error('User with this phone number already exists');
      }

      // Check if email is already taken
      if (userData.email) {
        const existingEmailUser = await User.findByEmail(userData.email);
        if (existingEmailUser) {
          throw new Error('User with this email already exists');
        }
      }

      // Create user without password (OTP verification required)
      const user = await User.create({
        id: uuidv4(),
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email || null,
        phone: userData.phone,
        password: null, // No password for phone-based signup
        role: userData.role || 'customer',
        is_verified: false, // OTP verification required
        email_verified_at: null,
        phone_verified_at: null
      });

      // Generate and send OTP
      await this.createOTPVerification(
        user.id, 
        userData.phone, 
        userData.email, 
        `${userData.first_name} ${userData.last_name}`
      );

      return {
        success: true,
        message: 'OTP sent to your phone number. Please verify to complete registration.',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            is_verified: user.is_verified
          },
          requires_otp_verification: true
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify OTP for phone verification
   */
  static async verifyOTP(userId, otp) {
    try {
      // Find valid OTP
      const otpVerification = await OtpVerification.findValidOtp(userId, otp);
      
      if (!otpVerification) {
        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as used
      await otpVerification.update({ is_used: true });

      // Update user verification status
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({
        is_verified: true,
        phone_verified_at: new Date()
      });

      // Generate JWT token
      const token = this.generateJWT(user);

      return {
        success: true,
        message: 'Phone number verified successfully',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            is_verified: user.is_verified,
            phone_verified_at: user.phone_verified_at
          },
          token
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify OTP by phone number (user-friendly method)
   */
  static async verifyOTPByPhone(phone, otp) {
    try {
      // First find the user by phone
      const user = await User.findByPhone(phone);
      if (!user) {
        throw new Error('User not found with this phone number');
      }

      // Find valid OTP for this user
      const otpVerification = await OtpVerification.findValidOtp(user.id, otp);
      
      if (!otpVerification) {
        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as used
      await otpVerification.update({ is_used: true });

      // Update user verification status
      await user.update({
        is_verified: true,
        phone_verified_at: new Date()
      });

      // Generate JWT token
      const token = this.generateJWT(user);

      return {
        success: true,
        message: 'Phone number verified successfully',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            is_verified: user.is_verified,
            phone_verified_at: user.phone_verified_at
          },
          token
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  static async loginWithEmail(email, password) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Check if user has password (phone-only users won't have password)
      if (!user.password) {
        throw new Error('This account requires phone verification. Please use phone login.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await user.update({ last_login_at: new Date() });

      // Generate JWT token
      const token = this.generateJWT(user);

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            is_verified: user.is_verified,
            last_login_at: user.last_login_at
          },
          token
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login with phone number (OTP verification)
   */
  static async loginWithPhone(phone) {
    try {
      // Find user by phone
      const user = await User.findByPhone(phone);
      if (!user) {
        throw new Error('User not found with this phone number');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is deactivated');
      }

      // Check if user is verified
      if (!user.is_verified) {
        throw new Error('Account not verified. Please complete verification first.');
      }

      // Generate and send OTP
      await this.createOTPVerification(
        user.id, 
        phone, 
        user.email, 
        `${user.first_name} ${user.last_name}`
      );

      return {
        success: true,
        message: 'OTP sent to your phone number',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            is_verified: user.is_verified
          },
          requires_otp_verification: true
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  static generateJWT(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      process.env.JWT_SECRET || 'shopzeo-secret-key',
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify JWT token
   */
  static verifyJWT(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'shopzeo-secret-key');
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updateData) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive fields from update data
      const { password, email, phone, role, ...safeUpdateData } = updateData;

      await user.update(safeUpdateData);

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            is_verified: user.is_verified,
            updated_at: user.updated_at
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has password (phone-only users won't have password)
      if (!user.password) {
        throw new Error('This account does not have a password. Please use phone verification.');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      await user.update({ password: newPassword });

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Forgot Password - Send reset email
   */
  static async forgotPassword(email) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('User not found with this email address');
      }

      // Check if user has password (phone-only users won't have password)
      if (!user.password) {
        throw new Error('This account does not have a password. Please use phone verification.');
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { id: user.id, email: user.email, type: 'password_reset' },
        process.env.JWT_SECRET || 'shopzeo-secret-key',
        { expiresIn: '1h' }
      );

      // Store reset token in user record (you might want to create a separate table for this)
      await user.update({ 
        reset_token: resetToken,
        reset_token_expires: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      });

      // Send reset email
      const resetLink = `${process.env.BASE_URL || 'https://linkiin.in'}/reset-password?token=${resetToken}`;
      const emailResult = await this.sendPasswordResetEmail(user.email, resetLink, user.first_name);

      return {
        success: true,
        message: 'Password reset email sent successfully',
        data: {
          email: user.email,
          reset_link: resetLink // In production, don't send this in response
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reset Password using token
   */
  static async resetPassword(token, newPassword) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'shopzeo-secret-key');
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      // Find user
      const user = await User.findByPk(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if token matches and is not expired
      if (user.reset_token !== token || new Date() > user.reset_token_expires) {
        throw new Error('Token expired or invalid');
      }

      // Update password
      await user.update({ 
        password: newPassword,
        reset_token: null,
        reset_token_expires: null
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Send Password Reset Email
   */
  static async sendPasswordResetEmail(email, resetLink, userName) {
    const subject = '🔐 Reset Your Shopzeo Password';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - Shopzeo</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password for your Shopzeo account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${resetLink}</p>
            <div class="warning">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <p>Best regards,<br>The Shopzeo Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendOTPEmail(email, html, userName);
  }

  /**
   * Cleanup expired OTPs (run this periodically)
   */
  static async cleanupExpiredOtps() {
    try {
      const deletedCount = await OtpVerification.cleanupExpiredOtps();
      console.log(`🧹 Cleaned up ${deletedCount} expired OTPs`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
      throw error;
    }
  }
}

module.exports = UserAuthService;
