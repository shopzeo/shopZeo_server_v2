'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('stores', 'logo', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('stores', 'banner', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('stores', 'logo');
    await queryInterface.removeColumn('stores', 'banner');
  }
};