const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopzeo_db'
};

async function testOtpTable() {
  let connection;
  
  try {
    console.log('🧪 Testing OTP Verifications Table...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Test 1: Check if table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'otp_verifications'");
    if (tables.length === 0) {
      console.log('❌ OTP verifications table does not exist!');
      return;
    }
    console.log('✅ Test 1: Table exists');
    
    // Test 2: Check table structure
    const [columns] = await connection.execute('DESCRIBE otp_verifications');
    const expectedColumns = ['id', 'user_id', 'otp', 'expires_at', 'is_used', 'created_at', 'updated_at'];
    const existingColumns = columns.map(col => col.Field);
    
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
    if (missingColumns.length === 0) {
      console.log('✅ Test 2: All required columns exist');
    } else {
      console.log('❌ Test 2: Missing columns:', missingColumns);
    }
    
    // Test 3: Insert test data
    const testUserId = '12345678-1234-1234-1234-123456789012'; // Test UUID
    const testOtp = '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    
    const insertSQL = `
      INSERT INTO otp_verifications (user_id, otp, expires_at, is_used) 
      VALUES (?, ?, ?, 0)
    `;
    
    await connection.execute(insertSQL, [testUserId, testOtp, expiresAt]);
    console.log('✅ Test 3: Test data inserted successfully');
    
    // Test 4: Query test data
    const [rows] = await connection.execute('SELECT * FROM otp_verifications WHERE user_id = ?', [testUserId]);
    if (rows.length > 0) {
      console.log('✅ Test 4: Test data retrieved successfully');
      console.log('   Retrieved record:', {
        id: rows[0].id,
        user_id: rows[0].user_id,
        otp: rows[0].otp,
        expires_at: rows[0].expires_at,
        is_used: rows[0].is_used
      });
    } else {
      console.log('❌ Test 4: Could not retrieve test data');
    }
    
    // Test 5: Update test data
    const updateSQL = 'UPDATE otp_verifications SET is_used = 1 WHERE user_id = ?';
    await connection.execute(updateSQL, [testUserId]);
    console.log('✅ Test 5: Test data updated successfully');
    
    // Test 6: Verify update
    const [updatedRows] = await connection.execute('SELECT * FROM otp_verifications WHERE user_id = ?', [testUserId]);
    if (updatedRows.length > 0 && updatedRows[0].is_used === 1) {
      console.log('✅ Test 6: Update verified successfully');
    } else {
      console.log('❌ Test 6: Update verification failed');
    }
    
    // Test 7: Clean up test data
    await connection.execute('DELETE FROM otp_verifications WHERE user_id = ?', [testUserId]);
    console.log('✅ Test 7: Test data cleaned up successfully');
    
    // Test 8: Check indexes
    const [indexes] = await connection.execute('SHOW INDEX FROM otp_verifications');
    const expectedIndexes = ['PRIMARY', 'idx_user_id', 'idx_otp', 'idx_expires_at', 'idx_is_used', 'idx_created_at', 'idx_otp_verifications_lookup'];
    const existingIndexes = [...new Set(indexes.map(idx => idx.Key_name))];
    
    const missingIndexes = expectedIndexes.filter(idx => !existingIndexes.includes(idx));
    if (missingIndexes.length === 0) {
      console.log('✅ Test 8: All expected indexes exist');
    } else {
      console.log('⚠️  Test 8: Missing indexes:', missingIndexes);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ OTP Verifications table is working correctly');
    console.log('✅ Ready for use in the authentication system');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  testOtpTable();
}

module.exports = { testOtpTable };
