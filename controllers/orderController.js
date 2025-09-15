// By requiring the central 'models' directory, we get the fully initialized db object
const db = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates new orders based on a multi-vendor cart.
 */
exports.createOrder = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const { items, shipping_address, billing_address } = req.body;
    const userId = req.user.id; // Use the authenticated user's ID for security

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are missing or invalid.' });
    }

    // This logic correctly groups items by store_id for a multi-vendor cart
    const ordersByStore = items.reduce((acc, item) => {
      if (!item.store_id) throw new Error(`Product ${item.product_id} is missing a store_id.`);
      if (!acc[item.store_id]) acc[item.store_id] = [];
      acc[item.store_id].push(item);
      return acc;
    }, {});

    const createdOrders = [];

    for (const storeId in ordersByStore) {
      const storeItems = ordersByStore[storeId];
      let subtotal = 0;

      for (const item of storeItems) {
        const product = await db.Product.findByPk(item.product_id, { transaction: t });
        if (!product) throw new Error(`Product with ID ${item.product_id} not found.`);
        if (product.quantity < item.quantity) throw new Error(`The product "${product.name}" is out of stock.`);
        subtotal += (item.price || product.selling_price) * item.quantity;
      }

      const taxAmount = subtotal * 0.18;
      const shippingAmount = 50.00;
      const totalAmount = subtotal + taxAmount + shippingAmount;

      const newOrder = await db.Order.create({
        id: uuidv4(),
        orderNumber: `ORD-${Date.now()}`, // Using camelCase to match your model
        customerId: userId,
        storeId: storeId,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'COD',
        subtotal,
        taxAmount: taxAmount,
        shippingAmount: shippingAmount,
        totalAmount: totalAmount,
        shippingAddress: JSON.stringify(shipping_address),
        billingAddress: JSON.stringify(billing_address || shipping_address),
      }, { transaction: t });

      for (const item of storeItems) {
        const product = await db.Product.findByPk(item.product_id, { transaction: t });
        await db.OrderItem.create({
          id: uuidv4(),
          orderId: newOrder.id,
          productId: item.product_id,
          storeId: storeId,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: (item.price || product.selling_price),
          totalPrice: (item.price || product.selling_price) * item.quantity,
        }, { transaction: t });

        product.quantity -= item.quantity;
        await product.save({ transaction: t });
      }
      createdOrders.push(newOrder);
    }

    await t.commit();
    res.status(201).json({ success: true, message: 'Your order(s) have been placed successfully!', orders: createdOrders });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message || 'An unexpected error occurred.' });
  }
};

/**
 * Retrieves all orders for the currently authenticated user.
 */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await db.Order.findAll({
      where: { customerId: req.user.id },
      include: [{
        model: db.OrderItem,
        as: 'items',
        include: [{ model: db.Product, as: 'product' }]
      }],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error("Fetching Orders Failed!", error);
    res.status(500).json({ success: false, message: 'Failed to retrieve your orders.' });
  }
};

/**
 * Retrieves a single order by its ID.
 */
exports.getOrderById = async (req, res) => {
  try {
    const order = await db.Order.findOne({
      where: {
        id: req.params.id,
        customerId: req.user.id
      },
      include: [{
        model: db.OrderItem,
        as: 'items',
        include: [{ model: db.Product, as: 'product' }]
      }]
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(`Fetching Order ${req.params.id} Failed!`, error);
    res.status(500).json({ success: false, message: 'Failed to retrieve the order.' });
  }
};

/**
 * Cancels an order and restores product stock.
 */
exports.cancelOrder = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const orderId = req.params.id;
        const userId = req.user.id;

        const order = await db.Order.findOne({
            where: { id: orderId, customerId: userId },
            include: [{ model: db.OrderItem, as: 'items' }],
            transaction: t
        });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found or you do not have permission to cancel it." });
        }

        const cancellableStatuses = ['pending', 'confirmed', 'packaging'];
        if (!cancellableStatuses.includes(order.status)) {
            return res.status(400).json({ success: false, message: `Order cannot be cancelled. Current status: ${order.status}` });
        }

        // Restore the stock for each item in the order
        for (const item of order.items) {
            await db.Product.increment(
                { quantity: item.quantity },
                { where: { id: item.productId }, transaction: t }
            );
        }

        // Update the order status
        order.status = 'cancelled';
        // If the order was paid, it should be refunded.
        if (order.paymentStatus === 'paid') {
            order.paymentStatus = 'refunded';
        }
        await order.save({ transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: "Order has been successfully cancelled.", data: order });
    } catch (error) {
        await t.rollback();
        console.error(`Cancelling Order ${req.params.id} Failed!`, error);
        res.status(500).json({ success: false, message: error.message || 'Failed to cancel the order.' });
    }
};