const { sequelize } = require('./config/database');

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database schema...');
    
    // Add missing columns to users table
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS default_shipping_address TEXT,
      ADD COLUMN IF NOT EXISTS default_billing_address TEXT,
      ADD COLUMN IF NOT EXISTS preferences JSON,
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(500),
      ADD COLUMN IF NOT EXISTS reset_token_expires DATETIME
    `);
    
    console.log('✅ Database schema fixed successfully!');
    
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ Database connection verified!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixDatabase();

