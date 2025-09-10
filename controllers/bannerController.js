const Banner = require('../models/Banner');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/app');

// Ensure the uploads directory exists
const UPLOADS_DIR = 'uploads/banners';
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

// Configure multer for banner image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to delete an image file
const deleteImageFile = async (filename) => {
  if (!filename) return;
  try {
    const imagePath = path.join(__dirname, '..', UPLOADS_DIR, filename);
    await fs.unlink(imagePath);
  } catch (error) {
    // Log error if file deletion fails but don't crash the app
    console.error(`Error deleting banner image ${filename}:`, error);
  }
};


// --- REWRITTEN AND SIMPLIFIED FUNCTIONS ---

// Create a new banner
const createBanner = async (req, res) => {
  try {
    // 1. Check if an image was uploaded. Multer puts the file in `req.file`.
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Banner image is required'
      });
    }

    const {
      title,
      subtitle,
      banner_type,
      resource_type,
      resource_id,
      button_text,
      button_url,
      is_active
    } = req.body;

    // 2. Validate required fields
    if (!title || !banner_type) {
      // If validation fails, delete the uploaded file to prevent orphans
      await deleteImageFile(req.file.filename);
      return res.status(400).json({
        success: false,
        message: 'Title and banner_type are required'
      });
    }

    // 3. Create the banner with the filename from multer
    const banner = await Banner.create({
      ...req.body,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      image: req.file.filename // Use the filename saved by multer
    });

    res.status(201).json({
      success: true,
      message: 'Banner created successfully',
      data: banner
    });
  } catch (error) {
    // If any other error occurs, delete the uploaded file
    if (req.file) {
      await deleteImageFile(req.file.filename);
    }
    console.error('Create banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create banner',
      error: error.message
    });
  }
};

// Update banner
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByPk(id);

    if (!banner) {
      // If banner not found and a file was uploaded, delete it
      if (req.file) {
        await deleteImageFile(req.file.filename);
      }
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const oldImage = banner.image;
    const updateData = { ...req.body };

    // If a new image is uploaded, update the filename and delete the old one
    if (req.file) {
      updateData.image = req.file.filename;
      if (oldImage) {
        await deleteImageFile(oldImage);
      }
    }

    await banner.update(updateData);

    res.json({
      success: true,
      message: 'Banner updated successfully',
      data: banner
    });
  } catch (error) {
    // If update fails and a new file was uploaded, delete the new file
    if (req.file) {
      await deleteImageFile(req.file.filename);
    }
    console.error('Update banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update banner',
      error: error.message
    });
  }
};

// Delete banner
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByPk(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    // Delete the associated image file first
    await deleteImageFile(banner.image);
    
    // Then destroy the database record
    await banner.destroy();

    res.json({
      success: true,
      message: 'Banner deleted successfully'
    });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete banner',
      error: error.message
    });
  }
};

// --- Other functions (getBanners, getBannerById, etc.) remain the same ---
// --- I'm including them here for completeness ---

// Get all banners with pagination
const getBanners = async (req, res) => {
  try {
    const { page = 1, limit = 10, banner_type, is_active } = req.query;
    
    const whereClause = {};
    
    if (banner_type) {
      whereClause.banner_type = banner_type;
    }
    
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const { count, rows: banners } = await Banner.findAndCountAll({
      where: whereClause,
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(limit) * (parseInt(page) - 1)
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    const transformedBanners = banners.map(banner => ({
      ...banner.toJSON(),
      image: banner.image ? config.getImageUrl(`${UPLOADS_DIR}/${banner.image}`) : null
    }));

    res.json({
      success: true,
      data: {
        banners: transformedBanners,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banners',
      error: error.message
    });
  }
};

// Get banner by ID
const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByPk(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: 'Banner not found'
      });
    }

    const bannerData = banner.toJSON();
    if (bannerData.image) {
      bannerData.image = config.getImageUrl(`${UPLOADS_DIR}/${bannerData.image}`);
    }

    res.json({
      success: true,
      data: bannerData
    });
  } catch (error) {
    console.error('Get banner error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch banner',
      error: error.message
    });
  }
};

const toggleBannerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findByPk(id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        const newStatus = !banner.is_active;
        await banner.update({ is_active: newStatus });
        res.json({ success: true, message: `Banner ${newStatus ? 'activated' : 'deactivated'}`, data: { is_active: newStatus } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to toggle status', error: error.message });
    }
};

const toggleBannerFeatured = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findByPk(id);
        if (!banner) {
            return res.status(404).json({ success: false, message: 'Banner not found' });
        }
        const newFeatured = !banner.is_featured;
        await banner.update({ is_featured: newFeatured });
        res.json({ success: true, message: `Banner ${newFeatured ? 'featured' : 'unfeatured'}`, data: { is_featured: newFeatured } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to toggle featured status', error: error.message });
    }
};


module.exports = {
  upload,
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  toggleBannerFeatured
};