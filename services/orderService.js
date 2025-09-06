const { sequelize } = require('../models');
const { Order, OrderItem, Product, Store, Address } = require('../models/associations');
const { AppError } = require('../middleware/errorHandler'); // Make sure you have this error handler

class OrderService {
  async createOrder(orderData, customerId) {
    const { items, shippingAddressId, billingAddressId, paymentMethod, notes } = orderData;

    if (!items || !items.length) {
      throw new AppError('Your cart is empty. Please add items to create an order.', 400);
    }

    const shippingAddress = await Address.findOne({ where: { id: shippingAddressId, userId: customerId } });
    if (!shippingAddress) {
      throw new AppError('The provided shipping address ID is invalid or does not belong to you.', 400);
    }
    const billingAddress = billingAddressId ? await Address.findOne({ where: { id: billingAddressId, userId: customerId } }) : shippingAddress;
    if (!billingAddress) {
        throw new AppError('The provided billing address ID is invalid or does not belong to you.', 400);
    }

    // Group items by store to create separate orders if needed
    const itemsByStore = {};
    for (const item of items) {
      const product = await Product.findByPk(item.productId, { include: [Store] });
      if (!product || !product.Store) {
        throw new AppError(`Product with ID ${item.productId} could not be found or is not associated with a store.`, 404);
      }
      const storeId = product.Store.id;
      if (!itemsByStore[storeId]) itemsByStore[storeId] = [];
      itemsByStore[storeId].push({ ...item, product });
    }

    // Use a transaction for data integrity
    return sequelize.transaction(async (transaction) => {
      const createdOrders = [];

      for (const storeId in itemsByStore) {
        const storeItems = itemsByStore[storeId];
        let subtotal = 0;
        storeItems.forEach(item => {
          subtotal += item.product.selling_price * item.quantity;
        });

        const taxAmount = subtotal * 0.18; // 18% tax
        const shippingAmount = 50.00; // Flat 50
        const totalAmount = subtotal + taxAmount + shippingAmount;

        // --- THE FIX ---
        // Using camelCase field names to match your Sequelize model definition
        const order = await Order.create({
          customerId: customerId,
          storeId: storeId,
          paymentMethod: paymentMethod,
          subtotal: subtotal,
          taxAmount: taxAmount,
          shippingAmount: shippingAmount,
          totalAmount: totalAmount,
          shippingAddress: shippingAddress.toJSON(),
          billingAddress: billingAddress.toJSON(),
          customerNotes: notes,
          currency: 'INR'
        }, { transaction });

        // Create associated order items
        for (const item of storeItems) {
          await OrderItem.create({
            orderId: order.id,
            productId: item.productId,
            storeId: storeId,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.product.selling_price,
            totalPrice: item.product.selling_price * item.quantity,
          }, { transaction });
        }
        
        createdOrders.push(order);
      }
      return createdOrders;
    });
  }
}

module.exports = new OrderService();