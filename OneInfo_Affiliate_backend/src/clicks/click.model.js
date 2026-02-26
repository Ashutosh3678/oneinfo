const mongoose = require("mongoose");

const ClickSchema = new mongoose.Schema(
  {
    shortCode: { type: String, index: true },
    creatorId: { type: String, index: true },
    ip:        { type: String, index: true },
    userAgent: String,

    // Traffic source analytics (5th add-on)
    referer:   { type: String, default: "direct" },

    // Fraud detection fields
    isFraud: {
      type: Boolean,
      default: false,
      index: true,
    },
    fraudReason: {
      type: String,
    },
  },
  { timestamps: true }  // createdAt acts as the click timestamp
);

// Helpful compound index
ClickSchema.index({ shortCode: 1, createdAt: -1 });
ClickSchema.index({ ip: 1, createdAt: -1 });

module.exports =
  mongoose.models.ClickEvent ||
  mongoose.model("ClickEvent", ClickSchema);
