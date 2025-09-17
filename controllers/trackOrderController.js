const { Order, Shipment, OrderItem, Product, Store } = require('../models/associations');
const { AppError } = require('../middleware/errorHandler');

const catchAsync = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Track an order
exports.trackOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  if (!req.user || !req.user.id) {
    return next(new AppError('Authentication is required. Please log in.', 401));
  }

  const order = await Order.findOne({
    where: { id: orderId, customerId: req.user.id },
    include: [{
      model: Shipment,
      as: 'shipments',
    }],
  });

  if (!order) {
    return next(new AppError('Order not found or you do not have permission to view it.', 404));
  }

  const shipment = order.shipments && order.shipments[0] ? order.shipments[0] : null;

  const trackingInfo = {
    orderNumber: order.orderNumber,
    status: order.status,
    estimatedDelivery: order.estimatedDelivery,
    actualDelivery: order.actualDelivery,
    trackingNumber: shipment ? shipment.trackingNumber : null,
    carrier: shipment ? shipment.carrier : null,
  };

  res.status(200).json({
    success: true,
    data: trackingInfo,
  });
});