const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const OrderItem = require('./OrderItem');
const User = require('./User');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.CHAR(36), // Matching CHAR(36) from your DB
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  // THE FIX: Added 'field' to map the model's camelCase to the DB's snake_case
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'order_number'
  },
  customerId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'customer_id'
  },
  storeId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'store_id'
  },
  deliveryManId: {
    type: DataTypes.CHAR(36),
    allowNull: true,
    field: 'delivery_man_id'
  },
  status: {
    type: DataTypes.ENUM(
      'pending', 'confirmed', 'packaging', 'out_for_delivery',
      'delivered', 'returned', 'failed', 'cancelled'
    ),
    allowNull: false,
    defaultValue: 'pending'
  },
  orderType: {
    type: DataTypes.ENUM('inhouse', 'vendor'),
    allowNull: false,
    defaultValue: 'vendor',
    field: 'order_type'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status'
  },
  paymentMethod: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_method'
  },
  paymentGateway: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_gateway'
  },
  transactionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'transaction_id'
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'tax_amount'
  },
  shippingAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'shipping_amount'
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'discount_amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'total_amount'
  },
  commissionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'commission_amount'
  },
  vendorAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'vendor_amount'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  exchangeRate: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: false,
    defaultValue: 1.000000,
    field: 'exchange_rate'
  },
  shippingAddress: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'shipping_address'
  },
  billingAddress: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'billing_address'
  },
  shippingMethod: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'shipping_method'
  },
  trackingNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'tracking_number'
  },
  estimatedDelivery: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'estimated_delivery'
  },
  actualDelivery: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'actual_delivery'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  customerNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'customer_notes'
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_deleted'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'orders',
  // THE FIX: Explicitly set timestamps to true and define the column names.
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: (order) => {
      if (!order.orderNumber) {
        order.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      }
      if (!order.billingAddress) {
        order.billingAddress = order.shippingAddress;
      }
    },
    beforeUpdate: (order) => {
      if (order.changed('status') && order.status === 'delivered' && !order.actualDelivery) {
        order.actualDelivery = new Date();
      }
    }
  }
});

// --- ALL YOUR EXISTING INSTANCE AND CLASS METHODS ARE PRESERVED UNCHANGED ---

// Instance methods
Order.prototype.calculateTotals = function () {
  this.totalAmount = this.subtotal + this.taxAmount + this.shippingAmount - this.discountAmount;
  this.vendorAmount = this.totalAmount - this.commissionAmount;
  return this;
};
Order.prototype.canTransitionTo = function (newStatus) {
  const validTransitions = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['packaging', 'cancelled'],
    packaging: ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered', 'failed'],
    delivered: ['returned'],
    failed: ['confirmed', 'cancelled'],
    returned: ['confirmed'],
    cancelled: []
  };
  return validTransitions[this.status]?.includes(newStatus) || false;
};
Order.prototype.getStatusColor = function () {
  const statusColors = {
    pending: 'yellow', confirmed: 'blue', packaging: 'purple',
    out_for_delivery: 'orange', delivered: 'green', returned: 'red',
    failed: 'red', cancelled: 'gray'
  };
  return statusColors[this.status] || 'gray';
};
Order.prototype.getStatusLabel = function () {
  const statusLabels = {
    pending: 'Pending', confirmed: 'Confirmed', packaging: 'Packaging',
    out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
    returned: 'Returned', failed: 'Failed to Deliver', cancelled: 'Cancelled'
  };
  return statusLabels[this.status] || this.status;
};
Order.prototype.isEditable = function () {
  return ['pending', 'confirmed', 'packaging'].includes(this.status);
};
Order.prototype.isCancellable = function () {
  return ['pending', 'confirmed', 'packaging'].includes(this.status);
};

// Class methods
Order.findByOrderNumber = function (orderNumber) {
  return this.findOne({ where: { orderNumber, isDeleted: false } });
};
Order.findByCustomer = function (customerId) {
  return this.findAll({ where: { customerId, isDeleted: false }, order: [['createdAt', 'DESC']] });
};
Order.findByStore = function (storeId) {
  return this.findAll({ where: { storeId, isDeleted: false }, order: [['createdAt', 'DESC']] });
};
Order.findByStatus = function (status) {
  return this.findAll({ where: { status, isDeleted: false }, order: [['createdAt', 'DESC']] });
};
Order.findByDeliveryMan = function (deliveryManId) {
  return this.findAll({ where: { deliveryManId, isDeleted: false }, order: [['createdAt', 'DESC']] });
};
Order.getStatusCounts = function () {
  return this.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    where: { isDeleted: false },
    group: ['status']
  });
};
Order.getRevenueStats = function (startDate, endDate) {
  return this.findAll({
    attributes: [
      [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
      [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
    ],
    where: {
      createdAt: { [sequelize.Op.between]: [startDate, endDate] },
      paymentStatus: 'paid',
      isDeleted: false
    },
    group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
    order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
  });
};

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'order_items' });

module.exports = Order;