const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Custom OTP Service - 100% Free, No External Dependencies
 * 
 * Features:
 * - Generate secure 6-digit OTPs
 * - Store OTPs in local file system (or database)
 * - Rate limiting and security
 * - Customizable OTP expiry
 * - Multiple delivery methods (console, file, email template)
 */

class CustomOtpService {
  constructor() {
    this.otpStorage = new Map(); // In-memory storage (for production, use database)
    this.rateLimitMap = new Map(); // Rate limiting
    this.otpExpiryMinutes = 10; // OTP validity
    this.maxOtpPerHour = 3; // Max OTP requests per hour
    this.maxOtpPerDay = 10; // Max OTP requests per day
    
    // Create logs directory if it doesn't exist
    this.ensureLogsDirectory();
  }

  /**
   * Ensure logs directory exists
   */
  async ensureLogsDirectory() {
    try {
      const logsDir = path.join(__dirname, '../logs');
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      console.log('📁 Logs directory already exists or cannot be created');
    }
  }

  /**
   * Generate cryptographically secure 6-digit OTP
   */
  generateSecureOTP() {
    // Use crypto.randomInt for better security than Math.random
    const min = 100000;
    const max = 999999;
    return crypto.randomInt(min, max + 1).toString();
  }

  /**
   * Check rate limiting for a phone/email
   */
  checkRateLimit(identifier) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    if (!this.rateLimitMap.has(identifier)) {
      this.rateLimitMap.set(identifier, {
        hourly: [],
        daily: []
      });
    }

    const userLimits = this.rateLimitMap.get(identifier);
    
    // Clean old entries
    userLimits.hourly = userLimits.hourly.filter(time => now - time < oneHour);
    userLimits.daily = userLimits.daily.filter(time => now - time < oneDay);

    // Check limits
    if (userLimits.hourly.length >= this.maxOtpPerHour) {
      const oldestRequest = userLimits.hourly[0];
      const timeLeft = Math.ceil((oneHour - (now - oldestRequest)) / 60000);
      throw new Error(`Rate limit exceeded. Try again in ${timeLeft} minutes.`);
    }

    if (userLimits.daily.length >= this.maxOtpPerDay) {
      throw new Error('Daily OTP limit exceeded. Try again tomorrow.');
    }

    // Add current request
    userLimits.hourly.push(now);
    userLimits.daily.push(now);

    return true;
  }

  /**
   * Store OTP with expiry
   */
  storeOTP(identifier, otp, userId = null) {
    const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);
    
    this.otpStorage.set(identifier, {
      otp,
      userId,
      expiresAt,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date()
    });

    // Clean up expired OTPs periodically
    this.cleanupExpiredOTPs();
  }

  /**
   * Verify OTP
   */
  verifyOTP(identifier, otp) {
    const storedData = this.otpStorage.get(identifier);
    
    if (!storedData) {
      throw new Error('OTP not found or expired');
    }

    if (new Date() > storedData.expiresAt) {
      this.otpStorage.delete(identifier);
      throw new Error('OTP has expired');
    }

    if (storedData.attempts >= storedData.maxAttempts) {
      this.otpStorage.delete(identifier);
      throw new Error('Maximum verification attempts exceeded');
    }

    storedData.attempts++;

    if (storedData.otp === otp) {
      // OTP verified successfully
      this.otpStorage.delete(identifier);
      return {
        success: true,
        userId: storedData.userId,
        message: 'OTP verified successfully'
      };
    } else {
      const remainingAttempts = storedData.maxAttempts - storedData.attempts;
      if (remainingAttempts <= 0) {
        this.otpStorage.delete(identifier);
        throw new Error('Maximum verification attempts exceeded');
      }
      throw new Error(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
    }
  }

  /**
   * Clean up expired OTPs
   */
  cleanupExpiredOTPs() {
    const now = new Date();
    for (const [identifier, data] of this.otpStorage.entries()) {
      if (now > data.expiresAt) {
        this.otpStorage.delete(identifier);
      }
    }
  }

  /**
   * Send OTP via console (for development/testing)
   */
  async sendOTPConsole(identifier, otp, type = 'phone') {
    const timestamp = new Date().toISOString();
    const message = `
🔐 SHOPZEO OTP VERIFICATION
${'='.repeat(40)}
📱 ${type === 'phone' ? 'Phone' : 'Email'}: ${identifier}
🔢 OTP Code: ${otp}
⏰ Expires: ${new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000).toLocaleString()}
💡 Valid for: ${this.otpExpiryMinutes} minutes
⚠️  Don't share this code with anyone!
${'='.repeat(40)}
    `.trim();

    console.log(message);
    
    // Also log to file
    await this.logToFile(identifier, otp, type, 'console');
    
    return {
      success: true,
      method: 'console',
      message: 'OTP displayed in console and logged to file'
    };
  }

  /**
   * Send OTP via file (for production logging)
   */
  async sendOTPFile(identifier, otp, type = 'phone') {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        identifier,
        type,
        otp,
        expiresAt: new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000).toISOString(),
        method: 'file'
      };

      const logFile = path.join(__dirname, '../logs/otp_logs.json');
      
      // Read existing logs or create new file
      let logs = [];
      try {
        const existingData = await fs.readFile(logFile, 'utf8');
        logs = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist or is empty, start with empty array
      }

      // Add new log entry
      logs.push(logEntry);

      // Keep only last 1000 entries to prevent file from growing too large
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      // Write back to file
      await fs.writeFile(logFile, JSON.stringify(logs, null, 2));

      return {
        success: true,
        method: 'file',
        message: 'OTP logged to file successfully',
        logFile
      };
    } catch (error) {
      console.error('Error logging OTP to file:', error.message);
      return {
        success: false,
        method: 'file',
        message: 'Failed to log OTP to file',
        error: error.message
      };
    }
  }

  /**
   * Send OTP via email template (ready for SMTP integration)
   */
  async sendOTPEmailTemplate(identifier, otp, type = 'phone', userName = 'User') {
    const emailTemplate = this.generateEmailTemplate(otp, userName);
    
    // For now, just log the email template
    await this.logToFile(identifier, otp, type, 'email_template');
    
    return {
      success: true,
      method: 'email_template',
      message: 'Email template generated and logged',
      template: emailTemplate
    };
  }

  /**
   * Generate beautiful email template
   */
  generateEmailTemplate(otp, userName) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopzeo Verification Code</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #f8f9fa; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: white; padding: 40px; }
    .otp-box { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 15px; margin: 30px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .otp-code { font-size: 42px; font-weight: bold; letter-spacing: 8px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 5px; }
    .footer { background: #343a40; color: white; padding: 20px; text-align: center; }
    .btn { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Shopzeo</h1>
      <p>Your Verification Code</p>
    </div>
    
    <div class="content">
      <h2>Hello ${userName}! 👋</h2>
      <p>You've requested a verification code for your Shopzeo account.</p>
      
      <div class="otp-box">
        <p style="margin-bottom: 20px; font-size: 18px;">Your verification code is:</p>
        <div class="otp-code">${otp}</div>
        <p style="margin-top: 20px; font-size: 16px;">⏰ Valid for ${this.otpExpiryMinutes} minutes</p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong>
        <ul style="margin: 15px 0; padding-left: 25px;">
          <li>Never share this code with anyone</li>
          <li>Shopzeo staff will never ask for this code</li>
          <li>If you didn't request this code, please ignore this email</li>
        </ul>
      </div>
      
      <p>If you have any questions, please contact our support team.</p>
      
      <p>Best regards,<br><strong>The Shopzeo Team</strong></p>
    </div>
    
    <div class="footer">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Shopzeo. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Log OTP to file
   */
  async logToFile(identifier, otp, type, method) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        identifier,
        type,
        otp,
        method,
        expiresAt: new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000).toISOString()
      };

      const logFile = path.join(__dirname, '../logs/otp_delivery.json');
      
      let logs = [];
      try {
        const existingData = await fs.readFile(logFile, 'utf8');
        logs = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist, start with empty array
      }

      logs.push(logEntry);

      // Keep only last 500 entries
      if (logs.length > 500) {
        logs = logs.slice(-500);
      }

      await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error logging OTP delivery:', error.message);
    }
  }

  /**
   * Main method to send OTP
   */
  async sendOTP(identifier, type = 'phone', userId = null, userName = null) {
    try {
      // Check rate limiting
      this.checkRateLimit(identifier);

      // Generate secure OTP
      const otp = this.generateSecureOTP();

      // Store OTP
      this.storeOTP(identifier, otp, userId);

      // Send via multiple methods
      const results = {
        console: await this.sendOTPConsole(identifier, otp, type),
        file: await this.sendOTPFile(identifier, otp, type),
        email_template: await this.sendOTPEmailTemplate(identifier, otp, type, userName)
      };

      return {
        success: true,
        message: 'OTP sent successfully via multiple methods',
        results,
        identifier,
        type,
        expiresIn: `${this.otpExpiryMinutes} minutes`
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.message
      };
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    const now = new Date();
    let activeOtps = 0;
    let expiredOtps = 0;

    for (const [identifier, data] of this.otpStorage.entries()) {
      if (now > data.expiresAt) {
        expiredOtps++;
      } else {
        activeOtps++;
      }
    }

    return {
      activeOtps,
      expiredOtps,
      totalStored: this.otpStorage.size,
      rateLimitMapSize: this.rateLimitMap.size,
      maxOtpPerHour: this.maxOtpPerHour,
      maxOtpPerDay: this.maxOtpPerDay,
      otpExpiryMinutes: this.otpExpiryMinutes
    };
  }

  /**
   * Test the service
   */
  async testService() {
    console.log('🧪 Testing Custom OTP Service...');
    
    try {
      // Test OTP generation
      const testOtp = this.generateSecureOTP();
      console.log('✅ OTP Generation:', testOtp);

      // Test rate limiting
      const testIdentifier = 'test@example.com';
      this.checkRateLimit(testIdentifier);
      console.log('✅ Rate Limiting: Working');

      // Test OTP sending
      const sendResult = await this.sendOTP(testIdentifier, 'email', 'test-user-id', 'Test User');
      console.log('✅ OTP Sending:', sendResult.success ? 'Success' : 'Failed');

      // Test OTP verification
      const verifyResult = this.verifyOTP(testIdentifier, testOtp);
      console.log('✅ OTP Verification:', verifyResult.success ? 'Success' : 'Failed');

      // Get stats
      const stats = this.getServiceStats();
      console.log('✅ Service Stats:', stats);

      return {
        success: true,
        message: 'Custom OTP service is working correctly',
        stats
      };

    } catch (error) {
      console.error('❌ Service test failed:', error.message);
      return {
        success: false,
        message: error.message,
        error: error.message
      };
    }
  }
}

module.exports = CustomOtpService;
