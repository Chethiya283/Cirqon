import React, { useState } from "react";
import "./ComponentImage.css";
import type { ComponentData } from "./componentImageUtils";
import { getComponentImageInfo } from "./componentImageUtils";

/**
 * Renders an authentic, package-accurate vector drawing for each component type.
 * Used as an instant fallback during network latency, image 404s, or offline usage.
 */
function renderPackageIllustration(packageType: string, component: ComponentData) {
  const partNumber = component.partNumber || "PART";

  switch (packageType) {
    case "dip8":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="PDIP-8 IC Package">
          {/* DIP-8 Body */}
          <rect x="22" y="15" width="56" height="70" rx="3" fill="#242D3D" stroke="#161B22" strokeWidth="1.2" />
          {/* Top Notch */}
          <path d="M44 15 A6 6 0 0 0 56 15" fill="#161B22" />
          {/* Pin 1 Dot */}
          <circle cx="30" cy="25" r="2.5" fill="#147D64" />
          {/* Left Pins (4) */}
          <rect x="10" y="21" width="12" height="6" rx="1" fill="#C9D4E0" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="10" y="37" width="12" height="6" rx="1" fill="#C9D4E0" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="10" y="53" width="12" height="6" rx="1" fill="#C9D4E0" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="10" y="69" width="12" height="6" rx="1" fill="#C9D4E0" stroke="#7B899B" strokeWidth="0.8" />
          {/* Right Pins (4) */}
          <rect x="78" y="21" width="12" height="6" rx="1" fill="#C9D4E0" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="78" y="37" width="12" height="6" rx="1" fill="#C9D4E0" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="78" y="53" width="12" height="6" rx="1" fill="#C9D4E0" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="78" y="69" width="12" height="6" rx="1" fill="#C9D4E0" stroke="#7B899B" strokeWidth="0.8" />
          {/* Laser Marking */}
          <text x="50" y="47" fill="#E2E8F0" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            {partNumber}
          </text>
          <text x="50" y="57" fill="#94A3B8" fontSize="5.5" fontFamily="monospace" textAnchor="middle">
            DIP-8
          </text>
        </svg>
      );

    case "to220":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="TO-220 Transistor Package">
          {/* Metal Heat Sink Tab */}
          <rect x="25" y="12" width="50" height="22" rx="2" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
          <circle cx="50" cy="22" r="6" fill="#F8FAFC" stroke="#7B899B" strokeWidth="1" />
          {/* Plastic Body */}
          <rect x="25" y="32" width="50" height="34" rx="2" fill="#1E293B" stroke="#0F172A" strokeWidth="1.2" />
          <rect x="27" y="34" width="46" height="3" fill="#334155" />
          {/* 3 Terminal Leads */}
          <rect x="33" y="66" width="6" height="24" rx="1" fill="#CBD5E1" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="47" y="66" width="6" height="24" rx="1" fill="#CBD5E1" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="61" y="66" width="6" height="24" rx="1" fill="#CBD5E1" stroke="#7B899B" strokeWidth="0.8" />
          {/* Text Marking */}
          <text x="50" y="52" fill="#F1F5F9" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            {partNumber}
          </text>
        </svg>
      );

    case "to92":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="TO-92 Transistor Package">
          {/* Curved Back */}
          <path d="M30 46 C30 24 70 24 70 46 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
          {/* Flat Front Face */}
          <rect x="30" y="32" width="40" height="26" rx="3" fill="#334155" stroke="#1E293B" strokeWidth="1" />
          {/* 3 Leads */}
          <rect x="36" y="58" width="5" height="30" rx="1" fill="#CBD5E1" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="47.5" y="58" width="5" height="30" rx="1" fill="#CBD5E1" stroke="#7B899B" strokeWidth="0.8" />
          <rect x="59" y="58" width="5" height="30" rx="1" fill="#CBD5E1" stroke="#7B899B" strokeWidth="0.8" />
          {/* Text Marking */}
          <text x="50" y="47" fill="#F8FAFC" fontSize="6" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            {partNumber}
          </text>
        </svg>
      );

    case "do41":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="DO-41 Rectifier Diode">
          {/* Left Lead Wire */}
          <line x1="8" y1="50" x2="32" y2="50" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          {/* Diode Cylindrical Body */}
          <rect x="30" y="38" width="40" height="24" rx="3" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
          {/* Silver Cathode Band */}
          <rect x="62" y="38" width="6" height="24" fill="#E2E8F0" />
          {/* Right Lead Wire */}
          <line x1="70" y1="50" x2="92" y2="50" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          {/* Part Marking */}
          <text x="47" y="52" fill="#E2E8F0" fontSize="5.5" fontFamily="monospace" textAnchor="middle">
            {partNumber}
          </text>
        </svg>
      );

    case "do35":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="DO-35 Glass Diode">
          {/* Left Lead Wire */}
          <line x1="10" y1="50" x2="35" y2="50" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Glass Bead Body */}
          <rect x="33" y="40" width="34" height="20" rx="4" fill="#EA580C" opacity="0.85" stroke="#C2410C" strokeWidth="1" />
          {/* Silicon Slug Inside */}
          <circle cx="48" cy="50" r="3.5" fill="#78350F" />
          {/* Black Cathode Band */}
          <rect x="60" y="40" width="5" height="20" fill="#0F172A" />
          {/* Right Lead Wire */}
          <line x1="67" y1="50" x2="90" y2="50" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Part Marking */}
          <text x="46" y="52" fill="#FEF3C7" fontSize="5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            {partNumber}
          </text>
        </svg>
      );

    case "resistor":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="Axial Resistor">
          {/* Lead Wires */}
          <line x1="8" y1="50" x2="28" y2="50" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="72" y1="50" x2="92" y2="50" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Resistor Body (Light Blue for Metal Film) */}
          <path d="M28 44 C26 44 26 56 28 56 L72 56 C74 56 74 44 72 44 Z" fill="#7DD3FC" stroke="#0284C7" strokeWidth="1" />
          {/* 5 Color Bands for 10k 1% (Brown, Black, Black, Red, Brown) */}
          <rect x="34" y="44" width="3.5" height="12" fill="#78350F" /> {/* Brown = 1 */}
          <rect x="42" y="44" width="3.5" height="12" fill="#0F172A" /> {/* Black = 0 */}
          <rect x="50" y="44" width="3.5" height="12" fill="#0F172A" /> {/* Black = 0 */}
          <rect x="58" y="44" width="3.5" height="12" fill="#DC2626" /> {/* Red = x100 */}
          <rect x="66" y="44" width="3.5" height="12" fill="#78350F" /> {/* Brown = 1% */}
        </svg>
      );

    case "capacitor_radial":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="Radial MLCC Capacitor">
          {/* 2 Crimped Leads */}
          <path d="M42 54 L42 66 L39 70 L42 74 L42 88" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M58 54 L58 66 L61 70 L58 74 L58 88" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Yellow Epoxy Dipped Body */}
          <rect x="30" y="22" width="40" height="34" rx="7" fill="#FACC15" stroke="#CA8A04" strokeWidth="1.2" />
          {/* Value Marking */}
          <text x="50" y="40" fill="#713F12" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            104
          </text>
          <text x="50" y="48" fill="#854D0E" fontSize="5" fontFamily="monospace" textAnchor="middle">
            50V
          </text>
        </svg>
      );

    case "inductor_radial":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="Radial Power Inductor">
          {/* Leads */}
          <line x1="40" y1="62" x2="40" y2="88" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="62" x2="60" y2="88" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Bobbin Top & Bottom Flanges */}
          <rect x="28" y="20" width="44" height="42" rx="4" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
          {/* Visible Copper Winding Middle Groove */}
          <rect x="30" y="32" width="40" height="18" fill="#B45309" stroke="#92400E" strokeWidth="0.8" />
          {/* Value Marking */}
          <text x="50" y="43" fill="#FEF3C7" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            101K
          </text>
        </svg>
      );

    case "tactile_switch":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="Tactile Switch">
          {/* Terminal Leads (4) */}
          <rect x="14" y="28" width="10" height="5" rx="1" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="0.8" />
          <rect x="14" y="66" width="10" height="5" rx="1" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="0.8" />
          <rect x="76" y="28" width="10" height="5" rx="1" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="0.8" />
          <rect x="76" y="66" width="10" height="5" rx="1" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="0.8" />
          {/* Metallic Square Bracket Body */}
          <rect x="22" y="22" width="56" height="56" rx="4" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
          {/* Corner Rivet Points */}
          <circle cx="28" cy="28" r="2.5" fill="#94A3B8" />
          <circle cx="72" cy="28" r="2.5" fill="#94A3B8" />
          <circle cx="28" cy="72" r="2.5" fill="#94A3B8" />
          <circle cx="72" cy="72" r="2.5" fill="#94A3B8" />
          {/* Circular Button Actuator */}
          <circle cx="50" cy="50" r="16" fill="#1E293B" stroke="#0F172A" strokeWidth="1" />
          <circle cx="50" cy="50" r="13" fill="#334155" />
        </svg>
      );

    case "connector_header":
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="Vertical Connector Header">
          {/* Nylon Housing Base */}
          <rect x="20" y="35" width="60" height="30" rx="2" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.2" />
          <rect x="20" y="32" width="60" height="5" fill="#E2E8F0" />
          {/* Friction Lock Ramp */}
          <polygon points="38,32 62,32 58,26 42,26" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
          {/* 4 Square Brass Contact Pins */}
          <rect x="28" y="18" width="5" height="34" rx="0.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
          <rect x="42" y="18" width="5" height="34" rx="0.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
          <rect x="56" y="18" width="5" height="34" rx="0.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
          <rect x="70" y="18" width="5" height="34" rx="0.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
          {/* Solder Tails extending downward */}
          <rect x="29" y="65" width="3" height="18" fill="#CBD5E1" />
          <rect x="43" y="65" width="3" height="18" fill="#CBD5E1" />
          <rect x="57" y="65" width="3" height="18" fill="#CBD5E1" />
          <rect x="71" y="65" width="3" height="18" fill="#CBD5E1" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 100 100" className="package-svg" aria-label="Electronic Component">
          <rect x="25" y="25" width="50" height="50" rx="4" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="14" fill="#E2E8F0" stroke="#7B899B" strokeWidth="1" />
          <circle cx="50" cy="50" r="4" fill="#147D64" />
          <line x1="50" y1="12" x2="50" y2="25" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <line x1="50" y1="75" x2="50" y2="88" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="50" x2="25" y2="50" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <line x1="75" y1="50" x2="88" y2="50" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <text x="50" y="53" fill="#1E293B" fontSize="6" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
            PART
          </text>
        </svg>
      );
  }
}

interface ComponentThumbnailProps {
  component: ComponentData;
  size?: "sm" | "md" | "lg" | "fluid";
  showProvenanceBadge?: boolean;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

/**
 * Robust component image container:
 * - Attempts to load real product photograph
 * - Shows subtle loading shimmer while in flight
 * - Seamlessly falls back to category icon or package vector illustration on network failure, 404, or missing URL
 * - Strictly prevents layout shifts with fixed aspect ratio box
 */
export const ComponentThumbnail: React.FC<ComponentThumbnailProps> = ({
  component,
  size = "sm",
  showProvenanceBadge = false,
  className = "",
  fallbackIcon,
}) => {
  const imageInfo = getComponentImageInfo(component);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(imageInfo.src));

  const shouldRenderPhoto = Boolean(imageInfo.src) && !hasError;

  return (
    <div
      className={`component-thumb-container size-${size} ${className}`}
      title={`${imageInfo.alt} — ${imageInfo.provenanceLabel}`}
    >
      <div className="component-thumb-box">
        {shouldRenderPhoto ? (
          <>
            {isLoading && <div className="thumb-shimmer" />}
            <img
              src={imageInfo.src}
              alt={imageInfo.alt}
              loading="lazy"
              className={`thumb-img ${isLoading ? "loading" : "loaded"}`}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
            />
          </>
        ) : fallbackIcon ? (
          <div className="thumb-category-wrap">
            {fallbackIcon}
          </div>
        ) : (
          <div className="thumb-vector-wrap">
            {renderPackageIllustration(imageInfo.packageType, component)}
          </div>
        )}
      </div>

      {showProvenanceBadge && (
        <span
          className={`provenance-badge ${
            imageInfo.isVerifiedPhoto && !hasError ? "verified" : "spec"
          }`}
          title={imageInfo.provenanceLabel}
        >
          {imageInfo.isVerifiedPhoto && !hasError ? "Illustration" : "Package visual"}
        </span>
      )}
    </div>
  );
};
