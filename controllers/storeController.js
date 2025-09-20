const { Store, User } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');

// --- HELPER FUNCTIONS ---

// Helper to remove uploaded files if an operation fails
const cleanupFilesOnError = async (files) => {
    if (!files) return;
    const cleanup = async (fileArray) => {
        if (fileArray && fileArray[0] && fileArray[0].path) {
            try {
                await fs.unlink(path.resolve(fileArray[0].path));
            } catch (err) {
                console.error("Error cleaning up orphaned file:", err);
            }
        }
    };
    await cleanup(files.logo);
    await cleanup(files.banner);
};

// Helper to remove a single old file path during an update
const cleanupOldFile = async (relativePath) => {
    if (!relativePath) return;
    try {
        await fs.unlink(path.resolve(relativePath));
    } catch (err) {
        // Log error if file doesn't exist, but don't stop the process
        if (err.code !== 'ENOENT') {
            console.error("Error cleaning up old file:", err);
        }
    }
};

// Helper to construct a full, correct URL from a relative path
const constructFileUrl = (req, relativePath) => {
    if (!relativePath) return null;
    // Replace backslashes with forward slashes for URL compatibility
    const correctedPath = relativePath.replace(/\\/g, "/");
    return `${req.protocol}://${req.get('host')}/${correctedPath}`;
};

// --- CONTROLLER FUNCTIONS ---

// CREATE a new store (Fixed for atomicity, file handling, and user creation)
const createStore = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            name, description, address, city, state, country, postal_code,
            phone, email, password, gst_number, gst_percentage,
            pan_number, business_type
        } = req.body;

        // --- Critical Validations ---
        if (!name || !email) {
            cleanupFilesOnError(req.files);
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Store Name and Email are required.' });
        }
        
        const existingStoreName = await Store.findOne({ where: { name }, transaction: t });
        if (existingStoreName) {
            cleanupFilesOnError(req.files);
            await t.rollback();
            return res.status(400).json({ success: false, message: 'A store with this name already exists.' });
        }
        if (gst_number) {
            const existingGST = await Store.findOne({ where: { gst_number }, transaction: t });
            if (existingGST) {
                cleanupFilesOnError(req.files);
                await t.rollback();
                return res.status(400).json({ success: false, message: 'A store with this GST number already exists.' });
            }
        }

        // --- User Management within Transaction ---
        let vendorUser;
        const existingUser = await User.findOne({ where: { email }, transaction: t });

        if (existingUser) {
            if (existingUser.role !== 'customer') {
                cleanupFilesOnError(req.files);
                await t.rollback();
                return res.status(403).json({ success: false, message: 'This email is already associated with a vendor or admin.' });
            }
            existingUser.role = 'vendor';
            vendorUser = await existingUser.save({ transaction: t });
        } else {
            if (!password) {
                cleanupFilesOnError(req.files);
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Password is required for a new vendor account.' });
            }
            // **FIXED LOGIC FOR NAMES**
           const nameParts = name.split(' ');
            const first_name = nameParts[0];
            let last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Owner'; // Default last name
            
            // Ensure last_name meets the minimum length validation from the User model
            if (last_name.length < 2) {
                last_name = 'Owner';
            }
            vendorUser = await User.create({
                first_name,
                last_name,
                email,
                password,
                phone,
                role: 'vendor',
                is_active: true,
                is_verified: true, // Assuming new vendors are auto-verified for simplicity
            }, { transaction: t });
        }

        // --- Store Creation with Correct File Paths ---
       const logoPath = req.files && req.files.logo ? `uploads/stores/${req.files.logo[0].filename}` : null;
       const bannerPath = req.files && req.files.banner ? `uploads/stores/${req.files.banner[0].filename}` : null;
       const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

        const newStore = await Store.create({
            name, slug, description, address, city, state, country, postal_code, phone, email,
            gst_number, gst_percentage: parseFloat(gst_percentage) || 18.00, pan_number, business_type,
            owner_id: vendorUser.id,
            logo: logoPath, // Save the relative path
            banner: bannerPath, // Save the relative path
            meta_title: `${name} - Online Store`,
            meta_description: description || `Shop at ${name} for the best products and deals`,
        }, { transaction: t });

        await t.commit();

        // Construct full URLs for the response object
        const responseStore = newStore.toJSON();
        responseStore.logo = constructFileUrl(req, responseStore.logo);
        responseStore.banner = constructFileUrl(req, responseStore.banner);

        res.status(201).json({
            success: true,
            message: 'Store created successfully!',
            data: { store: responseStore }
        });
    } catch (error) {
        await t.rollback();
        cleanupFilesOnError(req.files);
        console.error('Create store error:', error);
        res.status(500).json({ success: false, message: 'Failed to create store due to an internal error.', error: error.message });
    }
};

// Get all stores with optional pagination and correct image URLs
const getAllStores = async (req, res) => {
    try {
        const { page, limit, search = '', status = '', verified = '' } = req.query;
        const whereClause = {};

        if (search) whereClause[Op.or] = [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }];
        if (status) whereClause.is_active = status === 'active';
        if (verified) whereClause.is_verified = verified === 'verified';

        const queryOptions = {
            where: whereClause,
            include: [{ model: User, as: 'owner', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'is_active', 'is_verified'] }],
            order: [['created_at', 'DESC']]
        };

        if (page && limit) {
            queryOptions.limit = parseInt(limit, 10);
            queryOptions.offset = (parseInt(page, 10) - 1) * queryOptions.limit;
        }

        const { count, rows: stores } = await Store.findAndCountAll(queryOptions);

        const storesWithImageUrls = stores.map(store => {
            const storeJson = store.toJSON();
            return {
                ...storeJson,
                logo: constructFileUrl(req, storeJson.logo),
                banner: constructFileUrl(req, storeJson.banner),
            };
        });

        const response = {
            success: true,
            data: { stores: storesWithImageUrls, pagination: { totalItems: count } }
        };

        if (page && limit) {
            response.data.pagination.currentPage = parseInt(page, 10);
            response.data.pagination.totalPages = Math.ceil(count / parseInt(limit, 10));
        }

        res.json(response);
    } catch (error) {
        console.error('Get stores error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stores', error: error.message });
    }
};

// UPDATE store (Fixed for atomicity and file handling)
const updateStore = async (req, res) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
        const store = await Store.findByPk(id, { transaction: t });
        if (!store) {
            cleanupFilesOnError(req.files);
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        const updateData = req.body;
        const oldLogoPath = store.logo;
        const oldBannerPath = store.banner;

        if (req.files && req.files.logo) {
            updateData.logo = `uploads/stores/${req.files.logo[0].filename}`;
            if (oldLogoPath) await cleanupOldFile(oldLogoPath);
        }
        if (req.files && req.files.banner) {
            updateData.banner = `uploads/stores/${req.files.banner[0].filename}`;
            if (oldBannerPath) await cleanupOldFile(oldBannerPath);
        }


        await store.update(updateData, { transaction: t });
        await t.commit();
     
        const updatedStoreJson = store.toJSON();
        updatedStoreJson.logo = constructFileUrl(req, updatedStoreJson.logo);
        updatedStoreJson.banner = constructFileUrl(req, updatedStoreJson.banner);

        res.json({
            success: true,
            message: 'Store updated successfully',
            data: updatedStoreJson
        });
    } catch (error) {
        await t.rollback();
        cleanupFilesOnError(req.files);
        console.error('Update store error:', error);
        res.status(500).json({ success: false, message: 'Failed to update store', error: error.message });
    }
};

// Get store by ID
const getStoreById = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await Store.findByPk(id, {
            include: [{ model: User, as: 'owner' }]
        });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }
        const storeJson = store.toJSON();
        const responseStore = {
            ...storeJson,
            logo: constructFileUrl(req, storeJson.logo),
            banner: constructFileUrl(req, storeJson.banner),
        };

        res.json({ success: true, data: responseStore });
    } catch (error) {
        console.error('Get store by ID error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch store', error: error.message });
    }
};

// Delete store
const deleteStore = async (req, res) => {
    const { id } = req.params;
    const t = await sequelize.transaction();
    try {
        const store = await Store.findByPk(id, { transaction: t });
        if (!store) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Store not found' });
        }
        await cleanupOldFile(store.logo);
        await cleanupOldFile(store.banner);

        await User.destroy({ where: { id: store.owner_id }, transaction: t });
        await store.destroy({ transaction: t });
        await t.commit();
        res.json({ success: true, message: 'Store and associated vendor account deleted successfully.' });
    } catch (error) {
        await t.rollback();
        console.error('Delete store error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete store', error: error.message });
    }
};

// Toggle store status
const toggleStoreStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await Store.findByPk(id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }
        const newStatus = !store.is_active;
        await store.update({ is_active: newStatus });
        res.json({ success: true, message: `Store status set to ${newStatus ? 'Active' : 'Inactive'}.`, data: store });
    } catch (error) {
        console.error('Toggle store status error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle store status', error: error.message });
    }
};

// Toggle store verification
const toggleStoreVerification = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await Store.findByPk(id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }
        const newStatus = !store.is_verified;
        await store.update({ is_verified: newStatus });
        res.json({ success: true, message: `Store verification set to ${newStatus ? 'Verified' : 'Unverified'}.`, data: store });
    } catch (error) {
        console.error('Toggle verification error:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle store verification', error: error.message });
    }
};

// Update vendor password
const updateVendorPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }
        const store = await Store.findByPk(id);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found.' });
        }
        const user = await User.findByPk(store.owner_id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Associated vendor user not found.' });
        }
        user.password = new_password; // The model's hook will hash it
        await user.save();
        res.json({ success: true, message: 'Vendor password updated successfully.' });
    } catch (error) {
        console.error('Update vendor password error:', error);
        res.status(500).json({ success: false, message: 'Failed to update password.', error: error.message });
    }
};

// Export stores to CSV
const exportStores = async (req, res) => {
    try {
        const stores = await Store.findAll({
            include: [{ model: User, as: 'owner', attributes: ['first_name', 'last_name'] }],
            raw: true,
        });

        if (stores.length === 0) {
            return res.status(404).json({ success: false, message: "No stores to export." });
        }

        const csvData = stores.map(store => ({
            'Store ID': store.id,
            'Store Name': store.name,
            'Owner Name': `${store['owner.first_name'] || ''} ${store['owner.last_name'] || ''}`.trim(),
            // ... add other fields you want to export
        }));
       
        // This is a simplified CSV creation, consider using a library like 'csv-writer' for production
        const headers = Object.keys(csvData[0]).join(',');
        const rows = csvData.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="stores.csv"');
        res.status(200).send(`${headers}\n${rows}`);

    } catch (error) {
        console.error('Export stores error:', error);
        res.status(500).json({ success: false, message: 'Failed to export stores', error: error.message });
    }
};

module.exports = {
    createStore,
    getAllStores,
    getStoreById,
    updateStore,
    deleteStore,
    toggleStoreStatus,
    toggleStoreVerification,
    updateVendorPassword,
    exportStores
};