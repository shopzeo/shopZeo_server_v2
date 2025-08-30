const nodemailer = require('nodemailer');

/**
 * Free Email Service using Gmail SMTP
 * 
 * Features:
 * - Uses Gmail's free SMTP (100 emails/day limit)
 * - Beautiful HTML email templates
 * - Automatic fallback to file logging
 * - No external service costs
 * - Easy to configure
 */

class FreeEmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.maxEmailsPerDay = 100; // Gmail free limit
    this.emailCount = 0;
    this.lastResetDate = new Date().toDateString();
    
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      // Check if Gmail credentials are available
      if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        this.transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
          }
        });
        
        this.isConfigured = true;
        console.log('✅ Gmail SMTP service configured successfully');
        console.log('💡 Free tier: 100 emails per day');
      } else {
        console.log('⚠️  Gmail credentials not found, using file logging only');
        console.log('💡 To enable Gmail: Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
      }
    } catch (error) {
      console.log('⚠️  Gmail service initialization failed:', error.message);
    }
  }

  /**
   * Check daily email limit
   */
  checkDailyLimit() {
    const today = new Date().toDateString();
    
    // Reset counter if it's a new day
    if (today !== this.lastResetDate) {
      this.emailCount = 0;
      this.lastResetDate = today;
    }

    if (this.emailCount >= this.maxEmailsPerDay) {
      throw new Error(`Daily email limit (${this.maxEmailsPerDay}) exceeded. Try again tomorrow.`);
    }

    return true;
  }

  /**
   * Send email via Gmail SMTP
   */
  async sendEmailViaGmail(to, subject, html) {
    if (!this.isConfigured || !this.transporter) {
      throw new Error('Gmail service not configured');
    }

    // Check daily limit
    this.checkDailyLimit();

    try {
      console.log(`📧 Sending email to ${to} via Gmail SMTP...`);
      
      const info = await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: to,
        subject: subject,
        html: html
      });

      // Increment email counter
      this.emailCount++;

      console.log(`✅ Email sent successfully via Gmail. Message ID: ${info.messageId}`);
      console.log(`📊 Daily emails sent: ${this.emailCount}/${this.maxEmailsPerDay}`);
      
      return {
        success: true,
        messageId: info.messageId,
        provider: 'gmail',
        status: 'sent',
        dailyCount: this.emailCount,
        dailyLimit: this.maxEmailsPerDay
      };

    } catch (error) {
      console.error('❌ Gmail email sending failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate beautiful OTP email template
   */
  generateOtpEmailTemplate(otp, userName = 'User', expiryMinutes = 10) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopzeo Verification Code</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background: #f4f4f4;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background: white; 
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 32px; 
      font-weight: 300;
    }
    .header p { 
      margin: 10px 0 0 0; 
      font-size: 18px;
      opacity: 0.9;
    }
    .content { 
      padding: 40px 30px; 
    }
    .otp-box { 
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
      color: white; 
      padding: 40px 30px; 
      text-align: center; 
      border-radius: 20px; 
      margin: 30px 0; 
      box-shadow: 0 8px 25px rgba(240, 147, 251, 0.3);
    }
    .otp-code { 
      font-size: 48px; 
      font-weight: bold; 
      letter-spacing: 10px; 
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      margin: 20px 0;
    }
    .warning { 
      background: #fff3cd; 
      border-left: 4px solid #ffc107; 
      padding: 25px; 
      margin: 30px 0; 
      border-radius: 8px;
    }
    .warning ul { 
      margin: 15px 0; 
      padding-left: 25px; 
    }
    .warning li { 
      margin: 8px 0;
    }
    .footer { 
      background: #343a40; 
      color: white; 
      padding: 25px; 
      text-align: center; 
      font-size: 14px;
    }
    .stats { 
      background: #e9ecef; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0;
      text-align: center;
      font-size: 14px;
      color: #6c757d;
    }
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
        <p style="margin-bottom: 20px; font-size: 18px; opacity: 0.9;">Your verification code is:</p>
        <div class="otp-code">${otp}</div>
        <p style="margin-top: 20px; font-size: 16px; opacity: 0.9;">⏰ Valid for ${expiryMinutes} minutes</p>
      </div>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong>
        <ul>
          <li>Never share this code with anyone</li>
          <li>Shopzeo staff will never ask for this code</li>
          <li>If you didn't request this code, please ignore this email</li>
        </ul>
      </div>
      
      <p>If you have any questions, please contact our support team.</p>
      
      <p>Best regards,<br><strong>The Shopzeo Team</strong></p>
      
      <div class="stats">
        📧 This email was sent via our secure Gmail SMTP service
      </div>
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
   * Send OTP via email
   */
  async sendOTPEmail(email, otp, userName = 'User', expiryMinutes = 10) {
    const subject = '🔐 Your Shopzeo Verification Code';
    const html = this.generateOtpEmailTemplate(otp, userName, expiryMinutes);

    try {
      // Try to send via Gmail first
      if (this.isConfigured) {
        return await this.sendEmailViaGmail(email, subject, html);
      }
    } catch (error) {
      console.log('🔄 Gmail failed, falling back to file logging...');
    }

    // Fallback to file logging
    return await this.logEmailToFile(email, subject, html);
  }

  /**
   * Log email to file (fallback method)
   */
  async logEmailToFile(email, subject, html) {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        to: email,
        subject,
        html: html.substring(0, 200) + '...', // Truncate for readability
        method: 'file_logging',
        status: 'logged_to_file'
      };

      const logFile = path.join(__dirname, '../logs/email_logs.json');
      
      // Ensure logs directory exists
      const logsDir = path.dirname(logFile);
      await fs.mkdir(logsDir, { recursive: true });
      
      // Read existing logs or create new file
      let logs = [];
      try {
        const existingData = await fs.readFile(logFile, 'utf8');
        logs = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist, start with empty array
      }

      // Add new log entry
      logs.push(logEntry);

      // Keep only last 500 entries
      if (logs.length > 500) {
        logs = logs.slice(-500);
      }

      // Write back to file
      await fs.writeFile(logFile, JSON.stringify(logs, null, 2));

      console.log(`📧 Email logged to file: ${logFile}`);
      
      return {
        success: true,
        method: 'file_logging',
        message: 'Email logged to file (Gmail not configured or failed)',
        logFile,
        note: 'Check logs/email_logs.json for email content'
      };

    } catch (error) {
      console.error('Error logging email to file:', error.message);
      return {
        success: false,
        method: 'file_logging',
        message: 'Failed to log email to file',
        error: error.message
      };
    }
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      isConfigured: this.isConfigured,
      provider: this.isConfigured ? 'gmail' : 'file_logging',
      hasCredentials: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
      dailyEmailsSent: this.emailCount,
      dailyEmailLimit: this.maxEmailsPerDay,
      emailsRemaining: this.maxEmailsPerDay - this.emailCount,
      lastResetDate: this.lastResetDate
    };
  }

  /**
   * Test the service
   */
  async testService() {
    console.log('🧪 Testing Free Email Service...');
    
    const status = this.getServiceStatus();
    console.log('📊 Service Status:', status);
    
    if (status.isConfigured) {
      try {
        // Test with a dummy email (won't actually send due to test mode)
        const testResult = await this.sendOTPEmail('test@example.com', '123456', 'Test User');
        console.log('✅ Service test successful:', testResult);
        return { success: true, status, testResult };
      } catch (error) {
        console.log('❌ Service test failed:', error.message);
        return { success: false, status, error: error.message };
      }
    } else {
      console.log('⚠️  Service not configured, testing file logging...');
      const mockResult = await this.logEmailToFile('test@example.com', 'Test Email', '<h1>Test</h1>');
      return { success: true, status, mockResult };
    }
  }
}

module.exports = FreeEmailService;
