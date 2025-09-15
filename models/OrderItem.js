const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  // THE FIX: Changed 'id' to a CHAR(36) to match your database schema.
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  // THE FIX: Added the 'field' property to map camelCase model names to snake_case database columns.
  orderId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'order_id',
    references: {
      model: 'orders', // Should be the table name as a string
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'products', // Should be the table name as a string
      key: 'id'
    }
  },
  storeId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'store_id',
    references: {
      model: 'stores', // Should be the table name as a string
      key: 'id'
    }
  },
  productName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'product_name'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'unit_price'
  },
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_price'
  },
  // THE FIX: Removed fields that do not exist in your `order_items` table:
  // - variantId
  // - productSku
  // - discountAmount
  // - taxAmount
  // - finalPrice
  // - weight
  // - attributes
  // - notes
  // - isReturned
  // - returnReason
  // - returnDate
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'order_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  // THE FIX: Removed hooks that were trying to calculate fields that do not exist in the database.
  // This calculation is now correctly handled in the `orderService.js` before saving.
  hooks: {}
});

module.exports = OrderItem;