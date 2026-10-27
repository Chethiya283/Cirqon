// Pure formatting and validation utility functions for component specifications, dimensions, and URLs.

import type { ComponentData } from "../types";

export function isValidHttpUrl(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

export function formatDimensions(pkg?: ComponentData["package"]): string {
  const dims =
    pkg?.bodyDimensions &&
    (pkg.bodyDimensions.lengthMm != null ||
      pkg.bodyDimensions.widthMm != null ||
      pkg.bodyDimensions.heightMm != null)
      ? pkg.bodyDimensions
      : pkg?.footprintDimensions;
  if (!dims) return "Not available";
  const { lengthMm, widthMm, heightMm } = dims;
  const parts: string[] = [];
  if (lengthMm != null) parts.push(`${lengthMm} mm L`);
  if (widthMm != null) parts.push(`${widthMm} mm W`);
  if (heightMm != null) parts.push(`${heightMm} mm H`);
  return parts.length > 0 ? parts.join(" × ") : "Not available";
}

export function findUnitForSpecKey(
  key: string,
  specs?: Record<string, unknown>
): string | undefined {
  if (!specs) return undefined;
  if (typeof specs[`${key}Unit`] === "string") {
    return specs[`${key}Unit`] as string;
  }
  const baseKey = key.replace(/(Max|Min|Nom)$/, "");
  if (baseKey !== key && typeof specs[`${baseKey}Unit`] === "string") {
    return specs[`${baseKey}Unit`] as string;
  }
  return undefined;
}

export function formatSpecValue(val: unknown, unit?: string): string {
  if (val === undefined || val === null || val === "") {
    return "Not available";
  }
  let display: string;
  if (typeof val === "boolean") {
    display = val ? "Yes" : "No";
  } else if (Array.isArray(val)) {
    display = val
      .map((item) =>
        typeof item === "object" && item !== null
          ? JSON.stringify(item)
          : String(item)
      )
      .join(", ");
  } else if (typeof val === "object") {
    display = JSON.stringify(val);
  } else {
    display = String(val).trim();
  }

  if (!display || display === "—" || display === "null" || display === "undefined") {
    return "Not available";
  }

  if (unit && unit.trim()) {
    return `${display} ${unit.trim()}`;
  }
  return display;
}

export function formatSpecKeyLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function getSpecPairs(
  specs?: Record<string, unknown>,
  limit?: number
): { key: string; label: string; value: string }[] {
  if (!specs) return [];
  const allKeys = Object.keys(specs);
  const filteredKeys = allKeys.filter((key) => {
    if (key.endsWith("Unit")) {
      const base = key.slice(0, -4);
      const hasPairedValue = allKeys.some(
        (k) => k !== key && (k === base || k.startsWith(base))
      );
      if (hasPairedValue) return false;
    }
    return true;
  });

  const pairs = filteredKeys
    .map((key) => {
      const unit = findUnitForSpecKey(key, specs);
      const value = formatSpecValue(specs[key], unit);
      return {
        key,
        label: formatSpecKeyLabel(key),
        value,
      };
    })
    .filter((item) => item.value !== "—" && item.value !== "Not available");

  return limit ? pairs.slice(0, limit) : pairs;
}

export function isRowDivergent(values: (string | undefined | null)[]): boolean {
  const valid = values
    .map((v) => (v ?? "").trim())
    .filter(
      (v) =>
        v !== "" &&
        v !== "—" &&
        v !== "-" &&
        v !== "Not available" &&
        v !== "N/A" &&
        v !== "None" &&
        v !== "Not specified"
    );
  if (valid.length <= 1) return false;
  return new Set(valid).size > 1;
}

