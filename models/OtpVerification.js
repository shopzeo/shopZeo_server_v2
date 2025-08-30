const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OtpVerification = sequelize.define('OtpVerification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  otp: {
    type: DataTypes.STRING(6),
    allowNull: false,
    validate: {
      len: [6, 6],
      isNumeric: true
    }
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: true
    }
  },
  is_used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  tableName: 'otp_verifications',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['otp'] },
    { fields: ['expires_at'] },
    { fields: ['is_used'] },
    { fields: ['created_at'] },
    { 
      fields: ['user_id', 'otp', 'expires_at', 'is_used'],
      name: 'idx_otp_verifications_lookup'
    }
  ]
});

// Instance methods
OtpVerification.prototype.isExpired = function() {
  return new Date() > this.expires_at;
};

OtpVerification.prototype.isValid = function() {
  return !this.is_used && !this.isExpired();
};

// Class methods
OtpVerification.findValidOtp = function(userId, otp) {
  return this.findOne({
    where: {
      user_id: userId,
      otp: otp,
      is_used: false,
      expires_at: {
        [sequelize.Op.gt]: new Date()
      }
    }
  });
};

OtpVerification.findLatestOtp = function(userId) {
  return this.findOne({
    where: {
      user_id: userId,
      is_used: false,
      expires_at: {
        [sequelize.Op.gt]: new Date()
      }
    },
    order: [['created_at', 'DESC']]
  });
};

OtpVerification.cleanupExpiredOtps = function() {
  return this.destroy({
    where: {
      expires_at: {
        [sequelize.Op.lt]: new Date()
      }
    }
  });
};

module.exports = OtpVerification;
