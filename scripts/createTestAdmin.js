const { sequelize } = require('../config/database');
const Admin = require('../models/Admin')(sequelize);

async function createTestAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Check existing admins
    console.log('\n📋 Checking existing admins...');
    const existingAdmins = await Admin.findAll({
      raw: true,
      attributes: ['id', 'email', 'name', 'role', 'isActive']
    });
    
    if (existingAdmins.length > 0) {
      console.log('Existing admins:');
      existingAdmins.forEach(admin => {
        console.log(`- ${admin.name} (${admin.email}) - Role: ${admin.role} - Active: ${admin.isActive}`);
      });
    } else {
      console.log('No existing admins found');
    }

    // Create test admin user
    console.log('\n🔧 Creating test admin user...');
    
    const testAdmin = await Admin.create({
      email: 'test@shopzeo.com',
      password: 'test123456',
      name: 'Test Admin',
      role: 'admin',
      isActive: true
    });
    
    console.log(`✅ Created test admin user:`);
    console.log(`   - ID: ${testAdmin.id}`);
    console.log(`   - Name: ${testAdmin.name}`);
    console.log(`   - Email: ${testAdmin.email}`);
    console.log(`   - Role: ${testAdmin.role}`);
    console.log(`   - Active: ${testAdmin.isActive}`);
    console.log(`   - Password: test123456`);

    // Create another test admin with super_admin role
    console.log('\n🔧 Creating super admin user...');
    
    const superAdmin = await Admin.create({
      email: 'super@shopzeo.com',
      password: 'super123456',
      name: 'Super Test Admin',
      role: 'super_admin',
      isActive: true
    });
    
    console.log(`✅ Created super admin user:`);
    console.log(`   - ID: ${superAdmin.id}`);
    console.log(`   - Name: ${superAdmin.name}`);
    console.log(`   - Email: ${superAdmin.email}`);
    console.log(`   - Role: ${superAdmin.role}`);
    console.log(`   - Active: ${superAdmin.isActive}`);
    console.log(`   - Password: super123456`);

    // Test password comparison
    console.log('\n🧪 Testing password functionality...');
    const isPasswordValid = await testAdmin.comparePassword('test123456');
    console.log(`Password 'test123456' is valid: ${isPasswordValid}`);
    
    const isWrongPasswordValid = await testAdmin.comparePassword('wrongpassword');
    console.log(`Password 'wrongpassword' is valid: ${isWrongPasswordValid}`);

    // Final admin list
    console.log('\n📊 Final admin list:');
    const allAdmins = await Admin.findAll({
      raw: true,
      attributes: ['id', 'email', 'name', 'role', 'isActive', 'createdAt']
    });
    
    allAdmins.forEach(admin => {
      console.log(`- ${admin.name} (${admin.email}) - Role: ${admin.role} - Active: ${admin.isActive} - Created: ${admin.createdAt}`);
    });

    console.log('\n🎯 Test Admin Credentials:');
    console.log('Email: test@shopzeo.com');
    console.log('Password: test123456');
    console.log('Role: admin');
    console.log('\n🎯 Super Admin Credentials:');
    console.log('Email: super@shopzeo.com');
    console.log('Password: super123456');
    console.log('Role: super_admin');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

createTestAdmin();
