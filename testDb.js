const { testConnection } = require('./config/database');

async function testDB() {
  console.log('🧪 Testing Database Connection...');
  console.log('=' .repeat(40));
  
  try {
    await testConnection();
    console.log('✅ Database connection successful!');
    console.log('🚀 You can now start the server with: node server.js');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n💡 Check your .env file for correct database credentials');
    console.log('💡 Make sure MySQL is running');
  }
}

testDB();
