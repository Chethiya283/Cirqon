const mongoose = require("mongoose");

/**
 * SavedPart Schema
 * 
 * VIVA EXPLANATION:
 * 1. Document References & Normalization:
 *    Instead of embedding the full component document (which could become stale if
 *    the component specifications or datasheet links change), we store only an ObjectId
 *    reference to the `Component` and `User` collections.
 * 
 * 2. Compound Unique Index:
 *    `savedPartSchema.index({ user: 1, component: 1 }, { unique: true });`
 *    Creates a composite index enforcing at the database engine level that a user
 *    cannot bookmark the exact same component more than once. This prevents duplicate
 *    records even if concurrent POST requests arrive simultaneously.
 */
const savedPartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User reference is required"],
  },

  component: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Component",
    required: [true, "Component reference is required"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Enforce single bookmark per user-component pair
savedPartSchema.index({ user: 1, component: 1 }, { unique: true });

module.exports = mongoose.model("SavedPart", savedPartSchema);

