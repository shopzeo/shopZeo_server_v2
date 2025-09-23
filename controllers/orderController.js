const db = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Order, Product, Store, User, OrderItem } = require("../models");
const path = require("path");
const PDFDocument = require("pdfkit");
const { sequelize } = require("../config/database");
/**
 * Creates new orders based on a multi-vendor cart.
 */
exports.createOrder = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { items, shipping_address, billing_address, paymentMethod, notes, discount_amount } = req.body;
        const userId = req.user.id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Order items are missing or invalid.' });
        }
        if (!shipping_address || !shipping_address.addressLine1) {
            return res.status(400).json({ success: false, message: 'A valid shipping address with "addressLine1" is required.' });
        }
        if (!paymentMethod) {
            return res.status(400).json({ success: false, message: 'A payment method is required.' });
        }

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
                subtotal += product.selling_price * item.quantity;
            }

            const taxAmount = subtotal * 0.18;
            const shippingAmount = 50.00;
            const totalAmount = subtotal + taxAmount + shippingAmount - (discount_amount || 0);
            const orderStatus = paymentMethod.toUpperCase() === 'COD' ? 'confirmed' : 'pending';

            const newOrder = await db.Order.create({
                id: uuidv4(),
                orderNumber: `ORD-${Date.now()}-${storeId.slice(0, 4)}`,
                customerId: userId,
                storeId: storeId,
                status: orderStatus,
                paymentStatus: 'pending',
                paymentMethod,
                subtotal,
                taxAmount,
                shippingAmount,
                totalAmount,
                notes,
                discountAmount: discount_amount || 0,
                shippingAddress: shipping_address,
                billingAddress: billing_address || shipping_address,
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
                    unitPrice: product.selling_price,
                    totalPrice: product.selling_price * item.quantity,
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
        console.error("CREATE ORDER ERROR:", error);
        res.status(500).json({
            success: false,
            message: 'An internal server error occurred while creating the order.',
            error: error.message
        });
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
        const { orderId } = req.params; // Correctly get orderId
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

        for (const item of order.items) {
            await db.Product.increment(
                { quantity: item.quantity },
                { where: { id: item.productId }, transaction: t }
            );
        }

        order.status = 'cancelled';
        if (order.paymentStatus === 'paid') {
            order.paymentStatus = 'refunded';
        }
        await order.save({ transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: "Order has been successfully cancelled.", data: order });
    } catch (error) {
        await t.rollback();
        console.error(`Cancelling Order ${req.params.orderId} Failed!`, error);
        res.status(500).json({ success: false, message: error.message || 'Failed to cancel the order.' });
    }
};

exports.getOrderList = async (req, res) => {
    try {
        const { status } = req.query;

        let whereClause = {};
        if (status && status !== 'all') {
            whereClause.status = status;
        }

        const orders = await db.Order.findAll({
            where: whereClause,
            include: [
                {
                    model: db.OrderItem,
                    as: 'items',
                    attributes: [
                        'id',
                        'product_id',
                        'product_name',
                        'quantity',
                        'unit_price',
                        'total_price',
                        'store_id',
                        'variant_id'
                    ]
                }, {
                    model: db.Store,
                    as: 'store',
                    attributes: [
                        'id',
                        'name',
                        'slug',
                        'phone',
                        'email',
                        'address',
                        'rating',
                        'total_orders'
                    ]
                },
                {
                    model: db.User,
                    as: 'customer',
                    attributes: [
                        'id',
                        'email',
                        'first_name',
                        'last_name',
                        'phone',
                        'address',
                    ]
                }

            ],
            order: [['created_at', 'DESC']]
        });

        // Count orders by status
        const statuses = [
            'pending',
            'confirmed',
            'packaging',
            'out_for_delivery',
            'delivered',
            'returned',
            'failed',
            'cancelled'
        ];

        const counts = {};
        for (let s of statuses) {
            counts[s] = await db.Order.count({ where: { status: s } });
        }

        return res.json({
            status: 200,
            success: true,
            message: 'Orders fetched successfully',
            data: orders,   // data is now a proper array
            counts
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            stack: error.stack
        });
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params; // Order ID from URL
        const {
            status,
            address,
            notes,
            tracking_number
        } = req.body;

        // Find order by ID
        const order = await db.Order.findByPk(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Update allowed fields
        if (status) order.status = status;
        if (address) order.address = address;
        if (notes) order.notes = notes;
        if (tracking_number) order.tracking_number = tracking_number;

        await order.save();

        return res.json({
            status: 200,
            success: true,
            message: "Order updated successfully",
            data: order
        });

    } catch (error) {
        console.error("Error updating order:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            stack: error.stack
        });
    }
};

//new controller to to show all orders


exports.getOrdersBySeller = async (req, res) => {
  try {
    const { email } = req.user; // token se seller email aa raha hai

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Seller email is required",
      });
    }

    // Step 1: Seller ka store_id nikaalo
    const store = await Store.findOne({ where: { email } });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: "No store found for this seller",
      });
    }

    // Step 2: Orders fetch karo is store ke
    const orders = await Order.findAll({
      where: { storeId: store.id }, // ✅ camelCase field use kar (jo model me hai)
      include: [
        {
          model: db.OrderItem,
          as: "items",
          include: [
            {
              model: db.Product,
              as: "product",
              attributes: ["id", "name", "image_1", "selling_price"],
            },
          ],
          attributes: ["id", "quantity", "unitPrice", "totalPrice"], // ✅ order_items ke fields
        },
      ],
      attributes: [
        "id",
        "orderNumber",
        "customerId",
        "paymentMethod",
        "status",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!orders || orders.length === 0) {
      return res.json({ success: true, orders: [] });
    }

    // Step 3: Response bhejo
    res.json({
      success: true,
      storeId: store.id,
      orders,
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

// PATCH /api/orders/:id/confirm
exports.confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    order.status = "Confirmed"; // update status
    await order.save();

    res.json({ success: true, message: "Order confirmed successfully", order });
  } catch (error) {
    console.error("Error confirming order:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, message: "Order ID required" });
    }

    // 👉 Yahan wahi query use karte hain jo getOrdersBySeller me hai
    const order = await Order.findOne({
      where: { id: orderId },
      include: [
        {
          model: db.OrderItem,
          as: "items",
          include: [
            {
              model: db.Product,
              as: "product",
              attributes: ["id", "name", "image_1", "selling_price"],
            },
          ],
          attributes: ["id", "quantity", "unitPrice", "totalPrice"],
        },
        { model: Store, as: "store" },
        { model: User, as: "customer" },
      ],
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // ✅ Ab PDF banao
    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${orderId}.pdf`
    );
    doc.pipe(res);

    // Shopzeo Branding
    doc.fontSize(20).text("Shopzeo Invoice", { align: "center" });
    doc.moveDown();

    // Store Info
    doc.fontSize(12).text(`Store: ${order.store?.name || "-"}`);
    doc.text(`Store Email: ${order.store?.email || "-"}`);
    doc.text(`Store Address: ${order.store?.address || "-"}`);
    doc.moveDown();

    // Customer Info
    doc.text(
      `Customer: ${order.customer?.first_name} ${order.customer?.last_name}`
    );
    doc.text(`Email: ${order.customer?.email}`);
    doc.text(`Phone: ${order.customer?.phone || "-"}`);
    doc.moveDown();

    // Order Info
    doc.text(`Order Number: ${order.orderNumber}`);
    doc.text(`Order Date: ${order.createdAt.toDateString()}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.text(`Status: ${order.status}`);
    doc.moveDown();

    // Items Table
    doc.fontSize(14).text("Products:", { underline: true });
    order.items.forEach((item, idx) => {
      doc
        .fontSize(12)
        .text(
          `${idx + 1}. ${item.product?.name} (x${item.quantity}) - ₹${
            item.totalPrice
          }`
        );
    });

    // Total
    const total = order.items.reduce(
      (sum, i) => sum + parseFloat(i.totalPrice),
      0
    );
    doc.moveDown();
    doc.fontSize(14).text(`Total Amount: ₹${total}`, { align: "right" });

    doc.end();
  } catch (err) {
    console.error("Invoice Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate invoice",
      error: err.message,
    });
  }
};

exports.generateLabel = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        { model: Store, as: "store" },
        { model: User, as: "customer" },
      ],
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=label-${id}.pdf`
    );
    doc.pipe(res);

    // Shopzeo Branding
    doc.fontSize(18).text("Shopzeo Shipping Label", { align: "center" });
    doc.moveDown();

    // Store Info
    doc.fontSize(12).text(`From: ${order.store?.name}`);
    doc.text(`Address: ${order.store?.address || "-"}`);
    doc.moveDown();

    // Customer Info
    doc
      .fontSize(12)
      .text(`To: ${order.customer?.first_name} ${order.customer?.last_name}`);
    doc.text(`Address: ${order.shippingAddress?.addressLine1 || "-"}`);
    doc.text(`Phone: ${order.customer?.phone || "-"}`);
    doc.moveDown();

    // Order Info
    doc.text(`Order Number: ${order.orderNumber}`);
    doc.text(`Payment: ${order.paymentMethod}`);
    doc.text(`Status: ${order.status}`);

    doc.end();
  } catch (err) {
    console.error("Label Error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate label" });
  }
};
