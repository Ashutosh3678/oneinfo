const mongoose = require("mongoose");

const SyncStateSchema = new mongoose.Schema({
  platform: { type: String, required: true, unique: true },
  lastSync: { type: Date, default: () => new Date(Date.now() - 24 * 60 * 60 * 1000) }
}, { timestamps: true });

module.exports = 
  mongoose.models.SyncState || 
  mongoose.model("SyncState", SyncStateSchema);

  
