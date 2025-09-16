// server.js

// 1. सबसे पहले Environment Variables लोड करें
require('dotenv').config();

// 2. मॉड्यूल इम्पोर्ट्स
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const config = require('./config/app');
const { testConnection } = require('./config/database');

// 3. डेटाबेस और Sequelize सेटअप
const models = require('./models');
const setupAssociations = require('./models/associations');
setupAssociations(models);

// 4. Express ऐप को इनिशियलाइज़ करें
const app = express();
const PORT = config.PORT;

// --- Middleware सेटअप ---

// सुरक्षा के लिए Helmet
app.use(helmet({
  contentSecurityPolicy: false, 
  crossOriginEmbedderPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// --- सही CORS कॉन्फ़िगरेशन ---
const allowedOrigins = Array.isArray(config.ALLOWED_ORIGINS) ? config.ALLOWED_ORIGINS : (config.ALLOWED_ORIGINS ? config.ALLOWED_ORIGINS.split(',') : []);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000'); // डेवलपमेंट के लिए localhost को अनुमति दें
}

app.use(cors({
  origin: (origin, callback) => {
    // अगर रिक्वेस्ट का ऑरिजिन हमारी allowedOrigins लिस्ट में है या कोई ऑरिजिन नहीं है (जैसे Postman), तो उसे अनुमति दें
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-API-Key"]
}));



app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// No-cache middleware
const nocache = (req, res, next) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  res.header('Surrogate-Control', 'no-store');
  next();
};

app.use('/api', nocache); 


app.use(session({
  secret: process.env.SESSION_SECRET || 'shopzeo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- रूट्स सेटअप ---
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
const paymentRoutes = require('./routes/payments');

app.use('/api/auth', authRoutes);
app.use('/api/user-auth', userAuthRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/admin', bulkImportRoutes);
app.use('/api/category-hierarchy', categoryHierarchyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Health Check रूट
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Shopzeo Backend API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: error.message || 'Internal server error',
  });
});

// --- सर्वर को स्टार्ट करें ---
const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error(' Failed to start server:', error);
    process.exit(1);
  }
};

startServer();