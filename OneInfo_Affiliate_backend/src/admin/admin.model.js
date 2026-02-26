const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["superadmin", "manager"],
      default: "manager",
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Admin ||
  mongoose.model("Admin", AdminSchema);
