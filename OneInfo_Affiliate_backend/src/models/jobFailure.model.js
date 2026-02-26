const mongoose = require("mongoose");

const JobFailureSchema = new mongoose.Schema(
  {
    jobId: String,
    queueName: String,
    attemptsMade: Number,
    data: Object,
    error: String,
    stack: String,
    failedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobFailure", JobFailureSchema);
