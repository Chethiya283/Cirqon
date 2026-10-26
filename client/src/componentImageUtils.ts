export type ComponentData = {
  _id: string;
  partNumber: string;
  name: string;
  category: string;
  manufacturer: string;
  description: string;
  imageUrl?: string;
  specifications?: Record<string, unknown>;
  package?: {
    name?: string;
    mountingType?: string;
    bodyDimensions?: {
      lengthMm?: number;
      widthMm?: number;
      heightMm?: number;
      seatedHeightMm?: number;
    };
    pcbLayout?: {
      leadPitchMm?: number;
      rowSpacingMm?: number;
      drillDiameterMm?: number;
      padDiameterMm?: number;
    };
    footprintDimensions?: {
      lengthMm?: number;
      widthMm?: number;
      heightMm?: number;
    };
    padLayout?: string;
    landPatternUrl?: string;
  };
  pins?: {
    number?: number;
    name?: string;
    function?: string;
  }[];
  datasheetUrl?: string;
  manufacturerUrl?: string;
  dataStatus: "verified" | "incomplete";
};

export type ImageProvenance = "database" | "verified-photo" | "package-spec";

export interface ComponentImageInfo {
  src?: string;
  alt: string;
  isVerifiedPhoto: boolean;
  provenance: ImageProvenance;
  provenanceLabel: string;
  packageType: string;
}

/**
 * Curated product photographs from open-access scientific & engineering repositories
 * (Wikimedia Commons CC BY-SA / Public Domain) matched exactly to component part numbers.
 */
export const VERIFIED_PRODUCT_PHOTOS: Record<
  string,
  { url: string; packageType: string; label: string }
> = {
  LM358: {
    url: "/images/components/LM358.jpg",
    packageType: "dip8",
    label: "Texas Instruments LM358P Dual Op-Amp (Verified Photo)",
  },
  NE555: {
    url: "/images/components/NE555.jpg",
    packageType: "dip8",
    label: "NE555 Precision Timer IC DIP-8 (Verified Photo)",
  },
  LM7805: {
    url: "/images/components/LM7805.jpg",
    packageType: "to220",
    label: "LM7805 Positive 5V Regulator TO-220 (Verified Photo)",
  },
  "1N4007": {
    url: "/images/components/1N4007.jpg",
    packageType: "do41",
    label: "1N4007 1000V 1A Rectifier Diode DO-41 (Verified Photo)",
  },
  "1N4148": {
    url: "/images/components/1N4148.jpg",
    packageType: "do35",
    label: "1N4148 High-Speed Switching Diode DO-35 (Verified Photo)",
  },
  BC547: {
    url: "/images/components/BC547.jpg",
    packageType: "to92",
    label: "BC547B NPN General Purpose BJT TO-92 (Verified Photo)",
  },
  "MFR-25FTE52-10K": {
    url: "/images/components/MFR-25FTE52-10K.jpg",
    packageType: "resistor",
    label: "10 kΩ 0.25W Metal Film Resistor Axial (Verified Photo)",
  },
  C315C104K5R5TA: {
    url: "/images/components/C315C104K5R5TA.jpg",
    packageType: "capacitor_radial",
    label: "100 nF (0.1 µF) 50V Ceramic Capacitor (Verified Photo)",
  },
  "RLB0914-101KL": {
    url: "/images/components/RLB0914-101KL.jpg",
    packageType: "inductor_radial",
    label: "100 µH Radial Leaded Power Inductor (Verified Photo)",
  },
  "B3F-1000": {
    url: "/images/components/B3F-1000.jpg",
    packageType: "tactile_switch",
    label: "6×6 mm PCB Tactile Push-Button Switch (Verified Photo)",
  },
  "0022232041": {
    url: "/images/components/0022232041.jpg",
    packageType: "connector_header",
    label: "KK 254 4-Pin Vertical Solid Header (Verified Photo)",
  },
};

/**
 * Determine the visual package category for fallback vector rendering.
 */
export function inferPackageType(component: ComponentData): string {
  const cat = (component.category || "").toLowerCase();
  const pkg = (component.package?.name || "").toLowerCase();
  const part = (component.partNumber || "").toUpperCase();

  if (
    part.includes("555") ||
    part.includes("358") ||
    pkg.includes("dip") ||
    pkg.includes("soic") ||
    cat.includes("ic") ||
    cat.includes("circuit")
  ) {
    return "dip8";
  }
  if (
    part.includes("7805") ||
    pkg.includes("to-220") ||
    cat.includes("regulator")
  ) {
    return "to220";
  }
  if (
    part.includes("BC") ||
    pkg.includes("to-92") ||
    cat.includes("bjt") ||
    cat.includes("mosfet")
  ) {
    return "to92";
  }
  if (
    part.includes("4007") ||
    part.includes("4001") ||
    pkg.includes("do-41") ||
    pkg.includes("do-204")
  ) {
    return "do41";
  }
  if (part.includes("4148") || pkg.includes("do-35") || cat.includes("diode")) {
    return "do35";
  }
  if (
    cat.includes("resistor") ||
    pkg.includes("mfr") ||
    pkg.includes("axial")
  ) {
    return "resistor";
  }
  if (cat.includes("capacitor")) {
    return "capacitor_radial";
  }
  if (cat.includes("inductor")) {
    return "inductor_radial";
  }
  if (cat.includes("switch")) {
    return "tactile_switch";
  }
  if (cat.includes("connector") || pkg.includes("header")) {
    return "connector_header";
  }
  return "generic";
}

/**
 * Resolves component image metadata in strict priority order:
 * 1. Database record `imageUrl`
 * 2. Curated verified product photo
 * 3. Package specification illustration
 */
export function getComponentImageInfo(
  component: ComponentData
): ComponentImageInfo {
  // 1. Direct database record
  if (component.imageUrl && component.imageUrl.trim().length > 0) {
    return {
      src: component.imageUrl.trim(),
      alt: `${component.name} (${component.partNumber}) Product Photograph`,
      isVerifiedPhoto: true,
      provenance: "database",
      provenanceLabel: "Verified Database Record Photo",
      packageType: inferPackageType(component),
    };
  }

  // 2. Verified real product photo mapping
  const verified = VERIFIED_PRODUCT_PHOTOS[component.partNumber];
  if (verified) {
    return {
      src: verified.url,
      alt: `${component.name} (${component.partNumber}) Product Photograph`,
      isVerifiedPhoto: true,
      provenance: "verified-photo",
      provenanceLabel: verified.label,
      packageType: verified.packageType,
    };
  }

  // 3. Fallback package illustration
  const pkgType = inferPackageType(component);
  return {
    alt: `${component.name} (${component.partNumber}) Technical Package Illustration`,
    isVerifiedPhoto: false,
    provenance: "package-spec",
    provenanceLabel: "Physical Package Specification Reference",
    packageType: pkgType,
  };
}

