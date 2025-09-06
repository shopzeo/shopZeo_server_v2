const { Op, Transaction } = require('sequelize');
const { sequelize } = require('../config/database'); // Database instance import karna
const { 
  Order, 
  OrderItem, 
  Product, 
  Store, 
  User, 
  Address, 
  Wallet, 
  Transaction: WalletTransaction,
  Stock
} = require('../models/associations');
const { AppError } = require('../middleware/errorHandler');

class OrderService {
  /**
   * Ek naya order create karna. Agar cart mein multiple stores ke items hain,
   * to har store ke liye alag order banega.
   * @param {object} orderData - Order ka data (items, addresses, etc.)
   * @param {string} userId - Customer ka UUID
   * @returns {Promise<Array<Order>>} - Create kiye gaye orders ka array
   */
  async createOrder(orderData, userId) {
    const {
      items,
      billingAddressId,
      shippingAddressId,
      paymentMethod,
      notes,
      couponCode
    } = orderData;

    if (!items || items.length === 0) {
      throw new AppError('Order must contain at least one item', 400);
    }

    // Addresses ko validate karna
    const billingAddress = await Address.findByPk(billingAddressId);
    const shippingAddress = await Address.findByPk(shippingAddressId);
    
    if (!billingAddress || billingAddress.userId !== userId) {
      throw new AppError('Invalid billing address', 400);
    }
    
    if (!shippingAddress || shippingAddress.userId !== userId) {
      throw new AppError('Invalid shipping address', 400);
    }

    // Items ko storeId ke hisaab se group karna
    const itemsByStore = {};
    for (const item of items) {
      const product = await Product.findByPk(item.productId, { include: [{ model: Store, as: 'store' }] });

      if (!product || !product.isActive || !product.isApproved) {
        throw new AppError(`Product with ID ${item.productId} is not available`, 400);
      }

      const storeId = product.storeId;
      if (!itemsByStore[storeId]) {
        itemsByStore[storeId] = [];
      }
      itemsByStore[storeId].push({ ...item, product });
    }

    const createdOrders = [];
    const transaction = await sequelize.transaction();

    try {
      for (const storeId in itemsByStore) {
        const storeItems = itemsByStore[storeId];
        let subtotal = 0;
        let totalTax = 0;
        let totalShipping = 0;

        // Har store ke order ke liye totals calculate karna
        for (const item of storeItems) {
          const stock = await Stock.findOne({ where: { productId: item.productId, storeId: storeId } });
          if (!stock || stock.availableQuantity < item.quantity) {
            throw new AppError(`Insufficient stock for product ${item.product.name}`, 400);
          }
          const itemSubtotal = item.product.price * item.quantity;
          subtotal += itemSubtotal;
          totalTax += this.calculateTax(itemSubtotal, storeId);
          totalShipping += this.calculateShipping(item.product, item.quantity);
        }

        // Coupon (agar hai to) - Is logic ko har order ke liye adjust karna pad sakta hai
        const totalDiscount = couponCode ? await this.applyCoupon(couponCode, subtotal, userId) : 0;
        const totalAmount = subtotal + totalTax + totalShipping - totalDiscount;

        // Har store ke liye ek naya order create karna
        const order = await Order.create({
          orderNumber: this.generateOrderNumber(),
          customerId: userId,
          storeId: storeId,
          billingAddressId,
          shippingAddressId,
          paymentMethod,
          subtotal,
          taxAmount: totalTax,
          shippingAmount: totalShipping,
          discountAmount: totalDiscount,
          totalAmount: totalAmount,
          status: 'pending',
          paymentStatus: 'pending',
          shippingAddress: shippingAddress.toJSON(),
          billingAddress: billingAddress.toJSON(),
          notes,
          currency: 'INR', // Example currency
        }, { transaction });

        // Order items create karna aur stock update karna
        for (const item of storeItems) {
          await OrderItem.create({
            orderId: order.id,
            productId: item.productId,
            storeId: storeId,
            productName: item.product.name,
            productSku: item.product.sku,
            quantity: item.quantity,
            unitPrice: item.product.price,
            totalPrice: item.product.price * item.quantity,
          }, { transaction });

          const stock = await Stock.findOne({ where: { productId: item.productId, storeId: storeId } });
          await stock.update({
            availableQuantity: stock.availableQuantity - item.quantity,
          }, { transaction });

          await item.product.increment('soldCount', { by: item.quantity, transaction });
        }
        
        createdOrders.push(order);
      }

      await transaction.commit();
      return createdOrders;

    } catch (error) {
      await transaction.rollback();
      throw error; // Error ko controller tak pahunchana
    }
  }

  // Baaki service functions (processPayment, updateOrderStatus, etc.) waise hi rahenge...
  // ... (Your existing service methods from the previous file)
  // ...
  // ...

  // Helper functions
  calculateTax(subtotal, storeId) {
    const taxRate = 0.08; // 8% tax rate
    return subtotal * taxRate;
  }

  calculateShipping(product, quantity) {
    const baseShipping = 5.00;
    const weightShipping = (product.weight || 0) * quantity * 0.5;
    return baseShipping + weightShipping;
  }

  async applyCoupon(couponCode, subtotal, userId) {
    return subtotal * 0.1; // 10% discount
  }

  generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `SZ-${timestamp}-${random}`;
  }
}

module.exports = new OrderService();

