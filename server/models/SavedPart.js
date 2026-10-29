const mongoose = require("mongoose");

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
