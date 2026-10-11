
const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema(
  {
    // Basic identification
    partNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "Resistors",
        "Capacitors",
        "Inductors",
        "Diodes and LEDs",
        "BJTs and MOSFETs",
        "Integrated circuits (ICs)",
        "Voltage regulators",
        "Connectors",
        "Switches and protection components",
      ],
    },

    manufacturer: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // Flexible technical specifications
    specifications: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Package and PCB footprint information
    package: {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      footprintDimensions: {
        lengthMm: Number,
        widthMm: Number,
        heightMm: Number,
      },

      padLayout: {
        type: String,
        default: "",
      },

      landPatternUrl: {
        type: String,
        default: "",
      },
    },

    // Pin information, where applicable
    pins: [
      {
        number: Number,
        name: String,
        function: String,
      },
    ],

    // Official technical references
    datasheetUrl: {
      type: String,
      required: true,
      trim: true,
    },

    manufacturerUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // Data quality and administration
    dataStatus: {
      type: String,
      enum: ["verified", "incomplete"],
      default: "incomplete",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create the model
const Component = mongoose.model("Component", componentSchema);

module.exports = Component;
