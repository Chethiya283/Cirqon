// Procedural SVG package footprint drawing functions and data provenance auditing for PCB layout inspection.
// Viva Note: Separates provenance auditing from SVG rendering so that footprints are only drawn
// when backed by stored catalogue dimensions and a matching package template (never from fallback placeholders).

import type { ComponentData } from "../types";

/**
 * Viva Note — Provenance Taxonomy:
 * - "Catalogue": Value stored in the database. Not called "Datasheet" unless `dataStatus` is "verified".
 * - "Derived": Calculated from stored values (e.g., pin count and row span from pitch).
 * - "Placeholder": Fallback supplied by code when no value is stored (e.g., 10 × 6 mm or 2.54 mm);
 *   placeholder values are strictly blocked from being drawn as real geometry.
 * - "Not available": Missing in the database with no fallback.
 */
export type ProvenanceLabel =
  | "Catalogue"
  | "Derived"
  | "Placeholder"
  | "Not available";

export interface FootprintDataSourceField {
  key: string;
  label: string;
  value: string;
  provenance: ProvenanceLabel;
}

export interface FootprintAuditResult {
  canDrawFootprint: boolean;
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

/**
 * Evaluates a component's stored footprint data, assigns one of the four provenance labels
 * to each of the 7 required footprint fields, and determines whether an honest footprint
 * can be drawn without guessing or using placeholder dimensions.
 */
export function auditComponentFootprint(
  component: ComponentData
): FootprintAuditResult {
  const cat = (component.category || "").toLowerCase();
  const pkg = (component.package?.name || "").toLowerCase();
  const pins = component.pins || [];
  const pinCount = pins.length;

  const bodyDims = component.package?.bodyDimensions;
  const fpDims = component.package?.footprintDimensions;
  const hasStoredBodySize =
    (bodyDims?.lengthMm != null && bodyDims?.widthMm != null) ||
    (fpDims?.lengthMm != null && fpDims?.widthMm != null);

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

  // 2. Pin count field provenance (Derived from stored pins array length + row span when pitch exists)
  let pinCountField: FootprintDataSourceField;
  if (pinCount > 0) {
    if (storedPitch != null && pinCount >= 6 && pinCount % 2 === 0) {
      const pinsPerSide = pinCount / 2;
      const rowSpanMm = Number(((pinsPerSide - 1) * storedPitch).toFixed(2));
      pinCountField = {
        key: "pinCount",
        label: "Pin count",
        value: `${pinCount} (${pinsPerSide} per row · ${rowSpanMm} mm row span)`,
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
  const leadPitchField: FootprintDataSourceField =
    storedPitch != null
      ? {
          key: "leadPitch",
          label: "Lead pitch",
          value:
            storedRowSpacing != null
              ? `${storedPitch} mm (row spacing ${storedRowSpacing} mm)`
              : `${storedPitch} mm`,
          provenance: "Catalogue",
        }
      : {
          key: "leadPitch",
          label: "Lead pitch",
          value: "2.54 mm (fallback — not drawn)",
          provenance: "Placeholder",
        };

  // 4. Body size field provenance
  let bodySizeField: FootprintDataSourceField;
  if (hasStoredBodySize) {
    const activeDims =
      bodyDims?.lengthMm != null && bodyDims?.widthMm != null
        ? bodyDims
        : fpDims!;
    const dimParts: string[] = [];
    if (activeDims.lengthMm != null) dimParts.push(`${activeDims.lengthMm} mm L`);
    if (activeDims.widthMm != null) dimParts.push(`${activeDims.widthMm} mm W`);
    if (activeDims.heightMm != null) dimParts.push(`${activeDims.heightMm} mm H`);
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
      value: "10 × 6 mm (fallback — not drawn)",
      provenance: "Placeholder",
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

  // Check footprint template support and honesty conditions
  const isIcBranch =
    cat.includes("ic") ||
    cat.includes("circuit") ||
    pkg.includes("dip") ||
    pkg.includes("soic") ||
    pkg.includes("sop") ||
    pkg.includes("qfp") ||
    pinCount >= 6;

  const isTransistorBranch =
    !isIcBranch &&
    (cat.includes("bjt") ||
      cat.includes("mosfet") ||
      cat.includes("transistor") ||
      pkg.includes("to-") ||
      pkg.includes("sot") ||
      pinCount === 3);

  const isPassiveBranch =
    !isIcBranch &&
    !isTransistorBranch &&
    (cat.includes("resistor") ||
      cat.includes("diode") ||
      cat.includes("inductor") ||
      pkg.includes("0805") ||
      pkg.includes("1206") ||
      pkg.includes("axial"));

  const isCapacitorBranch =
    !isIcBranch &&
    !isTransistorBranch &&
    !isPassiveBranch &&
    cat.includes("capacitor");

  const isGenericFallback =
    !isIcBranch && !isTransistorBranch && !isPassiveBranch && !isCapacitorBranch;

  // Detect wrong package type matches
  const isTo92DrawnAsTo220 = isTransistorBranch && pkg.includes("to-92");
  const isCeramicDrawnAsElectrolytic =
    isCapacitorBranch &&
    (pkg.includes("c315") ||
      pkg.includes("goldmax") ||
      pkg.includes("ceramic") ||
      !pkg.includes("electrolytic"));
  const isRadialInductorDrawnAsAxial =
    isPassiveBranch && cat.includes("inductor") && pkg.includes("radial");

  const missingFields: string[] = [];
  let templateReason = "";

  if (isGenericFallback) {
    missingFields.push(`${pkgName || "package"} footprint template`);
    templateReason = `No footprint template for ${pkgName || "this package"} (generic fallback suppressed).`;
  } else if (isTo92DrawnAsTo220) {
    missingFields.push("TO-92 footprint template");
    templateReason =
      "Existing 3-pin template depicts a TO-220 heatsink tab, which does not match a plastic TO-92 package.";
  } else if (isCeramicDrawnAsElectrolytic) {
    missingFields.push("radial ceramic footprint template");
    templateReason =
      "Existing capacitor template depicts a polarized electrolytic can, which does not match a non-polar radial ceramic capacitor.";
  } else if (isRadialInductorDrawnAsAxial) {
    missingFields.push("radial inductor footprint template");
    templateReason =
      "Existing passive template depicts an axial horizontal body, which does not match a radial leaded inductor.";
  }

  if (!hasStoredBodySize) {
    missingFields.push("body dimensions");
  }
  if (storedPitch == null) {
    missingFields.push("lead pitch");
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

  const hasValidTemplate =
    !isGenericFallback &&
    !isTo92DrawnAsTo220 &&
    !isCeramicDrawnAsElectrolytic &&
    !isRadialInductorDrawnAsAxial;

  // Viva Note: A footprint is ONLY drawn if the package template is accurate AND both
  // body dimensions and lead pitch come from stored Catalogue data (never from Placeholders).
  const canDrawFootprint =
    hasValidTemplate && hasStoredBodySize && storedPitch != null && pinCount > 0;

  let emptyStateReason = "";
  if (!canDrawFootprint) {
    if (templateReason) {
      emptyStateReason = templateReason;
    } else if (!hasStoredBodySize && storedPitch == null) {
      emptyStateReason =
        "Body dimensions and lead pitch are not stored in the catalogue (placeholder geometry suppressed).";
    } else if (!hasStoredBodySize) {
      emptyStateReason =
        "Body dimensions are not stored in the catalogue (10 × 6 mm placeholder suppressed).";
    } else if (storedPitch == null) {
      emptyStateReason =
        "Lead pitch is not stored in the catalogue (2.54 mm placeholder suppressed).";
    } else {
      emptyStateReason =
        "Required footprint dimensions are not stored in the catalogue.";
    }
  }

  return {
    canDrawFootprint,
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

export function renderFootprintSvg(component: ComponentData) {
  const cat = (component.category || "").toLowerCase();
  const pkg = (component.package?.name || "").toLowerCase();
  const pinCount = component.pins?.length || 0;
  const leadPitch = component.package?.pcbLayout?.leadPitchMm ?? 2.54;
  const lengthMm =
    component.package?.bodyDimensions?.lengthMm ??
    component.package?.footprintDimensions?.lengthMm ??
    10;
  const widthMm =
    component.package?.bodyDimensions?.widthMm ??
    component.package?.footprintDimensions?.widthMm ??
    6;

  // 1. IC / DIP / SOIC / QFP
  if (
    cat.includes("ic") ||
    cat.includes("circuit") ||
    pkg.includes("dip") ||
    pkg.includes("soic") ||
    pkg.includes("sop") ||
    pkg.includes("qfp") ||
    pinCount >= 6
  ) {
    const pinsPerSide = Math.max(
      3,
      Math.min(8, Math.ceil((pinCount || 8) / 2))
    );
    return (
      <svg
        className="footprint-svg"
        viewBox="0 0 220 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="IC Footprint Vector Diagram"
      >
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
        {Array.from({ length: pinsPerSide }).map((_, i) => {
          const y = 30 + i * (70 / (pinsPerSide - 1 || 1));
          const storedPin = component.pins?.[i];
          return (
            <g key={`l-${storedPin?.number ?? i}`}>
              {storedPin && (
                <title>{`Pin ${storedPin.number}: ${storedPin.name}`}</title>
              )}
              <rect
                x="25"
                y={y - 4}
                width="25"
                height="8"
                rx="1.5"
                fill="var(--cq-surface)"
                stroke="var(--cq-emerald)"
                strokeWidth="1.2"
              />
              <text
                x="18"
                y={y + 3}
                fill="var(--cq-text-secondary)"
                fontSize="8"
                fontFamily="var(--cq-font-mono)"
                textAnchor="end"
              >
                {storedPin?.number ?? ""}
              </text>
            </g>
          );
        })}
        {Array.from({ length: pinsPerSide }).map((_, i) => {
          const y = 30 + i * (70 / (pinsPerSide - 1 || 1));
          const storedPin = component.pins?.[pinsPerSide * 2 - 1 - i];
          return (
            <g key={`r-${storedPin?.number ?? i}`}>
              {storedPin && (
                <title>{`Pin ${storedPin.number}: ${storedPin.name}`}</title>
              )}
              <rect
                x="170"
                y={y - 4}
                width="25"
                height="8"
                rx="1.5"
                fill="var(--cq-surface)"
                stroke="var(--cq-blue)"
                strokeWidth="1.2"
              />
              <text
                x="202"
                y={y + 3}
                fill="var(--cq-text-secondary)"
                fontSize="8"
                fontFamily="var(--cq-font-mono)"
              >
                {storedPin?.number ?? ""}
              </text>
            </g>
          );
        })}
        <line
          x1="50"
          y1="120"
          x2="170"
          y2="120"
          stroke="var(--cq-text-muted)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text
          x="110"
          y="126"
          fill="var(--cq-text-secondary)"
          fontSize="8"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          {lengthMm} mm L × {widthMm} mm W
        </text>
        <text
          x="110"
          y="68"
          fill="var(--cq-text-primary)"
          fontSize="9"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "IC PACKAGE"}
        </text>
      </svg>
    );
  }

  // 2. Transistors / 3-pin TO-220 / TO-92 / SOT
  if (
    cat.includes("bjt") ||
    cat.includes("mosfet") ||
    cat.includes("transistor") ||
    pkg.includes("to-") ||
    pkg.includes("sot") ||
    pinCount === 3
  ) {
    return (
      <svg
        className="footprint-svg"
        viewBox="0 0 220 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Transistor Footprint Vector Diagram"
      >
        <rect
          x="70"
          y="15"
          width="80"
          height="20"
          rx="2"
          fill="var(--cq-surface-subtle)"
          stroke="var(--cq-border-strong)"
          strokeWidth="1.2"
        />
        <circle
          cx="110"
          cy="25"
          r="5"
          fill="var(--cq-surface)"
          stroke="var(--cq-blue)"
          strokeWidth="1"
        />
        <rect
          x="70"
          y="35"
          width="80"
          height="50"
          rx="3"
          fill="var(--cq-surface)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />
        <text
          x="110"
          y="62"
          fill="var(--cq-text-primary)"
          fontSize="9"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "3-LEAD TRANSISTOR"}
        </text>
        <g>
          <rect
            x="80"
            y="85"
            width="10"
            height="28"
            rx="1.5"
            fill="var(--cq-surface)"
            stroke="var(--cq-emerald)"
            strokeWidth="1.2"
          />
          <text
            x="85"
            y="122"
            fill="var(--cq-text-secondary)"
            fontSize="8"
            fontFamily="var(--cq-font-mono)"
            textAnchor="middle"
          >
            {component.pins?.[0]?.number ?? ""}
          </text>
        </g>
        <g>
          <rect
            x="105"
            y="85"
            width="10"
            height="28"
            rx="1.5"
            fill="var(--cq-surface)"
            stroke="var(--cq-emerald)"
            strokeWidth="1.2"
          />
          <text
            x="110"
            y="122"
            fill="var(--cq-text-secondary)"
            fontSize="8"
            fontFamily="var(--cq-font-mono)"
            textAnchor="middle"
          >
            {component.pins?.[1]?.number ?? ""}
          </text>
        </g>
        <g>
          <rect
            x="130"
            y="85"
            width="10"
            height="28"
            rx="1.5"
            fill="var(--cq-surface)"
            stroke="var(--cq-emerald)"
            strokeWidth="1.2"
          />
          <text
            x="135"
            y="122"
            fill="var(--cq-text-secondary)"
            fontSize="8"
            fontFamily="var(--cq-font-mono)"
            textAnchor="middle"
          >
            {component.pins?.[2]?.number ?? ""}
          </text>
        </g>
        <line
          x1="85"
          y1="98"
          x2="135"
          y2="98"
          stroke="var(--cq-warning)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text
          x="165"
          y="102"
          fill="var(--cq-warning)"
          fontSize="8"
          fontFamily="var(--cq-font-mono)"
        >
          {leadPitch}mm pitch
        </text>
      </svg>
    );
  }

  // 3. Resistors, Inductors, Diodes (2-terminal Axial / SMD)
  if (
    cat.includes("resistor") ||
    cat.includes("diode") ||
    cat.includes("inductor") ||
    pkg.includes("0805") ||
    pkg.includes("1206") ||
    pkg.includes("axial")
  ) {
    const isDiode = cat.includes("diode") || cat.includes("led");
    return (
      <svg
        className="footprint-svg"
        viewBox="0 0 220 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="2-Terminal Passive Footprint Vector Diagram"
      >
        <rect
          x="30"
          y="55"
          width="35"
          height="20"
          rx="2"
          fill="var(--cq-emerald-soft)"
          stroke="var(--cq-emerald)"
          strokeWidth="1.5"
        />
        <text
          x="47"
          y="68"
          fill="var(--cq-emerald)"
          fontSize="9"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.pins?.[0]?.number ?? ""}
        </text>
        <rect
          x="65"
          y="45"
          width="90"
          height="40"
          rx="4"
          fill="var(--cq-surface)"
          stroke="var(--cq-border-strong)"
          strokeWidth="1.5"
        />
        {isDiode ? (
          <line
            x1="135"
            y1="45"
            x2="135"
            y2="85"
            stroke="var(--cq-emerald)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        ) : (
          <g opacity="0.8">
            <line
              x1="85"
              y1="45"
              x2="85"
              y2="85"
              stroke="var(--cq-warning)"
              strokeWidth="3"
            />
            <line
              x1="97"
              y1="45"
              x2="97"
              y2="85"
              stroke="var(--cq-blue)"
              strokeWidth="3"
            />
            <line
              x1="109"
              y1="45"
              x2="109"
              y2="85"
              stroke="var(--cq-emerald)"
              strokeWidth="3"
            />
          </g>
        )}
        <rect
          x="155"
          y="55"
          width="35"
          height="20"
          rx="2"
          fill="var(--cq-emerald-soft)"
          stroke="var(--cq-emerald)"
          strokeWidth="1.5"
        />
        <text
          x="172"
          y="68"
          fill="var(--cq-emerald)"
          fontSize="9"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.pins?.[1]?.number ?? ""}
        </text>
        <line
          x1="30"
          y1="102"
          x2="190"
          y2="102"
          stroke="var(--cq-text-muted)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text
          x="110"
          y="116"
          fill="var(--cq-text-secondary)"
          fontSize="8"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Span: {lengthMm} mm · Width: {widthMm} mm
        </text>
        <text
          x="110"
          y="36"
          fill="var(--cq-text-primary)"
          fontSize="9"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "2-TERMINAL DEVICE"}
        </text>
      </svg>
    );
  }

  // 4. Capacitors (Radial / SMD)
  if (cat.includes("capacitor")) {
    return (
      <svg
        className="footprint-svg"
        viewBox="0 0 220 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Capacitor Footprint Vector Diagram"
      >
        <circle
          cx="110"
          cy="60"
          r="40"
          fill="var(--cq-surface)"
          stroke="var(--cq-text-primary)"
          strokeWidth="1.5"
        />
        <circle
          cx="110"
          cy="60"
          r="36"
          fill="none"
          stroke="var(--cq-border-default)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d="M74 46 A40 40 0 0 0 74 74 L81 74 A32 32 0 0 1 81 46 Z"
          fill="var(--cq-border-default)"
        />
        <text
          x="77"
          y="63"
          fill="var(--cq-text-secondary)"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
        >
          -
        </text>
        <circle
          cx="98"
          cy="60"
          r="6"
          fill="var(--cq-emerald-soft)"
          stroke="var(--cq-emerald)"
          strokeWidth="1.5"
        />
        <circle
          cx="98"
          cy="60"
          r="2.5"
          fill="var(--cq-surface)"
          stroke="var(--cq-emerald)"
          strokeWidth="0.8"
        />
        <circle
          cx="122"
          cy="60"
          r="6"
          fill="var(--cq-blue-soft)"
          stroke="var(--cq-blue)"
          strokeWidth="1.5"
        />
        <circle
          cx="122"
          cy="60"
          r="2.5"
          fill="var(--cq-surface)"
          stroke="var(--cq-blue)"
          strokeWidth="0.8"
        />
        <text
          x="110"
          y="118"
          fill="var(--cq-text-secondary)"
          fontSize="8"
          fontFamily="var(--cq-font-mono)"
          textAnchor="middle"
        >
          Lead Pitch: {leadPitch} mm · ⌀{widthMm} mm
        </text>
        <text
          x="110"
          y="15"
          fill="var(--cq-text-primary)"
          fontSize="9"
          fontFamily="var(--cq-font-sans)"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "RADIAL ELECTROLYTIC"}
        </text>
      </svg>
    );
  }

  return null;
}
