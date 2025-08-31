'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing fields to users table
    await queryInterface.addColumn('users', 'default_shipping_address', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'default_billing_address', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'preferences', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {}
    });

    await queryInterface.addColumn('users', 'reset_token', {
      type: Sequelize.STRING(500),
      allowNull: true
    });

    await queryInterface.addColumn('users', 'reset_token_expires', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Also fix the id field to be UUID instead of INTEGER
    await queryInterface.changeColumn('users', 'id', {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added columns
    await queryInterface.removeColumn('users', 'default_shipping_address');
    await queryInterface.removeColumn('users', 'default_billing_address');
    await queryInterface.removeColumn('users', 'preferences');
    await queryInterface.removeColumn('users', 'reset_token');
    await queryInterface.removeColumn('users', 'reset_token_expires');
    
    // Revert id field to INTEGER
    await queryInterface.changeColumn('users', 'id', {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    });
  }
};

