const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopzeo_db'
};

async function fixUsersTable() {
  let connection;
  
  try {
    console.log('🔧 Fixing Users Table for Phone-Only Authentication...');
    console.log('=' .repeat(60));
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Check current table structure
    console.log('\n📋 Current Users Table Structure:');
    const [columns] = await connection.execute('DESCRIBE users');
    console.table(columns);
    
    // Check which columns need to be modified
    const emailColumn = columns.find(col => col.Field === 'email');
    const passwordColumn = columns.find(col => col.Field === 'password');
    
    console.log('\n🔍 Columns to Modify:');
    console.log(`Email column - Null: ${emailColumn?.Null}, Type: ${emailColumn?.Type}`);
    console.log(`Password column - Null: ${passwordColumn?.Null}, Type: ${passwordColumn?.Type}`);
    
    // Modify email column to allow NULL
    if (emailColumn && emailColumn.Null === 'NO') {
      console.log('\n🔧 Modifying email column to allow NULL...');
      try {
        await connection.execute('ALTER TABLE users MODIFY COLUMN email varchar(255) NULL');
        console.log('✅ Email column modified successfully');
      } catch (error) {
        console.log('⚠️  Warning: Could not modify email column:', error.message);
        console.log('   This might be due to existing data or constraints');
      }
    } else {
      console.log('✅ Email column already allows NULL values');
    }
    
    // Modify password column to allow NULL
    if (passwordColumn && passwordColumn.Null === 'NO') {
      console.log('\n🔧 Modifying password column to allow NULL...');
      try {
        await connection.execute('ALTER TABLE users MODIFY COLUMN password varchar(255) NULL');
        console.log('✅ Password column modified successfully');
      } catch (error) {
        console.log('⚠️  Warning: Could not modify password column:', error.message);
        console.log('   This might be due to existing data or constraints');
      }
    } else {
      console.log('✅ Password column already allows NULL values');
    }
    
    // Verify the changes
    console.log('\n📋 Updated Users Table Structure:');
    const [updatedColumns] = await connection.execute('DESCRIBE users');
    console.table(updatedColumns);
    
    // Check if modifications were successful
    const updatedEmailColumn = updatedColumns.find(col => col.Field === 'email');
    const updatedPasswordColumn = updatedColumns.find(col => col.Field === 'password');
    
    console.log('\n✅ Verification Results:');
    console.log(`Email column - Null: ${updatedEmailColumn?.Null} ${updatedEmailColumn?.Null === 'YES' ? '✅' : '❌'}`);
    console.log(`Password column - Null: ${updatedPasswordColumn?.Null} ${updatedPasswordColumn?.Null === 'YES' ? '✅' : '❌'}`);
    
    if (updatedEmailColumn?.Null === 'YES' && updatedPasswordColumn?.Null === 'YES') {
      console.log('\n🎉 Users table successfully modified!');
      console.log('✅ Phone-only users can now be created without email/password');
      console.log('✅ Email+password users can still be created normally');
      console.log('✅ Both authentication methods are now supported');
    } else {
      console.log('\n⚠️  Some modifications may not have been successful');
      console.log('   You may need to manually modify the table or check for constraints');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Run the authentication test again: node scripts/testAuthSystem.js');
    console.log('2. Test both signup methods');
    console.log('3. Verify the authentication system works correctly');
    
  } catch (error) {
    console.error('❌ Error fixing users table:', error);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Hint: Check your database credentials in the .env file.');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 Hint: Make sure the users table exists.');
    }
    
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
  fixUsersTable();
}

module.exports = { fixUsersTable };
