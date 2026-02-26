const mongoose = require("mongoose");

const JobMetricsSchema = new mongoose.Schema({
  
  queueName: String,
  processedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
});



module.exports = mongoose.model("JobMetrics", JobMetricsSchema);

