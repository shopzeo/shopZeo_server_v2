const express = require('express');
const router = express.Router();
const {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
  toggleStoreStatus,
  toggleStoreVerification,
  updateVendorPassword,
  exportStores,
  getStoreByOwnerId,
} = require("../controllers/storeController");
const { authenticate, adminOnly } = require('../middleware/auth');
const createUploader = require('../middleware/upload');

//
// THE FIX IS HERE: We must call the createUploader function
// to create the actual multer middleware for handling form-data.
//
const storeUpload = createUploader('store', [
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]);
// Note: We are not using the 'storeUpload' middleware directly here
// because the 'storeController' already uses multer internally for file handling.
// Applying it here would cause a duplicate processing error and timeout.

// @route   POST /api/stores
// @desc    Create a new store (with logo and banner uploads)
// @access  Admin
router.post('/', storeUpload, createStore);

// @route   PUT /api/stores/:id
// @desc    Update a store (with logo and banner uploads)
// @access  Admin
router.put('/:id', storeUpload, updateStore);

// --- All other routes remain the same ---

// Get all stores with pagination and search (admin only)
router.get('/', getAllStores);

// Get store by ID (admin only)
router.get('/:id', getStoreById);

// Delete store (admin only)
router.delete('/:id', deleteStore);

// Toggle store status (active/inactive) (admin only)
router.patch('/:id/toggle-status', toggleStoreStatus);

// Toggle store verification (admin only)
router.patch('/:id/toggle-verification', toggleStoreVerification);

// Update vendor password (admin only)
router.patch('/:id/update-password', updateVendorPassword);

// Export stores to CSV (admin only)
router.get('/export/csv', exportStores);
router.get('/owner/:owner_id', getStoreByOwnerId);

module.exports = router;