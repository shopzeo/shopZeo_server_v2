const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const productController = require("../controllers/productController");
const bulkImportController = require("../controllers/bulkImportController");

// --- FIX: Use diskStorage to save the file and get a path ---
const tempUploadDir = "uploads/temp";

// Ensure the temp directory exists
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "bulk-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage, // Use the disk storage configuration
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

// Get all products
router.get("/", productController.getProducts);

// Search products with full text search
router.get("/search", productController.searchProducts);

// Get single product
router.get("/:id", productController.getProduct);

// Create new product with file uploads
router.post(
  "/",
  productController.upload.fields([
    { name: "image_1", maxCount: 1 },
    { name: "image_2", maxCount: 1 },
    { name: "image_3", maxCount: 1 },
    { name: "image_4", maxCount: 1 },
    { name: "image_5", maxCount: 1 },
    { name: "image_6", maxCount: 1 },
    { name: "image_7", maxCount: 1 },
    { name: "image_8", maxCount: 1 },
    { name: "image_9", maxCount: 1 },
    { name: "image_10", maxCount: 1 },
    { name: "video_1", maxCount: 1 },
    { name: "video_2", maxCount: 1 },
    { name: "size_chart", maxCount: 1 },
  ]),
  productController.createProduct
);

// Update product with file uploads
router.put(
  "/:id",
  productController.upload.fields([
    { name: "image_1", maxCount: 1 },
    { name: "image_2", maxCount: 1 },
    { name: "image_3", maxCount: 1 },
    { name: "image_4", maxCount: 1 },
    { name: "image_5", maxCount: 1 },
    { name: "image_6", maxCount: 1 },
    { name: "image_7", maxCount: 1 },
    { name: "image_8", maxCount: 1 },
    { name: "image_9", maxCount: 1 },
    { name: "image_10", maxCount: 1 },
    { name: "video_1", maxCount: 1 },
    { name: "video_2", maxCount: 1 },
    { name: "size_chart", maxCount: 1 },
  ]),
  productController.updateProduct
);

// Delete product
router.delete("/bulk-delete", productController.deleteMultiProducts);
router.delete("/:id", productController.deleteProduct);

// Get products by store
router.get("/store/:store_id", productController.getProductsByStore);

// Toggle product status
router.patch("/:id/toggle-status", productController.toggleProductStatus);

// Toggle product featured
router.patch("/:id/toggle-featured", productController.toggleProductFeatured);

// Export products
router.get("/export/all", productController.exportProducts);

// Bulk upload products from CSV
router.post(
  "/bulk-upload",
  upload.single("csv"),
  bulkImportController.bulkImportProducts
);

module.exports = router;
