const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    // Link reference
    shortCode: { type: String, required: true, index: true },
    creatorId: { type: String, required: true, index: true },

    // Brand order reference
    orderId: { type: String, required: true, unique: true },

    productName: { type: String },
    category: { type: String, required: true }, // Used for commission rules
    platform: { type: String, required: true, index: true },

    // Order value
    orderValue: { type: Number, required: true },

    // Brand commission (what brand gives YOU)
    brandCommissionRate: { type: Number, required: true },
    brandCommissionAmount: { type: Number, required: true },

    // Creator commission (what YOU give creator)
    creatorCommissionRate: { type: Number, required: true },
    creatorCommissionAmount: { type: Number, required: true },

    // Your platform profit
    platformCommissionAmount: { type: Number, required: true },

    // Order lifecycle
    status: {
      type: String,
      enum: ["pending", "approved", "declined", "paid"],
      default: "pending",
      index: true
    },

    // Optional future expansion
    customerType: {
      type: String,
      enum: ["new", "existing"],
      default: "existing"
    },

    transactionDate: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Compound index for fast analytics
OrderSchema.index({ creatorId: 1, status: 1 });
OrderSchema.index({ platform: 1, category: 1 });

module.exports =
  mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);


  
  