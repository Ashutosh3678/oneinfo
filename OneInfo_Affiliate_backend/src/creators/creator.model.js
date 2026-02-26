const mongoose = require("mongoose");

const CreatorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
    },

    socialPlatform: {
      type: String,
      enum: ["instagram", "youtube", "telegram", "other"],
      default: "other",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Creator ||
  mongoose.model("Creator", CreatorSchema);
