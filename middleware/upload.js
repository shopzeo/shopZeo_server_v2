const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Creates a reusable multer upload middleware.
 * @param {string} entityName - The name for the subfolder and filename prefix (e.g., 'store', 'category').
 * @param {Array<Object>} fieldsConfig - The fields configuration for multer (e.g., [{ name: 'image', maxCount: 1 }]).
 * @returns {Function} - The configured multer middleware.
 */
const createUploader = (entityName, fieldsConfig) => {
  const uploadDir = path.join(__dirname, `../uploads/${entityName}s`);

  // Ensure the destination directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${entityName}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

  const checkFileType = (file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only image files are allowed!'));
    }
  };

  return multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      checkFileType(file, cb);
    }
  }).fields(fieldsConfig);
};

module.exports = createUploader;
