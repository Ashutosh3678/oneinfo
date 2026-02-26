const mongoose = require("mongoose");

const LinkStatsSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    unique: true,
    index: true,
  },
  totalClicks: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("LinkStats", LinkStatsSchema);
