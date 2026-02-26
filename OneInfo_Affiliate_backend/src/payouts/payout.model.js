const mongoose = require("mongoose");

const PayoutSchema = new mongoose.Schema(
  {
    creatorId: {
      type: String,
      required: true,
      index: true,
    },

    periodStart: {
      type: Date,
      required: true,
    },

    periodEnd: {
      type: Date,
      required: true,
    },

    totalOrders: {
      type: Number,
      default: 0,
    },

    totalRevenue: {
      type: Number,
      default: 0,
    },

    totalCommission: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },

    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// 🛡️ Prevent duplicate payouts for the same period
PayoutSchema.index({ creatorId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

module.exports =
  mongoose.models.Payout ||
  mongoose.model("Payout", PayoutSchema);
