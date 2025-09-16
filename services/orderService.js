const db = require('../models');
const { AppError } = require('../middleware/errorHandler');

class OrderService {

    /**
     * Creates one or more orders from a cart, grouping them by store.
     * This is the primary function for placing an order.
     */
    async createOrder(orderData, user) {
        const t = await db.sequelize.transaction();
        try {
            const { items, shipping_address, billing_address, paymentMethod, notes, discount_amount } = orderData;
            const userId = user.id;

            // --- 1. Validate Input ---
            if (!items || !Array.isArray(items) || items.length === 0) {
                throw new AppError('Order must contain at least one item.', 400);
            }
            if (!shipping_address || !shipping_address.street) {
                throw new AppError('A valid shipping address object is required.', 400);
            }
            if (!paymentMethod) {
                throw new AppError('A payment method (e.g., "COD" or "Razorpay") is required.', 400);
            }

            // --- 2. Group Items by Store ID ---
            const ordersByStore = items.reduce((acc, item) => {
                const storeId = item.store_id;
                if (!storeId) throw new AppError(`Product ID ${item.product_id} is missing a required store_id.`, 400);
                if (!acc[storeId]) acc[storeId] = [];
                acc[storeId].push(item);
                return acc;
            }, {});

            // --- 3. Create an Order for Each Store ---
            const createdOrders = [];
            for (const storeId in ordersByStore) {
                const storeItems = ordersByStore[storeId];
                let subtotal = 0;

                // --- 4. Calculate Subtotal and Validate Stock ---
                for (const item of storeItems) {
                    const product = await db.Product.findByPk(item.product_id, { transaction: t });
                    if (!product) throw new AppError(`Product with ID ${item.product_id} is not available.`, 400);
                    if (product.quantity < item.quantity) throw new AppError(`Insufficient stock for product "${product.name}".`, 400);
                    
                    // Always use the price from the database for security and accuracy.
                    subtotal += product.selling_price * item.quantity;
                }

                // --- 5. Calculate Final Totals ---
                const taxAmount = subtotal * 0.18; // Example: 18% tax
                const shippingAmount = 50.00;      // Example: Flat shipping fee
                const totalAmount = subtotal + taxAmount + shippingAmount - (discount_amount || 0);

                // --- 6. Create the Order Record ---
                // For COD, the order is confirmed immediately. For others, it's pending payment.
                const orderStatus = paymentMethod.toUpperCase() === 'COD' ? 'confirmed' : 'pending';

                const order = await db.Order.create({
                    orderNumber: this._generateOrderNumber(),
                    customerId: userId,
                    storeId: storeId,
                    shippingAddress: shipping_address,
                    billingAddress: billing_address || shipping_address,
                    paymentMethod: paymentMethod,
                    orderType: 'customer',
                    subtotal,
                    taxAmount,
                    shippingAmount,
                    discountAmount: discount_amount || 0,
                    totalAmount,
                    status: orderStatus, // Use the dynamically set status
                    paymentStatus: 'pending', // Payment is always pending until collected/verified
                    notes: notes,
                }, { transaction: t });

                // --- 7. Create Order Items and Update Stock ---
                for (const item of storeItems) {
                    const product = await db.Product.findByPk(item.product_id, { transaction: t });
                    await db.OrderItem.create({
                        orderId: order.id,
                        productId: item.product_id,
                        storeId: storeId,
                        productName: product.name,
                        quantity: item.quantity,
                        unitPrice: product.selling_price, // Always use the secure price from the database
                        totalPrice: product.selling_price * item.quantity
                    }, { transaction: t });

                    // Decrement stock
                    await product.update({ quantity: product.quantity - item.quantity }, { transaction: t });
                }
                createdOrders.push(order);
            }

            await t.commit();
            return createdOrders;
        } catch (error) {
            await t.rollback();
            console.error("CREATE ORDER SERVER ERROR:", error); 
            throw new AppError('An internal server error occurred while creating the order.', 500);
        }
    }

    /**
     * Fetches all orders for the currently authenticated user.
     */
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

    /**
     * Fetches a single order by its ID, ensuring it belongs to the user.
     */
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

    /**
     * Allows a user to cancel their own order.
     */
    async cancelOrder(orderId, user) {
        try {
            const order = await db.Order.findOne({ where: { id: orderId, customerId: user.id } });
            if (!order) {
                throw new AppError("Order not found or you do not have permission to cancel it.", 404);
            }

            const cancellableStatuses = ['pending', 'confirmed'];
            if (!cancellableStatuses.includes(order.status)) {
                throw new AppError(`This order cannot be cancelled as its status is '${order.status}'.`, 400);
            }

            return this.updateOrderStatus(orderId, 'cancelled');
        } catch (error) {
            console.error("Cancel Order Service Error:", error);
            if (error instanceof AppError) throw error;
            throw new AppError("Failed to cancel the order.", 500);
        }
    }

    /**
     * Updates the status of an order and handles related logic.
     */
    async updateOrderStatus(orderId, newStatus) {
        const t = await db.sequelize.transaction();
        try {
            const order = await db.Order.findByPk(orderId, { transaction: t });
            if (!order) throw new AppError('Order not found.', 404);

            const oldStatus = order.status;
            
            if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
                const items = await db.OrderItem.findAll({ where: { orderId: order.id }, transaction: t });
                for (const item of items) {
                    await db.Product.increment('quantity', {
                        by: item.quantity,
                        where: { id: item.productId },
                        transaction: t
                    });
                }
                
                if (order.paymentStatus === 'paid') {
                    order.paymentStatus = 'refunded';
                    // **CALL PAYMENT SERVICE FOR REFUND HERE**
                    // Example: await PaymentService.processRefund(order.transactionId);
                }
            }

            order.status = newStatus;
            await order.save({ transaction: t });
            await t.commit();
            return order;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Internal helper to generate a unique order number.
     * @private
     */
    _generateOrderNumber() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 6).toUpperCase();
        return `ORD-${timestamp}-${random}`;
    }
}

module.exports = new OrderService();