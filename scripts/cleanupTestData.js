const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopzeo_db'
};

async function cleanupTestData() {
  let connection;
  
  try {
    console.log('🧹 Cleaning up Test Data...');
    console.log('=' .repeat(40));
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Clean up OTP verifications for test users
    const testEmails = ['testemail@example.com', 'test@example.com'];
    const testPhones = ['+919876543210', '+919876543211'];
    
    // Find test users by email or phone (using separate queries to avoid SQL issues)
    let testUsers = [];
    
    // Find by email
    for (const email of testEmails) {
      const [emailUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      testUsers = testUsers.concat(emailUsers);
    }
    
    // Find by phone
    for (const phone of testPhones) {
      const [phoneUsers] = await connection.execute(
        'SELECT id FROM users WHERE phone = ?',
        [phone]
      );
      testUsers = testUsers.concat(phoneUsers);
    }
    
    if (testUsers.length > 0) {
      console.log(`🔍 Found ${testUsers.length} test users to clean up`);
      
      const userIds = testUsers.map(user => user.id);
      
      // Delete OTP records first
      for (const userId of userIds) {
        const [otpResult] = await connection.execute(
          'DELETE FROM otp_verifications WHERE user_id = ?',
          [userId]
        );
        if (otpResult.affectedRows > 0) {
          console.log(`✅ Deleted OTP records for user ${userId}`);
        }
      }
      
      // Delete test users
      for (const userId of userIds) {
        const [userResult] = await connection.execute(
          'DELETE FROM users WHERE id = ?',
          [userId]
        );
        if (userResult.affectedRows > 0) {
          console.log(`✅ Deleted test user ${userId}`);
        }
      }
    } else {
      console.log('✅ No test users found to clean up');
    }
    
    // Also clean up any OTP records that might be orphaned
    try {
      const [orphanedOtps] = await connection.execute(`
        DELETE otp FROM otp_verifications otp
        LEFT JOIN users u ON otp.user_id = u.id
        WHERE u.id IS NULL
      `);
      
      if (orphanedOtps.affectedRows > 0) {
        console.log(`✅ Cleaned up ${orphanedOtps.affectedRows} orphaned OTP records`);
      }
    } catch (error) {
      console.log('ℹ️  Could not clean up orphaned OTPs:', error.message);
    }
    
    console.log('\n🎉 Test data cleanup completed!');
    console.log('✅ Ready for fresh authentication tests');
    
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  cleanupTestData();
}

module.exports = { cleanupTestData };
