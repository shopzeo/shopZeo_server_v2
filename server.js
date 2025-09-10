// server.js (top of file)
require('dotenv').config(); // <--- load .env immediately
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


// Step 1: Load all models first
const models = require('./models');

// Step 2: Then, set up their associations
const setupAssociations = require('./models/associations');
setupAssociations(models);

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
const orderRoutes = require('./routes/orders'); // Make sure this is also imported

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


app.use('/api/categories', categoryRoutes);
app.use('/api/category-hierarchy', categoryHierarchyRoutes); 
app.use('/api/orders', orderRoutes); // Order routes are added here

// Health check route
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

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Start server
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