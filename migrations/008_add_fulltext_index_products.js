'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add full text search index to products table
      await queryInterface.sequelize.query(`
        ALTER TABLE products 
        ADD FULLTEXT INDEX idx_products_fulltext (name, description, product_code, sku_id)
      `);
      
      console.log('✅ Full text search index added to products table');
    } catch (error) {
      console.error('❌ Error adding full text search index:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove full text search index
      await queryInterface.sequelize.query(`
        DROP INDEX idx_products_fulltext ON products
      `);
      
      console.log('✅ Full text search index removed from products table');
    } catch (error) {
      console.error('❌ Error removing full text search index:', error.message);
      throw error;
    }
  }
};
