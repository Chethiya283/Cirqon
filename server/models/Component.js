const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema(
  {
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

    specifications: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    package: {
      name: {
        type: String,
        default: "",
        trim: true,
      },

      mountingType: {
        type: String,
        enum: ["Through-Hole", "Surface-Mount"],
      },

      bodyDimensions: {
        lengthMm: Number,
        widthMm: Number,
        heightMm: Number,
        seatedHeightMm: Number,
      },

      pcbLayout: {
        leadPitchMm: Number,
        rowSpacingMm: Number,
        drillDiameterMm: Number,
        padDiameterMm: Number,
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

    pins: [
      {
        number: Number,
        name: String,
        function: String,
      },
    ],

    datasheetUrl: {
      type: String,
      default: "",
      trim: true,
    },

    manufacturerUrl: {
      type: String,
      default: "",
      trim: true,
    },

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

const Component = mongoose.model("Component", componentSchema);

module.exports = Component;
