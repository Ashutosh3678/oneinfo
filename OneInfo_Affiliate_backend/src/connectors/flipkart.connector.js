const Order = require("../orders/order.model");
const orderQueue = require("../queue/order.queue");

async function processFlipkartReport(reportData) {
  for (const row of reportData) {
    try {
      // 🔒 Duplicate protection (light check before queue)
      const existingOrder = await Order.findOne({ orderId: row.orderId }).lean();

      if (existingOrder) {
        console.log(`Duplicate skipped: ${row.orderId}`);
        continue;
      }

      // 🚀 Push to Queue instead of createOrder
      await orderQueue.add(
        "createOrder",
        {
          shortCode: row.shortCode,
          creatorId: row.creatorId,
          orderId: row.orderId,
          productName: row.productName,
          orderValue: row.orderValue,
          platform: "flipkart",
          category: row.category,
        },
        {
          attempts: 5,
          backoff: {
            type: "exponential",
            delay: 3000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      console.log(`Queued order: ${row.orderId}`);

    } catch (err) {
      console.error(`Error queueing ${row.orderId}`, err.message);
    }
  }
}

module.exports = { processFlipkartReport };
