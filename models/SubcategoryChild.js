const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Category = require('./Category');
const SubCategory = require('./SubCategory');

const SubcategoriesChild = sequelize.define("SubcategoriesChild", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    subcategories_name: { type: DataTypes.TEXT, allowNull: false },
    subcategories_slug: { type: DataTypes.STRING(200), allowNull: false },
    subcategories_priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_active: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    sub_categories_id: { type: DataTypes.INTEGER, allowNull: false },
    meta_title: { type: DataTypes.TEXT, allowNull: true },
    meta_description: { type: DataTypes.TEXT, allowNull: true },
    meta_keywords: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    deleted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
    tableName: "subcategories_child",
    timestamps: false,
});

SubcategoriesChild.belongsTo(Category, { foreignKey: "category_id", as: "category" });
SubcategoriesChild.belongsTo(SubCategory, { foreignKey: "sub_categories_id", as: "subcategory" });

module.exports = SubcategoriesChild;
