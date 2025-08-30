const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopzeo_db'
};

async function checkUsersTable() {
  let connection;
  
  try {
    console.log('🔍 Checking Users Table Structure...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');
    
    // Check if users table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'users'");
    if (tables.length === 0) {
      console.log('❌ Users table does not exist!');
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Get users table structure
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('\n📋 Users Table Structure:');
    console.table(columns);
    
    // Check the id column specifically
    const idColumn = columns.find(col => col.Field === 'id');
    if (idColumn) {
      console.log('\n🔍 ID Column Details:');
      console.log(`Field: ${idColumn.Field}`);
      console.log(`Type: ${idColumn.Type}`);
      console.log(`Key: ${idColumn.Key}`);
      console.log(`Null: ${idColumn.Null}`);
      console.log(`Default: ${idColumn.Default}`);
      console.log(`Extra: ${idColumn.Extra}`);
    }
    
    // Check for any indexes on the id column
    const [indexes] = await connection.execute("SHOW INDEX FROM users WHERE Column_name = 'id'");
    console.log('\n🔍 Indexes on ID Column:');
    if (indexes.length > 0) {
      indexes.forEach(index => {
        console.log(`- ${index.Key_name}: ${index.Column_name} (${index.Collation})`);
      });
    } else {
      console.log('No specific indexes found on ID column');
    }
    
    // Check table engine and charset
    const [tableInfo] = await connection.execute("SHOW TABLE STATUS WHERE Name = 'users'");
    if (tableInfo.length > 0) {
      console.log('\n🔍 Table Information:');
      console.log(`Engine: ${tableInfo[0].Engine}`);
      console.log(`Collation: ${tableInfo[0].Collation}`);
      console.log(`Row Format: ${tableInfo[0].Row_format}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking users table:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkUsersTable();
}

module.exports = { checkUsersTable };
