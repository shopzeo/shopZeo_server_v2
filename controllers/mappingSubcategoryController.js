const SubCategoryChild = require('../models/SubcategoryChild');
const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const { Op } = require('sequelize');

// Helper function to generate slug
const generateSlug = (name) => {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
};


exports.getSubCategoriesChildList = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', categoryId = '', subcategoryId = '' } = req.query;
        const offset = (page - 1) * limit;

        // Build where clause
        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { subcategories_name: { [Op.like]: `%${search}%` } },
                { subcategories_slug: { [Op.like]: `%${search}%` } }
            ];
        }

        if (categoryId) whereClause.category_id = categoryId;
        if (subcategoryId) whereClause.sub_categories_id = subcategoryId;

        // Fetch subcategory children with pagination and associations
        const { count, rows: subCategoryChildren } = await SubCategoryChild.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['subcategories_priority', 'ASC'], ['created_at', 'DESC']],
            include: [
                {
                    model: Category,
                    as: 'category', // must match the alias in association
                    attributes: ['id', 'name']
                },
                {
                    model: SubCategory,
                    as: 'subcategory', // must match the alias in association
                    attributes: ['id', 'name']
                }
            ]
        });

        res.json({
            success: true,
            data: {
                subCategoryChildren,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get SubcategoriesChild error:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subcategory children',
            error: error.message,
            stack: error.stack
        });
    }
};


// Get single sub category by ID
exports.getSubCategoryChildById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Subcategory child ID is required.'
            });
        }

        const subCategoryChild = await SubCategoryChild.findOne({
            where: { id },
            include: [
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name']
                },
                {
                    model: SubCategory,
                    as: 'subcategory',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!subCategoryChild) {
            return res.status(404).json({
                success: false,
                message: 'Subcategory child not found.'
            });
        }

        res.json({
            success: true,
            data: subCategoryChild
        });

    } catch (error) {
        console.error('Get Subcategory child error:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subcategory child.',
            error: error.message,
            stack: error.stack
        });
    }
};


// Create new sub category
exports.createSubCategoryChild = async (req, res) => {
    try {
        console.log('Creating subcategory with data:', req.body);

        const {
            name,
            priority = 0,
            isActive = true,
            categoryId,
            subcategoryId,
            metaTitle,
            metaDescription,
            metaKeywords
        } = req.body;

        // Use categoryId or category_id, whichever is provided
        const finalCategoryId = categoryId;

        // Use isActive or is_active, whichever is provided
        const finalIsActive = isActive !== undefined ? isActive : 0;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'name is required.'
            });
        }

        if (!finalCategoryId) {
            return res.status(400).json({
                success: false,
                message: 'Main category is required'
            });
        }

        if (!subcategoryId) {
            return res.status(400).json({
                success: false,
                message: 'Select sub category is required'
            });
        }

        // Check if category exists
        const category = await Category.findByPk(finalCategoryId);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Main category not found'
            });
        }


        const getsubcategory = await SubCategory.findOne({
            where: {
                id: subcategoryId,
                category_id: finalCategoryId
            }
        });

        if (!getsubcategory) {
            return res.status(400).json({
                success: false,
                message: 'Subcategory does not belong to this category'
            });
        }

        // Generate slug
        const slug = generateSlug(name);

        // Check if slug already exists
        const existingSubCategoryChild = await SubCategoryChild.findOne({
            where: { subcategories_slug: slug }
        });
        if (existingSubCategoryChild) {
            return res.status(400).json({
                success: false,
                message: 'Subcategory child with this slug already exists in this subcategory',
            });
        }

        // Create sub category
        const subCategory = await SubCategoryChild.create({
            subcategories_name: name,
            subcategories_slug: slug,
            subcategories_priority: parseInt(priority),
            is_active: finalIsActive ? 1 : 0,
            category_id: parseInt(finalCategoryId),
            sub_categories_id: parseInt(subcategoryId),
            meta_title: metaTitle,
            meta_description: metaDescription,
            meta_keywords: metaKeywords
        });



        res.status(201).json({
            success: true,
            message: 'SubCategory Child has been created successfully',
            data: subCategory
        });
    } catch (error) {
        console.error('SubCategory Child error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create sub category',
            error: error.message,
            stack: error.stack
        });
    }
};

// Update sub category child
exports.updateSubCategoryChild = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            priority,
            isActive,
            is_active,
            subCategoryId,
            sub_category_id,
            metaTitle,
            metaDescription,
            metaKeywords
        } = req.body;

        // Use subCategoryId or sub_category_id, whichever is provided
        const finalSubCategoryId = subCategoryId || sub_category_id;

        // Use isActive or is_active, whichever is provided
        const finalIsActive = isActive !== undefined ? isActive : is_active;

        // Find child sub category
        const childSubCategory = await SubCategoryChild.findByPk(id);
        if (!childSubCategory) {
            return res.status(404).json({
                success: false,
                message: 'Child sub category not found'
            });
        }

        // Check if new parent sub category exists (if changing)
        if (finalSubCategoryId && finalSubCategoryId !== childSubCategory.sub_category_id) {
            const parentSubCategory = await SubCategory.findByPk(finalSubCategoryId);
            if (!parentSubCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent sub category not found'
                });
            }
        }

        // Generate new slug if name changed
        let slug = childSubCategory.slug;
        if (name && name !== childSubCategory.name) {
            slug = generateSlug(name);

            // Check if new slug exists
            const existingChild = await SubCategoryChild.findOne({
                where: { slug, id: { [Op.ne]: id } }
            });
            if (existingChild) {
                return res.status(400).json({
                    success: false,
                    message: 'Child sub category with this name already exists'
                });
            }
        }

        // Update child sub category
        await childSubCategory.update({
            name: name || childSubCategory.name,
            slug,
            priority: priority !== undefined ? parseInt(priority) : childSubCategory.priority,
            is_active: finalIsActive !== undefined ? Boolean(finalIsActive) : childSubCategory.is_active,
            sub_category_id: finalSubCategoryId !== undefined ? parseInt(finalSubCategoryId) : childSubCategory.sub_category_id,
            meta_title: metaTitle !== undefined ? metaTitle : childSubCategory.meta_title,
            meta_description: metaDescription !== undefined ? metaDescription : childSubCategory.meta_description,
            meta_keywords: metaKeywords !== undefined ? metaKeywords : childSubCategory.meta_keywords
        });

        res.json({
            success: true,
            message: 'Child sub category updated successfully',
            data: childSubCategory
        });
    } catch (error) {
        console.error('Update child sub category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update child sub category',
            error: error.message
        });
    }
};

exports.deleteSubCategoryChild = async (req, res) => {
    try {
        const { id } = req.params;

        const childSubCategory = await SubCategoryChild.findByPk(id);
        if (!childSubCategory) {
            return res.status(404).json({
                success: false,
                message: 'Child sub category not found'
            });
        }

        // Optional: check if child sub category has products
        // Implement your check here if needed

        await childSubCategory.destroy();

        res.json({
            success: true,
            message: 'Child sub category deleted successfully'
        });
    } catch (error) {
        console.error('Delete child sub category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete child sub category',
            error: error.message
        });
    }
};

// Toggle child sub category status
exports.toggleSubCategoryChildStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const childSubCategory = await SubCategoryChild.findByPk(id);
        if (!childSubCategory) {
            return res.status(404).json({
                success: false,
                message: 'Child sub category not found'
            });
        }

        const newValue = !childSubCategory.is_active;
        await childSubCategory.update({ is_active: newValue });

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: { isActive: newValue }
        });
    } catch (error) {
        console.error('Toggle child sub category status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle child sub category status',
            error: error.message
        });
    }
};

// Export child sub categories
exports.exportSubCategoryChildren = async (req, res) => {
    try {
        const childSubCategories = await SubCategoryChild.findAll({
            order: [['priority', 'ASC'], ['createdAt', 'DESC']]
        });

        const exportData = childSubCategories.map(child => ({
            ID: child.id,
            Name: child.name,
            Slug: child.slug,
            Priority: child.priority,
            Status: child.is_active ? 'Active' : 'Inactive',
            'Parent Sub Category ID': child.sub_category_id,
            'Created At': child.createdAt.toISOString().split('T')[0]
        }));

        res.json({
            success: true,
            data: exportData
        });
    } catch (error) {
        console.error('Export child sub categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export child sub categories',
            error: error.message
        });
    }
};
