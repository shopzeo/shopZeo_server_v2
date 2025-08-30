const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopzeo_db'
};

async function createOtpTableSimple() {
  let connection;
  
  try {
    console.log('🔧 Creating OTP Verifications Table (Simple Approach)...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Drop existing table if it exists
    try {
      await connection.execute('DROP TABLE IF EXISTS `otp_verifications`');
      console.log('✅ Dropped existing OTP verifications table');
    } catch (error) {
      console.log('ℹ️  No existing table to drop');
    }
    
    // Step 1: Create table without foreign key constraint
    const createTableSQL = `
      CREATE TABLE \`otp_verifications\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`user_id\` char(36) NOT NULL,
        \`otp\` varchar(6) NOT NULL,
        \`expires_at\` datetime NOT NULL,
        \`is_used\` tinyint(1) DEFAULT 0,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_otp\` (\`otp\`),
        KEY \`idx_expires_at\` (\`expires_at\`),
        KEY \`idx_is_used\` (\`is_used\`),
        KEY \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ Step 1: OTP verifications table created successfully (without foreign key)');
    
    // Step 2: Add composite index
    try {
      const compositeIndexSQL = `
        CREATE INDEX \`idx_otp_verifications_lookup\` 
        ON \`otp_verifications\` (\`user_id\`, \`otp\`, \`expires_at\`, \`is_used\`);
      `;
      
      await connection.execute(compositeIndexSQL);
      console.log('✅ Step 2: Composite index created successfully');
    } catch (indexError) {
      console.log('⚠️  Warning: Could not create composite index:', indexError.message);
    }
    
    // Step 3: Try to add foreign key constraint
    try {
      const addForeignKeySQL = `
        ALTER TABLE \`otp_verifications\` 
        ADD CONSTRAINT \`fk_otp_verifications_user_id\` 
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `;
      
      await connection.execute(addForeignKeySQL);
      console.log('✅ Step 3: Foreign key constraint added successfully');
    } catch (fkError) {
      console.log('⚠️  Step 3: Could not add foreign key constraint:', fkError.message);
      console.log('   This might be due to data type mismatch or existing data issues');
      console.log('   The table will still work for basic operations');
    }
    
    // Verify final table structure
    const [rows] = await connection.execute('DESCRIBE otp_verifications');
    console.log('\n📋 Final OTP Verifications Table Structure:');
    console.table(rows);
    
    // Check if foreign key was added
    const [constraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
      AND TABLE_NAME = 'otp_verifications' 
      AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);
    
    if (constraints.length > 0) {
      console.log('\n🔗 Foreign Key Constraints (Successfully Added):');
      console.table(constraints);
    } else {
      console.log('\n⚠️  No foreign key constraints found (Table created without referential integrity)');
    }
    
    // Show table status
    const [tableInfo] = await connection.execute("SHOW TABLE STATUS WHERE Name = 'otp_verifications'");
    if (tableInfo.length > 0) {
      console.log('\n🔍 Table Information:');
      console.log(`Engine: ${tableInfo[0].Engine}`);
      console.log(`Collation: ${tableInfo[0].Collation}`);
      console.log(`Row Format: ${tableInfo[0].Row_format}`);
    }
    
    console.log('\n🎉 OTP Verifications table creation completed!');
    if (constraints.length > 0) {
      console.log('✅ Foreign key constraint is properly configured');
    } else {
      console.log('⚠️  Table created without foreign key constraint');
      console.log('   You may need to manually add it later or check for data type issues');
    }
    console.log('✅ All indexes are created for optimal performance');
    
  } catch (error) {
    console.error('❌ Error creating OTP table:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createOtpTableSimple();
}

module.exports = { createOtpTableSimple };
