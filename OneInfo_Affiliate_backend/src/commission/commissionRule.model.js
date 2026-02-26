const mongoose = require("mongoose");

const CommissionRuleSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  category: { type: String, required: true },

  // What brand gives YOU
  brandCommissionRate: { type: Number, required: true },

  // What YOU give creator
  creatorCommissionRate: { type: Number, required: true },

}, { timestamps: true });

CommissionRuleSchema.index({ platform: 1, category: 1 }, { unique: true });

module.exports =
  mongoose.models.CommissionRule ||
  mongoose.model("CommissionRule", CommissionRuleSchema);
