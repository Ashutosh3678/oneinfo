const orderQueue = require("./order.queue");

async function scheduleJobs() {
  await orderQueue.add(
    "fetchFlipkartReport",
    {},
    {
      repeat: { every: 600000 }, // 10 mins
      jobId: "flipkart_report_fetcher", // 🛡️ Deduplication ID
    }
  );
  console.log("📅 Scheduled Flipkart report fetcher (Deduplication enabled)");
}

scheduleJobs();
