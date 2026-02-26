const CommissionRule = require("../commission/commissionRule.model");
const Order = require("./order.model");
const AffiliateLink = require("../links/affiliateLink.model");

/**
 * Creates or updates an order based on platform data.
 * Standarized lifecycle: pending, approved, declined, paid
 */
async function createOrder(data) {
  // 🔹 Step 1: Idempotency & Status Transitions
  const existingOrder = await Order.findOne({ orderId: data.orderId });
  if (existingOrder) {
  
    const oldStatus = existingOrder.status;
    if (data.status && existingOrder.status !== data.status) {
      console.log(`Updating order ${data.orderId} status: ${existingOrder.status} -> ${data.status}`);
      existingOrder.status = data.status;
      await existingOrder.save();
      return { order: existingOrder, isNew: false, oldStatus };
    }
    return { order: existingOrder, isNew: false, oldStatus };
  }

  // 🔹 Step 2: Handle subId mapping for Admitad
  let creatorId = data.creatorId;
  let shortCode = data.shortCode;

  if (data.subId && !creatorId) {
    const link = await AffiliateLink.findOne({ shortCode: data.subId });
    if (!link) {
      console.warn("No affiliate link found for subId:", data.subId);
      return null;
    }
    creatorId = link.creatorId;
    shortCode = data.subId;
  }

  // 🔹 Step 3: Fetch commission rules
  const rule = await CommissionRule.findOne({
    platform: data.platform,
    category: data.category
  });

  if (!rule) {
    throw new Error(`Commission rule not found for ${data.platform}/${data.category}`);
  }

  // 🔹 Step 4: Calculate commissions
  let brandCommissionAmount, creatorCommissionAmount, platformCommissionAmount;
  const creatorRate = rule.creatorCommissionRate;

  if (data.platform === "admitad") {
    // Admitad gives literal payout, we split it based on creatorCommissionRate (%)
    brandCommissionAmount = data.orderValue;
    creatorCommissionAmount = brandCommissionAmount * (creatorRate / 100);
    platformCommissionAmount = brandCommissionAmount - creatorCommissionAmount;
  } else {
    // Generic Percentage Logic (Flipkart/Amazon/etc)
    brandCommissionAmount = (data.orderValue * rule.brandCommissionRate) / 100;
    creatorCommissionAmount = (data.orderValue * rule.creatorCommissionRate) / 100;
    platformCommissionAmount = brandCommissionAmount - creatorCommissionAmount;
  }

  // 🔹 Step 5: Save order
  const order = await Order.create({
    shortCode: shortCode || data.shortCode,
    creatorId: creatorId || data.creatorId,
    orderId: data.orderId,
    productName: data.productName || "Admitad Product",
    orderValue: data.rawAmount || data.orderValue, 

    brandCommissionRate: data.platform === "admitad" ? 0 : rule.brandCommissionRate,
    brandCommissionAmount,

    creatorCommissionRate: creatorRate,
    creatorCommissionAmount,

    platformCommissionAmount,

    platform: data.platform,
    category: data.category,
    status: data.status || "pending" 
  });

  return { order, isNew: true };
}

module.exports = { createOrder };
