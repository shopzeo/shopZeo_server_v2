const { Order, Shipment } = require('../models/associations');
const { AppError } = require('../middleware/errorHandler');

class TrackingService {
  /**
   * Track an order by its ID.
   * @param {string} orderId - The ID of the order to track.
   * @param {string} userId - The ID of the user requesting the tracking information.
   * @returns {Promise<object|null>} - The tracking information or null if not found.
   */
  async trackOrder(orderId, userId) {
    const order = await Order.findOne({
      where: { id: orderId, customerId: userId },
      include: [{
        model: Shipment,
        as: 'shipments',
      }],
    });

    if (!order) {
      return null;
    }

    // You can add more logic here to get real-time tracking from a carrier API
    // For now, we'll just return the information from our database.

    const shipment = order.shipments && order.shipments[0] ? order.shipments[0] : null;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      actualDelivery: order.actualDelivery,
      trackingNumber: shipment ? shipment.trackingNumber : null,
      carrier: shipment ? shipment.carrier : null,
    };
  }
}

module.exports = new TrackingService();