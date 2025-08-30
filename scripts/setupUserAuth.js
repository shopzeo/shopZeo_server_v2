const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopzeo_db',
  multipleStatements: true
};

async function setupUserAuth() {
  let connection;
  
  try {
    console.log('🔧 Setting up User Authentication System...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Create OTP verifications table with correct foreign key constraint
    const createOtpTableSQL = `
      CREATE TABLE IF NOT EXISTS \`otp_verifications\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`user_id\` char(36) NOT NULL COMMENT 'Foreign key to users table (UUID)',
        \`otp\` varchar(6) NOT NULL COMMENT '6-digit OTP code',
        \`expires_at\` datetime NOT NULL COMMENT 'OTP expiration timestamp',
        \`is_used\` tinyint(1) DEFAULT 0 COMMENT 'Whether OTP has been used',
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_otp\` (\`otp\`),
        KEY \`idx_expires_at\` (\`expires_at\`),
        KEY \`idx_is_used\` (\`is_used\`),
        KEY \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='OTP verification codes for phone verification';
    `;
    
    await connection.execute(createOtpTableSQL);
    console.log('✅ OTP verifications table created successfully');
    
    // Add foreign key constraint separately to avoid issues
    try {
      const addForeignKeySQL = `
        ALTER TABLE \`otp_verifications\` 
        ADD CONSTRAINT \`fk_otp_verifications_user_id\` 
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `;
      
      await connection.execute(addForeignKeySQL);
      console.log('✅ Foreign key constraint added successfully');
    } catch (fkError) {
      if (fkError.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Foreign key constraint already exists');
      } else {
        console.log('⚠️  Warning: Could not add foreign key constraint:', fkError.message);
        console.log('   The table will still work, but referential integrity won\'t be enforced');
      }
    }
    
    // Create additional indexes for better performance
    try {
      const createIndexesSQL = `
        CREATE INDEX IF NOT EXISTS \`idx_otp_verifications_lookup\` 
        ON \`otp_verifications\` (\`user_id\`, \`otp\`, \`expires_at\`, \`is_used\`);
      `;
      
      await connection.execute(createIndexesSQL);
      console.log('✅ Performance indexes created successfully');
    } catch (indexError) {
      if (indexError.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Performance indexes already exist');
      } else {
        console.log('⚠️  Warning: Could not create performance indexes:', indexError.message);
      }
    }
    
    // Verify table structure
    const [rows] = await connection.execute('DESCRIBE otp_verifications');
    console.log('\n📋 OTP Verifications Table Structure:');
    console.table(rows);
    
    // Check if users table exists and has required fields
    const [userTableRows] = await connection.execute('DESCRIBE users');
    const requiredFields = ['id', 'email', 'phone', 'password', 'first_name', 'last_name', 'role', 'is_active', 'is_verified', 'email_verified_at', 'phone_verified_at'];
    const existingFields = userTableRows.map(row => row.Field);
    
    console.log('\n🔍 Checking Users Table Compatibility...');
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    if (missingFields.length > 0) {
      console.log('⚠️  Warning: The following fields are missing from the users table:');
      missingFields.forEach(field => console.log(`   - ${field}`));
      console.log('   Please ensure your users table has all required fields for the authentication system to work properly.');
    } else {
      console.log('✅ Users table has all required fields');
    }
    
    // Show the created table
    const [tableInfo] = await connection.execute("SHOW TABLE STATUS WHERE Name = 'otp_verifications'");
    if (tableInfo.length > 0) {
      console.log('\n🔍 OTP Verifications Table Info:');
      console.log(`Engine: ${tableInfo[0].Engine}`);
      console.log(`Collation: ${tableInfo[0].Collation}`);
      console.log(`Row Format: ${tableInfo[0].Row_format}`);
    }
    
    console.log('\n🎉 User Authentication System setup completed successfully!');
    console.log('\n📚 Next Steps:');
    console.log('1. Start your server: npm start');
    console.log('2. Test the API endpoints using the documentation');
    console.log('3. Integrate with your frontend application');
    console.log('4. Replace mock SMS/Email with actual services in production');
    
  } catch (error) {
    console.error('❌ Error setting up User Authentication System:', error);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 Hint: Make sure the users table exists before running this script.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Hint: Check your database credentials in the .env file.');
    } else if (error.code === 'ER_CANT_CREATE_TABLE') {
      console.log('\n💡 Hint: There might be a table creation issue. Check the error details above.');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupUserAuth();
}

module.exports = { setupUserAuth };
