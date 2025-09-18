const setupAssociations = (models) => {
  const {
    User, Store, Product, Category, SubCategory, Brand, Attribute, AttributeValue,
    ProductVariant, ProductCategory, ProductBrand, ProductAttribute, ProductMedia,
    Stock, Media, Order, OrderItem, Address, Shipment, Payment, RefundRequest,
    Wallet, Transaction, Ticket, Message, Banner, Coupon, Offer, Announcement,
    Notification, Page, BlogPost, Review, Like, Subscriber, Settings, AuditLog
  } = models;

  // --- ALL YOUR EXISTING ASSOCIATIONS ARE PRESERVED BELOW ---

  User.hasMany(Store, { foreignKey: 'owner_id', as: 'stores' });
  User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });
  User.hasMany(Wallet, { foreignKey: 'userId', as: 'wallets' });
  User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
  User.hasMany(RefundRequest, { foreignKey: 'customerId', as: 'refundRequests' });
  User.hasMany(Ticket, { foreignKey: 'customerId', as: 'tickets' });
  User.hasMany(Ticket, { foreignKey: 'assignedTo', as: 'assignedTickets' });
  User.hasMany(Message, { foreignKey: 'senderId', as: 'messages' });
  User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
  User.hasMany(Review, { foreignKey: 'customerId', as: 'reviews' });
  User.hasMany(Like, { foreignKey: 'userId', as: 'likes' });
  User.hasMany(BlogPost, { foreignKey: 'authorId', as: 'blogPosts' });
  User.hasMany(Coupon, { foreignKey: 'createdBy', as: 'coupons' });
  User.hasMany(Offer, { foreignKey: 'createdBy', as: 'offers' });
  User.hasMany(Announcement, { foreignKey: 'createdBy', as: 'announcements' });
  User.hasMany(Page, { foreignKey: 'createdBy', as: 'pages' });
  User.hasMany(Page, { foreignKey: 'publishedBy', as: 'publishedPages' });
  User.hasMany(Settings, { foreignKey: 'updatedBy', as: 'settingsUpdates' });
  User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });

  Store.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
  Store.hasMany(Product, { foreignKey: 'store_id', as: 'products' });
  Store.hasMany(Stock, { foreignKey: 'storeId', as: 'inventory' });
  Store.hasMany(Ticket, { foreignKey: 'storeId', as: 'tickets' });

  Product.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
  Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
  Product.belongsTo(SubCategory, { foreignKey: 'sub_category_id', as: 'subCategory' });
  Product.hasMany(ProductVariant, { foreignKey: 'productId', as: 'variants' });
  Product.hasMany(ProductCategory, { foreignKey: 'productId', as: 'productCategories' });
  Product.hasMany(ProductBrand, { foreignKey: 'productId', as: 'productBrands' });
  Product.hasMany(ProductAttribute, { foreignKey: 'productId', as: 'productAttributes' });
  Product.hasMany(ProductMedia, { foreignKey: 'product_id', as: 'productMedia' });
  Product.hasMany(Stock, { foreignKey: 'productId', as: 'stock' });
  Product.hasMany(Review, { foreignKey: 'productId', as: 'reviews' });
  Product.hasMany(Like, { foreignKey: 'likeableId', constraints: false, scope: { likeableType: 'product' } });

  Category.hasMany(ProductCategory, { foreignKey: 'categoryId', as: 'productCategories' });
  Category.belongsToMany(Product, { through: ProductCategory, as: 'products' });
  Category.hasMany(SubCategory, { as: 'subCategories', foreignKey: 'category_id' }); // Corrected foreign key from DB schema
  Category.hasMany(Product, { foreignKey: 'category_id', as: 'categoryProducts' });
  
  SubCategory.belongsTo(Category, { as: 'category', foreignKey: 'category_id' });
  SubCategory.hasMany(Product, { foreignKey: 'sub_category_id', as: 'subCategoryProducts' });

  Brand.hasMany(ProductBrand, { foreignKey: 'brandId', as: 'productBrands' });
  Brand.belongsToMany(Product, { through: ProductBrand, as: 'brandProducts' });
  
  // (All other existing associations are preserved...)
  Attribute.hasMany(AttributeValue, { foreignKey: 'attributeId', as: 'values' });
  Attribute.hasMany(ProductAttribute, { foreignKey: 'attributeId', as: 'productAttributes' });
  AttributeValue.belongsTo(Attribute, { foreignKey: 'attributeId', as: 'attribute' });
  AttributeValue.hasMany(ProductAttribute, { foreignKey: 'attributeValueId', as: 'productAttributes' });
  ProductVariant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  ProductVariant.hasMany(Stock, { foreignKey: 'variantId', as: 'stock' });
  ProductVariant.hasMany(OrderItem, { foreignKey: 'variantId', as: 'orderItems' });
  ProductCategory.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  ProductCategory.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
  ProductBrand.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  ProductBrand.belongsTo(Brand, { foreignKey: 'brandId', as: 'brand' });
  ProductAttribute.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  ProductAttribute.belongsTo(Attribute, { foreignKey: 'attributeId', as: 'attribute' });
  ProductAttribute.belongsTo(AttributeValue, { foreignKey: 'attributeValueId', as: 'attributeValue' });
  ProductMedia.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  Stock.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  Stock.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });
  Stock.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

  // --- NEWLY ADDED & CORRECTED ORDER ASSOCIATIONS ---
  // Using foreign keys from your shopzeo_db.sql file
  
  Order.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });
  User.hasMany(Order, { foreignKey: 'customer_id' });

  Order.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });
  Store.hasMany(Order, { foreignKey: 'store_id' });

  Order.belongsTo(User, { foreignKey: 'delivery_man_id', as: 'deliveryMan' });
  User.hasMany(Order, { foreignKey: 'delivery_man_id' });

  Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' }); // This alias is critical for the controller
  OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
  
  OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  Product.hasMany(OrderItem, { foreignKey: 'product_id' });
  // --- END OF NEW ASSOCIATIONS ---

  Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Shipment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  RefundRequest.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  RefundRequest.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
  RefundRequest.belongsTo(OrderItem, { foreignKey: 'orderItemId', as: 'orderItem' });
  Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });
  Transaction.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });
  Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Transaction.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  Transaction.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  Ticket.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
  Ticket.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedToUser' });
  Ticket.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  Ticket.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  Ticket.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
  Ticket.hasMany(Message, { foreignKey: 'ticketId', as: 'messages' });
  Message.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
  Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
  Coupon.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Offer.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Announcement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Page.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Page.belongsTo(User, { foreignKey: 'publishedBy', as: 'publisher' });
  BlogPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
  BlogPost.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
  BlogPost.hasMany(Like, { foreignKey: 'likeableId', constraints: false, scope: { likeableType: 'blog_post' } });
  Review.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  Review.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });
  Review.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  Review.hasMany(Like, { foreignKey: 'likeableId', constraints: false, scope: { likeableType: 'review' } });
  Like.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Settings.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
  AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
};

module.exports = setupAssociations;