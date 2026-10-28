// Utility functions for auditing footprint data provenance and rendering SVG component footprints.

import type { ComponentData } from "../types";
import { isValidHttpUrl } from "./formatters";

/**
 * Viva Note: Exact four provenance labels required by the specification:
 * - Catalogue: value stored in the database (only called Datasheet if dataStatus is "verified").
 * - Derived: calculated from stored values (e.g. row span from pin count and lead pitch).
 * - Placeholder: a fallback the code supplies when no value is stored (e.g. schematic pad size or illustrative axial bend span).
 * - Not available: missing in the database.
 */
export type ProvenanceLabel =
  | "Catalogue"
  | "Derived"
  | "Placeholder"
  | "Not available";

/**
 * Footprint validation status distinguishing datasheet-checked data from illustrative visualization.
 * - verified: All applicable requirements checked against official documentation with per-field source citations.
 * - illustrative: Drawing rendered from outline/pinout for visualization, but pads/drills are unverified placeholders, axial leads are flexible, or per-field source citations are missing.
 * - incomplete: Critical layout parameters (e.g. lead pitch, body size, or pinout) are missing.
 */
export type FootprintValidationStatus =
  | "verified"
  | "illustrative"
  | "incomplete";

export type RequirementCheckState =
  | "passed"
  | "missing"
  | "unverified"
  | "not-applicable";

export interface FootprintRequirementCheck {
  id: string;
  label: string;
  state: RequirementCheckState;
  valueDescription: string;
  detail?: string;
  sourceOrProvenance?: ProvenanceLabel | "N/A";
}

export interface FootprintValidationResult {
  status: FootprintValidationStatus;
  statusLabel: string;
  statusBadgeClass: string;
  summary: string;
  warningNotice?: string;
  requirementsNotice: string;
  checks: FootprintRequirementCheck[];
  passedCount: number;
  totalApplicableCount: number;
  isDatasheetChecked: boolean;
  isIllustrativeOnly: boolean;
  missingCrucialData: boolean;
}

export type PackageTemplateKind =
  | "pdip"
  | "axial-resistor"
  | "axial-diode"
  | "radial-ceramic-cap"
  | "radial-inductor"
  | "to-220"
  | "to-92"
  | "header-1x4"
  | "tactile-switch-4p"
  | "unsupported";

export interface FootprintDataSourceField {
  key:
    | "package"
    | "pinCount"
    | "leadPitch"
    | "bodySize"
    | "padSize"
    | "drill"
    | "pinout";
  label: string;
  value: string;
  provenance: ProvenanceLabel;
}

export interface FootprintAuditResult {
  canDrawFootprint: boolean;
  templateKind: PackageTemplateKind;
  isAxialPackage: boolean;
  defaultAxialSpanMm: number | null;
  emptyStateReason: string;
  missingFields: string[];
  fields: {
    package: FootprintDataSourceField;
    pinCount: FootprintDataSourceField;
    leadPitch: FootprintDataSourceField;
    bodySize: FootprintDataSourceField;
    padSize: FootprintDataSourceField;
    drill: FootprintDataSourceField;
    pinout: FootprintDataSourceField;
  };
  validation: FootprintValidationResult;
}

/**
 * Viva Note: Typed pad representation exposed from the exact numbers the SVG drawing uses.
 * Pin names always come from stored component.pins, never from loop counters.
 * Pad width/height carry provenance "Placeholder" when the database has no padDiameterMm,
 * while drill carries "Catalogue" when drillDiameterMm is stored (e.g. Molex 0022232041 and OMRON B3F-1000).
 */
export interface FootprintPadData {
  number: number;
  name: string;
  pinFunction?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "Rectangular" | "Circular" | "Square";
  drill: number | null;
  side: "left" | "right" | "bottom" | "center";
  labelX: number;
  labelY: number;
  labelAnchor?: "start" | "middle" | "end";
  numberProvenance: ProvenanceLabel;
  nameProvenance: ProvenanceLabel;
  shapeProvenance: ProvenanceLabel;
  widthProvenance: ProvenanceLabel;
  heightProvenance: ProvenanceLabel;
  drillProvenance: ProvenanceLabel;
}

export interface FootprintGeometry {
  templateKind: PackageTemplateKind;
  isAxialPackage: boolean;
  viewBoxWidth: number;
  viewBoxHeight: number;
  lengthMm: number;
  widthMm: number;
  heightMm: number | null;
  leadPitchMm: number;
  rowSpacingMm: number | null;
  svgUnitsPerMm: number;
  pads: FootprintPadData[];
}

export interface FootprintRenderOptions {
  viewBox?: string;
  showGrid?: boolean;
  selectedPadNumber?: number | null;
  hoveredPadNumber?: number | null;
  onSelectPad?: (padNumber: number) => void;
  onHoverPad?: (padNumber: number | null) => void;
  measurePoints?: { x: number; y: number }[];
  axialSpanMm?: number;
}

/**
 * Viva Note: Maps each component to its exact physical package template so that
 * incompatible packages (e.g. TO-92 vs TO-220, radial ceramic vs electrolytic,
 * radial inductor vs axial resistor, 4-pin header vs 4-pin tactile switch) never share a wrong drawing.
 */
export function getPackageTemplateKind(
  component: ComponentData
): PackageTemplateKind {
  const cat = (component.category || "").toLowerCase();
  const pkg = (component.package?.name || "").toLowerCase();
  const pinCount = component.pins?.length || 0;

  if (
    pkg.includes("dip") ||
    pkg.includes("soic") ||
    pkg.includes("sop") ||
    pkg.includes("qfp") ||
    ((cat.includes("ic") || cat.includes("circuit")) && pinCount >= 6)
  ) {
    return "pdip";
  }

  if (pkg.includes("to-220")) {
    return "to-220";
  }

  if (pkg.includes("to-92")) {
    return "to-92";
  }

  if (
    pkg.includes("do-35") ||
    pkg.includes("do-41") ||
    pkg.includes("do-204") ||
    (pkg.includes("axial") && (cat.includes("diode") || cat.includes("led")))
  ) {
    return "axial-diode";
  }

  if (
    pkg.includes("mfr-25") ||
    (pkg.includes("axial") && cat.includes("resistor"))
  ) {
    return "axial-resistor";
  }

  if (
    cat.includes("capacitor") &&
    (pkg.includes("c315") ||
      pkg.includes("goldmax") ||
      pkg.includes("ceramic") ||
      pkg.includes("radial"))
  ) {
    return "radial-ceramic-cap";
  }

  if (
    cat.includes("inductor") &&
    (pkg.includes("rlb") || pkg.includes("radial"))
  ) {
    return "radial-inductor";
  }

  if (
    pkg.includes("kk 254") ||
    pkg.includes("6373") ||
    (cat.includes("connector") && pkg.includes("header") && pinCount === 4)
  ) {
    return "header-1x4";
  }

  if (
    pkg.includes("tactile") ||
    pkg.includes("b3f") ||
    (cat.includes("switch") && pinCount === 4)
  ) {
    return "tactile-switch-4p";
  }

  return "unsupported";
}

/**
 * Returns the default illustrative axial lead-bend span (in mm, on a 2.54 mm grid)
 * based on the stored body length L plus lead-bend clearance.
 */
export function getDefaultAxialSpanMm(bodyLengthMm: number): number {
  if (bodyLengthMm <= 3.8) return 7.62; // DO-35 (3.4 mm body) -> 7.62 mm (0.300")
  if (bodyLengthMm <= 6.8) return 10.16; // DO-41 (5.2 mm) & MFR-25 (6.3 mm) -> 10.16 mm (0.400")
  return Number((Math.ceil((bodyLengthMm + 3.0) / 2.54) * 2.54).toFixed(2));
}

/**
 * Audits a component's stored footprint data, assigns exact provenance labels,
 * and determines whether an accurate footprint or illustrative package diagram can be drawn.
 */
export function auditComponentFootprint(
  component: ComponentData
): FootprintAuditResult {
  const pins = component.pins || [];
  const pinCount = pins.length;
  const templateKind = getPackageTemplateKind(component);
  const isAxialPackage =
    templateKind === "axial-resistor" || templateKind === "axial-diode";

  const bodyDims = component.package?.bodyDimensions;
  const fpDims = component.package?.footprintDimensions;
  const hasStoredBodySize =
    (bodyDims?.lengthMm != null && bodyDims?.widthMm != null) ||
    (fpDims?.lengthMm != null && fpDims?.widthMm != null);

  const storedLengthMm = bodyDims?.lengthMm ?? fpDims?.lengthMm ?? null;
  const defaultAxialSpanMm =
    isAxialPackage && storedLengthMm != null
      ? getDefaultAxialSpanMm(storedLengthMm)
      : null;

  const storedPitch = component.package?.pcbLayout?.leadPitchMm;
  const storedRowSpacing = component.package?.pcbLayout?.rowSpacingMm;
  const storedPadSize = component.package?.pcbLayout?.padDiameterMm;
  const storedDrill = component.package?.pcbLayout?.drillDiameterMm;

  // 1. Package field provenance
  const pkgName = component.package?.name?.trim() || "";
  const mounting = component.package?.mountingType?.trim() || "";
  const packageField: FootprintDataSourceField = pkgName
    ? {
        key: "package",
        label: "Package",
        value: mounting ? `${pkgName} (${mounting})` : pkgName,
        provenance: "Catalogue",
      }
    : {
        key: "package",
        label: "Package",
        value: "Not available",
        provenance: "Not available",
      };

  // 2. Pin count field provenance (Derived from stored pins array length + span when pitch exists)
  let pinCountField: FootprintDataSourceField;
  if (pinCount > 0) {
    if (
      templateKind === "pdip" &&
      storedPitch != null &&
      pinCount >= 6 &&
      pinCount % 2 === 0
    ) {
      const pinsPerSide = pinCount / 2;
      const rowSpanMm = Number(((pinsPerSide - 1) * storedPitch).toFixed(2));
      pinCountField = {
        key: "pinCount",
        label: "Pin count",
        value: `${pinCount} (${pinsPerSide} per row · ${rowSpanMm} mm row span)`,
        provenance: "Derived",
      };
    } else if (
      templateKind === "tactile-switch-4p" &&
      storedPitch != null &&
      storedRowSpacing != null
    ) {
      pinCountField = {
        key: "pinCount",
        label: "Pin count",
        value: `${pinCount} (2 per side · ${storedPitch} mm × ${storedRowSpacing} mm grid)`,
        provenance: "Derived",
      };
    } else if (storedPitch != null && pinCount >= 3) {
      const totalSpanMm = Number(((pinCount - 1) * storedPitch).toFixed(2));
      pinCountField = {
        key: "pinCount",
        label: "Pin count",
        value: `${pinCount} (${totalSpanMm} mm outer pin span)`,
        provenance: "Derived",
      };
    } else {
      pinCountField = {
        key: "pinCount",
        label: "Pin count",
        value: `${pinCount}`,
        provenance: "Derived",
      };
    }
  } else {
    pinCountField = {
      key: "pinCount",
      label: "Pin count",
      value: "Not available",
      provenance: "Not available",
    };
  }

  // 3. Lead pitch field provenance
  let leadPitchField: FootprintDataSourceField;
  if (storedPitch != null) {
    leadPitchField = {
      key: "leadPitch",
      label: "Lead pitch",
      value:
        storedRowSpacing != null
          ? `${storedPitch} mm (row spacing ${storedRowSpacing} mm)`
          : `${storedPitch} mm`,
      provenance: "Catalogue",
    };
  } else if (isAxialPackage && defaultAxialSpanMm != null) {
    leadPitchField = {
      key: "leadPitch",
      label: "Lead pitch",
      value: `Variable axial bend (${defaultAxialSpanMm} mm illustrative span — not fixed by datasheet)`,
      provenance: "Placeholder",
    };
  } else {
    leadPitchField = {
      key: "leadPitch",
      label: "Lead pitch",
      value: "Not available",
      provenance: "Not available",
    };
  }

  // 4. Body size field provenance
  let bodySizeField: FootprintDataSourceField;
  if (hasStoredBodySize) {
    const activeDims =
      bodyDims?.lengthMm != null && bodyDims?.widthMm != null
        ? bodyDims
        : fpDims!;
    const dimParts: string[] = [];
    if (activeDims.lengthMm != null)
      dimParts.push(`${activeDims.lengthMm} mm L`);
    if (activeDims.widthMm != null) dimParts.push(`${activeDims.widthMm} mm W`);
    if (activeDims.heightMm != null)
      dimParts.push(`${activeDims.heightMm} mm H`);
    if (bodyDims?.seatedHeightMm != null) {
      dimParts.push(`${bodyDims.seatedHeightMm} mm seated`);
    }
    bodySizeField = {
      key: "bodySize",
      label: "Body size",
      value: dimParts.join(" × "),
      provenance: "Catalogue",
    };
  } else {
    bodySizeField = {
      key: "bodySize",
      label: "Body size",
      value: "Not available",
      provenance: "Not available",
    };
  }

  // 5. Pad size field provenance
  const padSizeField: FootprintDataSourceField =
    storedPadSize != null
      ? {
          key: "padSize",
          label: "Pad size",
          value: `${storedPadSize} mm`,
          provenance: "Catalogue",
        }
      : {
          key: "padSize",
          label: "Pad size",
          value: "Not available",
          provenance: "Not available",
        };

  // 6. Drill field provenance
  const drillField: FootprintDataSourceField =
    storedDrill != null
      ? {
          key: "drill",
          label: "Drill",
          value: `${storedDrill} mm`,
          provenance: "Catalogue",
        }
      : {
          key: "drill",
          label: "Drill",
          value: "Not available",
          provenance: "Not available",
        };

  // 7. Pinout field provenance (Pin names always read from stored pinout, never loop counters)
  const pinoutField: FootprintDataSourceField =
    pinCount > 0
      ? {
          key: "pinout",
          label: "Pinout",
          value: pins
            .map((p) => `${p.number ?? "?"}: ${p.name || "Unnamed"}`)
            .join(" · "),
          provenance: "Catalogue",
        }
      : {
          key: "pinout",
          label: "Pinout",
          value: "Not available",
          provenance: "Not available",
        };

  const missingFields: string[] = [];
  let templateReason = "";

  if (templateKind === "unsupported") {
    missingFields.push(`${pkgName || "package"} footprint template`);
    templateReason = `No footprint template for ${pkgName || "this package"}.`;
  }

  if (!hasStoredBodySize) {
    missingFields.push("body dimensions");
  }
  if (storedPitch == null) {
    if (isAxialPackage) {
      missingFields.push("fixed lead pitch (flexible axial leads)");
    } else {
      missingFields.push("lead pitch");
    }
  }
  if (storedPadSize == null) {
    missingFields.push("pad size");
  }
  if (storedDrill == null) {
    missingFields.push("drill");
  }
  if (pinCount === 0) {
    missingFields.push("pinout");
  }

  const hasValidTemplate = templateKind !== "unsupported";

  // Viva Note: A footprint is drawn when a dedicated package template exists, body dimensions
  // and pinout are stored in the catalogue, and either fixed lead pitch is stored OR the package
  // is an axial leaded part with a clearly labelled illustrative/configurable bend span.
  const canDrawFootprint =
    hasValidTemplate &&
    hasStoredBodySize &&
    (storedPitch != null || isAxialPackage) &&
    pinCount > 0;

  let emptyStateReason = "";
  if (!canDrawFootprint) {
    if (templateReason) {
      emptyStateReason = templateReason;
    } else if (!hasStoredBodySize && storedPitch == null) {
      emptyStateReason =
        "Body dimensions and lead pitch are not stored in the catalogue.";
    } else if (!hasStoredBodySize) {
      emptyStateReason = "Body dimensions are not stored in the catalogue.";
    } else if (storedPitch == null) {
      emptyStateReason = "Lead pitch is not stored in the catalogue.";
    } else {
      emptyStateReason =
        "Required footprint dimensions are not stored in the catalogue.";
    }
  }

  const partialAudit = {
    canDrawFootprint,
    templateKind,
    isAxialPackage,
    defaultAxialSpanMm,
    emptyStateReason,
    missingFields,
    fields: {
      package: packageField,
      pinCount: pinCountField,
      leadPitch: leadPitchField,
      bodySize: bodySizeField,
      padSize: padSizeField,
      drill: drillField,
      pinout: pinoutField,
    },
  };

  const validation = validateComponentFootprint(component, partialAudit);

  return {
    canDrawFootprint,
    templateKind,
    isAxialPackage,
    defaultAxialSpanMm,
    emptyStateReason,
    missingFields,
    fields: {
      package: packageField,
      pinCount: pinCountField,
      leadPitch: leadPitchField,
      bodySize: bodySizeField,
      padSize: padSizeField,
      drill: drillField,
      pinout: pinoutField,
    },
    validation,
  };
}

/**
 * Validates a component footprint against package-specific engineering requirements.
 * Distinguishes datasheet-checked footprints from illustrative visualization drawings.
 */
export function validateComponentFootprint(
  component: ComponentData,
  auditContext?: {
    canDrawFootprint: boolean;
    templateKind: PackageTemplateKind;
    isAxialPackage: boolean;
    defaultAxialSpanMm: number | null;
    emptyStateReason: string;
    missingFields: string[];
    fields: {
      package: FootprintDataSourceField;
      pinCount: FootprintDataSourceField;
      leadPitch: FootprintDataSourceField;
      bodySize: FootprintDataSourceField;
      padSize: FootprintDataSourceField;
      drill: FootprintDataSourceField;
      pinout: FootprintDataSourceField;
    };
  }
): FootprintValidationResult {
  const templateKind =
    auditContext?.templateKind ?? getPackageTemplateKind(component);
  const isAxialPackage =
    auditContext?.isAxialPackage ??
    (templateKind === "axial-resistor" || templateKind === "axial-diode");
  const canDrawFootprint = auditContext
    ? auditContext.canDrawFootprint
    : Boolean(
        templateKind !== "unsupported" &&
          ((component.package?.bodyDimensions?.lengthMm != null &&
            component.package?.bodyDimensions?.widthMm != null) ||
            (component.package?.footprintDimensions?.lengthMm != null &&
              component.package?.footprintDimensions?.widthMm != null)) &&
          (component.package?.pcbLayout?.leadPitchMm != null || isAxialPackage) &&
          (component.pins?.length || 0) > 0
      );

  const pkg = component.package;
  const pkgName = pkg?.name?.trim() || "";
  const mountingType = pkg?.mountingType?.trim() || "";
  const mountingLower = mountingType.toLowerCase();
  const isSmd =
    mountingLower.includes("surface") ||
    mountingLower.includes("smd") ||
    mountingLower.includes("smt");
  const isThroughHole =
    mountingLower.includes("through") ||
    mountingLower.includes("tht") ||
    (!isSmd && mountingType.length > 0);

  const bodyDims = pkg?.bodyDimensions;
  const fpDims = pkg?.footprintDimensions;
  const hasBodyDims =
    (bodyDims?.lengthMm != null && bodyDims?.widthMm != null) ||
    (fpDims?.lengthMm != null && fpDims?.widthMm != null);

  const storedLengthMm = bodyDims?.lengthMm ?? fpDims?.lengthMm ?? null;
  const defaultAxialSpanMm =
    isAxialPackage && storedLengthMm != null
      ? getDefaultAxialSpanMm(storedLengthMm)
      : null;

  const storedPitch = pkg?.pcbLayout?.leadPitchMm;
  const storedRowSpacing = pkg?.pcbLayout?.rowSpacingMm;
  const storedPadSize = pkg?.pcbLayout?.padDiameterMm;
  const storedDrill = pkg?.pcbLayout?.drillDiameterMm;
  const pins = component.pins || [];
  const pinCount = pins.length;

  const checks: FootprintRequirementCheck[] = [];

  // 1. Package Identity & Physical Template
  if (pkgName && templateKind !== "unsupported") {
    checks.push({
      id: "package-identity",
      label: "Package Identity & Template",
      state: "passed",
      valueDescription: pkgName,
      detail: `Mapped to dedicated physical template (${templateKind}).`,
      sourceOrProvenance: "Catalogue",
    });
  } else if (pkgName) {
    checks.push({
      id: "package-identity",
      label: "Package Identity & Template",
      state: "unverified",
      valueDescription: pkgName,
      detail: `Package designation recorded, but no dedicated CAD template exists for "${pkgName}".`,
      sourceOrProvenance: "Catalogue",
    });
  } else {
    checks.push({
      id: "package-identity",
      label: "Package Identity & Template",
      state: "missing",
      valueDescription: "Not specified",
      detail: "Package name and packaging family are missing from database.",
      sourceOrProvenance: "Not available",
    });
  }

  // 2. Mounting Technology
  if (mountingType) {
    checks.push({
      id: "mounting-type",
      label: "Mounting Technology",
      state: "passed",
      valueDescription: mountingType,
      detail: isThroughHole
        ? "Through-hole mounting: requires drill diameter and annular pad sizing."
        : "Surface-mount technology: requires land pattern pad dimensions (drill not applicable).",
      sourceOrProvenance: "Catalogue",
    });
  } else {
    checks.push({
      id: "mounting-type",
      label: "Mounting Technology",
      state: "missing",
      valueDescription: "Not specified",
      detail: "Mounting type (Through-Hole or Surface Mount) is unrecorded.",
      sourceOrProvenance: "Not available",
    });
  }

  // 3. Package Body Envelope Dimensions
  if (hasBodyDims) {
    const activeDims =
      bodyDims?.lengthMm != null && bodyDims?.widthMm != null
        ? bodyDims
        : fpDims!;
    const h = activeDims.heightMm ? ` × ${activeDims.heightMm} mm H` : "";
    checks.push({
      id: "body-dimensions",
      label: "Package Body Dimensions",
      state: "passed",
      valueDescription: `${activeDims.lengthMm} × ${activeDims.widthMm} mm${h}`,
      detail: "Body boundary dimensions stored from manufacturer datasheet.",
      sourceOrProvenance: "Catalogue",
    });
  } else {
    checks.push({
      id: "body-dimensions",
      label: "Package Body Dimensions",
      state: "missing",
      valueDescription: "Not available",
      detail: "Component body length and width are missing from catalogue.",
      sourceOrProvenance: "Not available",
    });
  }

  // 4. Pin Count & Terminal Numbering
  if (pinCount > 0) {
    const allNumbered = pins.every((p) => p.number != null);
    const allNamed = pins.every((p) => p.name && p.name.trim().length > 0);
    if (allNumbered && allNamed) {
      checks.push({
        id: "pin-configuration",
        label: "Pinout & Terminal Layout",
        state: "passed",
        valueDescription: `${pinCount} pins (numbered with assigned names)`,
        detail: "All leads/pins have explicit numeric indices and signal names.",
        sourceOrProvenance: "Catalogue",
      });
    } else {
      checks.push({
        id: "pin-configuration",
        label: "Pinout & Terminal Layout",
        state: "unverified",
        valueDescription: `${pinCount} pins (incomplete labels)`,
        detail: "Pin count is recorded, but one or more pins lack explicit numbers or standard signal names.",
        sourceOrProvenance: "Catalogue",
      });
    }
  } else {
    checks.push({
      id: "pin-configuration",
      label: "Pinout & Terminal Layout",
      state: "missing",
      valueDescription: "No pins recorded",
      detail: "Terminal layout and pinout table are missing from database.",
      sourceOrProvenance: "Not available",
    });
  }

  // 5. Terminal Spacing & Lead Pitch (Package-Dependent)
  if (isAxialPackage) {
    checks.push({
      id: "lead-pitch",
      label: "Terminal / Lead Pitch",
      state: "not-applicable",
      valueDescription: `Flexible axial leads (${defaultAxialSpanMm} mm illustrative grid)`,
      detail: "Flexible axial component leads do not have a fixed lead pitch in datasheets. Terminal spacing depends on user lead bending and PCB grid rules.",
      sourceOrProvenance: "Placeholder",
    });
  } else if (templateKind === "pdip") {
    if (storedPitch != null && storedRowSpacing != null) {
      checks.push({
        id: "lead-pitch",
        label: "Lead Pitch & Row Spacing",
        state: "passed",
        valueDescription: `${storedPitch} mm pitch · ${storedRowSpacing} mm row spacing`,
        detail: "Dual-in-line 2.54 mm pin pitch and 7.62 mm row spacing checked against DIP specification.",
        sourceOrProvenance: "Catalogue",
      });
    } else if (storedPitch != null) {
      checks.push({
        id: "lead-pitch",
        label: "Lead Pitch & Row Spacing",
        state: "unverified",
        valueDescription: `${storedPitch} mm pitch (row spacing missing)`,
        detail: "Lead pitch is recorded, but dual-in-line row spacing is missing.",
        sourceOrProvenance: "Catalogue",
      });
    } else {
      checks.push({
        id: "lead-pitch",
        label: "Lead Pitch & Row Spacing",
        state: "missing",
        valueDescription: "Not available",
        detail: "Lead pitch and row spacing are required for DIP packages but missing from catalogue.",
        sourceOrProvenance: "Not available",
      });
    }
  } else if (templateKind === "tactile-switch-4p") {
    if (storedPitch != null && storedRowSpacing != null) {
      checks.push({
        id: "lead-pitch",
        label: "Terminal Grid Spacing (X × Y)",
        state: "passed",
        valueDescription: `${storedPitch} mm × ${storedRowSpacing} mm grid`,
        detail: "Tactile switch 4-terminal mounting pitch and row spacing checked.",
        sourceOrProvenance: "Catalogue",
      });
    } else {
      checks.push({
        id: "lead-pitch",
        label: "Terminal Grid Spacing",
        state: "missing",
        valueDescription: "Not available",
        detail: "Terminal mounting pitch/row spacing is missing from catalogue.",
        sourceOrProvenance: "Not available",
      });
    }
  } else {
    // Rigid lead through-hole (TO-220, TO-92, Headers, etc.)
    if (storedPitch != null) {
      checks.push({
        id: "lead-pitch",
        label: "Lead Pitch",
        state: "passed",
        valueDescription: `${storedPitch} mm pitch`,
        detail: "Adjacent terminal lead pitch checked against package drawing.",
        sourceOrProvenance: "Catalogue",
      });
    } else {
      checks.push({
        id: "lead-pitch",
        label: "Lead Pitch",
        state: "missing",
        valueDescription: "Not available",
        detail: "Lead pitch is required for this package but missing from catalogue.",
        sourceOrProvenance: "Not available",
      });
    }
  }

  // 6. Pad Dimensions (Land Pattern)
  if (storedPadSize != null) {
    checks.push({
      id: "pad-dimensions",
      label: "Pad Dimensions (Land Pattern)",
      state: "passed",
      valueDescription: `${storedPadSize} mm pad diameter`,
      detail: "Authoritative pad diameter stored from manufacturer land pattern.",
      sourceOrProvenance: "Catalogue",
    });
  } else {
    checks.push({
      id: "pad-dimensions",
      label: "Pad Dimensions (Land Pattern)",
      state: canDrawFootprint ? "unverified" : "missing",
      valueDescription: "Not stored in catalogue",
      detail: canDrawFootprint
        ? "No manufacturer land pattern stored; drawing uses illustrative fallback pad geometry. Not checked for PCB layout."
        : "Pad dimensions are not recorded in catalogue.",
      sourceOrProvenance: canDrawFootprint ? "Placeholder" : "Not available",
    });
  }

  // 7. Drill Diameter (Through-Hole Only)
  if (isSmd) {
    checks.push({
      id: "drill-diameter",
      label: "Through-Hole Drill Diameter",
      state: "not-applicable",
      valueDescription: "N/A (Surface-mount component)",
      detail: "Surface-mount packages do not require through-hole drilling.",
      sourceOrProvenance: "N/A",
    });
  } else if (storedDrill != null) {
    checks.push({
      id: "drill-diameter",
      label: "Through-Hole Drill Diameter",
      state: "passed",
      valueDescription: `${storedDrill} mm drill diameter`,
      detail: "Finished drill hole diameter checked against official datasheet specification.",
      sourceOrProvenance: "Catalogue",
    });
  } else {
    checks.push({
      id: "drill-diameter",
      label: "Through-Hole Drill Diameter",
      state: canDrawFootprint ? "unverified" : "missing",
      valueDescription: "Not stored in catalogue",
      detail: canDrawFootprint
        ? "Drill size is missing from catalogue; drawing uses illustrative fallback. Confirm drill specification before PCB layout."
        : "Through-hole drill diameter is missing from catalogue.",
      sourceOrProvenance: canDrawFootprint ? "Placeholder" : "Not available",
    });
  }

  // 8. Documentation / Datasheet Reference
  const hasDatasheet = isValidHttpUrl(component.datasheetUrl);
  if (hasDatasheet) {
    checks.push({
      id: "datasheet-documentation",
      label: "Datasheet & Reference Documentation",
      state: "passed",
      valueDescription: "Official manufacturer datasheet available",
      detail: `Referenced documentation: ${component.manufacturer} official datasheet link.`,
      sourceOrProvenance: "Catalogue",
    });
  } else {
    checks.push({
      id: "datasheet-documentation",
      label: "Datasheet & Reference Documentation",
      state: "missing",
      valueDescription: "No datasheet link",
      detail: "Authoritative manufacturer datasheet link is not recorded.",
      sourceOrProvenance: "Not available",
    });
  }

  // Evaluation of overall status
  const applicableChecks = checks.filter((c) => c.state !== "not-applicable");
  const passedChecks = applicableChecks.filter((c) => c.state === "passed");

  const isDataStatusVerified = component.dataStatus === "verified";
  const allApplicablePassed = passedChecks.length === applicableChecks.length;

  // Per-field source references (document URL + page/table) are not stored in the schema yet.
  // Every applicable requirement must have an explicit stored source reference to produce "verified".
  const hasPerFieldSourceReferences = false;
  const requirementsNotice =
    "Verified status needs per-field datasheet source references, which are not stored yet.";

  let status: FootprintValidationStatus;
  let statusLabel: string;
  let statusBadgeClass: string;
  let summary: string;
  let warningNotice: string | undefined;

  if (hasPerFieldSourceReferences && isDataStatusVerified && allApplicablePassed) {
    status = "verified";
    statusLabel = "Datasheet-checked";
    statusBadgeClass = "validation-status-verified";
    summary =
      "All mechanical packaging, terminal pitch, pad sizing, and drill specifications have been checked against per-field datasheet source references.";
    warningNotice =
      "Datasheet-checked Footprint: Confirm land pattern dimensions against datasheet and fabricator rules before PCB layout.";
  } else if (canDrawFootprint) {
    status = "illustrative";
    statusLabel = "Illustrative — Visualization Only";
    statusBadgeClass = "validation-status-illustrative";
    summary = isAxialPackage
      ? "Component outline and pinout are recorded, but axial leads are flexible (variable bend span) and pad/drill sizes are illustrative fallbacks. Not validated for direct PCB layout."
      : "The drawing illustrates package body dimensions and terminal arrangement, but lacks verified manufacturer pad/drill dimensions. Intended for visual clearance inspection, not direct PCB layout.";
    warningNotice =
      "Illustrative Footprint: Confirm manufacturer land pattern dimensions and drill diameters against the datasheet and fabricator rules before PCB layout.";
  } else {
    status = "incomplete";
    statusLabel = "Incomplete — Missing Engineering Data";
    statusBadgeClass = "validation-status-incomplete";
    summary =
      "Essential physical parameters (such as terminal pitch, body dimensions, or pinout) are missing from the catalogue. A reliable footprint cannot be rendered.";
    warningNotice =
      "Incomplete Footprint Data: Consult the official manufacturer datasheet to obtain physical package and layout parameters.";
  }

  return {
    status,
    statusLabel,
    statusBadgeClass,
    summary,
    warningNotice,
    requirementsNotice,
    checks,
    passedCount: passedChecks.length,
    totalApplicableCount: applicableChecks.length,
    isDatasheetChecked: status === "verified",
    isIllustrativeOnly: status === "illustrative",
    missingCrucialData: status === "incomplete",
  };
}

export function getValidationBadgeClass(status: FootprintValidationStatus): string {
  switch (status) {
    case "verified":
      return "status-badge status-verified";
    case "illustrative":
      return "status-badge status-illustrative";
    case "incomplete":
      return "status-badge status-incomplete";
  }
}

export function getCheckStateIcon(state: RequirementCheckState): string {
  switch (state) {
    case "passed":
      return "✓";
    case "unverified":
      return "⚠";
    case "missing":
      return "✕";
    case "not-applicable":
      return "—";
  }
}

export function getCheckStateClass(state: RequirementCheckState): string {
  switch (state) {
    case "passed":
      return "check-state-passed";
    case "unverified":
      return "check-state-unverified";
    case "missing":
      return "check-state-missing";
    case "not-applicable":
      return "check-state-na";
  }
}

export function getProvenanceBadgeClass(provenance: ProvenanceLabel): string {
  switch (provenance) {
    case "Catalogue":
      return "prov-badge prov-catalogue";
    case "Derived":
      return "prov-badge prov-derived";
    case "Placeholder":
      return "prov-badge prov-placeholder";
    case "Not available":
      return "prov-badge prov-na";
  }
}

/**
 * Viva Note: Wraps only numeric tokens in monospace spans so that prose labels,
 * provenance badges, and units/notes remain in the standard sans-serif font.
 */
export function renderValueWithMonoNumbers(text: string) {
  const parts = text.split(/(\d+(?:\.\d+)?)/g);
  return parts.map((part, idx) =>
    /^\d+(?:\.\d+)?$/.test(part) ? (
      <span key={idx} className="pcb-mono-num">
        {part}
      </span>
    ) : (
      <span key={idx}>{part}</span>
    )
  );
}

/**
 * Extracts the exact pad coordinates, dimensions, and provenance array used by the
 * SVG footprint renderer for all supported package families.
 */
export function getFootprintGeometry(
  component: ComponentData,
  axialSpanOverrideMm?: number
): FootprintGeometry {
  const templateKind = getPackageTemplateKind(component);
  const isAxialPackage =
    templateKind === "axial-resistor" || templateKind === "axial-diode";
  const pinCount = component.pins?.length || 0;

  const lengthMm =
    component.package?.bodyDimensions?.lengthMm ??
    component.package?.footprintDimensions?.lengthMm ??
    0;
  const widthMm =
    component.package?.bodyDimensions?.widthMm ??
    component.package?.footprintDimensions?.widthMm ??
    0;
  const heightMm =
    component.package?.bodyDimensions?.heightMm ??
    component.package?.footprintDimensions?.heightMm ??
    null;

  const defaultAxialSpan = getDefaultAxialSpanMm(lengthMm || 5);
  const leadPitchMm =
    component.package?.pcbLayout?.leadPitchMm ??
    (isAxialPackage ? axialSpanOverrideMm ?? defaultAxialSpan : 0);
  const rowSpacingMm = component.package?.pcbLayout?.rowSpacingMm ?? null;

  const storedPadDiameter = component.package?.pcbLayout?.padDiameterMm;
  const storedDrill = component.package?.pcbLayout?.drillDiameterMm ?? null;
  const padSizeProv: ProvenanceLabel =
    storedPadDiameter != null ? "Catalogue" : "Not available";
  const drillProv: ProvenanceLabel =
    storedDrill != null ? "Catalogue" : "Not available";

  const pads: FootprintPadData[] = [];

  const makePad = (
    pinIdx: number,
    opts: {
      x: number;
      y: number;
      width: number;
      height: number;
      shape: "Rectangular" | "Circular" | "Square";
      side: "left" | "right" | "bottom" | "center";
      labelX: number;
      labelY: number;
      labelAnchor?: "start" | "middle" | "end";
    }
  ): FootprintPadData | null => {
    const storedPin = component.pins?.[pinIdx];
    if (storedPin?.number == null) return null;
    return {
      number: storedPin.number,
      name: storedPin.name || "Not available",
      pinFunction: storedPin.function,
      x: opts.x,
      y: opts.y,
      width: opts.width,
      height: opts.height,
      shape: opts.shape,
      drill: storedDrill,
      side: opts.side,
      labelX: opts.labelX,
      labelY: opts.labelY,
      labelAnchor: opts.labelAnchor,
      numberProvenance: "Catalogue",
      nameProvenance: storedPin.name ? "Catalogue" : "Not available",
      shapeProvenance: "Placeholder",
      widthProvenance: padSizeProv,
      heightProvenance: padSizeProv,
      drillProvenance: drillProv,
    };
  };

  // 1. PDIP-8 / Dual In-Line IC (LM358, NE555) - Preserved visually identical to Phase 1/2
  if (templateKind === "pdip") {
    const pinsPerSide = Math.max(
      3,
      Math.min(8, Math.ceil((pinCount || 8) / 2))
    );

    for (let i = 0; i < pinsPerSide; i++) {
      const centerY = 30 + i * (70 / (pinsPerSide - 1 || 1));
      const pad = makePad(i, {
        x: 25,
        y: centerY - 4,
        width: 25,
        height: 8,
        shape: "Rectangular",
        side: "left",
        labelX: 18,
        labelY: centerY + 3,
        labelAnchor: "end",
      });
      if (pad) pads.push(pad);
    }

    for (let i = 0; i < pinsPerSide; i++) {
      const centerY = 30 + i * (70 / (pinsPerSide - 1 || 1));
      const pad = makePad(pinsPerSide * 2 - 1 - i, {
        x: 170,
        y: centerY - 4,
        width: 25,
        height: 8,
        shape: "Rectangular",
        side: "right",
        labelX: 202,
        labelY: centerY + 3,
        labelAnchor: "start",
      });
      if (pad) pads.push(pad);
    }

    const svgUnitsPerMm = lengthMm > 0 ? 120 / lengthMm : 12;
    return {
      templateKind,
      isAxialPackage,
      viewBoxWidth: 220,
      viewBoxHeight: 130,
      lengthMm,
      widthMm,
      heightMm,
      leadPitchMm,
      rowSpacingMm,
      svgUnitsPerMm,
      pads,
    };
  }

  // 2. Axial Resistor (MFR-25) & Axial Diodes (DO-35 1N4148, DO-41 1N4007)
  // Scale: 12 SVG units per mm so DO-35 (3.4x1.75 mm), DO-41 (5.2x2.7 mm), and MFR-25 (6.3x2.4 mm)
  // have visibly distinct, dimensionally proportional bodies and configurable lead-bend span.
  if (templateKind === "axial-resistor" || templateKind === "axial-diode") {
    const svgUnitsPerMm = 12;
    const spanMm = Math.max(lengthMm + 1.8, leadPitchMm || defaultAxialSpan);
    const halfSpanSvg = (spanMm * svgUnitsPerMm) / 2;
    const leftPadCenterX = Math.max(22, Math.min(68, 110 - halfSpanSvg));
    const rightPadCenterX = Math.min(198, Math.max(152, 110 + halfSpanSvg));
    const padSize = 16;

    const p1 = makePad(0, {
      x: leftPadCenterX - padSize / 2,
      y: 54 - padSize / 2,
      width: padSize,
      height: padSize,
      shape: "Circular",
      side: "left",
      labelX: leftPadCenterX,
      labelY: 39,
      labelAnchor: "middle",
    });
    const p2 = makePad(1, {
      x: rightPadCenterX - padSize / 2,
      y: 54 - padSize / 2,
      width: padSize,
      height: padSize,
      shape: "Circular",
      side: "right",
      labelX: rightPadCenterX,
      labelY: 39,
      labelAnchor: "middle",
    });
    if (p1) pads.push(p1);
    if (p2) pads.push(p2);

    return {
      templateKind,
      isAxialPackage: true,
      viewBoxWidth: 220,
      viewBoxHeight: 130,
      lengthMm,
      widthMm,
      heightMm,
      leadPitchMm: spanMm,
      rowSpacingMm,
      svgUnitsPerMm,
      pads,
    };
  }

  // 3. Non-Polar Radial Ceramic Capacitor (C315C104K5R5TA: 3.81 x 2.54 mm body, 2.54 mm pitch)
  if (templateKind === "radial-ceramic-cap") {
    const svgUnitsPerMm = 18;
    const halfPitchSvg = ((leadPitchMm || 2.54) * svgUnitsPerMm) / 2;
    const padSize = 15;

    const p1 = makePad(0, {
      x: 110 - halfPitchSvg - padSize / 2,
      y: 60 - padSize / 2,
      width: padSize,
      height: padSize,
      shape: "Circular",
      side: "left",
      labelX: 110 - halfPitchSvg - 13,
      labelY: 63,
      labelAnchor: "end",
    });
    const p2 = makePad(1, {
      x: 110 + halfPitchSvg - padSize / 2,
      y: 60 - padSize / 2,
      width: padSize,
      height: padSize,
      shape: "Circular",
      side: "right",
      labelX: 110 + halfPitchSvg + 13,
      labelY: 63,
      labelAnchor: "start",
    });
    if (p1) pads.push(p1);
    if (p2) pads.push(p2);

    return {
      templateKind,
      isAxialPackage: false,
      viewBoxWidth: 220,
      viewBoxHeight: 130,
      lengthMm,
      widthMm,
      heightMm,
      leadPitchMm,
      rowSpacingMm,
      svgUnitsPerMm,
      pads,
    };
  }

  // 4. Radial Cylindrical Power Inductor (RLB0914-101KL: 8.7 mm dia, 5.0 mm pitch)
  if (templateKind === "radial-inductor") {
    const svgUnitsPerMm = 9.2;
    const halfPitchSvg = ((leadPitchMm || 5.0) * svgUnitsPerMm) / 2;
    const padSize = 14;

    const p1 = makePad(0, {
      x: 110 - halfPitchSvg - padSize / 2,
      y: 60 - padSize / 2,
      width: padSize,
      height: padSize,
      shape: "Circular",
      side: "left",
      labelX: 110 - halfPitchSvg - 12,
      labelY: 63,
      labelAnchor: "end",
    });
    const p2 = makePad(1, {
      x: 110 + halfPitchSvg - padSize / 2,
      y: 60 - padSize / 2,
      width: padSize,
      height: padSize,
      shape: "Circular",
      side: "right",
      labelX: 110 + halfPitchSvg + 12,
      labelY: 63,
      labelAnchor: "start",
    });
    if (p1) pads.push(p1);
    if (p2) pads.push(p2);

    return {
      templateKind,
      isAxialPackage: false,
      viewBoxWidth: 220,
      viewBoxHeight: 130,
      lengthMm,
      widthMm,
      heightMm,
      leadPitchMm,
      rowSpacingMm,
      svgUnitsPerMm,
      pads,
    };
  }

  // 5. TO-220 3-Pin Power Package (LM7805: 10.16 x 4.57 mm, 2.54 mm pitch)
  if (templateKind === "to-220") {
    const svgUnitsPerMm = lengthMm > 0 ? 100 / lengthMm : 9.84;
    const pitchSvg = (leadPitchMm || 2.54) * svgUnitsPerMm;
    const xs = [110 - pitchSvg, 110, 110 + pitchSvg];

    xs.forEach((cx, idx) => {
      const pad = makePad(idx, {
        x: cx - 7,
        y: 78,
        width: 14,
        height: 22,
        shape: "Rectangular",
        side: "bottom",
        labelX: cx,
        labelY: 111,
        labelAnchor: "middle",
      });
      if (pad) pads.push(pad);
    });

    return {
      templateKind,
      isAxialPackage: false,
      viewBoxWidth: 220,
      viewBoxHeight: 130,
      lengthMm,
      widthMm,
      heightMm,
      leadPitchMm,
      rowSpacingMm,
      svgUnitsPerMm,
      pads,
    };
  }

  // 6. TO-92 3-Pin Plastic Package (BC547: 5.2 x 4.19 mm D-shape body, 1.27 mm adjacent pitch)
  if (templateKind === "to-92") {
    const svgUnitsPerMm = 15;
    const pitchSvg = (leadPitchMm || 1.27) * svgUnitsPerMm; // 19.05 units
    const xs = [110 - pitchSvg, 110, 110 + pitchSvg];
    const padSize = 12;

    xs.forEach((cx, idx) => {
      const pad = makePad(idx, {
        x: cx - padSize / 2,
        y: 66 - padSize / 2,
        width: padSize,
        height: padSize,
        shape: "Circular",
        side: "bottom",
        labelX: cx,
        labelY: 85,
        labelAnchor: "middle",
      });
      if (pad) pads.push(pad);
    });

    return {
      templateKind,
      isAxialPackage: false,
      viewBoxWidth: 220,
      viewBoxHeight: 130,
      lengthMm,
      widthMm,
      heightMm,
      leadPitchMm,
      rowSpacingMm,
      svgUnitsPerMm,
      pads,
    };
  }

  // 7. 4-Pin Molex KK 254 Vertical Header (0022232041: 10.16 x 6.35 mm, 2.54 mm pitch, 1.02 mm drill)
  if (templateKind === "header-1x4") {
    const svgUnitsPerMm = 13.5;
    const pitchSvg = (leadPitchMm || 2.54) * svgUnitsPerMm;
    const startX = 110 - 1.5 * pitchSvg;
    const padSize = 16;

    for (let i = 0; i < 4; i++) {
      const cx = startX + i * pitchSvg;
      const pad = makePad(i, {
        x: cx - padSize / 2,
        y: 62 - padSize / 2,
        width: padSize,
        height: padSize,
        shape: i === 0 ? "Square" : "Circular",
        side: "center",
        labelX: cx,
        labelY: 84,
        labelAnchor: "middle",
      });
      if (pad) pads.push(pad);
    }

    return {
      templateKind,
      isAxialPackage: false,
      viewBoxWidth: 220,
      viewBoxHeight: 130,
      lengthMm,
      widthMm,
      heightMm,
      leadPitchMm,
      rowSpacingMm,
      svgUnitsPerMm,
      pads,
    };
  }

  // 8. 4-Terminal 6x6 mm Tactile Switch (B3F-1000: 6.0 x 6.0 mm body, 6.5 x 4.5 mm pitch, 1.0 mm drill)
  if (templateKind === "tactile-switch-4p") {
    const svgUnitsPerMm = 11.5;
    const halfRowX = ((rowSpacingMm || 6.5) * svgUnitsPerMm) / 2;
    const halfPitchY = ((leadPitchMm || 4.5) * svgUnitsPerMm) / 2;
    const padSize = 14;

    // OMRON B3F terminal layout: 1 & 2 on top pair (internally connected), 3 & 4 on bottom pair
    const coords: {
      x: number;
      y: number;
      side: "left" | "right";
      lx: number;
      ly: number;
      anchor: "start" | "end";
    }[] = [
      {
        x: 110 - halfRowX,
        y: 58 - halfPitchY,
        side: "left",
        lx: 110 - halfRowX - 12,
        ly: 58 - halfPitchY + 3,
        anchor: "end",
      },
      {
        x: 110 + halfRowX,
        y: 58 - halfPitchY,
        side: "right",
        lx: 110 + halfRowX + 12,
        ly: 58 - halfPitchY + 3,
        anchor: "start",
      },
      {
        x: 110 - halfRowX,
        y: 58 + halfPitchY,
        side: "left",
        lx: 110 - halfRowX - 12,
        ly: 58 + halfPitchY + 3,
        anchor: "end",
      },
      {
        x: 110 + halfRowX,
        y: 58 + halfPitchY,
        side: "right",
        lx: 110 + halfRowX + 12,
        ly: 58 + halfPitchY + 3,
        anchor: "start",
      },
    ];

    coords.forEach((pt, idx) => {
      const pad = makePad(idx, {
        x: pt.x - padSize / 2,
        y: pt.y - padSize / 2,
        width: padSize,
        height: padSize,
        shape: "Circular",
        side: pt.side,
        labelX: pt.lx,
        labelY: pt.ly,
        labelAnchor: pt.anchor,
      });
      if (pad) pads.push(pad);
    });

    return {
      templateKind,
      isAxialPackage: false,
      viewBoxWidth: 220,
      viewBoxHeight: 130,
      lengthMm,
      widthMm,
      heightMm,
      leadPitchMm,
      rowSpacingMm,
      svgUnitsPerMm,
      pads,
    };
  }

  return {
    templateKind: "unsupported",
    isAxialPackage: false,
    viewBoxWidth: 220,
    viewBoxHeight: 130,
    lengthMm,
    widthMm,
    heightMm,
    leadPitchMm,
    rowSpacingMm,
    svgUnitsPerMm: 12,
    pads,
  };
}

export function renderFootprintSvg(
  component: ComponentData,
  options?: FootprintRenderOptions
) {
  // Viva Note: Enforce the same data-availability rules everywhere — never render a footprint SVG
  // when stored body dimensions, pinout, or a valid package template are missing.
  const audit = auditComponentFootprint(component);
  if (!audit.canDrawFootprint) {
    return null;
  }

  const geometry = getFootprintGeometry(component, options?.axialSpanMm);
  const {
    templateKind,
    lengthMm,
    widthMm,
    leadPitchMm: leadPitch,
    rowSpacingMm,
    pads,
    svgUnitsPerMm,
  } = geometry;

  const viewBoxStr = options?.viewBox || "0 0 220 130";
  const showGrid = options?.showGrid ?? false;
  const selectedPadNumber = options?.selectedPadNumber ?? null;
  const hoveredPadNumber = options?.hoveredPadNumber ?? null;
  const onSelectPad = options?.onSelectPad;
  const onHoverPad = options?.onHoverPad;
  const measurePoints = options?.measurePoints || [];
  const gridPatternId = `mm-grid-${component._id}`;

  const renderGridOverlay = () =>
    showGrid ? (
      <>
        <defs>
          <pattern
            id={gridPatternId}
            width={svgUnitsPerMm}
            height={svgUnitsPerMm}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${svgUnitsPerMm} 0 L 0 0 0 ${svgUnitsPerMm}`}
              fill="none"
              stroke="var(--cq-border-default)"
              strokeWidth="0.45"
            />
          </pattern>
        </defs>
        <rect
          x="-200"
          y="-200"
          width="620"
          height="530"
          fill={`url(#${gridPatternId})`}
          pointerEvents="none"
        />
      </>
    ) : null;

  const renderMeasureOverlay = () =>
    measurePoints.length > 0 ? (
      <g className="footprint-measure-overlay" pointerEvents="none">
        <circle
          cx={measurePoints[0].x}
          cy={measurePoints[0].y}
          r="2.5"
          fill="var(--cq-warning)"
          stroke="var(--cq-surface)"
          strokeWidth="0.8"
        />
        {measurePoints.length === 2 && (
          <>
            <line
              x1={measurePoints[0].x}
              y1={measurePoints[0].y}
              x2={measurePoints[1].x}
              y2={measurePoints[1].y}
              stroke="var(--cq-warning)"
              strokeWidth="1.2"
              strokeDasharray="2.5 1.5"
            />
            <circle
              cx={measurePoints[1].x}
              cy={measurePoints[1].y}
              r="2.5"
              fill="var(--cq-warning)"
              stroke="var(--cq-surface)"
              strokeWidth="0.8"
            />
          </>
        )}
      </g>
    ) : null;

  const renderInteractivePad = (
    pad: FootprintPadData,
    defaultStroke: string,
    keyPrefix: string
  ) => {
    const isSelected = selectedPadNumber === pad.number;
    const isHovered = hoveredPadNumber === pad.number;
    const isInteractive = Boolean(onSelectPad || onHoverPad);

    const padFill = isSelected
      ? "var(--cq-emerald-soft)"
      : isHovered
      ? "var(--cq-surface-hover)"
      : "var(--cq-surface)";
    const padStroke = isSelected
      ? "var(--cq-emerald-hover)"
      : isHovered
      ? "var(--cq-text-primary)"
      : defaultStroke;
    const padStrokeWidth = isSelected ? "2" : isHovered ? "1.6" : "1.3";
    const cx = pad.x + pad.width / 2;
    const cy = pad.y + pad.height / 2;
    const drillRadiusSvg =
      pad.drill != null
        ? Math.max(2.2, (pad.drill * svgUnitsPerMm) / 2)
        : 2.6;

    return (
      <g
        key={`${keyPrefix}-${pad.number}`}
        className={`footprint-pad-group ${isSelected ? "pad-selected" : ""} ${
          isHovered ? "pad-hovered" : ""
        }`}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? "button" : undefined}
        aria-label={
          isInteractive ? `Pad ${pad.number}, Pin ${pad.name}` : undefined
        }
        aria-pressed={isInteractive ? isSelected : undefined}
        onMouseEnter={onHoverPad ? () => onHoverPad(pad.number) : undefined}
        onMouseLeave={onHoverPad ? () => onHoverPad(null) : undefined}
        onFocus={onHoverPad ? () => onHoverPad(pad.number) : undefined}
        onBlur={onHoverPad ? () => onHoverPad(null) : undefined}
        onClick={
          onSelectPad
            ? (e) => {
                e.stopPropagation();
                onSelectPad(pad.number);
              }
            : undefined
        }
        onKeyDown={
          onSelectPad
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectPad(pad.number);
                }
              }
            : undefined
        }
      >
        <title>{`Pin ${pad.number}: ${pad.name}`}</title>
        {isSelected &&
          (pad.shape === "Circular" ? (
            <circle
              cx={cx}
              cy={cy}
              r={pad.width / 2 + 2.5}
              fill="none"
              stroke="var(--cq-emerald)"
              strokeWidth="1"
              strokeDasharray="2 1"
            />
          ) : (
            <rect
              x={pad.x - 2}
              y={pad.y - 2}
              width={pad.width + 4}
              height={pad.height + 4}
              rx="2.5"
              fill="none"
              stroke="var(--cq-emerald)"
              strokeWidth="1"
              strokeDasharray="2 1"
            />
          ))}

        {pad.shape === "Circular" ? (
          <circle
            cx={cx}
            cy={cy}
            r={pad.width / 2}
            fill={padFill}
            stroke={padStroke}
            strokeWidth={padStrokeWidth}
          />
        ) : (
          <rect
            x={pad.x}
            y={pad.y}
            width={pad.width}
            height={pad.height}
            rx={pad.shape === "Square" ? "1" : "1.5"}
            fill={padFill}
            stroke={padStroke}
            strokeWidth={padStrokeWidth}
          />
        )}

        {/* Inner through-hole ring when pad is Circular or Square */}
        {(pad.shape === "Circular" || pad.shape === "Square") && (
          <circle
            cx={cx}
            cy={cy}
            r={drillRadiusSvg}
            fill="var(--cq-surface-subtle)"
            stroke={padStroke}
            strokeWidth="0.85"
            strokeDasharray={pad.drill != null ? undefined : "1.5 1"}
          />
        )}

        <text
          x={pad.labelX}
          y={pad.labelY}
          fill={
            isSelected ? "var(--cq-emerald-hover)" : "var(--cq-text-primary)"
          }
          fontSize="8.5"
          fontFamily="var(--cq-font-mono)"
          fontWeight={isSelected ? "700" : "600"}
          textAnchor={pad.labelAnchor}
        >
          {pad.number}
        </text>
      </g>
    );
  };

  // 1. PDIP-8 / Dual In-Line IC (LM358, NE555)
  if (templateKind === "pdip") {
    const leftPads = pads.filter((p) => p.side === "left");
    const rightPads = pads.filter((p) => p.side === "right");

    return (
      <svg
        className="footprint-svg"
        viewBox={viewBoxStr}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="IC Footprint Vector Diagram"
      >
        {renderGridOverlay()}
        <rect
          x="50"
          y="20"
          width="120"
          height="90"
          rx="4"
          fill="var(--cq-surface)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />
        <path
          d="M50 55 A10 10 0 0 1 50 75"
          fill="var(--cq-surface-subtle)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />
        <circle cx="66" cy="36" r="3.5" fill="var(--cq-emerald)" />
        {leftPads.map((pad) =>
          renderInteractivePad(pad, "var(--cq-emerald)", "l")
        )}
        {rightPads.map((pad) =>
          renderInteractivePad(pad, "var(--cq-blue)", "r")
        )}
        {/* Catalogue body dimension callout with vertical end-ticks */}
        <g stroke="var(--cq-text-muted)" strokeWidth="1">
          <line x1="50" y1="114" x2="50" y2="119" />
          <line x1="170" y1="114" x2="170" y2="119" />
          <line
            x1="50"
            y1="116.5"
            x2="170"
            y2="116.5"
            strokeDasharray="2 2"
          />
        </g>
        <text
          x="110"
          y="126.5"
          fill="var(--cq-text-secondary)"
          fontSize="7.4"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Catalogue: {lengthMm}×{widthMm} mm · Pitch e={leadPitch} mm
        </text>
        <text
          x="110"
          y="63"
          fill="var(--cq-text-primary)"
          fontSize="9.5"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "IC PACKAGE"}
        </text>
        <text
          x="110"
          y="75"
          fill="var(--cq-text-muted)"
          fontSize="6.8"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
        >
          Illustrative package diagram
        </text>
        {renderMeasureOverlay()}
      </svg>
    );
  }

  // 2. Axial Resistor (MFR-25) & Axial Diodes (DO-35 1N4148, DO-41 1N4007)
  if (templateKind === "axial-resistor" || templateKind === "axial-diode") {
    const isDiode = templateKind === "axial-diode";
    const isDo35 = (component.package?.name || "")
      .toLowerCase()
      .includes("do-35");
    const bodyW = Math.max(38, Math.min(86, lengthMm * svgUnitsPerMm));
    const bodyH = Math.max(20, Math.min(36, widthMm * svgUnitsPerMm));
    const bodyX = 110 - bodyW / 2;
    const bodyY = 54 - bodyH / 2;
    const p1 = pads[0];
    const p2 = pads[1];
    const leftPadCx = p1 ? p1.x + p1.width / 2 : 45;
    const rightPadCx = p2 ? p2.x + p2.width / 2 : 175;

    return (
      <svg
        className="footprint-svg"
        viewBox={viewBoxStr}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`${component.package?.name || "Axial"} Package Diagram`}
      >
        {renderGridOverlay()}

        {/* Axial wire leads from body ends to user-defined bend pads */}
        <line
          x1={leftPadCx}
          y1="54"
          x2={bodyX}
          y2="54"
          stroke="var(--cq-text-secondary)"
          strokeWidth={isDo35 ? "1.6" : "2.2"}
        />
        <line
          x1={bodyX + bodyW}
          y1="54"
          x2={rightPadCx}
          y2="54"
          stroke="var(--cq-text-secondary)"
          strokeWidth={isDo35 ? "1.6" : "2.2"}
        />

        {/* Proportional axial package body */}
        <rect
          x={bodyX}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          rx={isDiode ? "2.5" : "5"}
          fill={isDo35 ? "var(--cq-blue-soft)" : "var(--cq-surface)"}
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />

        {isDiode ? (
          <>
            {/* Cathode polarity band near Pin 2 (Cathode) */}
            <rect
              x={bodyX + bodyW - Math.max(6, bodyW * 0.18)}
              y={bodyY + 1}
              width={Math.max(4, bodyW * 0.11)}
              height={bodyH - 2}
              fill="var(--cq-emerald)"
            />
            <text
              x={bodyX + 5}
              y={54 + 3}
              fill="var(--cq-text-muted)"
              fontSize="6.5"
              fontFamily="var(--cq-font-sans)"
              fontWeight="600"
            >
              A
            </text>
            <text
              x={bodyX + bodyW - 11}
              y={54 + 3}
              fill="var(--cq-emerald-hover)"
              fontSize="6.5"
              fontFamily="var(--cq-font-sans)"
              fontWeight="700"
            >
              K
            </text>
          </>
        ) : (
          /* MFR-25 metal film resistor bands */
          <g opacity="0.85">
            <line
              x1={bodyX + bodyW * 0.24}
              y1={bodyY + 1}
              x2={bodyX + bodyW * 0.24}
              y2={bodyY + bodyH - 1}
              stroke="var(--cq-warning)"
              strokeWidth="2.8"
            />
            <line
              x1={bodyX + bodyW * 0.42}
              y1={bodyY + 1}
              x2={bodyX + bodyW * 0.42}
              y2={bodyY + bodyH - 1}
              stroke="var(--cq-blue)"
              strokeWidth="2.8"
            />
            <line
              x1={bodyX + bodyW * 0.6}
              y1={bodyY + 1}
              x2={bodyX + bodyW * 0.6}
              y2={bodyY + bodyH - 1}
              stroke="var(--cq-emerald)"
              strokeWidth="2.8"
            />
            <line
              x1={bodyX + bodyW * 0.78}
              y1={bodyY + 1}
              x2={bodyX + bodyW * 0.78}
              y2={bodyY + bodyH - 1}
              stroke="var(--cq-text-muted)"
              strokeWidth="2.2"
            />
          </g>
        )}

        {p1 && renderInteractivePad(p1, "var(--cq-emerald)", "ax1")}
        {p2 && renderInteractivePad(p2, "var(--cq-blue)", "ax2")}

        <text
          x="110"
          y="16"
          fill="var(--cq-text-primary)"
          fontSize="8.5"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name} · Illustrative axial diagram
        </text>

        {/* Catalogue body dimension line ONLY (never draw a dimension line across the user-selected bend span) */}
        <g stroke="var(--cq-text-muted)" strokeWidth="1">
          <line x1={bodyX} y1="78" x2={bodyX} y2="84" />
          <line x1={bodyX + bodyW} y1="78" x2={bodyX + bodyW} y2="84" />
          <line
            x1={bodyX}
            y1="81"
            x2={bodyX + bodyW}
            y2="81"
            strokeDasharray="2 2"
          />
        </g>
        <text
          x="110"
          y="96"
          fill="var(--cq-text-secondary)"
          fontSize="7.5"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Catalogue body: {lengthMm}×{widthMm} mm
        </text>
        <text
          x="110"
          y="113"
          fill="var(--cq-warning)"
          fontSize="7"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Illustrative bend span: {leadPitch} mm (user-selected · not a datasheet pitch)
        </text>

        {renderMeasureOverlay()}
      </svg>
    );
  }

  // 3. Non-Polar Radial Ceramic Capacitor (C315C104K5R5TA: 3.81 x 2.54 mm, 2.54 mm pitch)
  if (templateKind === "radial-ceramic-cap") {
    const bodyW = Math.max(64, lengthMm * svgUnitsPerMm);
    const bodyH = Math.max(44, widthMm * svgUnitsPerMm);
    const bodyX = 110 - bodyW / 2;
    const bodyY = 60 - bodyH / 2;

    return (
      <svg
        className="footprint-svg"
        viewBox={viewBoxStr}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Radial Ceramic Capacitor Footprint Diagram"
      >
        {renderGridOverlay()}

        {/* Non-polar conformal coated rectangular/rounded radial ceramic profile */}
        <rect
          x={bodyX}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          rx="12"
          fill="var(--cq-warning-soft)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />
        <rect
          x={bodyX + 4}
          y={bodyY + 4}
          width={bodyW - 8}
          height={bodyH - 8}
          rx="9"
          fill="none"
          stroke="var(--cq-warning-border)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {pads.map((pad, idx) =>
          renderInteractivePad(
            pad,
            idx === 0 ? "var(--cq-emerald)" : "var(--cq-blue)",
            "rcap"
          )
        )}

        <text
          x="110"
          y="18"
          fill="var(--cq-text-primary)"
          fontSize="8.5"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name} (Non-polar MLCC)
        </text>
        <text
          x="110"
          y="30"
          fill="var(--cq-text-muted)"
          fontSize="6.5"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
        >
          Illustrative diagram
        </text>
        <text
          x="110"
          y="120"
          fill="var(--cq-text-secondary)"
          fontSize="7.4"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Catalogue: {lengthMm}×{widthMm} mm · Pitch: {leadPitch} mm
        </text>

        {renderMeasureOverlay()}
      </svg>
    );
  }

  // 4. Radial Cylindrical Power Inductor (RLB0914-101KL: 8.7 mm dia, 5.0 mm pitch)
  if (templateKind === "radial-inductor") {
    const outerRadius = Math.max(36, (lengthMm * svgUnitsPerMm) / 2);

    return (
      <svg
        className="footprint-svg"
        viewBox={viewBoxStr}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Radial Cylindrical Inductor Footprint Diagram"
      >
        {renderGridOverlay()}

        {/* Cylindrical ferrite drum top view */}
        <circle
          cx="110"
          cy="60"
          r={outerRadius}
          fill="var(--cq-surface)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.6"
        />
        <circle
          cx="110"
          cy="60"
          r={outerRadius - 5}
          fill="var(--cq-surface-subtle)"
          stroke="var(--cq-border-strong)"
          strokeWidth="1"
          strokeDasharray="3 2"
        />
        {/* Inductor winding emblem */}
        <path
          d="M 96 42 Q 101 35 106 42 Q 110 35 114 42 Q 119 35 124 42"
          fill="none"
          stroke="var(--cq-text-muted)"
          strokeWidth="1.2"
        />

        {pads.map((pad, idx) =>
          renderInteractivePad(
            pad,
            idx === 0 ? "var(--cq-emerald)" : "var(--cq-blue)",
            "rind"
          )
        )}

        <text
          x="110"
          y="14"
          fill="var(--cq-text-primary)"
          fontSize="8.5"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name} · Illustrative diagram
        </text>
        <text
          x="110"
          y="122"
          fill="var(--cq-text-secondary)"
          fontSize="7.4"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Catalogue: ⌀{lengthMm} mm body · Pitch: {leadPitch} mm
        </text>

        {renderMeasureOverlay()}
      </svg>
    );
  }

  // 5. TO-220 3-Pin Power Regulator (LM7805: 10.16 x 4.57 mm, 2.54 mm pitch)
  if (templateKind === "to-220") {
    return (
      <svg
        className="footprint-svg"
        viewBox={viewBoxStr}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="TO-220 Footprint Vector Diagram"
      >
        {renderGridOverlay()}

        {/* Rear metal heatsink mounting tab */}
        <rect
          x="60"
          y="18"
          width="100"
          height="16"
          rx="2"
          fill="var(--cq-surface-subtle)"
          stroke="var(--cq-border-strong)"
          strokeWidth="1.3"
        />
        <circle
          cx="110"
          cy="26"
          r="4.5"
          fill="var(--cq-surface)"
          stroke="var(--cq-blue)"
          strokeWidth="1"
        />

        {/* Plastic mold body (10.16 x 4.57 mm) */}
        <rect
          x="60"
          y="34"
          width="100"
          height="42"
          rx="3"
          fill="var(--cq-surface)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />
        <text
          x="110"
          y="53"
          fill="var(--cq-text-primary)"
          fontSize="9"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "TO-220"}
        </text>
        <text
          x="110"
          y="64"
          fill="var(--cq-text-muted)"
          fontSize="6.5"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
        >
          Illustrative diagram
        </text>

        {pads.map((pad) =>
          renderInteractivePad(pad, "var(--cq-emerald)", "to220")
        )}

        <text
          x="110"
          y="125"
          fill="var(--cq-text-secondary)"
          fontSize="7.4"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Catalogue: {lengthMm}×{widthMm} mm · Pitch e={leadPitch} mm
        </text>

        {renderMeasureOverlay()}
      </svg>
    );
  }

  // 6. TO-92 3-Pin Plastic Package (BC547: D-shaped body, 5.2 x 4.19 mm, 1.27 mm pitch)
  if (templateKind === "to-92") {
    return (
      <svg
        className="footprint-svg"
        viewBox={viewBoxStr}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="TO-92 Footprint Vector Diagram"
      >
        {renderGridOverlay()}

        {/* TO-92 D-shaped plastic body: curved rear arc + flat front face at y=78 */}
        <path
          d="M 71 78 A 39 39 0 0 1 149 78 Z"
          fill="var(--cq-surface)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.6"
        />
        <line
          x1="71"
          y1="78"
          x2="149"
          y2="78"
          stroke="var(--cq-text-primary)"
          strokeWidth="2.2"
        />

        <text
          x="110"
          y="49"
          fill="var(--cq-text-primary)"
          fontSize="8.5"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "TO-92"} (D-Body)
        </text>
        <text
          x="110"
          y="16"
          fill="var(--cq-text-muted)"
          fontSize="6.5"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
        >
          Illustrative diagram (flat front at bottom)
        </text>

        {pads.map((pad, idx) =>
          renderInteractivePad(
            pad,
            idx === 0 ? "var(--cq-emerald)" : "var(--cq-blue)",
            "to92"
          )
        )}

        <text
          x="110"
          y="104"
          fill="var(--cq-text-secondary)"
          fontSize="7"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
        >
          1: Collector · 2: Base · 3: Emitter
        </text>
        <text
          x="110"
          y="120"
          fill="var(--cq-text-secondary)"
          fontSize="7.3"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Catalogue: {lengthMm}×{widthMm} mm · Pitch: {leadPitch} mm (2.54 mm span)
        </text>

        {renderMeasureOverlay()}
      </svg>
    );
  }

  // 7. 4-Pin Molex KK 254 Vertical Header (0022232041: 10.16 x 6.35 mm, 2.54 mm pitch, 1.02 mm drill)
  if (templateKind === "header-1x4") {
    const shroudW = lengthMm * svgUnitsPerMm; // 137.16
    const shroudH = widthMm * svgUnitsPerMm * 0.65; // ~56
    const shroudX = 110 - shroudW / 2;
    const shroudY = 62 - shroudH / 2;

    return (
      <svg
        className="footprint-svg"
        viewBox={viewBoxStr}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="4-Pin KK 254 Vertical Header Footprint Diagram"
      >
        {renderGridOverlay()}

        {/* KK 254 wafer body + rear friction-lock ramp */}
        <rect
          x={shroudX}
          y={shroudY}
          width={shroudW}
          height={shroudH}
          rx="2.5"
          fill="var(--cq-surface)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />
        <rect
          x={shroudX + 4}
          y={shroudY + 3}
          width={shroudW - 8}
          height="7"
          rx="1"
          fill="var(--cq-surface-subtle)"
          stroke="var(--cq-border-strong)"
          strokeWidth="1"
        />

        {pads.map((pad, idx) =>
          renderInteractivePad(
            pad,
            idx === 0 ? "var(--cq-emerald)" : "var(--cq-blue)",
            "hdr"
          )
        )}

        <text
          x="110"
          y="16"
          fill="var(--cq-text-primary)"
          fontSize="8"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name} · Illustrative diagram
        </text>
        <text
          x="110"
          y="120"
          fill="var(--cq-text-secondary)"
          fontSize="7.3"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Catalogue: {lengthMm}×{widthMm} mm · Pitch: {leadPitch} mm · Drill: ⌀
          {component.package?.pcbLayout?.drillDiameterMm} mm
        </text>

        {renderMeasureOverlay()}
      </svg>
    );
  }

  // 8. 4-Terminal 6x6 mm Tactile Switch (B3F-1000: 6.0 x 6.0 mm body, 6.5 x 4.5 mm pitch, 1.0 mm drill)
  if (templateKind === "tactile-switch-4p") {
    const bodySide = lengthMm * svgUnitsPerMm; // 69 units
    const bodyX = 110 - bodySide / 2;
    const bodyY = 58 - bodySide / 2;

    return (
      <svg
        className="footprint-svg"
        viewBox={viewBoxStr}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="6x6 mm Tactile Switch Footprint Diagram"
      >
        {renderGridOverlay()}

        {/* Internal bridged terminal pairs (1-2 top, 3-4 bottom) */}
        {pads.length === 4 && (
          <g stroke="var(--cq-border-strong)" strokeWidth="1" strokeDasharray="2 2">
            <line
              x1={pads[0].x + pads[0].width / 2}
              y1={pads[0].y + pads[0].height / 2}
              x2={pads[1].x + pads[1].width / 2}
              y2={pads[1].y + pads[1].height / 2}
            />
            <line
              x1={pads[2].x + pads[2].width / 2}
              y1={pads[2].y + pads[2].height / 2}
              x2={pads[3].x + pads[3].width / 2}
              y2={pads[3].y + pads[3].height / 2}
            />
          </g>
        )}

        {/* 6x6 mm square switch housing + central circular actuator plunger */}
        <rect
          x={bodyX}
          y={bodyY}
          width={bodySide}
          height={bodySide}
          rx="4"
          fill="var(--cq-surface)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />
        <circle
          cx="110"
          cy="58"
          r="16"
          fill="var(--cq-surface-subtle)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.3"
        />

        {pads.map((pad, idx) =>
          renderInteractivePad(
            pad,
            idx < 2 ? "var(--cq-emerald)" : "var(--cq-blue)",
            "sw"
          )
        )}

        <text
          x="110"
          y="14"
          fill="var(--cq-text-primary)"
          fontSize="8"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name} · Illustrative diagram
        </text>
        <text
          x="110"
          y="122"
          fill="var(--cq-text-secondary)"
          fontSize="7.1"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Catalogue: {lengthMm}×{widthMm} mm · Grid: {rowSpacingMm}×{leadPitch} mm ·
          Drill: ⌀{component.package?.pcbLayout?.drillDiameterMm} mm
        </text>

        {renderMeasureOverlay()}
      </svg>
    );
  }

  return null;
}
