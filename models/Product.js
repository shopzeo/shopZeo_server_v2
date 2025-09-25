const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.CHAR(36),
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  product_code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Product code (no longer unique)'
  },
  amazon_asin: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Amazon ASIN if applicable'
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  sku_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: false,   // Allow duplicate SKUs as requested
    comment: 'Stock Keeping Unit'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  selling_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  mrp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Maximum Retail Price'
  },
  cost_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Cost price for margin calculation'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  // Packaging dimensions
  packaging_length: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: 'Length in cm'
  },
  packaging_breadth: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: 'Breadth in cm'
  },
  packaging_height: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    comment: 'Height in cm'
  },
  packaging_weight: {
    type: DataTypes.DECIMAL(8, 3),
    allowNull: true,
    comment: 'Weight in kg'
  },
  // Tax and pricing
  gst_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'GST percentage'
  },
  // Images (up to 10)
  image_1: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_2: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_3: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_4: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_5: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_6: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_7: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_8: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_9: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_10: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  // Videos
  video_1: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  video_2: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  // Product attributes
  product_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  size_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  size: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  colour: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  return_exchange_condition: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  visibility: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Product visibility status'
  },
  size_chart: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Size chart image path'
  },
  pickup_point: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  hsn_code: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'HSN code for GST'
  },
  customisation_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  associated_pixel: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Custom attributes
  attr1_attribute_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attr2_attribute_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attr3_attribute_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attr4_attribute_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  attr5_attribute_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Collections
  collection_1: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  collection_2: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  collection_3: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Status and metadata
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_home_product: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  total_reviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_sold: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Foreign keys
  store_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'stores',
      key: 'id'
    }
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  sub_category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'sub_categories',
      key: 'id'
    }
  },
  subcatagory_child_id: {
    type: DataTypes.STRING,   // VARCHAR equivalent
    allowNull: true,          // can be null
  },

  brand_id: {
    type: DataTypes.STRING,   // VARCHAR equivalent
    allowNull: true,          // can be null
  },
  mapped_nested_subcategory: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // SEO fields
  meta_title: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  meta_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  meta_keywords: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  slug: {
    type: DataTypes.STRING(500),
    allowNull: true,
    unique: false, // <-- YEH BADLAV KIYA GAYA HAI
    comment: 'URL-friendly product name'
  }
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['store_id'] },
    { fields: ['category_id'] },
    { fields: ['sub_category_id'] },
    { fields: ['is_active'] },
    { fields: ['is_featured'] },
    { fields: ['rating'] },
    { fields: ['selling_price'] },
    { fields: ['name'] },
    { fields: ['hsn_code'] }
  ]
});

Product.associate = (models) => {
  Product.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
  Product.belongsTo(models.Category, { foreignKey: 'category_id', as: 'category' });
  Product.belongsTo(models.SubCategory, { foreignKey: 'sub_category_id', as: 'subCategory' });
  Product.hasMany(models.ProductMedia, { foreignKey: 'product_id', as: 'productMedia' });
};

module.exports = Product;
