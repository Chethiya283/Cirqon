// Unit tests and verification assertions for Cirqon Footprint Validation system.

import type { ComponentData } from "../types";
import {
  validateComponentFootprint,
  auditComponentFootprint,
} from "../utils/footprint";

export function runValidationUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      console.error(`Assertion failed: ${msg}`);
    }
  }

  // Test 1: LM358 (DIP-8, verified body and pitch, missing pad diameter and drill)
  const lm358: ComponentData = {
    _id: "lm358-test",
    partNumber: "LM358",
    name: "Dual Op-Amp",
    category: "Integrated circuits (ICs)",
    manufacturer: "Texas Instruments",
    description: "Op-Amp",
    package: {
      name: "PDIP-8",
      mountingType: "Through-Hole",
      bodyDimensions: { lengthMm: 9.27, widthMm: 6.35, heightMm: 3.3 },
      pcbLayout: { leadPitchMm: 2.54, rowSpacingMm: 7.62 },
    },
    pins: [
      { number: 1, name: "OUT1" },
      { number: 2, name: "IN1-" },
      { number: 3, name: "IN1+" },
      { number: 4, name: "V-" },
      { number: 5, name: "IN2+" },
      { number: 6, name: "IN2-" },
      { number: 7, name: "OUT2" },
      { number: 8, name: "V+" },
    ],
    datasheetUrl: "https://www.ti.com/lit/ds/symlink/lm358.pdf",
    dataStatus: "incomplete",
  };

  const vLm358 = validateComponentFootprint(lm358);
  assert(
    vLm358.status === "illustrative",
    "LM358 status must be illustrative because pad & drill are unverified placeholders"
  );
  assert(
    !vLm358.isDatasheetChecked,
    "LM358 must not be marked datasheet-checked"
  );
  assert(
    vLm358.checks.some((c) => c.id === "lead-pitch" && c.state === "passed"),
    "LM358 must have passed lead pitch check"
  );
  assert(
    vLm358.checks.some((c) => c.id === "pad-dimensions" && c.state === "unverified"),
    "LM358 must flag pad dimensions as unverified"
  );
  assert(
    vLm358.checks.some((c) => c.id === "drill-diameter" && c.state === "unverified"),
    "LM358 must flag drill diameter as unverified"
  );

  // Test 2: MFR-25FTE52-10K (Axial Resistor: flexible leads, variable bend span)
  const mfr25: ComponentData = {
    _id: "mfr25-test",
    partNumber: "MFR-25FTE52-10K",
    name: "10 kΩ Resistor",
    category: "Resistors",
    manufacturer: "Yageo",
    description: "Axial Resistor",
    package: {
      name: "Axial (MFR-25)",
      mountingType: "Through-Hole",
      bodyDimensions: { lengthMm: 6.3, widthMm: 2.4, heightMm: 2.4 },
    },
    pins: [
      { number: 1, name: "Lead 1" },
      { number: 2, name: "Lead 2" },
    ],
    datasheetUrl: "https://yageogroup.com/datasheet.pdf",
    dataStatus: "incomplete",
  };

  const vMfr25 = validateComponentFootprint(mfr25);
  assert(
    vMfr25.status === "illustrative",
    "MFR-25 status must be illustrative due to flexible axial leads and placeholder pads"
  );
  assert(
    vMfr25.checks.some((c) => c.id === "lead-pitch" && c.state === "not-applicable"),
    "MFR-25 flexible axial lead pitch must be marked not-applicable"
  );

  // Test 3: B3F-1000 (Tactile Switch: verified 1.0mm drill and grid, missing pad diameter)
  const b3f: ComponentData = {
    _id: "b3f-test",
    partNumber: "B3F-1000",
    name: "Tactile Switch",
    category: "Switches and protection components",
    manufacturer: "OMRON",
    description: "Tactile Switch",
    package: {
      name: "Tactile 6x6 mm Through-Hole",
      mountingType: "Through-Hole",
      bodyDimensions: { lengthMm: 6.0, widthMm: 6.0, heightMm: 3.4 },
      pcbLayout: { leadPitchMm: 4.5, rowSpacingMm: 6.5, drillDiameterMm: 1.0 },
    },
    pins: [
      { number: 1, name: "1" },
      { number: 2, name: "2" },
      { number: 3, name: "3" },
      { number: 4, name: "4" },
    ],
    datasheetUrl: "https://omronfs.omron.com/en-b3f.pdf",
    dataStatus: "incomplete",
  };

  const vB3f = validateComponentFootprint(b3f);
  assert(
    vB3f.status === "illustrative",
    "B3F-1000 must be illustrative because pad diameter is unverified"
  );
  assert(
    vB3f.checks.some((c) => c.id === "drill-diameter" && c.state === "passed"),
    "B3F-1000 must pass drill diameter check"
  );

  // Test 4: Fully Verified hypothetical part
  const fullyVerified: ComponentData = {
    _id: "verified-test",
    partNumber: "VERIFIED-PART",
    name: "Fully Verified IC",
    category: "Integrated circuits (ICs)",
    manufacturer: "Cirqon Labs",
    description: "Verified IC",
    package: {
      name: "PDIP-8",
      mountingType: "Through-Hole",
      bodyDimensions: { lengthMm: 9.27, widthMm: 6.35, heightMm: 3.3 },
      pcbLayout: {
        leadPitchMm: 2.54,
        rowSpacingMm: 7.62,
        padDiameterMm: 1.8,
        drillDiameterMm: 0.8,
      },
    },
    pins: [
      { number: 1, name: "P1" },
      { number: 2, name: "P2" },
      { number: 3, name: "P3" },
      { number: 4, name: "P4" },
      { number: 5, name: "P5" },
      { number: 6, name: "P6" },
      { number: 7, name: "P7" },
      { number: 8, name: "P8" },
    ],
    datasheetUrl: "https://example.com/datasheet.pdf",
    dataStatus: "verified",
  };

  const vFull = validateComponentFootprint(fullyVerified);
  assert(
    vFull.status === "illustrative",
    "Part with dataStatus: 'verified' and all geometry present must remain illustrative because per-field source citations are not stored"
  );
  assert(
    !vFull.isDatasheetChecked,
    "Part must not be datasheet-checked without stored per-field source citations"
  );
  assert(
    vFull.requirementsNotice.includes(
      "Verified status needs per-field datasheet source references"
    ),
    "Part must display requirementsNotice for missing per-field source references"
  );

  // Test 5: Incomplete component missing lead pitch
  const missingPitchPart: ComponentData = {
    _id: "missing-pitch-test",
    partNumber: "NO-PITCH-IC",
    name: "Incomplete Part",
    category: "Integrated circuits (ICs)",
    manufacturer: "Generic",
    description: "Incomplete",
    package: {
      name: "DIP-8",
      mountingType: "Through-Hole",
      bodyDimensions: { lengthMm: 9.0, widthMm: 6.0 },
    },
    pins: [{ number: 1, name: "P1" }],
    dataStatus: "incomplete",
  };

  const vIncomplete = validateComponentFootprint(missingPitchPart);
  assert(
    vIncomplete.status === "incomplete",
    "Part with missing lead pitch must receive incomplete status"
  );
  assert(
    vIncomplete.missingCrucialData,
    "Missing crucial data flag must be true"
  );

  // Test 6: SMD component drill check must be not-applicable
  const smdPart: ComponentData = {
    _id: "smd-test",
    partNumber: "SMD-SOIC-8",
    name: "SMD Component",
    category: "Integrated circuits (ICs)",
    manufacturer: "TI",
    description: "Surface mount",
    package: {
      name: "SOIC-8",
      mountingType: "Surface Mount",
      bodyDimensions: { lengthMm: 4.9, widthMm: 3.9 },
      pcbLayout: { leadPitchMm: 1.27 },
    },
    pins: [{ number: 1, name: "1" }],
    datasheetUrl: "https://example.com/smd.pdf",
    dataStatus: "incomplete",
  };

  const vSmd = validateComponentFootprint(smdPart);
  assert(
    vSmd.checks.some((c) => c.id === "drill-diameter" && c.state === "not-applicable"),
    "SMD parts must have drill diameter marked not-applicable"
  );

  // Test 7: auditComponentFootprint integration returns validation object
  const auditRes = auditComponentFootprint(lm358);
  assert(
    auditRes.validation != null && auditRes.validation.status === "illustrative",
    "auditComponentFootprint must embed validation result"
  );

  return { passed, failed };
}

