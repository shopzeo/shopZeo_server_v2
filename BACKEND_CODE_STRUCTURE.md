# 🚀 Shopzeo Backend Code Structure

## 📁 **Complete Backend File Organization**

### **🏗️ Core Server Files**
```
backend/
├── server.js                    ← Main server entry point
├── package.json                 ← Dependencies and scripts
├── .env                        ← Environment variables (create from env.example)
├── env.example                 ← Example environment file
├── env.services.example        ← NEW: Services configuration example
└── README.md                   ← Project documentation
```

### **🔧 Configuration Files**
```
backend/config/
├── app.js                      ← Express app configuration
├── database.js                 ← Database connection (Sequelize)
└── sequelize.js                ← Sequelize ORM configuration
```

### **📊 Database & Models**
```
backend/models/
├── User.js                     ← User model (already existed)
├── OtpVerification.js          ← NEW: OTP verification model
├── associations.js             ← Model relationships
└── index.js                    ← Updated to export new models
```

### **🛠️ Services Layer (Business Logic)**
```
backend/services/
├── userAuthService.js          ← NEW: Complete authentication business logic
├── smsService.js               ← NEW: Twilio SMS service + fallback
├── emailService.js             ← NEW: Nodemailer email service + fallback
├── liveServerSync.js           ← Existing: Live server functionality
└── orderService.js             ← Existing: Order management
```

### **🎮 Controllers (API Request Handling)**
```
backend/controllers/
├── userAuthController.js       ← NEW: User authentication API endpoints
├── authController.js           ← Existing: Admin authentication
├── bannerController.js         ← Existing: Banner management
├── brandController.js          ← Existing: Brand management
├── categoryController.js       ← Existing: Category management
├── productController.js        ← Existing: Product management
└── storeController.js          ← Existing: Store management
```

### **🔒 Middleware (Security & Validation)**
```
backend/middleware/
├── userAuth.js                 ← NEW: JWT authentication + role-based access
├── auth.js                     ← Existing: Admin authentication middleware
├── errorHandler.js             ← Existing: Global error handling
└── rateLimit.js                ← Existing: Rate limiting
```

### **🛣️ API Routes**
```
backend/routes/
├── userAuth.js                 ← NEW: User authentication endpoints
├── auth.js                     ← Existing: Admin authentication routes
├── banners.js                  ← Existing: Banner management routes
├── brands.js                   ← Existing: Brand management routes
├── categories.js               ← Existing: Category management routes
├── products.js                 ← Existing: Product management routes
└── stores.js                   ← Existing: Store management routes
```

### **📝 Database Scripts**
```
backend/database/migrations/
├── 001_create_categories_table.sql
├── 002_create_sub_categories_table.sql
├── 003_create_brands_table.sql
├── 004_create_banners_table.sql
├── 005_create_products_table.sql
└── 006_create_otp_verifications_table.sql  ← NEW: OTP table
```

### **🧪 Testing & Setup Scripts**
```
backend/scripts/
├── setupUserAuth.js            ← NEW: Setup OTP table and verify users table
├── testAuthSystem.js           ← NEW: Test complete authentication system
├── testAuthAPI.js              ← NEW: Test API endpoints
├── testServices.js             ← NEW: Test SMS and Email services
├── fixUsersTable.js            ← NEW: Fix users table for phone auth
├── cleanupTestData.js          ← NEW: Clean up test data
├── checkUsersTable.js          ← NEW: Check table structure
└── [other existing scripts...]
```

## 🔐 **Authentication System Implementation**

### **📱 Phone + OTP Authentication**
- **Model**: `OtpVerification.js` - Stores OTP codes with expiration
- **Service**: `smsService.js` - Twilio SMS + fallback to mock
- **Logic**: `userAuthService.js` - OTP generation, verification, user activation
- **API**: `userAuthController.js` - Signup, login, OTP verification endpoints

### **📧 Email + Password Authentication**
- **Model**: `User.js` - Existing user model (modified to allow NULL email/password)
- **Service**: `emailService.js` - Nodemailer SMTP + fallback to mock
- **Logic**: `userAuthService.js` - Password hashing, JWT generation
- **API**: `userAuthController.js` - Signup, login endpoints

### **🔑 JWT Authentication**
- **Middleware**: `userAuth.js` - Token verification, role-based access control
- **Service**: `userAuthService.js` - JWT generation and verification
- **Security**: Rate limiting, token expiration, role validation

## 🚀 **How to Use**

### **1. Setup Environment**
```bash
cd backend
cp env.services.example .env
# Edit .env with your real credentials
```

### **2. Install Dependencies**
```bash
npm install
# Already installed: twilio, nodemailer, bcryptjs, jsonwebtoken
```

### **3. Setup Database**
```bash
node scripts/setupUserAuth.js
```

### **4. Test Services**
```bash
node scripts/testServices.js
```

### **5. Test Authentication System**
```bash
node scripts/testAuthSystem.js
```

### **6. Start Server**
```bash
node server.js
# Server runs on port 5310
```

## 📱 **SMS Service Configuration**

### **Twilio (Recommended)**
```bash
# Add to .env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### **AWS SNS (Alternative)**
```bash
# Add to .env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## 📧 **Email Service Configuration**

### **Gmail SMTP**
```bash
# Add to .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@shopzeo.com
```

### **Outlook/Hotmail**
```bash
# Add to .env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
FROM_EMAIL=noreply@shopzeo.com
```

## 🔍 **API Endpoints**

### **User Authentication**
```
POST /api/user-auth/signup          ← User registration
POST /api/user-auth/login           ← User login
POST /api/user-auth/verify-otp     ← OTP verification
GET  /api/user-auth/profile         ← Get user profile
PUT  /api/user-auth/profile         ← Update profile
POST /api/user-auth/change-password ← Change password
POST /api/user-auth/logout          ← User logout
POST /api/user-auth/refresh-token   ← Refresh JWT token
```

### **Admin Authentication (Existing)**
```
POST /api/auth/login                ← Admin login
POST /api/auth/logout               ← Admin logout
```

## 🧪 **Testing**

### **Database Testing**
```bash
node scripts/testAuthSystem.js      ← Test complete auth system
node scripts/testServices.js        ← Test SMS and Email services
```

### **API Testing**
```bash
# Start server first
node server.js

# Then test APIs
node scripts/testAuthAPI.js
```

### **Manual Testing**
```bash
# Test with cURL
curl -X POST http://localhost:5310/api/user-auth/signup \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","phone":"+919876543210","role":"customer"}'
```

## 🎯 **Key Features**

✅ **Dual Authentication**: Email+Password OR Phone+OTP  
✅ **Real SMS Service**: Twilio integration with fallback  
✅ **Real Email Service**: SMTP integration with fallback  
✅ **JWT Security**: Token-based authentication  
✅ **Role-Based Access**: Admin, vendor, customer roles  
✅ **Rate Limiting**: Prevent abuse  
✅ **Error Handling**: Comprehensive error management  
✅ **Validation**: Input validation and sanitization  
✅ **Database**: MySQL with Sequelize ORM  
✅ **Production Ready**: Environment-based configuration  

## 🚀 **Deployment**

1. **Copy environment file**: `cp env.services.example .env`
2. **Configure real services**: Add Twilio/SMTP credentials
3. **Set production variables**: Update URLs, secrets, etc.
4. **Start server**: `node server.js` or `npm start`
5. **Monitor logs**: Check service status and errors

## 📚 **Documentation Files**

- `USER_AUTH_API_DOCS.md` - Complete API documentation
- `LINKIIN_IN_MIGRATION_SUMMARY.md` - Production migration summary
- `BACKEND_CODE_STRUCTURE.md` - This file (code organization)

---

**🎉 Your backend is now complete with real SMS and Email services!**
