const db = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Creates new orders based on a multi-vendor cart.
 * This function is now secure and dynamic.
 */
exports.createOrder = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        // --- DYNAMIC: Destructure all necessary fields from the request body ---
        const { items, shipping_address, billing_address, paymentMethod, notes, discount_amount } = req.body;
        const userId = req.user.id; // Use the authenticated user's ID for security

        // --- 1. Validate Input ---
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order items are missing or invalid.' });
        }
        if (!shipping_address || !shipping_address.street) {
            return res.status(400).json({ success: false, message: 'A valid shipping address is required.' });
        }
        // DYNAMIC: Validate that a payment method was provided
        if (!paymentMethod) {
            return res.status(400).json({ success: false, message: 'A payment method (e.g., "COD" or "Razorpay") is required.' });
        }

        // --- 2. Group Items by Store ID ---
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

            // --- 3. Securely Calculate Subtotal ---
            for (const item of storeItems) {
                const product = await db.Product.findByPk(item.product_id, { transaction: t });
                if (!product) throw new Error(`Product with ID ${item.product_id} not found.`);
                if (product.quantity < item.quantity) throw new Error(`The product "${product.name}" is out of stock.`);
                
                // DYNAMIC & SECURE: Always use the price from your database.
                subtotal += product.selling_price * item.quantity;
            }

            // --- 4. Calculate Final Totals ---
            const taxAmount = subtotal * 0.18; // Example tax
            const shippingAmount = 50.00;      // Example shipping fee
            const totalAmount = subtotal + taxAmount + shippingAmount - (discount_amount || 0);

            // --- 5. DYNAMICALLY Set Order Status ---
            // For COD, the order is confirmed immediately. For online payments, it's pending.
            const orderStatus = paymentMethod.toUpperCase() === 'COD' ? 'confirmed' : 'pending';

            // --- 6. Create the Order Record ---
            const newOrder = await db.Order.create({
                id: uuidv4(),
                orderNumber: `ORD-${Date.now()}`,
                customerId: userId,
                storeId: storeId,
                status: orderStatus,
                paymentStatus: 'pending', // Payment is always pending until verified/collected
                paymentMethod: paymentMethod, // DYNAMIC: Use the method from the request
                subtotal,
                taxAmount,
                shippingAmount,
                totalAmount,
                notes,
                discountAmount: discount_amount || 0,
                shippingAddress: shipping_address, // Pass the object directly, Sequelize handles JSON
                billingAddress: billing_address || shipping_address,
            }, { transaction: t });

            // --- 7. Create Order Items and Update Stock ---
            for (const item of storeItems) {
                const product = await db.Product.findByPk(item.product_id, { transaction: t });
                await db.OrderItem.create({
                    id: uuidv4(),
                    orderId: newOrder.id,
                    productId: item.product_id,
                    storeId: storeId,
                    productName: product.name,
                    quantity: item.quantity,
                    unitPrice: product.selling_price, // DYNAMIC & SECURE: Use the database price
                    totalPrice: product.selling_price * item.quantity,
                }, { transaction: t });

                // Decrement stock
                product.quantity -= item.quantity;
                await product.save({ transaction: t });
            }
            createdOrders.push(newOrder);
        }

        await t.commit();
        res.status(201).json({ success: true, message: 'Your order(s) have been placed successfully!', orders: createdOrders });
    } catch (error) {
        await t.rollback();
        console.error("CREATE ORDER ERROR:", error);
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
            await t.rollback();
            return res.status(404).json({ success: false, message: "Order not found or you do not have permission to cancel it." });
        }

        const cancellableStatuses = ['pending', 'confirmed', 'packaging'];
        if (!cancellableStatuses.includes(order.status)) {
            await t.rollback();
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
        if (order.paymentStatus === 'paid') {
            order.paymentStatus = 'refunded';
            // Here you would call your PaymentService to process a refund
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