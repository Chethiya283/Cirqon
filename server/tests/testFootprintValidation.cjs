// Automated footprint validation test suite for catalogue components

const fs = require("fs");
const path = require("path");

process.env.NODE_PATH = path.join(__dirname, "../node_modules");
require("module").Module._initPaths();

const seedPath = path.join(__dirname, "../scripts/seedComponents.js");
const seedContent = fs.readFileSync(seedPath, "utf8");

let components;
try {
  const startIdx = seedContent.indexOf("const components = [");
  const endIdx = seedContent.indexOf("function buildSetObject");
  const rawArray = seedContent.slice(startIdx + "const components = ".length, endIdx).trim().replace(/;$/, "");
  components = eval(rawArray);
} catch (e) {
  console.error("Failed to parse components:", e.message);
}

function validateComponentFootprint(component) {
  const pkg = component.package;
  const pkgName = (pkg && pkg.name) ? pkg.name.trim() : "";
  const mountingType = (pkg && pkg.mountingType) ? pkg.mountingType.trim() : "";
  const mountingLower = mountingType.toLowerCase();
  const isSmd =
    mountingLower.includes("surface") ||
    mountingLower.includes("smd") ||
    mountingLower.includes("smt");
  const isThroughHole =
    mountingLower.includes("through") ||
    mountingLower.includes("tht") ||
    (!isSmd && mountingType.length > 0);

  const bodyDims = pkg && pkg.bodyDimensions;
  const fpDims = pkg && pkg.footprintDimensions;
  const hasBodyDims =
    (bodyDims && bodyDims.lengthMm != null && bodyDims.widthMm != null) ||
    (fpDims && fpDims.lengthMm != null && fpDims.widthMm != null);

  const isAxial =
    pkgName.toLowerCase().includes("axial") ||
    pkgName.toLowerCase().includes("do-35") ||
    pkgName.toLowerCase().includes("do-41") ||
    pkgName.toLowerCase().includes("mfr-25");

  const isDip =
    pkgName.toLowerCase().includes("dip") ||
    component.category.toLowerCase().includes("ic") ||
    component.category.toLowerCase().includes("circuit");

  const storedPitch = pkg && pkg.pcbLayout && pkg.pcbLayout.leadPitchMm;
  const storedRowSpacing = pkg && pkg.pcbLayout && pkg.pcbLayout.rowSpacingMm;
  const storedPadSize = pkg && pkg.pcbLayout && pkg.pcbLayout.padDiameterMm;
  const storedDrill = pkg && pkg.pcbLayout && pkg.pcbLayout.drillDiameterMm;
  const pins = component.pins || [];
  const pinCount = pins.length;

  const canDraw = hasBodyDims && (storedPitch != null || isAxial) && pinCount > 0;

  const checks = [];

  checks.push({
    id: "package-identity",
    state: pkgName ? "passed" : "missing",
    value: pkgName,
  });

  checks.push({
    id: "mounting-type",
    state: mountingType ? "passed" : "missing",
    value: mountingType,
  });

  checks.push({
    id: "body-dimensions",
    state: hasBodyDims ? "passed" : "missing",
    value: hasBodyDims ? `${bodyDims.lengthMm}x${bodyDims.widthMm}mm` : "missing",
  });

  checks.push({
    id: "pin-configuration",
    state: pinCount > 0 ? "passed" : "missing",
    value: `${pinCount} pins`,
  });

  if (isAxial) {
    checks.push({
      id: "lead-pitch",
      state: "not-applicable",
      value: "Flexible axial leads (user-bend dependent)",
    });
  } else if (isDip) {
    checks.push({
      id: "lead-pitch",
      state: storedPitch != null && storedRowSpacing != null ? "passed" : "unverified",
      value: `${storedPitch}mm pitch, ${storedRowSpacing}mm row spacing`,
    });
  } else {
    checks.push({
      id: "lead-pitch",
      state: storedPitch != null ? "passed" : "missing",
      value: `${storedPitch}mm pitch`,
    });
  }

  checks.push({
    id: "pad-dimensions",
    state: storedPadSize != null ? "passed" : canDraw ? "unverified" : "missing",
    value: storedPadSize != null ? `${storedPadSize}mm` : "Placeholder / Missing",
  });

  if (isSmd) {
    checks.push({
      id: "drill-diameter",
      state: "not-applicable",
      value: "N/A (Surface mount)",
    });
  } else {
    checks.push({
      id: "drill-diameter",
      state: storedDrill != null ? "passed" : canDraw ? "unverified" : "missing",
      value: storedDrill != null ? `${storedDrill}mm` : "Placeholder / Missing",
    });
  }

  checks.push({
    id: "datasheet-documentation",
    state: component.datasheetUrl ? "passed" : "missing",
    value: component.datasheetUrl || "none",
  });

  const applicable = checks.filter((c) => c.state !== "not-applicable");
  const passed = applicable.filter((c) => c.state === "passed");
  const isAllPassed = passed.length === applicable.length;
  const isVerified = component.dataStatus === "verified" && isAllPassed;

  let status;
  if (isVerified) {
    status = "verified";
  } else if (canDraw) {
    status = "illustrative";
  } else {
    status = "incomplete";
  }

  return {
    partNumber: component.partNumber,
    name: component.name,
    status,
    isFabricationReady: status === "verified",
    checks,
    passedCount: passed.length,
    totalCount: applicable.length,
  };
}

console.log("=== CIRQON FOOTPRINT VALIDATION TEST SUITE ===");

const testParts = ["LM358", "NE555", "BC547", "B3F-1000", "MFR-25FTE52-10K"];
let allPassed = true;

for (const pn of testParts) {
  const comp = components.find((c) => c.partNumber === pn);
  if (!comp) {
    console.error(`ERROR: Target part ${pn} not found in seed catalogue!`);
    allPassed = false;
    continue;
  }

  const res = validateComponentFootprint(comp);
  console.log(`\nComponent: ${res.partNumber} (${res.name})`);
  console.log(`Validation Status: ${res.status.toUpperCase()} (Fabrication Ready: ${res.isFabricationReady})`);
  console.log(`Checks Passed: ${res.passedCount} / ${res.totalCount}`);
  for (const c of res.checks) {
    console.log(`  - [${c.state.toUpperCase()}] ${c.id}: ${c.value}`);
  }

  if (pn === "LM358" || pn === "NE555") {
    if (res.status !== "illustrative") {
      console.error(`FAIL: ${pn} should be illustrative, got ${res.status}`);
      allPassed = false;
    }
    if (res.isFabricationReady) {
      console.error(`FAIL: ${pn} must not be fabrication ready`);
      allPassed = false;
    }
  }

  if (pn === "MFR-25FTE52-10K") {
    const pitchCheck = res.checks.find((c) => c.id === "lead-pitch");
    if (pitchCheck.state !== "not-applicable") {
      console.error(`FAIL: MFR-25 pitch check should be not-applicable, got ${pitchCheck.state}`);
      allPassed = false;
    }
    if (res.status !== "illustrative") {
      console.error(`FAIL: MFR-25 should be illustrative, got ${res.status}`);
      allPassed = false;
    }
  }

  if (pn === "B3F-1000") {
    const drillCheck = res.checks.find((c) => c.id === "drill-diameter");
    if (drillCheck.state !== "passed") {
      console.error(`FAIL: B3F-1000 drill should be passed, got ${drillCheck.state}`);
      allPassed = false;
    }
    if (res.status !== "illustrative") {
      console.error(`FAIL: B3F-1000 should be illustrative because pad is unverified`);
      allPassed = false;
    }
  }
}

if (allPassed) {
  console.log("\n>>> ALL TEST ASSERTIONS PASSED SUCCESSFULLY! <<<");
  process.exit(0);
} else {
  console.error("\n>>> SOME ASSERTIONS FAILED! <<<");
  process.exit(1);
}
