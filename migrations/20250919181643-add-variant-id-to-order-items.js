module.exports = {
up: async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('order_items', 'variant_id', {
    type: Sequelize.STRING,
    allowNull: true,
  });
},
down: async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('order_items', 'variant_id');
}
};
