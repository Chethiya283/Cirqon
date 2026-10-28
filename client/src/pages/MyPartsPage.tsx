// My Saved Parts page displaying bookmarked electronic components for active engineering projects.

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Check, RotateCcw, Save, Trash2 } from "lucide-react";
import type { ComponentData, SavedPartItem } from "../types";
import { useSavedParts } from "../auth/SavedPartsContext";
import { ComponentThumbnail } from "../ComponentImage";
import {
  getSpecPairs,
  isValidHttpUrl,
  resolveAssetUrl,
} from "../utils/formatters";
import "./MyPartsPage.css";

export interface MyPartsPageProps {
  /** Callback to open full technical specs in the details modal */
  onSelectComponent: (component: ComponentData) => void;
}

interface SavedPartCardProps {
  item: SavedPartItem;
  onSelectComponent: (component: ComponentData) => void;
  copiedMpn: string | null;
  onCopyMpn: (mpn: string, e: React.MouseEvent) => void;
}

/**
 * SavedPartCard Component
 * 
 * VIVA EXPLANATION:
 * 1. Component State Isolation:
 *    Each card encapsulates its own editing state for BOM quantity and engineering note.
 *    Validates client-side before dispatching network requests to provide instant UI feedback.
 * 2. Strict Input Validation:
 *    - Quantity: Enforces whole positive integers (1 to 10,000).
 *    - Note: Enforces 300 character limit with live character count indicator.
 * 3. Reactive Persistence:
 *    Calls `updateSavedPart` from `SavedPartsContext`, saving to MongoDB with JWT authorization
 *    and optimistically keeping context state synchronized.
 */
const SavedPartCard: React.FC<SavedPartCardProps> = ({
  item,
  onSelectComponent,
  copiedMpn,
  onCopyMpn,
}) => {
  const { toggleSave, updateSavedPart } = useSavedParts();
  const component = item.component;

  // Local form state
  const [quantityInput, setQuantityInput] = useState<string>(
    String(item.quantity ?? 1)
  );
  const [noteInput, setNoteInput] = useState<string>(item.note ?? "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize state during render when remote props change (React-recommended pattern)
  const [prevRemote, setPrevRemote] = useState({
    qty: item.quantity,
    note: item.note,
  });

  if (item.quantity !== prevRemote.qty || item.note !== prevRemote.note) {
    setPrevRemote({ qty: item.quantity, note: item.note });
    setQuantityInput(String(item.quantity ?? 1));
    setNoteInput(item.note ?? "");
  }

  // Validation
  const parsedQty = Number(quantityInput);
  let qtyError = "";
  if (quantityInput.trim() === "") {
    qtyError = "Quantity is required.";
  } else if (!Number.isInteger(parsedQty) || isNaN(parsedQty)) {
    qtyError = "Must be a whole number.";
  } else if (parsedQty < 1) {
    qtyError = "Quantity must be at least 1.";
  } else if (parsedQty > 10000) {
    qtyError = "Quantity cannot exceed 10,000.";
  }

  let noteError = "";
  if (noteInput.length > 300) {
    noteError = `Note exceeds 300 characters (${noteInput.length}/300).`;
  }

  const isFormValid = !qtyError && !noteError;
  const initialQty = item.quantity ?? 1;
  const initialNote = item.note ?? "";
  const hasChanges =
    parsedQty !== initialQty || noteInput.trim() !== initialNote.trim();

  const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isFormValid || !hasChanges || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      await updateSavedPart(component._id, {
        quantity: parsedQty,
        note: noteInput.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update saved part."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const previewSpecs = getSpecPairs(component.specifications, 3);
  const inputIdSuffix = item._id || component._id;

  return (
    <article
      className="product-card"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) {
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
            onClick={(e) => onCopyMpn(component.partNumber, e)}
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
          <span className="card-mfr">{component.manufacturer || "—"}</span>
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

      {/* BOM Workspace & Engineering Note Panel */}
      <div
        className="my-parts-bom-panel"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="bom-panel-header">
          <span className="bom-panel-title">Project Allocation</span>
          {saveSuccess && (
            <span className="bom-status-badge success" role="status">
              <Check size={12} aria-hidden="true" />
              <span>Saved</span>
            </span>
          )}
        </div>

        <div className="bom-fields-grid">
          {/* Quantity Input */}
          <div className="bom-field-group bom-qty-group">
            <label
              htmlFor={`qty-${inputIdSuffix}`}
              className="bom-field-label"
            >
              Qty
            </label>
            <input
              id={`qty-${inputIdSuffix}`}
              type="number"
              min={1}
              max={10000}
              step={1}
              className={`bom-input bom-qty-input ${
                qtyError ? "input-error" : ""
              }`}
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              aria-invalid={Boolean(qtyError)}
              aria-describedby={
                qtyError ? `qty-err-${inputIdSuffix}` : undefined
              }
              disabled={isSaving}
              placeholder="1"
            />
          </div>

          {/* Project Note Input */}
          <div className="bom-field-group bom-note-group">
            <div className="bom-note-label-row">
              <label
                htmlFor={`note-${inputIdSuffix}`}
                className="bom-field-label"
              >
                Engineering Note
              </label>
              <span
                className={`bom-char-count ${
                  noteInput.length > 300
                    ? "char-limit-exceeded"
                    : noteInput.length >= 270
                    ? "char-limit-near"
                    : ""
                }`}
              >
                {noteInput.length}/300
              </span>
            </div>
            <textarea
              id={`note-${inputIdSuffix}`}
              rows={2}
              className={`bom-input bom-note-input ${
                noteError ? "input-error" : ""
              }`}
              placeholder="e.g. C12 decoupling on MCU VDD rail"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              aria-invalid={Boolean(noteError)}
              aria-describedby={
                noteError ? `note-err-${inputIdSuffix}` : undefined
              }
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Validation Errors */}
        {qtyError && (
          <div
            id={`qty-err-${inputIdSuffix}`}
            className="bom-field-error"
            role="alert"
          >
            {qtyError}
          </div>
        )}
        {noteError && (
          <div
            id={`note-err-${inputIdSuffix}`}
            className="bom-field-error"
            role="alert"
          >
            {noteError}
          </div>
        )}
        {errorMessage && (
          <div className="bom-server-error" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Action Controls */}
        <div className="bom-actions-row">
          <button
            type="button"
            className="bom-save-btn"
            onClick={handleSave}
            disabled={!hasChanges || !isFormValid || isSaving}
            aria-busy={isSaving}
          >
            <Save size={13} aria-hidden="true" />
            <span>{isSaving ? "Saving..." : "Save Details"}</span>
          </button>
        </div>
      </div>

      {/* Card action footer */}
      <div className="card-footer">
        {isValidHttpUrl(component.datasheetUrl) ? (
          <a
            className="card-datasheet-btn"
            href={resolveAssetUrl(component.datasheetUrl)}
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
};

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
 *    one-click Remove action and inline BOM customization.
 * 
 * 3. Guided Empty State:
 *    When no parts are bookmarked, the view displays an actionable empty state guiding
 *    the engineer back to `/library` to explore the catalog rather than showing a blank screen.
 */
export const MyPartsPage: React.FC<MyPartsPageProps> = ({
  onSelectComponent,
}) => {
  const { savedItems, loading, error, retryLoad } = useSavedParts();
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
              : `${savedItems.length} ${
                  savedItems.length === 1 ? "part" : "parts"
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
      ) : error ? (
        <div className="card-empty-feedback error-feedback">
          <div className="empty-icon-wrap error-icon-wrap" aria-hidden="true">
            <span className="empty-icon">⚠</span>
          </div>
          <h3 className="empty-title">Unable to retrieve saved components</h3>
          <p className="empty-desc">{error}</p>
          <button
            className="library-empty-reset-btn"
            type="button"
            onClick={retryLoad}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Retry connection</span>
          </button>
        </div>
      ) : savedItems.length === 0 ? (
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
          {savedItems.map((item) => (
            <SavedPartCard
              key={item._id || item.component?._id}
              item={item}
              onSelectComponent={onSelectComponent}
              copiedMpn={copiedMpn}
              onCopyMpn={handleCopyMpn}
            />
          ))}
        </div>
      )}
    </div>
  );
};

