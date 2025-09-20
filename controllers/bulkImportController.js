const csv = require('csv-parser');
const fs = require('fs');
const { sequelize } = require('../config/database');
const { Sequelize } = require('sequelize'); // FIX: Import Sequelize directly from the library
const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Store = require('../models/Store');
const { v4: uuidv4 } = require('uuid');

// --- Helper Functions ---
const validateNumeric = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

const validateRequired = (value, fieldName) => {
    if (!value || value.toString().trim() === '') {
        throw new Error(`Required field "${fieldName}" is missing or empty.`);
    }
    return value.toString().trim();
};

const generateSlug = async (name, transaction) => {
    if (!name) return `product-${Date.now()}`;
    
    let baseSlug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');

    let slug = baseSlug;
    let counter = 1;

    // Check if slug already exists and append a number if it does
    while (await Product.findOne({ where: { slug }, transaction })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    return slug;
};

// --- Main bulk import function ---
const bulkImportProducts = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'CSV file is required' });
    }

    const filePath = req.file.path;
    const results = { total: 0, success: 0, failed: 0, created: 0 };
    const failedRows = [];
    const transaction = await sequelize.transaction();

    try {
        const csvData = await new Promise((resolve, reject) => {
            const rows = [];
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => rows.push(row))
                .on('end', () => resolve(rows))
                .on('error', reject);
        });

        results.total = csvData.length;

        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            try {
                // --- Validations ---
                const name = validateRequired(row['Name'], 'Name');
                const storeId = validateRequired(row['Store ID'], 'Store ID');
                const categoryId = validateRequired(row['Category ID'], 'Category ID');
                const skuId = row['Sku Id'] || null; // SKU is now optional

                // --- Foreign Key Checks ---
                const store = await Store.findByPk(storeId, { transaction });
                if (!store) throw new Error(`Store with ID "${storeId}" does not exist.`);
                
                const category = await Category.findByPk(categoryId, { transaction });
                if (!category) throw new Error(`Category with ID "${categoryId}" does not exist.`);

                // --- Build Product Data ---
                const productData = {
                    id: uuidv4(), // Always create a new unique ID
                    name,
                    sku_id: skuId,
                    store_id: storeId,
                    category_id: parseInt(categoryId),
                    sub_category_id: row['Sub Category ID'] ? parseInt(row['Sub Category ID']) : null,
                    product_code: row['Product Code'] || `PCODE-${Date.now()}`,
                    description: row['Description'] || null,
                    selling_price: validateNumeric(row['Selling Price']) || 0.00,
                    mrp: validateNumeric(row['MRP']),
                    quantity: parseInt(row['Quantity']) || 0,
                    slug: await generateSlug(name, transaction), // Generate a unique slug
                    is_active: true,
                };

                // **ALWAYS CREATE A NEW PRODUCT**
                await Product.create(productData, { transaction });
                results.created++;
                results.success++;

            } catch (error) {
                results.failed++;
                
                let errorMessage = error.message;
                if (error instanceof Sequelize.ValidationError) {
                    errorMessage = error.errors.map(e => `${e.path}: ${e.message}`).join(', ');
                }
                
                failedRows.push({
                    row_number: i + 2,
                    sku: row['Sku Id'] || 'N/A',
                    error: errorMessage
                });
            }
        }

        await transaction.commit();
        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'Bulk import process completed. All valid rows were created as new products.',
            results,
            failedRows
        });

    } catch (error) {
        await transaction.rollback();
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.error('Fatal bulk import error:', error);
        res.status(500).json({
            success: false,
            message: 'A fatal error occurred during the bulk import.',
            error: error.message
        });
    }
};

module.exports = {
  bulkImportProducts,
};

