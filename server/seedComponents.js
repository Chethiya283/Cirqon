
const mongoose = require("mongoose");
require("dotenv").config();

const Component = require("./models/Component");

const components = [
  {
    partNumber: "LM358",
    name: "Dual Operational Amplifier",
    category: "Integrated circuits (ICs)",
    manufacturer: "Texas Instruments",
    description:
      "A dual operational amplifier used in signal conditioning and analog circuits.",
    specifications: {
      channels: 2,
      supplyVoltageMax: 32,
      supplyVoltageUnit: "V",
    },
    package: {
      name: "PDIP-8",
      footprintDimensions: {},
      padLayout: "8-pin dual in-line package",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "OUT1", function: "Amplifier 1 output" },
      { number: 2, name: "IN1-", function: "Inverting input 1" },
      { number: 3, name: "IN1+", function: "Non-inverting input 1" },
      { number: 4, name: "V-", function: "Negative supply" },
      { number: 5, name: "IN2+", function: "Non-inverting input 2" },
      { number: 6, name: "IN2-", function: "Inverting input 2" },
      { number: 7, name: "OUT2", function: "Amplifier 2 output" },
      { number: 8, name: "V+", function: "Positive supply" },
    ],
    datasheetUrl: "https://www.ti.com/lit/ds/symlink/lm358.pdf",
    manufacturerUrl: "https://www.ti.com/product/LM358",
    dataStatus: "incomplete",
  },
  {
    partNumber: "NE555",
    name: "555 Timer IC",
    category: "Integrated circuits (ICs)",
    manufacturer: "Texas Instruments",
    description:
      "A timer IC commonly used for timing, pulse generation, and oscillator circuits.",
    specifications: {
      function: "Timer",
      supplyVoltageUnit: "V",
    },
    package: {
      name: "PDIP-8",
      footprintDimensions: {},
      padLayout: "8-pin dual in-line package",
      landPatternUrl: "",
    },
    datasheetUrl: "https://www.ti.com/lit/ds/symlink/ne555.pdf",
    manufacturerUrl: "https://www.ti.com/product/NE555",
    dataStatus: "incomplete",
  },
  {
    partNumber: "LM7805",
    name: "5 V Linear Voltage Regulator",
    category: "Voltage regulators",
    manufacturer: "Texas Instruments",
    description:
      "A linear regulator from the 7805 family designed to provide a regulated 5 V output.",
    specifications: {
      outputVoltage: 5,
      outputVoltageUnit: "V",
      type: "Linear regulator",
    },
    package: {
      name: "TO-220",
      footprintDimensions: {},
      padLayout: "3-pin package",
      landPatternUrl: "",
    },
    datasheetUrl: "https://www.ti.com/lit/ds/symlink/lm340.pdf",
    manufacturerUrl: "https://www.ti.com/product/LM340",
    dataStatus: "incomplete",
  },
];

async function seedComponents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    for (const component of components) {
      await Component.updateOne(
        { partNumber: component.partNumber },
        { $set: component },
        { upsert: true, runValidators: true }
      );
    }

    console.log("Component seed completed successfully");
    console.log(`Processed ${components.length} component records`);
  } catch (error) {
    console.error("Seeding failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedComponents();
