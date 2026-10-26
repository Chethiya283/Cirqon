// My Saved Parts page displaying bookmarked electronic components for active engineering projects.

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Trash2 } from "lucide-react";
import type { ComponentData } from "../types";
import { useSavedParts } from "../auth/SavedPartsContext";
import { ComponentThumbnail } from "../ComponentImage";
import { getSpecPairs, isValidHttpUrl } from "../utils/formatters";
import "./MyPartsPage.css";

export interface MyPartsPageProps {
  /** Callback to open full technical specs in the details modal */
  onSelectComponent: (component: ComponentData) => void;
}

/**
 * MyPartsPage Component
 * 
 * VIVA EXPLANATION:
 * 1. Protected Personal Workspace:
 *    This view is guarded by `ProtectedRoute`. Only engineers with a valid, verified JWT
 *    can access this page. Component bookmarks are retrieved directly from MongoDB
 *    scoped to `req.user._id`.
 * 
 * 2. Visual & Structural Consistency:
 *    Renders saved components using the identical card architecture as the main Library,
 *    providing a unified design language while swapping compare checkboxes for an intuitive
 *    one-click Remove action.
 * 
 * 3. Guided Empty State:
 *    When no parts are bookmarked, the view displays an actionable empty state guiding
 *    the engineer back to `/library` to explore the catalog rather than showing a blank screen.
 */
export const MyPartsPage: React.FC<MyPartsPageProps> = ({
  onSelectComponent,
}) => {
  const { savedParts, loading, toggleSave } = useSavedParts();
  const [copiedMpn, setCopiedMpn] = useState<string | null>(null);

  /**
   * Copy MPN to clipboard with temporary visual feedback.
   */
  const handleCopyMpn = (mpn: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mpn);
    setCopiedMpn(mpn);
    setTimeout(() => {
      setCopiedMpn((current) => (current === mpn ? null : current));
    }, 1500);
  };

  return (
    <div className="my-parts-page">
      {/* Header section matching Cirqon catalog control bar styling */}
      <div className="my-parts-header">
        <div className="my-parts-title-group">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Saved Parts</strong>
          </div>
          <h1>My Saved Parts</h1>
          <p className="my-parts-subtitle">
            Electronic components bookmarked for active circuit designs, bill of materials (BOM), and CAD layout.
          </p>
        </div>

        <div className="my-parts-actions-bar">
          <Link to="/library" className="my-parts-browse-btn">
            ← Browse Catalog
          </Link>
          <span className="result-count">
            {loading
              ? "Loading..."
              : `${savedParts.length} ${
                  savedParts.length === 1 ? "part" : "parts"
                } saved`}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="component-card-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div className="product-card skeleton-card" key={idx}>
              <div className="skeleton-line skeleton-top" />
              <div className="skeleton-thumb-box" />
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-sub" />
              <div className="skeleton-box skeleton-specs" />
              <div className="skeleton-line skeleton-btn" />
            </div>
          ))}
        </div>
      ) : savedParts.length === 0 ? (
        <div className="my-parts-empty-state">
          <div className="my-parts-empty-icon-wrap">
            <Bookmark size={36} aria-hidden="true" />
          </div>
          <h2>No saved components in your workspace</h2>
          <p>
            You haven't bookmarked any electronic components yet. Browse the component
            catalog and click the bookmark button on any card or table row to save parts
            here for quick reference.
          </p>
          <Link to="/library" className="my-parts-empty-cta">
            Explore Component Library →
          </Link>
        </div>
      ) : (
        <div className="component-card-grid">
          {savedParts.map((component) => {
            const previewSpecs = getSpecPairs(component.specifications, 3);

            return (
              <article
                key={component._id}
                className="product-card"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSelectComponent(component);
                  }
                }}
                aria-label={`${component.name} (${component.partNumber})`}
              >
                {/* Top bar with category badge and Remove button */}
                <div className="card-top-bar">
                  <span className="card-cat-badge">{component.category}</span>

                  <button
                    type="button"
                    className="my-parts-card-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSave(component);
                    }}
                    aria-label={`Remove ${component.partNumber} from saved parts`}
                    title="Remove from saved parts"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    <span>Remove</span>
                  </button>
                </div>

                {/* Component visual stage */}
                <div
                  className="card-image-stage"
                  onClick={() => onSelectComponent(component)}
                  title={`View technical details for ${component.name}`}
                >
                  <ComponentThumbnail
                    component={component}
                    size="lg"
                    showProvenanceBadge
                  />
                </div>

                {/* Card metadata body */}
                <div className="card-body">
                  <div className="card-mpn-row">
                    <span
                      className="card-mpn"
                      onClick={() => onSelectComponent(component)}
                      title={`Manufacturer Part Number: ${component.partNumber}`}
                    >
                      {component.partNumber}
                    </span>
                    <button
                      type="button"
                      className={`mpn-copy-btn ${
                        copiedMpn === component.partNumber ? "copied" : ""
                      }`}
                      onClick={(e) => handleCopyMpn(component.partNumber, e)}
                      title="Copy MPN to clipboard"
                    >
                      {copiedMpn === component.partNumber ? "COPIED" : "COPY"}
                    </button>
                  </div>

                  <h3
                    className="card-name"
                    onClick={() => onSelectComponent(component)}
                    title={component.name}
                  >
                    {component.name}
                  </h3>

                  <div className="card-mfr-pkg">
                    <span className="card-mfr">
                      {component.manufacturer || "—"}
                    </span>
                    <span className="card-mfr-dot">·</span>
                    <span className="card-pkg">
                      {component.package?.name || "Unspecified Pkg"}
                    </span>
                    {component.package?.mountingType && (
                      <span className="card-mount-type">
                        ({component.package.mountingType})
                      </span>
                    )}
                  </div>

                  <div className="card-specs-list">
                    {previewSpecs.length > 0 ? (
                      previewSpecs.map((spec) => (
                        <div className="card-spec-item" key={spec.key}>
                          <span className="spec-k">{spec.label}:</span>
                          <span className="spec-v" title={spec.value}>
                            {spec.value}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="spec-empty">No discrete parameters</span>
                    )}
                  </div>
                </div>

                {/* Card action footer */}
                <div className="card-footer">
                  {isValidHttpUrl(component.datasheetUrl) ? (
                    <a
                      className="card-datasheet-btn"
                      href={component.datasheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title={`Open official datasheet PDF for ${component.partNumber}`}
                    >
                      Datasheet ↗
                    </a>
                  ) : (
                    <span
                      className="card-datasheet-btn disabled"
                      title="No datasheet link available"
                    >
                      No PDF
                    </span>
                  )}

                  <button
                    type="button"
                    className="card-details-btn"
                    onClick={() => onSelectComponent(component)}
                    title={`View complete specifications and footprint for ${component.name}`}
                  >
                    View Details →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

