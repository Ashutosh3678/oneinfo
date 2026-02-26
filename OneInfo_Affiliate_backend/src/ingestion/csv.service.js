const orderQueue = require("../queue/order.queue");

async function pushRowsToQueue(rows, platform) {
  for (const row of rows) {
    await orderQueue.add(
      "createOrder",
      {
        shortCode: row.shortCode,
        creatorId: row.creatorId,
        orderId: row.orderId,
        productName: row.productName,
        orderValue: Number(row.orderValue),
        platform,
        category: row.category,
      },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );
  }
}

module.exports = { pushRowsToQueue };
