// Shared TypeScript types and interfaces for Cirqon electronic components and sorting fields.

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

export type SortField =
  | "partNumber"
  | "name"
  | "manufacturer"
  | "category"
  | "package";

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

