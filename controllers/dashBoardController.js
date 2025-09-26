import {
  Order,
  Product,
  Store,
  User,
  OrderItem,
  WithdrawHistory,
} from "../models/index.js";

export const vendorWallet = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Get vendor's store
    const store = await Store.findOne({ where: { owner_id: vendorId } });
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    }

    // Fetch all orders for this store
    const orders = await Order.findAll({
      where: { store_id: store.id },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
      ],
    });
    // If no orders, return zeros
    if (!orders.length) {
      return res.status(200).json({
        success: true,
        data: {
          withdrawableBalance: 0,
          pendingWithdraw: 0,
          totalTaxGiven: 0,
          totalCommissionGiven: 0,
          totalDeliveryCharge: 0,
          alreadyWithdraw: 0,
        },
      });
    }

    let withdrawableBalance = 0;
    let pendingWithdraw = 0;
    let totalTaxGiven = 0;
    let totalCommissionGiven = 0;
    let totalDeliveryCharge = 0;
    // let alreadyWithdraw = 0;

    for (const order of orders) {
      const totalAmount = parseFloat(order.totalAmount || 0);
      const subtotal = parseFloat(order.subtotal || 0);
      const taxAmount = parseFloat(order.taxAmount || 0);
      const commissionAmount = parseFloat(order.commissionAmount || 0);
      const shippingAmount = parseFloat(order.shippingAmount || 0);

      if (order.status === "delivered") {
        withdrawableBalance += totalAmount - commissionAmount - taxAmount;

        totalTaxGiven += taxAmount;
        totalCommissionGiven += commissionAmount;
        totalDeliveryCharge += shippingAmount;
      } else {
        pendingWithdraw += subtotal;
      }
    }

    // Fetch already withdrawn from WithdrawHistory
    const withdrawRecords = await WithdrawHistory.findAll({
      where: { vendor_id: vendorId, status: "approved" },
    });

    const alreadyWithdraw = withdrawRecords.reduce(
      (acc, record) => acc + parseFloat(record.amount),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        withdrawableBalance,
        pendingWithdraw,
        totalTaxGiven,
        totalCommissionGiven,
        totalDeliveryCharge,
        alreadyWithdraw,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor wallet data:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const deliveredOrders = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const store = await Store.findOne({ where: { owner_id: vendorId } });
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    }
    const orders = await Order.findAll({
      where: { store_id: store.id, status: "delivered" },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
        {
          model: User,
          as: "customer",
          attributes: ["id", "first_name", "last_name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching delivered orders:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
export const pendingOrders = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Find store by vendor
    const store = await Store.findOne({ where: { owner_id: vendorId } });
    if (!store) {
      return res
        .status(404)
        .json({ success: false, message: "Store not found" });
    }

    // Fetch orders with pending status
    const orders = await Order.findAll({
      where: { status: "pending" }, // 👈 only difference
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Product, as: "product" }],
        },
        {
          model: User,
          as: "customer",
          attributes: ["id", "first_name", "last_name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    console.log("Pending Orders:", orders);

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
