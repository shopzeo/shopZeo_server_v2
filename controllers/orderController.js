const OrderService = require('../services/orderService');
const { Order, OrderItem, Product, Store } = require('../models/associations');
const { AppError } = require('../middleware/errorHandler');


const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 1. Create new Order
exports.createOrder = catchAsync(async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return next(new AppError('For Authentication please login.', 401));
  }
  
  const createdOrders = await OrderService.createOrder(req.body, req.user.id);
  
  res.status(201).json({
    success: true,
    message: `${createdOrders.length} order(s) safaltapoorvak banaye gaye.`,
    data: createdOrders
  });
});

// 2. Show My Orders
exports.getMyOrders = catchAsync(async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return next(new AppError('Authentication zaroori hai. Kripya login karein.', 401));
    }

// For each order, include order items and unke associated products and stores  
    const orders = await Order.findAll({
        where: { customerId: req.user.id },
        include: {
            model: OrderItem,
            as: 'items',
            include: [
                { model: Product, as: 'product', attributes: ['name', 'thumbnail'] },
                { model: Store, as: 'store', attributes: ['name'] }
            ]
        },
        order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
    });
});

// 3. Get Order By ID (with details)
exports.getOrderById = catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    if (!req.user || !req.user.id) {
        return next(new AppError('Authentication zaroori hai. Kripya login karein.', 401));
    }

    // Ensure the order belongs to the logged-in user
    const order = await Order.findOne({ 
        where: { id: orderId, customerId: req.user.id },
        include: {
            model: OrderItem,
            as: 'items',
            include: [
                { model: Product, as: 'product', attributes: ['name', 'thumbnail', 'slug'] },
                { model: Store, as: 'store', attributes: ['name', 'slug'] }
            ]
        }
    });

    if (!order) {
        return next(new AppError('Order nahi mila ya aapke paas isse dekhne ki anumati nahi hai.', 404));
    }

    res.status(200).json({
        success: true,
        data: order,
    });
});

// 4. Update Order Status (For Admin/Store Owner)
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    
    const updatedOrder = await OrderService.updateOrderStatus(orderId, status, req.user.id, notes);
    
    res.status(200).json({
        success: true,
        message: `Order status safaltapoorvak "${status}" mein update ho gaya hai.`,
        data: updatedOrder
    });
});

// 5. Order cancellation by Customer
exports.cancelOrder = catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { notes } = req.body;

    // OrderService cancellaton logic hanling
    const cancelledOrder = await OrderService.updateOrderStatus(orderId, 'cancelled', req.user.id, notes);

    res.status(200).json({
        success: true,
        message: 'Order safaltapoorvak cancel kar diya gaya hai.',
        data: cancelledOrder
    });
});

