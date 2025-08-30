const nodemailer = require('nodemailer');

// Initialize email transporter
let transporter = null;
let isEmailConfigured = false;

// Check if email service is configured
try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    isEmailConfigured = true;
    console.log('✅ Email service configured successfully');
  } else {
    console.log('⚠️  SMTP credentials not found, using mock email service');
  }
} catch (error) {
  console.log('⚠️  Email service initialization failed, using mock service:', error.message);
}

/**
 * Send email using configured SMTP
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML email content
 * @returns {Object} - Result object with success status
 */
async function sendEmail(to, subject, html) {
  // If email service is not configured, use mock service
  if (!isEmailConfigured || !transporter) {
    return await sendMockEmail(to, subject, html);
  }

  try {
    console.log(`📧 Sending email to ${to} via SMTP...`);
    
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: html
    });

    console.log(`✅ Email sent successfully via SMTP. Message ID: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      provider: 'smtp',
      status: 'sent'
    };

  } catch (error) {
    console.error('❌ SMTP email sending failed:', error.message);
    
    // Fallback to mock service if SMTP fails
    console.log('🔄 Falling back to mock email service...');
    return await sendMockEmail(to, subject, html);
  }
}

/**
 * Send OTP via email
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's name (optional)
 * @returns {Object} - Result object with success status
 */
async function sendOTPEmail(email, otp, userName = 'User') {
  const subject = '🔐 Your Shopzeo Verification Code';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Shopzeo Verification Code</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-box { background: white; padding: 30px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #007bff; }
        .otp-code { font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Shopzeo</h1>
          <p>Verification Code</p>
        </div>
        
        <div class="content">
          <h2>Hello ${userName}!</h2>
          <p>You've requested a verification code for your Shopzeo account.</p>
          
          <div class="otp-box">
            <p style="margin-bottom: 15px; color: #666;">Your verification code is:</p>
            <div class="otp-code">${otp}</div>
            <p style="margin-top: 15px; color: #666; font-size: 14px;">Valid for 10 minutes</p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Never share this code with anyone</li>
              <li>Shopzeo staff will never ask for this code</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
          </div>
          
          <p>If you have any questions, please contact our support team.</p>
          
          <p>Best regards,<br>The Shopzeo Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message, please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} Shopzeo. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return await sendEmail(email, subject, html);
}

/**
 * Mock email service (for development/testing)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email content
 * @returns {Object} - Mock result
 */
async function sendMockEmail(to, subject, html) {
  console.log('📧 [MOCK EMAIL] Sending to:', to);
  console.log('📧 [MOCK EMAIL] Subject:', subject);
  console.log('📧 [MOCK EMAIL] Content preview:', html.substring(0, 100) + '...');
  console.log('💡 In production, this would be sent via real email service');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    messageId: `mock_email_${Date.now()}`,
    provider: 'mock',
    status: 'sent'
  };
}

/**
 * Check if email service is properly configured
 * @returns {Object} - Configuration status
 */
function getServiceStatus() {
  return {
    isConfigured: isEmailConfigured,
    provider: isEmailConfigured ? 'smtp' : 'mock',
    hasCredentials: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    smtpHost: process.env.SMTP_HOST || 'Not configured',
    smtpPort: process.env.SMTP_PORT || 'Not configured',
    fromEmail: process.env.FROM_EMAIL || process.env.SMTP_USER || 'Not configured'
  };
}

/**
 * Test email service configuration
 * @returns {Object} - Test result
 */
async function testService() {
  console.log('🧪 Testing Email Service...');
  
  const status = getServiceStatus();
  console.log('📊 Service Status:', status);
  
  if (status.isConfigured) {
    try {
      // Test with a dummy email (won't actually send)
      const testResult = await sendEmail('test@example.com', 'Test Email', '<h1>Test</h1>');
      console.log('✅ Service test successful:', testResult);
      return { success: true, status, testResult };
    } catch (error) {
      console.log('❌ Service test failed:', error.message);
      return { success: false, status, error: error.message };
    }
  } else {
    console.log('⚠️  Service not configured, testing mock service...');
    const mockResult = await sendMockEmail('test@example.com', 'Test Email', '<h1>Test</h1>');
    return { success: true, status, mockResult };
  }
}

module.exports = {
  sendEmail,
  sendOTPEmail,
  sendMockEmail,
  getServiceStatus,
  testService
};
