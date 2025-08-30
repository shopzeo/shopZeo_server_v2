const CustomOtpService = require('../services/customOtpService');
const FreeEmailService = require('../services/freeEmailService');

async function testFreeServices() {
  console.log('🧪 Testing FREE OTP & Email Services...');
  console.log('=' .repeat(60));
  
  try {
    // Test Custom OTP Service
    console.log('\n🔐 Testing Custom OTP Service...');
    console.log('-'.repeat(40));
    const customOtpService = new CustomOtpService();
    const otpResult = await customOtpService.testService();
    console.log('OTP Test Result:', otpResult);
    
    // Test Free Email Service
    console.log('\n📧 Testing Free Email Service...');
    console.log('-'.repeat(40));
    const freeEmailService = new FreeEmailService();
    const emailResult = await freeEmailService.testService();
    console.log('Email Test Result:', emailResult);
    
    console.log('\n🎉 All Free Services Tested!');
    console.log('=' .repeat(60));
    
    if (otpResult.success && emailResult.success) {
      console.log('✅ All free services are working correctly');
    } else {
      console.log('⚠️  Some services may have issues');
    }
    
    console.log('\n💡 To use Gmail (FREE - 100 emails/day):');
    console.log('1. Go to your Google Account settings');
    console.log('2. Enable 2-factor authentication');
    console.log('3. Generate an App Password');
    console.log('4. Add to .env file:');
    console.log('   GMAIL_USER=your_email@gmail.com');
    console.log('   GMAIL_APP_PASSWORD=your_app_password');
    
    console.log('\n💡 Custom OTP Service Features:');
    console.log('✅ 100% FREE - No external costs');
    console.log('✅ Secure OTP generation (crypto.randomInt)');
    console.log('✅ Rate limiting (3/hour, 10/day)');
    console.log('✅ File logging for all OTPs');
    console.log('✅ Beautiful email templates');
    console.log('✅ Console display for development');
    console.log('✅ Automatic cleanup of expired OTPs');
    
    console.log('\n💡 How to use in production:');
    console.log('1. OTPs are displayed in console (development)');
    console.log('2. OTPs are logged to logs/otp_logs.json');
    console.log('3. Email templates are generated and logged');
    console.log('4. For real SMS: Integrate with your own SMS gateway');
    console.log('5. For real email: Use Gmail SMTP (free) or your own server');
    
  } catch (error) {
    console.error('❌ Service testing failed:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testFreeServices();
}

module.exports = { testFreeServices };
