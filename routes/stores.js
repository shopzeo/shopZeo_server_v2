const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
  toggleStoreStatus,
  toggleStoreVerification,
  updateVendorPassword,
  exportStores
} = require('../controllers/storeController');
const { authenticate, adminOnly } = require('../middleware/auth');

// Configure multer for store image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/stores');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Create a new store (admin only) - Temporarily disabled auth for testing
router.post('/', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), createStore);

// Get all stores with pagination and search (admin only)
router.get('/', getAllStores); // Temporarily disabled auth for testing

// Get store by ID (admin only) - Temporarily disabled auth for testing
router.get('/:id', getStoreById);

// Update store (admin only) - Temporarily disabled auth for testing
router.put('/:id', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 }
]), updateStore);

// Delete store (admin only) - Temporarily disabled auth for testing
router.delete('/:id', deleteStore);

// Toggle store status (active/inactive) (admin only) - Temporarily disabled auth for testing
router.patch('/:id/toggle-status', toggleStoreStatus);

// Toggle store verification (admin only) - Temporarily disabled auth for testing
router.patch('/:id/toggle-verification', toggleStoreVerification);

// Update vendor password (admin only) - Temporarily disabled auth for testing
router.patch('/:id/update-password', updateVendorPassword);

// Export stores to CSV (admin only) - Temporarily disabled auth for testing
router.get('/export/csv', exportStores);

module.exports = router;
