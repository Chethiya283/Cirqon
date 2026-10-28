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

  /**
   * VIVA EXPLANATION:
   * 3. BOM Quantity & Backward Compatibility:
   *    Defaults to 1 so that existing saved part records naturally evaluate to quantity: 1
   *    without requiring a separate database migration. Validated as an integer between
   *    1 and 10,000 to prevent fractional or negative component counts in bill of materials.
   */
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    default: 1,
    min: [1, "Quantity must be at least 1"],
    max: [10000, "Quantity cannot exceed 10000"],
    validate: {
      validator: Number.isInteger,
      message: "Quantity must be an integer",
    },
  },

  /**
   * VIVA EXPLANATION:
   * 4. User Workspace Note:
   *    Allows engineers to record design notes (e.g., "Decoupling capacitor for IC2 pin 4",
   *    "BOM Line Item 14"). Trimmed and limited to 300 characters to prevent excessive
   *    payloads while providing practical engineering context.
   */
  note: {
    type: String,
    default: "",
    trim: true,
    maxlength: [300, "Note cannot exceed 300 characters"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Enforce single bookmark per user-component pair
savedPartSchema.index({ user: 1, component: 1 }, { unique: true });

module.exports = mongoose.model("SavedPart", savedPartSchema);

