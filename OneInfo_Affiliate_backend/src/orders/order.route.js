const express = require("express");
const router = express.Router();
const orderQueue = require("../queue/order.queue");

router.post("/create", async (req, res) => {
  try {
    await orderQueue.add("createOrder", req.body);
    res.status(202).json({ message: "Order ingestion queued successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
