# User Authentication Endpoints Testing Guide

This guide explains how to test the user authentication endpoints in your Shopzeo backend.

## 🚀 Quick Start

### 1. Start Your Server
```bash
# Make sure your server is running
npm start
# or
node server.js
```

### 2. Test the Health Endpoint
```bash
curl http://localhost:3000/health
```

## 📍 Available Endpoints

### Base URL: `http://localhost:3000/api/user-auth`

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/signup` | POST | User registration | ❌ No |
| `/login` | POST | User login | ❌ No |
| `/verify-otp` | POST | OTP verification | ❌ No |
| `/profile` | GET | Get user profile | ✅ Yes |
| `/profile` | PUT | Update user profile | ✅ Yes |
| `/change-password` | POST | Change password | ✅ Yes |
| `/logout` | POST | User logout | ✅ Yes |
| `/refresh-token` | POST | Refresh access token | ✅ Yes |

## 🧪 Testing Scenarios

### 1. User Signup Testing

#### Email + Password Signup
```bash
curl -X POST http://localhost:3000/api/user-auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "phone": "+919876543210",
    "password": "Test@123",
    "role": "customer"
  }'
```

#### Phone + OTP Signup
```bash
curl -X POST http://localhost:3000/api/user-auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "+919876543211",
    "role": "vendor"
  }'
```

### 2. User Login Testing

#### Email + Password Login
```bash
curl -X POST http://localhost:3000/api/user-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "Test@123"
  }'
```

#### Phone + OTP Login
```bash
curl -X POST http://localhost:3000/api/user-auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543211"
  }'
```

### 3. OTP Verification Testing
```bash
curl -X POST http://localhost:3000/api/user-auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_UUID_HERE",
    "otp": "123456"
  }'
```

### 4. Protected Endpoints Testing

#### Get User Profile
```bash
curl -X GET http://localhost:3000/api/user-auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

#### Update User Profile
```bash
curl -X PUT http://localhost:3000/api/user-auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John Updated",
    "city": "Mumbai"
  }'
```

#### Change Password
```bash
curl -X POST http://localhost:3000/api/user-auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "Test@123",
    "new_password": "NewTest@123"
  }'
```

## 🛠️ Testing Tools

### 1. Using cURL (Command Line)
All examples above use cURL. Make sure you have it installed.

### 2. Using Postman
Import the collection from `postman/UserAuth_Collection.json`

### 3. Using Thunder Client (VS Code Extension)
Copy the cURL commands and use Thunder Client extension.

### 4. Using JavaScript/Node.js
Use the test scripts in `scripts/testUserAuth.js`

## 📋 Test Data

### Valid Test Users
Use the test users created by the seeder:
- **Customer**: `test.customer@example.com` / `Test@123`
- **Vendor**: `test.vendor@example.com` / `Test@123`
- **Delivery**: `test.delivery@example.com` / `Test@123`

### Test Phone Numbers
- `+919876543210` (Customer)
- `+919876543211` (Vendor)
- `+919876543212` (Delivery)

## 🔍 Testing Checklist

### Signup Testing
- [ ] Email + Password signup with valid data
- [ ] Phone + OTP signup with valid data
- [ ] Signup with missing required fields
- [ ] Signup with invalid email format
- [ ] Signup with invalid phone format
- [ ] Signup with existing email
- [ ] Signup with existing phone
- [ ] Signup with invalid role

### Login Testing
- [ ] Email + Password login with valid credentials
- [ ] Phone + OTP login with valid phone
- [ ] Login with invalid email
- [ ] Login with invalid password
- [ ] Login with non-existent user
- [ ] Login with deactivated user

### OTP Testing
- [ ] OTP verification with valid OTP
- [ ] OTP verification with invalid OTP
- [ ] OTP verification with expired OTP
- [ ] OTP verification with wrong user ID

### Protected Endpoints Testing
- [ ] Access without token (should fail)
- [ ] Access with invalid token (should fail)
- [ ] Access with valid token (should succeed)
- [ ] Profile retrieval
- [ ] Profile update
- [ ] Password change
- [ ] Logout functionality

## 🚨 Common Issues & Solutions

### 1. CORS Errors
- Check if your frontend origin is in `ALLOWED_ORIGINS`
- Verify CORS configuration in `server.js`

### 2. Validation Errors
- Check request body format
- Ensure all required fields are present
- Verify data types (email format, phone format, etc.)

### 3. Authentication Errors
- Check if token is included in Authorization header
- Verify token format: `Bearer <token>`
- Check if token is expired

### 4. Database Connection Issues
- Ensure database is running
- Check database configuration in `.env`
- Verify database credentials

## 📊 Expected Responses

### Successful Signup
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "role": "customer"
    },
    "requires_otp": false
  }
}
```

### Successful Login
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com"
    },
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

## 🔐 Security Testing

### Rate Limiting
- Test rate limiting by making multiple requests
- Should get rate limit error after 50 requests in 15 minutes

### Input Validation
- Test SQL injection attempts
- Test XSS payloads
- Test malformed JSON

### Token Security
- Test expired tokens
- Test tampered tokens
- Test token refresh mechanism

## 📝 Logging & Debugging

### Enable Debug Logs
Set in your `.env`:
```
NODE_ENV=development
DEBUG=true
```

### Check Server Logs
Monitor console output for:
- Request/response logs
- Validation errors
- Database queries
- Authentication attempts

---

**Happy Testing! 🚀**

