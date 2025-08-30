const { testService: testSMSService } = require('../services/smsService');
const { testService: testEmailService } = require('../services/emailService');

async function testAllServices() {
  console.log('🧪 Testing All Services...');
  console.log('=' .repeat(60));
  
  try {
    // Test SMS Service
    console.log('\n📱 Testing SMS Service...');
    console.log('-'.repeat(40));
    const smsResult = await testSMSService();
    console.log('SMS Test Result:', smsResult);
    
    // Test Email Service
    console.log('\n📧 Testing Email Service...');
    console.log('-'.repeat(40));
    const emailResult = await testEmailService();
    console.log('Email Test Result:', emailResult);
    
    console.log('\n🎉 All Services Tested!');
    console.log('=' .repeat(60));
    
    if (smsResult.success && emailResult.success) {
      console.log('✅ All services are working correctly');
    } else {
      console.log('⚠️  Some services may have issues');
    }
    
    console.log('\n💡 To use real services, add these to your .env file:');
    console.log('\n📱 For SMS (Twilio):');
    console.log('TWILIO_ACCOUNT_SID=your_account_sid');
    console.log('TWILIO_AUTH_TOKEN=your_auth_token');
    console.log('TWILIO_PHONE_NUMBER=+1234567890');
    
    console.log('\n📧 For Email (SMTP):');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your_email@gmail.com');
    console.log('SMTP_PASS=your_app_password');
    console.log('FROM_EMAIL=noreply@shopzeo.com');
    
  } catch (error) {
    console.error('❌ Service testing failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testAllServices();
}

module.exports = { testAllServices };
