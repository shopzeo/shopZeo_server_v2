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
