const cron = require("node-cron");
const admitadService = require("../services/admitad.service");
const orderQueue = require("../queue/order.queue");
const SyncState = require("../models/syncState.model");

cron.schedule("*/10 * * * *", async () => {
  console.log("Running Admitad sync...");

  try {
    // 🔹 Step 1: Get Sync State
    let state = await SyncState.findOne({ platform: "admitad" });
    let dateStart;

    if (!state) {
      dateStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    } else {
      // 🛡️ HARDENING: 1-Hour Overlap Window
      const ONE_HOUR = 60 * 60 * 1000;
      const safeStartTime = new Date(state.lastSync.getTime() - ONE_HOUR);
      dateStart = safeStartTime.toISOString().split("T")[0];
    }

    const actions = await admitadService.fetchActions(dateStart);

    console.log(`Fetched ${actions.length} actions from Admitad since ${dateStart}.`);

    if (actions.length > 0) {
      for (const action of actions) {
        // 💰 FINANCIAL VERIFICATION LOG (TEMPORARY)
        console.log("Admitad Action Data:", {
          order_id: action.order_id,
          status: action.status,
          price: action.price || action.amount, // Order Value
          payment: action.payment, // Expected Commission
          currency: action.currency
        });

        await orderQueue.add("createOrder", {
          subId: action.subid,
          orderId: action.order_id,
          orderValue: action.payment, // brand payout (commission)
          rawAmount: action.price || action.amount, // product price (cart value)
          status: action.status, 
          platform: "admitad",
          category: "fashion" 
        }, {
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true
        });
      }

      // 🔹 Step 2: Update Sync State (Only after processing)
      await SyncState.updateOne(
        { platform: "admitad" },
        { lastSync: new Date() },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error("Admitad Cron Error:", err.message);
  }
});

console.log("Admitad cron job scheduled (every 10 minutes)");
