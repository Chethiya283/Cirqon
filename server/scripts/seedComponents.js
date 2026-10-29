
const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const Component = require("../models/Component");

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
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 9.27,
        widthMm: 6.35,
        heightMm: 3.3,
        seatedHeightMm: 5.08,
      },
      pcbLayout: {
        leadPitchMm: 2.54,
        rowSpacingMm: 7.62,
      },
      footprintDimensions: {},
      padLayout: "8-pin DIP, 2.54 mm lead pitch, 7.62 mm row spacing",
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
    imageUrl: "/images/components/LM358.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "NE555",
    name: "555 Timer IC",
    category: "Integrated circuits (ICs)",
    manufacturer: "Texas Instruments",
    description:
      "A precision timer IC commonly used for timing, pulse generation, sequential timing, and oscillator circuits.",
    specifications: {
      function: "Timer",
      supplyVoltageMin: 4.5,
      supplyVoltageMax: 16,
      supplyVoltageUnit: "V",
      outputCurrentMax: 200,
      outputCurrentUnit: "mA",
      quiescentCurrentTypical: 3,
      quiescentCurrentUnit: "mA",
      operatingTemperatureMin: 0,
      operatingTemperatureMax: 70,
      temperatureUnit: "°C",
    },
    package: {
      name: "PDIP-8",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 9.27,
        widthMm: 6.35,
        heightMm: 3.3,
        seatedHeightMm: 5.08,
      },
      pcbLayout: {
        leadPitchMm: 2.54,
        rowSpacingMm: 7.62,
      },
      footprintDimensions: {},
      padLayout: "8-pin DIP, 2.54 mm lead pitch, 7.62 mm row spacing",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "GND", function: "Ground reference voltage (0 V)" },
      {
        number: 2,
        name: "TRIG",
        function:
          "Trigger input (triggers timing cycle when voltage drops below 1/3 VCC)",
      },
      {
        number: 3,
        name: "OUT",
        function:
          "Timer output (drives high to near VCC or low to near GND up to 200 mA)",
      },
      {
        number: 4,
        name: "RESET",
        function:
          "Reset input (active low, overrides trigger and resets output low)",
      },
      {
        number: 5,
        name: "CONT",
        function:
          "Control voltage (provides access to internal 2/3 VCC resistor divider tap)",
      },
      {
        number: 6,
        name: "THRES",
        function:
          "Threshold input (compares to 2/3 VCC to end timing cycle)",
      },
      {
        number: 7,
        name: "DISCH",
        function:
          "Discharge pin (open-collector transistor output in phase with output)",
      },
      {
        number: 8,
        name: "VCC",
        function: "Positive supply voltage (4.5 V to 16 V recommended)",
      },
    ],
    datasheetUrl: "https://www.ti.com/lit/ds/symlink/ne555.pdf",
    manufacturerUrl: "https://www.ti.com/product/NE555",
    imageUrl: "/images/components/NE555.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "LM7805",
    name: "5 V Linear Voltage Regulator",
    category: "Voltage regulators",
    manufacturer: "Texas Instruments",
    description:
      "A 3-terminal positive linear regulator from the 7805/LM340 family designed to provide a regulated 5 V output with internal current limiting and thermal shutdown.",
    specifications: {
      type: "Linear regulator",
      outputVoltage: 5,
      outputVoltageUnit: "V",
      inputVoltageMin: 7,
      inputVoltageMax: 35,
      inputVoltageUnit: "V",
      outputCurrentMax: 1.5,
      outputCurrentUnit: "A",
      dropoutVoltageTypical: 2.0,
      dropoutVoltageUnit: "V",
      quiescentCurrentTypical: 5.0,
      quiescentCurrentUnit: "mA",
      operatingTemperatureMin: 0,
      operatingTemperatureMax: 125,
      temperatureUnit: "°C",
    },
    package: {
      name: "TO-220",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 10.16,
        widthMm: 4.57,
        heightMm: 14.99,
      },
      pcbLayout: {
        leadPitchMm: 2.54,
      },
      footprintDimensions: {},
      padLayout: "3-pin TO-220 through-hole, 2.54 mm lead pitch",
      landPatternUrl: "",
    },
    pins: [
      {
        number: 1,
        name: "INPUT",
        function: "Unregulated input voltage (7 V to 35 V)",
      },
      {
        number: 2,
        name: "GROUND",
        function:
          "Ground reference terminal (internally connected to mounting tab)",
      },
      {
        number: 3,
        name: "OUTPUT",
        function:
          "Regulated 5 V output voltage (up to 1.5 A with adequate heat sink)",
      },
    ],
    datasheetUrl: "https://www.ti.com/lit/ds/symlink/lm340.pdf",
    manufacturerUrl: "https://www.ti.com/product/LM340",
    imageUrl: "/images/components/LM7805.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "1N4007",
    name: "General-Purpose Rectifier Diode",
    category: "Diodes and LEDs",
    manufacturer: "Vishay",
    description:
      "A silicon rectifier diode commonly used in power rectification applications.",
    specifications: {
      type: "Rectifier diode",
      repetitivePeakReverseVoltage: 1000,
      repetitivePeakReverseVoltageUnit: "V",
      forwardCurrentAvg: 1,
      forwardCurrentAvgUnit: "A",
      surgeCurrentPeak: 30,
      surgeCurrentPeakUnit: "A",
      forwardVoltageMax: 1.1,
      forwardVoltageMaxUnit: "V",
      reverseCurrentMax: 5,
      reverseCurrentMaxUnit: "µA",
      reverseCurrentMaxCondition: "25 °C",
    },
    package: {
      name: "DO-204AL (DO-41)",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 5.2,
        widthMm: 2.7,
        heightMm: 2.7,
      },
      footprintDimensions: {},
      padLayout: "Axial, 2 leads (flexible bend span)",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "Anode", function: "Anode terminal" },
      { number: 2, name: "Cathode", function: "Cathode terminal" },
    ],
    datasheetUrl: "https://www.vishay.com/docs/88503/1n4001.pdf",
    manufacturerUrl: "https://www.vishay.com/",
    imageUrl: "/images/components/1N4007.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "1N4148",
    name: "Fast Switching Diode",
    category: "Diodes and LEDs",
    manufacturer: "Vishay",
    description:
      "A small-signal switching diode used in signal processing and switching circuits.",
    specifications: {
      type: "Switching diode",
      packageType: "DO-35",
      reverseVoltageMax: 100,
      reverseVoltageMaxUnit: "V",
      forwardCurrentMax: 300,
      forwardCurrentMaxUnit: "mA",
      forwardVoltageMax: 1.0,
      forwardVoltageMaxUnit: "V",
      forwardVoltageMaxCondition: "10 mA",
      reverseRecoveryTime: 4,
      reverseRecoveryTimeUnit: "ns",
      reverseRecoveryTest:
        "I_F = 10 mA, I_R = 10 mA to 1 mA, V_R ≈ 6 V, R_L = 100 Ω",
    },
    package: {
      name: "DO-35",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 3.4,
        widthMm: 1.75,
        heightMm: 1.75,
      },
      footprintDimensions: {},
      padLayout: "Axial, 2 leads (flexible bend span)",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "Anode", function: "Anode terminal" },
      { number: 2, name: "Cathode", function: "Cathode terminal" },
    ],
    datasheetUrl: "https://www.vishay.com/docs/81857/1n4148.pdf",
    manufacturerUrl: "https://www.vishay.com/",
    imageUrl: "/images/components/1N4148.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "BC547",
    name: "NPN General-Purpose Transistor",
    category: "BJTs and MOSFETs",
    manufacturer: "onsemi",
    description:
      "An NPN bipolar junction transistor used for low-power switching and amplification.",
    specifications: {
      transistorType: "NPN",
      numberOfPins: 3,
      collectorEmitterVoltageMax: 45,
      collectorEmitterVoltageMaxUnit: "V",
      collectorBaseVoltageMax: 50,
      collectorBaseVoltageMaxUnit: "V",
      emitterBaseVoltageMax: 6,
      emitterBaseVoltageMaxUnit: "V",
      collectorCurrentMax: 100,
      collectorCurrentMaxUnit: "mA",
      powerDissipationMax: 0.625,
      powerDissipationMaxUnit: "W",
      operatingTemperatureMin: -55,
      operatingTemperatureMax: 150,
      temperatureUnit: "°C",
      dcCurrentGainMin: 110,
      dcCurrentGainMax: 800,
      dcCurrentGainTest: "VCE = 5 V, IC = 2 mA",
    },
    package: {
      name: "TO-92",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 5.2,
        widthMm: 4.19,
        heightMm: 5.33,
      },
      pcbLayout: {
        leadPitchMm: 1.27,
      },
      footprintDimensions: {},
      padLayout:
        "3-pin TO-92 through-hole, 1.27 mm adjacent lead pitch (2.54 mm outer span)",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "Collector", function: "Collector terminal" },
      { number: 2, name: "Base", function: "Base terminal" },
      { number: 3, name: "Emitter", function: "Emitter terminal" },
    ],
    datasheetUrl: "https://www.onsemi.com/pdf/datasheet/bc546b-d.pdf",
    manufacturerUrl: "https://www.onsemi.com/",
    imageUrl: "/images/components/BC547.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "MFR-25FTE52-10K",
    name: "10 kΩ Metal Film Resistor",
    category: "Resistors",
    manufacturer: "Yageo",
    datasheetUrl:
      "https://yageogroup.com/content/Resource%20Library/Datasheet/YAGEO-MFR_DATASHEET.pdf",
    description:
      "A 1/4 W through-hole metal film resistor with 1% tolerance, commonly used in signal conditioning, pull-up/pull-down networks, and voltage dividers.",
    specifications: {
      resistance: 10,
      resistanceUnit: "kΩ",
      powerRating: 0.25,
      powerRatingUnit: "W",
      tolerance: 1,
      toleranceUnit: "%",
      temperatureCoefficient: 50,
      temperatureCoefficientUnit: "ppm/°C",
      operatingVoltageMax: 250,
      operatingVoltageUnit: "V",
      overloadVoltageMax: 500,
      overloadVoltageMaxUnit: "V",
      operatingTemperatureMin: -55,
      operatingTemperatureMax: 155,
      temperatureUnit: "°C",
      powerDeratingInfo:
        "0.25 W up to 70 °C, then linear derating to 0 W at 155 °C",
    },
    package: {
      name: "Axial (MFR-25)",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 6.3,
        widthMm: 2.4,
        heightMm: 2.4,
      },
      footprintDimensions: {},
      padLayout: "Axial, 2 leads (flexible bend span)",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "Lead 1", function: "Resistor terminal" },
      { number: 2, name: "Lead 2", function: "Resistor terminal" },
    ],
    imageUrl: "/images/components/MFR-25FTE52-10K.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "C315C104K5R5TA",
    name: "100 nF Radial Multilayer Ceramic Capacitor",
    category: "Capacitors",
    manufacturer: "KEMET",
    description:
      "A 0.1 µF (100 nF) radial leaded ceramic capacitor with X7R dielectric and 50 V rating, commonly used for power supply decoupling and high-frequency bypass.",
    specifications: {
      capacitance: 100,
      capacitanceUnit: "nF",
      voltageRating: 50,
      voltageRatingUnit: "V",
      dielectric: "X7R",
      tolerance: 10,
      toleranceUnit: "%",
      operatingTemperatureMin: -55,
      operatingTemperatureMax: 125,
      temperatureUnit: "°C",
      leadSpacing: 2.54,
      leadSpacingUnit: "mm",
      maximumSeatedHeight: 5.08,
      maximumSeatedHeightUnit: "mm",
      dielectricWithstandVoltage: 125,
      dielectricWithstandVoltageUnit: "V",
      dissipationFactor: 2.5,
      dissipationFactorUnit: "%",
      dissipationFactorTest: "1 kHz, 1.0 Vrms",
      insulationResistance: 10,
      insulationResistanceUnit: "GΩ",
      agingRate: 3,
      agingRateUnit: "% per decade-hour",
    },
    package: {
      name: "Radial (GoldMax 300, C315)",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 3.81,
        widthMm: 2.54,
        heightMm: 3.14,
        seatedHeightMm: 5.08,
      },
      pcbLayout: {
        leadPitchMm: 2.54,
      },
      footprintDimensions: {},
      padLayout: "Radial, 2 leads, 2.54 mm lead pitch",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "Lead 1", function: "Capacitor terminal" },
      { number: 2, name: "Lead 2", function: "Capacitor terminal" },
    ],
    datasheetUrl:
      "https://search.kemet.com/component-documentation/download/specsheet/C315C104K5R5TA",
    manufacturerUrl: "https://www.kemet.com/",
    imageUrl: "/images/components/C315C104K5R5TA.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "RLB0914-101KL",
    name: "100 µH Radial Leaded Power Inductor",
    category: "Inductors",
    manufacturer: "Bourns",
    description:
      "A radial leaded power inductor with ferrite core offering 100 µH inductance, commonly used in DC-DC converters, switching power supplies, and output filters.",
    specifications: {
      inductance: 100,
      inductanceUnit: "µH",
      tolerance: 10,
      toleranceUnit: "%",
      ratedCurrent: 1.1,
      ratedCurrentUnit: "A",
      saturationCurrentTypical: 2.1,
      saturationCurrentUnit: "A",
      dcResistanceMax: 0.28,
      dcResistanceUnit: "Ω",
      selfResonantFrequencyMin: 3.5,
      selfResonantFrequencyUnit: "MHz",
      maximumSeatedHeight: 12.0,
      maximumSeatedHeightUnit: "mm",
      operatingTemperatureMin: -20,
      operatingTemperatureMax: 80,
      temperatureUnit: "°C",
      ratedCurrentCondition: "25\u202f°C ambient, 10\u202f°C temperature rise",
      saturationCurrentCondition: "Inductance drops ~10\u202f% at saturation",
      qFactor: 30,
      qFactorTestFrequency: 0.796,
      qFactorTestFrequencyUnit: "MHz",
      leadSpacing: 5.0,
      leadSpacingUnit: "mm",
    },
    package: {
      name: "Radial (RLB0914)",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 8.7,
        widthMm: 8.7,
        heightMm: 12.0,
        seatedHeightMm: 12.0,
      },
      pcbLayout: {
        leadPitchMm: 5.0,
      },
      footprintDimensions: {},
      padLayout: "Radial, 2 leads, 5.0 mm lead pitch",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "Lead 1", function: "Inductor terminal" },
      { number: 2, name: "Lead 2", function: "Inductor terminal" },
    ],
    datasheetUrl: "https://www.bourns.com/docs/Product-Datasheets/rlb0914.pdf",
    manufacturerUrl: "https://www.bourns.com/",
    imageUrl: "/images/components/RLB0914-101KL.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "B3F-1000",
    name: "SPST-NO Tactile Switch (6 mm × 6 mm)",
    category: "Switches and protection components",
    manufacturer: "OMRON",
    description:
      "A 6 mm × 6 mm through-hole tactile push-button switch with positive click action, commonly used for reset buttons and digital input keys.",
    specifications: {
      contactForm: "SPST-NO",
      switchingCapacityMax: 50,
      switchingCapacityUnit: "mA at 24 VDC",
      operatingForce: 0.98,
      operatingForceUnit: "N",
      contactResistanceMax: 100,
      contactResistanceUnit: "mΩ",
      mechanicalLife: 1000000,
      mechanicalLifeUnit: "Operations",
    },
    package: {
      name: "Tactile 6x6 mm Through-Hole",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 6.0,
        widthMm: 6.0,
        heightMm: 3.4,
        seatedHeightMm: 4.3,
      },
      pcbLayout: {
        leadPitchMm: 4.5,
        rowSpacingMm: 6.5,
        drillDiameterMm: 1.0,
      },
      footprintDimensions: {},
      padLayout: "4-pin through-hole, 6.5 mm × 4.5 mm pitch, 1.0 mm drill",
      landPatternUrl: "",
    },
    pins: [
      {
        number: 1,
        name: "1",
        function: "Terminal 1 (internally connected to terminal 2)",
      },
      {
        number: 2,
        name: "2",
        function: "Terminal 2 (internally connected to terminal 1)",
      },
      {
        number: 3,
        name: "3",
        function: "Terminal 3 (internally connected to terminal 4)",
      },
      {
        number: 4,
        name: "4",
        function: "Terminal 4 (internally connected to terminal 3)",
      },
    ],
    datasheetUrl: "https://omronfs.omron.com/en_US/ecb/products/pdf/en-b3f.pdf",
    manufacturerUrl: "https://components.omron.com/",
    imageUrl: "/images/components/B3F-1000.webp",
    dataStatus: "incomplete",
  },
  {
    partNumber: "0022232041",
    name: "KK 254 Solid Header, Vertical, 4 Circuits",
    category: "Connectors",
    manufacturer: "Molex",
    description:
      "A 4-circuit vertical single-row friction lock header with 2.54 mm pitch, commonly used for wire-to-board power and signal interconnects.",
    specifications: {
      pitch: 2.54,
      pitchUnit: "mm",
      numberOfCircuits: 4,
      currentMax: 4.0,
      currentUnit: "A per contact",
      voltageMax: 500,
      voltageUnit: "V",
      contactPlating: "Tin",
    },
    package: {
      name: "KK 254 Vertical Header (6373 Series)",
      mountingType: "Through-Hole",
      bodyDimensions: {
        lengthMm: 10.16,
        widthMm: 6.35,
        heightMm: 8.15,
        seatedHeightMm: 11.3,
      },
      pcbLayout: {
        leadPitchMm: 2.54,
        drillDiameterMm: 1.02,
      },
      footprintDimensions: {},
      padLayout: "4-pin single row, 2.54 mm pitch, 1.02 mm drill",
      landPatternUrl: "",
    },
    pins: [
      { number: 1, name: "1", function: "Circuit 1 contact" },
      { number: 2, name: "2", function: "Circuit 2 contact" },
      { number: 3, name: "3", function: "Circuit 3 contact" },
      { number: 4, name: "4", function: "Circuit 4 contact" },
    ],
    datasheetUrl: "https://www.molex.com/pdm_docs/sd/022232041_sd.pdf",
    manufacturerUrl:
      "https://www.molex.com/en-us/products/part-detail/22232041",
    imageUrl: "/images/components/0022232041.webp",
    dataStatus: "incomplete",
  },
];

function buildSetObject(component) {
  const set = {};

  [
    "partNumber",
    "name",
    "category",
    "manufacturer",
    "description",
    "imageUrl",
    "datasheetUrl",
    "manufacturerUrl",
    "dataStatus",
  ].forEach((key) => {
    if (component[key] !== undefined) {
      set[key] = component[key];
    }
  });

  if (component.specifications) {
    for (const [key, value] of Object.entries(component.specifications)) {
      set[`specifications.${key}`] = value;
    }
  }

  if (component.package) {
    for (const [key, value] of Object.entries(component.package)) {
      if (value === undefined) continue;

      const isDimensionObject =
        ["bodyDimensions", "pcbLayout", "footprintDimensions"].includes(key) &&
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);

      if (isDimensionObject) {
        for (const [subKey, subValue] of Object.entries(value)) {
          set[`package.${key}.${subKey}`] = subValue;
        }
      } else {
        set[`package.${key}`] = value;
      }
    }
  }

  if (Array.isArray(component.pins)) {
    set.pins = component.pins;
  }

  return set;
}

async function seedComponents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    for (const component of components) {
      const setObject = buildSetObject(component);

      await Component.updateOne(
        { partNumber: component.partNumber },
        { $set: setObject },
        { upsert: true, runValidators: true }
      );
    }

    console.log("Component seed completed successfully");
    console.log(`Processed ${components.length} component records`);
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedComponents();
