// server.js (top of file)
require('dotenv').config(); // <--- load .env immediately
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');

const { testConnection } = require('./config/database');
const config = require('./config/app');

// Step 1: Load all models first
const models = require('./models');

// Step 2: Then, set up their associations
const setupAssociations = require('./models/associations');
setupAssociations(models);

// Import routes
const authRoutes = require('./routes/auth');
const userAuthRoutes = require('./routes/userAuth');
const brandRoutes = require('./routes/brands');
const categoryRoutes = require('./routes/categories');
const subCategoryRoutes = require('./routes/subCategoryRoutes');
const productRoutes = require('./routes/products');
const bannerRoutes = require('./routes/banners');
const storeRoutes = require('./routes/stores');
const bulkImportRoutes = require('./routes/bulkImport');
const categoryHierarchyRoutes = require('./routes/categoryHierarchy');
const orderRoutes = require('./routes/orders'); 

const app = express();
const PORT = config.PORT;

// -----------------------------
// Middleware
// -----------------------------

// Helmet (security)
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS
app.use(cors({
  origin: config.ALLOWED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-API-Key"]
}));

// Logging & parsers
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// -----------------------------
// No-cache middleware
// -----------------------------
const nocache = (req, res, next) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  res.header('Surrogate-Control', 'no-store');
  next();
};

// Apply to all API routes
app.use(nocache);

// -----------------------------
// Session configuration
// -----------------------------
app.use(session({
  secret: process.env.SESSION_SECRET || 'shopzeo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// -----------------------------
// Static file serving (uploads)
// -----------------------------
app.use('/uploads', (req, res, next) => {
  // CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  // Disable cache for uploaded files
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  res.header('Surrogate-Control', 'no-store');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// -----------------------------
// Routes
// -----------------------------
app.use('/api/auth', authRoutes);
app.use('/api/user-auth', userAuthRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/admin', bulkImportRoutes);

app.use('/api/orders', orderRoutes); // Order routes are added here
app.use('/api/categories', categoryRoutes);
app.use('/api/category-hierarchy', categoryHierarchyRoutes); 


// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Shopzeo Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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

// -----------------------------
// Start server
// -----------------------------
const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Admin Panel: https://shopzeo.in/api/auth`);
      console.log(`🔗 Health Check: https://shopzeo.in/health`);
      console.log(`🏷️  Brands API: https://shopzeo.in/api/brands`);
      console.log(`📁 Categories API: https://shopzeo.in/api/categories`);
      console.log(`📂 Subcategories API: https://shopzeo.in/api/subcategories`);
      console.log(`📦 Products API: https://shopzeo.in/api/products`);
      console.log(`🖼️  Banners API: https://shopzeo.in/api/banners`);
      console.log(`🏪 Stores API: https://shopzeo.in/api/stores`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
