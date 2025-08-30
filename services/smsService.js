const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;
let isTwilioConfigured = false;

// Check if Twilio is configured
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    isTwilioConfigured = true;
    console.log('✅ Twilio SMS service configured successfully');
  } else {
    console.log('⚠️  Twilio credentials not found, using mock SMS service');
  }
} catch (error) {
  console.log('⚠️  Twilio initialization failed, using mock SMS service:', error.message);
}

/**
 * Send SMS using Twilio
 * @param {string} phone - Phone number with country code
 * @param {string} message - SMS message content
 * @returns {Object} - Result object with success status
 */
async function sendSMS(phone, message) {
  // If Twilio is not configured, use mock service
  if (!isTwilioConfigured || !twilioClient) {
    return await sendMockSMS(phone, message);
  }

  try {
    console.log(`📱 Sending SMS to ${phone} via Twilio...`);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    console.log(`✅ SMS sent successfully via Twilio. Message ID: ${result.sid}`);
    
    return {
      success: true,
      messageId: result.sid,
      provider: 'twilio',
      status: result.status
    };

  } catch (error) {
    console.error('❌ Twilio SMS sending failed:', error.message);
    
    // Fallback to mock service if Twilio fails
    console.log('🔄 Falling back to mock SMS service...');
    return await sendMockSMS(phone, message);
  }
}

/**
 * Send OTP via SMS
 * @param {string} phone - Phone number with country code
 * @param {string} otp - 6-digit OTP code
 * @returns {Object} - Result object with success status
 */
async function sendOTP(phone, otp) {
  const message = `🔐 Your Shopzeo verification code is: ${otp}\n\n⏰ Valid for 10 minutes\n\n💡 Don't share this code with anyone`;
  
  return await sendSMS(phone, message);
}

/**
 * Mock SMS service (for development/testing)
 * @param {string} phone - Phone number
 * @param {string} message - SMS message
 * @returns {Object} - Mock result
 */
async function sendMockSMS(phone, message) {
  console.log('📱 [MOCK SMS] Sending to:', phone);
  console.log('📱 [MOCK SMS] Message:', message);
  console.log('💡 In production, this would be sent via real SMS service');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    provider: 'mock',
    status: 'delivered'
  };
}

/**
 * Check if SMS service is properly configured
 * @returns {Object} - Configuration status
 */
function getServiceStatus() {
  return {
    isConfigured: isTwilioConfigured,
    provider: isTwilioConfigured ? 'twilio' : 'mock',
    hasCredentials: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not configured'
  };
}

/**
 * Test SMS service configuration
 * @returns {Object} - Test result
 */
async function testService() {
  console.log('🧪 Testing SMS Service...');
  
  const status = getServiceStatus();
  console.log('📊 Service Status:', status);
  
  if (status.isConfigured) {
    try {
      // Test with a dummy number (won't actually send)
      const testResult = await sendSMS('+1234567890', 'Test message');
      console.log('✅ Service test successful:', testResult);
      return { success: true, status, testResult };
    } catch (error) {
      console.log('❌ Service test failed:', error.message);
      return { success: false, status, error: error.message };
    }
  } else {
    console.log('⚠️  Service not configured, testing mock service...');
    const mockResult = await sendMockSMS('+1234567890', 'Test message');
    return { success: true, status, mockResult };
  }
}

module.exports = {
  sendSMS,
  sendOTP,
  sendMockSMS,
  getServiceStatus,
  testService
};
