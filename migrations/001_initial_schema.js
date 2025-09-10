'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    // --- Yahaan se 'stores' aur 'categories' table banane wala code hata diya gaya hai ---
    // Kyunki inke liye alag se migration files (002 and 003) maujood hain.

    // Create Products table
    await queryInterface.createTable('products', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      store_id: { // store_id ko yahaan define karna zaroori hai
        type: Sequelize.UUID,
        references: {
          model: 'stores', // Yeh 'stores' table se link hoga
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      category_id: { // category_id ko bhi yahaan define karna zaroori hai
        type: Sequelize.INTEGER,
        references: {
          model: 'categories', // Yeh 'categories' table se link hoga
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      // ... baaki product columns ...
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    // --- Yahaan se 'stores' aur 'categories' table drop karne wala code hata diya gaya hai ---
    await queryInterface.dropTable('products');
  }
};

