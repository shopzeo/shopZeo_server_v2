const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const config = require('./config/app');
// Load model associations
require('./models/associations');
const userAuthRoutes = require('./routes/userAuth');
const adminRoutes = require('./routes/admin');
const brandRoutes = require('./routes/brands');
const categoryRoutes = require('./routes/categories');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const productRoutes = require('./routes/products');
const bannerRoutes = require('./routes/banners');
const storeRoutes = require('./routes/stores');
const bulkImportRoutes = require('./routes/bulkImport');
const categoryHierarchyRoutes = require('./routes/categoryHierarchy');

const app = express();
const PORT = config.PORT;

// Middleware - Simplified approach without restrictive CSP
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow all resources
  crossOriginEmbedderPolicy: false, // Allow cross-origin resources
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resource loading
}));

app.use(cors({
  origin: config.ALLOWED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-API-Key"]
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'shopzeo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Static file serving for uploads with proper headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/user-auth', userAuthRoutes);
app.use('/admin', adminRoutes); // Admin dashboard routes
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/admin', bulkImportRoutes);
app.use('/api/categories', categoryHierarchyRoutes);

// Database test route
app.get('/test-db', async (req, res) => {
  try {
    const { sequelize } = require('./config/database');
    
    // Test basic connection
    await sequelize.authenticate();
    
    // Test if users table exists
    const [results] = await sequelize.query("SHOW TABLES LIKE 'users'");
    const usersTableExists = results.length > 0;
    
    // Test if we can query the users table
    let userCount = 0;
    if (usersTableExists) {
      const [countResults] = await sequelize.query("SELECT COUNT(*) as count FROM users");
      userCount = countResults[0].count;
    }
    
    res.json({
      success: true,
      message: 'Database test completed',
      database: {
        connection: 'OK',
        users_table_exists: usersTableExists,
        user_count: userCount,
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'shopzeo_db'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check route
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { sequelize } = require('./config/database');
    let dbStatus = 'unknown';
    let dbError = null;
    
    try {
      await sequelize.authenticate();
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'disconnected';
      dbError = error.message;
    }
    
    res.json({
      success: true,
      message: 'Shopzeo Backend API is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        name: process.env.DB_NAME || 'shopzeo_db',
        user: process.env.DB_USER || 'root',
        error: dbError
      },
      jwt: {
        secret: process.env.JWT_SECRET ? 'configured' : 'using-default',
        expires: process.env.JWT_EXPIRES_IN || '7d'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Admin Dashboard Routes (Fallback - Redirect to frontend)
app.get('/admin', (req, res) => {
  res.redirect('/admin/login');
});

app.get('/admin/dashboard', (req, res) => {
  // Redirect to frontend admin dashboard
  res.json({
    success: false,
    message: 'Please login first to access admin dashboard',
    data: {
      login_url: '/admin/login',
      frontend_dashboard: 'Use your React frontend for full dashboard experience'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Admin Panel: https://linkiin.in/api/auth`);
      console.log(`🔗 Health Check: https://linkiin.in/health`);
      console.log(`🏷️  Brands API: https://linkiin.in/api/brands`);
      console.log(`📁 Categories API: https://linkiin.in/api/categories`);
      console.log(`📂 Subcategories API: https://linkiin.in/api/subcategories`);
      console.log(`📦 Products API: https://linkiin.in/api/products`);
      console.log(`🖼️  Banners API: https://linkiin.in/api/banners`);
      console.log(`🏪 Stores API: https://linkiin.in/api/stores`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
