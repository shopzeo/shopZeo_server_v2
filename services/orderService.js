const { Op } = require('sequelize');
const db = require('../models');
const { AppError } = require('../middleware/errorHandler');

class OrderService {
  /**
   * Creates one or more orders based on the items in the cart.
   * This function now only handles the creation of the order record in the database.
   * Payment processing is handled by the Payment service.
   * @param {object} orderData - The data for the order.
   * @param {object} user - The authenticated user placing the order.
   */
  async createOrder(orderData, user) {
    const t = await db.sequelize.transaction();
    try {
      const { items, shippingAddress, billingAddress, paymentMethod, notes, discountAmount } = orderData;
      const customerId = user.id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Order must contain at least one item.', 400);
      }
      if (!shippingAddress || !shippingAddress.street) {
        throw new AppError('A valid shipping address is required.', 400);
      }

      // Group items by store to create separate orders if necessary
      const ordersByStore = items.reduce((acc, item) => {
        const storeId = item.store_id;
        if (!storeId) throw new AppError(`Product ID ${item.product_id} is missing a store_id.`, 400);
        if (!acc[storeId]) acc[storeId] = [];
        acc[storeId].push(item);
        return acc;
      }, {});

      const createdOrders = [];
      for (const storeId in ordersByStore) {
        const storeItems = ordersByStore[storeId];
        let subtotal = 0;

        // Verify products and calculate subtotal
        for (const item of storeItems) {
          const product = await db.Product.findByPk(item.product_id, { transaction: t });
          if (!product) throw new AppError(`Product with ID ${item.product_id} not found.`, 404);
          if (product.quantity < item.quantity) throw new AppError(`Insufficient stock for "${product.name}".`, 400);
          subtotal += (item.price || product.selling_price) * item.quantity;
        }

        // Calculate totals
        const taxAmount = this.calculateTax(subtotal, storeId);
        const shippingAmount = 50.00; // Example flat shipping rate
        const totalAmount = subtotal + taxAmount + shippingAmount - (discountAmount || 0);

        const order = await db.Order.create({
          orderNumber: this.generateOrderNumber(),
          customerId,
          storeId,
          shippingAddress: JSON.stringify(shippingAddress),
          billingAddress: JSON.stringify(billingAddress || shippingAddress),
          paymentMethod: paymentMethod || 'COD',
          paymentStatus: 'pending', // Payment is always pending initially
          status: 'pending', // Order status is pending
          subtotal,
          taxAmount,
          shippingAmount,
          discountAmount: discountAmount || 0,
          totalAmount,
          notes,
        }, { transaction: t });

        // Create order items and decrease product stock
        for (const item of storeItems) {
          const product = await db.Product.findByPk(item.product_id, { transaction: t });
          await db.OrderItem.create({
            orderId: order.id,
            productId: item.product_id,
            storeId,
            productName: product.name,
            quantity: item.quantity,
            unitPrice: (item.price || product.selling_price),
            totalPrice: (item.price || product.selling_price) * item.quantity
          }, { transaction: t });
          await product.decrement('quantity', { by: item.quantity, transaction: t });
        }
        createdOrders.push(order);
      }

      await t.commit();
      return createdOrders;
    } catch (error) {
      await t.rollback();
      throw error; // Re-throw the error to be caught by the controller
    }
  }

  // GET ALL ORDERS FOR A USER
  async getMyOrders(user) {
    try {
      const orders = await db.Order.findAll({
        where: { customerId: user.id },
        include: [{ 
            model: db.OrderItem, 
            as: 'items', 
            include: [{ model: db.Product, as: 'product' }] 
        }],
        order: [['createdAt', 'DESC']],
      });
      return orders;
    } catch (error) {
      console.error("Get My Orders Service Error:", error);
      throw new AppError("Failed to retrieve your orders.", 500);
    }
  }

  // GET A SINGLE ORDER BY ID
  async getOrderById(orderId, user) {
    try {
      const order = await db.Order.findOne({
        where: { id: orderId, customerId: user.id },
        include: [{ 
            model: db.OrderItem, 
            as: 'items', 
            include: [{ model: db.Product, as: 'product' }] 
        }]
      });

      if (!order) {
        throw new AppError("Order not found or you do not have permission to view it.", 404);
      }
      return order;
    } catch (error) {
      console.error("Get Order By ID Service Error:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to retrieve the order.", 500);
    }
  }

  // CANCEL AN ORDER
  async cancelOrder(orderId, user) {
    const t = await db.sequelize.transaction();
    try {
      const order = await db.Order.findOne({
        where: { id: orderId, customerId: user.id },
        include: [{ model: db.OrderItem, as: 'items' }],
        transaction: t
      });

      if (!order) {
        throw new AppError("Order not found or you do not have permission to cancel it.", 404);
      }

      const cancellableStatuses = ['pending', 'confirmed', 'packaging'];
      if (!cancellableStatuses.includes(order.status)) {
        throw new AppError(`Order cannot be cancelled. Current status: ${order.status}`, 400);
      }

      // Restore stock for each item
      for (const item of order.items) {
        await db.Product.increment({ quantity: item.quantity }, { where: { id: item.productId }, transaction: t });
      }

      // Update order status
      order.status = 'cancelled';
      if (order.paymentStatus === 'paid') {
        order.paymentStatus = 'refunded';
      }
      await order.save({ transaction: t });

      await t.commit();
      return { success: true, message: "Order has been successfully cancelled." };
    } catch (error) {
      await t.rollback();
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to cancel the order due to an internal error.", 500);
    }
  }

  // --- HELPER AND OTHER ORDER-RELATED FUNCTIONS ---
  
  generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }
  
  calculateTax(subtotal, storeId) {
    // In a real app, this would fetch the tax rate for the store's region
    return subtotal * 0.18; // Example 18% tax
  }

  // ... (any other purely order-related functions from your original file can remain here)
}

module.exports = new OrderService();