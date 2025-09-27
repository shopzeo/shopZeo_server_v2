const { Sequelize } = require("sequelize");
const { sequelize } = require("../config/database");

// Import all models
const User = require("./User");
const Store = require("./Store");
const Product = require("./Product");
const Category = require("./Category");
const SubCategory = require("./SubCategory");
const Brand = require("./Brand");
const Attribute = require("./Attribute");
const AttributeValue = require("./AttributeValue");
const ProductVariant = require("./ProductVariant");
const ProductCategory = require("./ProductCategory");
const ProductBrand = require("./ProductBrand");
const ProductAttribute = require("./ProductAttribute");
const ProductMedia = require("./ProductMedia");
const Stock = require("./Stock");
const Media = require("./Media");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Address = require("./Address");
const Shipment = require("./Shipment");
const Payment = require("./Payment");
const RefundRequest = require("./RefundRequest");
const Wallet = require("./Wallet");
const Transaction = require("./Transaction");
const Ticket = require("./Ticket");
const Message = require("./Message");
const Banner = require("./Banner");
const Coupon = require("./Coupon");
const Offer = require("./Offer");
const Announcement = require("./Announcement");
const Notification = require("./Notification");
const Page = require("./Page");
const BlogPost = require("./BlogPost");
const Review = require("./Review");
const Like = require("./Like");
const Subscriber = require("./Subscriber");
const Settings = require("./Settings");
const AuditLog = require("./AuditLog");
const OtpVerification = require("./OtpVerification");

const WithdrawHistory = require("./WithdrawHistory");

const SubcategoryChild = require('./SubcategoryChild');



// Associations define karo

// Export sab models + sequelize
module.exports = {
  sequelize,
  Sequelize,
  User,
  Store,
  Product,
  Order,
};

module.exports = {
  sequelize,
  User,
  Store,
  Product,
  Category,
  SubCategory,
  Brand,
  Attribute,
  AttributeValue,
  ProductVariant,
  ProductCategory,
  ProductBrand,
  ProductAttribute,
  ProductMedia,
  Stock,
  Media,
  Order,
  OrderItem,
  Address,
  Shipment,
  Payment,
  RefundRequest,
  Wallet,
  Transaction,
  Ticket,
  Message,
  Banner,
  Coupon,
  Offer,
  Announcement,
  Notification,
  Page,
  BlogPost,
  Review,
  Like,
  Subscriber,
  Settings,
  AuditLog,
  OtpVerification,

  WithdrawHistory,

  SubcategoryChild,

};

// // SubCategory -> SubcategoryChild
// SubCategory.hasMany(SubcategoryChild, { as: 'children', foreignKey: 'sub_categories_id' });
// SubcategoryChild.belongsTo(SubCategory, { as: 'parentSubCategory', foreignKey: 'sub_category_id' });

// // Product -> SubCategory
// Product.belongsTo(SubCategory, { as: 'ProductsubCategory', foreignKey: 'sub_category_id' });
// SubCategory.hasMany(Product, { as: 'products', foreignKey: 'sub_category_id' });

// SubCategory -> SubcategoryChild
// SubCategory.hasMany(SubcategoryChild, {
//   as: 'children',          // alias for easy include
//   foreignKey: 'sub_category_id' // make sure this matches the actual column name in SubcategoryChild table
// });

// SubcategoryChild.belongsTo(SubCategory, {
//   as: 'parentSubCategory',
//   foreignKey: 'sub_category_id'
// })


