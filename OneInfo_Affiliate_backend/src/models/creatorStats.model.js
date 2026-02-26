const mongoose = require("mongoose");

const CreatorStatsSchema = new mongoose.Schema({
  creatorId: { type: String, required: true, index: true },
  lifetimeRevenue: { type: Number, default: 0 },
  lifetimeCommission: { type: Number, default: 0 }, // Total ever earned
  
  pendingCommission: { type: Number, default: 0 },
  approvedCommission: { type: Number, default: 0 },
  paidCommission: { type: Number, default: 0 },
  declinedCommission: { type: Number, default: 0 },
  
  lifetimeOrders: { type: Number, default: 0 },
  totalClicks: { type: Number, default: 0 },
  platformProfit: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CreatorStats", CreatorStatsSchema);
