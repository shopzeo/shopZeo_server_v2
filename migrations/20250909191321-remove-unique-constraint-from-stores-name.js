'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * The name of the constraint might be different in your database.
     * 'unique_store_name' is based on your error log.
     * If this fails, you may need to check your database schema for the exact constraint name.
     */
    await queryInterface.removeConstraint('stores', 'unique_store_name');
  },

  async down (queryInterface, Sequelize) {
    /**
     * The `down` function is for undoing the migration.
     * This will add the unique constraint back if you ever need to revert.
     */
    await queryInterface.addConstraint('stores', {
      fields: ['name'],
      type: 'unique',
      name: 'unique_store_name'
    });
  }
};