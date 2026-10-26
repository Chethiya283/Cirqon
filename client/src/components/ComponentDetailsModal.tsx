// Modal dialog presenting complete component specifications, CAD footprint, pinout table, and documentation links.

import React, { useEffect } from "react";
import type { ComponentData } from "../types";
import { ComponentThumbnail } from "../ComponentImage";
import { getComponentImageInfo } from "../componentImageUtils";
import { renderFootprintSvg } from "../utils/footprint";
import {
  formatDimensions,
  getSpecPairs,
  isValidHttpUrl,
} from "../utils/formatters";
import "./ComponentDetailsModal.css";

/**
 * Props for the ComponentDetailsModal component.
 */
export interface ComponentDetailsModalProps {
  /** The electronic component data to display inside the modal; if null, the modal renders nothing */
  component: ComponentData | null;
  /** Callback function invoked when the modal is closed via close button, backdrop click, or Escape key */
  onClose: () => void;
}

export const ComponentDetailsModal: React.FC<ComponentDetailsModalProps> = ({
  component,
  onClose,
}) => {
  // Close the component details modal with the Escape key.
  useEffect(() => {
    if (!component) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [component, onClose]);

  if (!component) return null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="component-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-component-name"
      >
        <header className="modal-header">
          <div>
            <div className="eyebrow">COMPONENT SPECIFICATION</div>
            <h2 id="modal-component-name">
              {component.name}
            </h2>
            <p className="modal-part-number">
              {component.partNumber}
            </p>
          </div>

          <button
            className="modal-close"
            type="button"
            aria-label="Close component details"
            onClick={onClose}
          >
             × 
          </button>
        </header>

        <div className="modal-content">
          {(() => {
            const imgInfo = getComponentImageInfo(component);
            return (
              <div className="modal-product-identity">
                <ComponentThumbnail
                  component={component}
                  size="lg"
                  showProvenanceBadge
                />
                <div className="modal-product-meta">
                  <div className="modal-photo-provenance-bar">
                    <span
                      className={`photo-indicator-tag ${
                        imgInfo.provenance === "package-spec"
                          ? "spec"
                          : "verified"
                      }`}
                    >
                      {imgInfo.provenance === "package-spec"
                        ? "◈ PACKAGE SPEC VISUAL"
                        : "● VERIFIED PRODUCT PHOTO"}
                    </span>
                    <span>{imgInfo.provenanceLabel}</span>
                  </div>
                  <div className="modal-summary">
                    <span className="modal-category">
                      {component.category}
                    </span>
                    {component.package?.mountingType && (
                      <span className="modal-category">
                        {component.package.mountingType}
                      </span>
                    )}
                    {component.package?.name && (
                      <span className="modal-category">
                        {component.package.name}
                      </span>
                    )}
                  </div>
                  <p className="modal-quick-desc">
                    {component.description ||
                      "No functional description recorded for this part."}
                  </p>
                </div>
              </div>
            );
          })()}

          <section className="modal-section">
            <h3>General Information</h3>
            <p>
              {component.description ||
                "No functional description recorded for this part."}
            </p>

            <div className="modal-info-grid">
              <div>
                <span>Manufacturer</span>
                <strong>{component.manufacturer || "—"}</strong>
              </div>
              <div>
                <span>Part Number</span>
                <strong>{component.partNumber}</strong>
              </div>
              <div>
                <span>Category</span>
                <strong>{component.category || "—"}</strong>
              </div>
              <div>
                <span>Package Name</span>
                <strong>
                  {component.package?.name || "Unspecified"}
                </strong>
              </div>
            </div>
          </section>

          <section className="modal-section">
            <h3>Electrical & Parametric Specifications</h3>

            {getSpecPairs(component.specifications).length > 0 ? (
              <div className="specification-list">
                {getSpecPairs(component.specifications).map(
                  (spec) => (
                    <div className="specification-row" key={spec.key}>
                      <span>{spec.label}</span>
                      <strong>{spec.value}</strong>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="modal-muted">
                No discrete electrical parameters are recorded in the catalog for this part.
              </p>
            )}
          </section>

          <section className="modal-section modal-mechanical-section">
            <h3>Package & Mechanical Dimensions</h3>

            <div className="modal-footprint-grid">
              <div className="modal-footprint-preview cad-grid-overlay">
                <span className="cad-dimension-badge">FOOTPRINT VECTOR GEOMETRY</span>
                {renderFootprintSvg(component)}
              </div>

              <div className="specification-list">
                <div className="specification-row">
                  <span>Package Designation</span>
                  <strong>
                    {component.package?.name || "Unspecified"}
                  </strong>
                </div>

                <div className="specification-row">
                  <span>Mounting Technology</span>
                  <strong>
                    {component.package?.mountingType || "Unspecified"}
                  </strong>
                </div>

                <div className="specification-row">
                  <span>Body Dimensions (L × W × H)</span>
                  <strong>
                    {formatDimensions(component.package)}
                  </strong>
                </div>

                {component.package?.bodyDimensions?.seatedHeightMm != null && (
                  <div className="specification-row">
                    <span>Seated Height</span>
                    <strong>
                      {component.package.bodyDimensions.seatedHeightMm} mm
                    </strong>
                  </div>
                )}

                {component.package?.pcbLayout?.leadPitchMm != null && (
                  <div className="specification-row">
                    <span>Lead Pitch</span>
                    <strong>
                      {component.package.pcbLayout.leadPitchMm} mm
                    </strong>
                  </div>
                )}

                {component.package?.pcbLayout?.rowSpacingMm != null && (
                  <div className="specification-row">
                    <span>Row Spacing</span>
                    <strong>
                      {component.package.pcbLayout.rowSpacingMm} mm
                    </strong>
                  </div>
                )}

                {component.package?.pcbLayout?.drillDiameterMm != null && (
                  <div className="specification-row">
                    <span>Recommended Drill Diameter</span>
                    <strong>
                      {component.package.pcbLayout.drillDiameterMm} mm
                    </strong>
                  </div>
                )}

                {component.package?.padLayout && (
                  <div className="specification-row">
                    <span>Pad Layout Reference</span>
                    <strong>
                      {component.package.padLayout}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="modal-section">
            <h3>
              Pin Configuration
              {component.pins && component.pins.length > 0 && (
                <span className="pin-count-badge">
                  ({component.pins.length} Pins)
                </span>
              )}
            </h3>

            {component.pins &&
            component.pins.length > 0 ? (
              <div className="pin-table-wrap">
                <table className="pin-table">
                  <thead>
                    <tr>
                      <th>Pin</th>
                      <th>Name</th>
                      <th>Function / Signal Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {component.pins.map((pin, index) => (
                      <tr
                        key={`${pin.number ?? "pin"}-${index}`}
                      >
                        <td>{pin.number ?? "—"}</td>
                        <td>{pin.name || "—"}</td>
                        <td>{pin.function || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="modal-muted">
                No discrete pin mapping required or recorded for this component.
              </p>
            )}
          </section>

          <section className="modal-section">
            <h3>Documentation & Manufacturer References</h3>

            <div className="modal-links">
              {isValidHttpUrl(component.datasheetUrl) && (
                <a
                  href={component.datasheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Official Datasheet PDF ↗
                </a>
              )}

              {isValidHttpUrl(component.manufacturerUrl) && (
                <a
                  href={component.manufacturerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Manufacturer Product Page ↗
                </a>
              )}

              {isValidHttpUrl(component.package?.landPatternUrl) && (
                <a
                  href={component.package?.landPatternUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CAD Land Pattern ↗
                </a>
              )}

              {!isValidHttpUrl(component.datasheetUrl) &&
                !isValidHttpUrl(component.manufacturerUrl) &&
                !isValidHttpUrl(component.package?.landPatternUrl) && (
                  <p className="modal-muted">
                    No external documentation URLs recorded for this component.
                  </p>
                )}
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <button
            className="filter-button"
            type="button"
            onClick={onClose}
          >
            Close details
          </button>
        </footer>
      </section>
    </div>
  );
};

