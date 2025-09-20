const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    field: 'orderId', // Explicitly map to the DB column name
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  paymentNumber: {
    type: DataTypes.STRING(255), // VARCHAR(20) se 255 kar diya gaya hai
    allowNull: false,
    unique: true,
    field: 'paymentNumber' // Explicitly map
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR'
  },
  method: {
    type: DataTypes.ENUM('stripe', 'paypal', 'razorpay', 'cod', 'bank_transfer', 'wallet', 'other'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  gatewayTransactionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'gatewayTransactionId' // Explicitly map
  },
  gatewayResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'gatewayResponse' // Explicitly map
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'failureReason' // Explicitly map
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processedAt' // Explicitly map
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refundedAt' // Explicitly map
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'refundAmount' // Explicitly map
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'refundReason' // Explicitly map
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'isActive' // Explicitly map
  },
  createdAt: {
      type: DataTypes.DATE,
      field: 'createdAt'
  },
  updatedAt: {
      type: DataTypes.DATE,
      field: 'updatedAt'
  }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  hooks: {
    beforeCreate: (payment) => {
      if (!payment.paymentNumber) {
        payment.paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      }
    }
  },
  // indexes ko alag se define karne ki zaroorat nahi, model definition mein hi ho gaya hai
});

module.exports = Payment;