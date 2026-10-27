// Floating comparison tray dock displaying staged components and quick navigation to comparison view.
// VIVA EXPLANATION: Floating Comparison Tray Architecture
// 1. Positioned with position: fixed at bottom: 16px, centered horizontally using left: 50% + translateX(-50%).
// 2. High z-index (900) ensures it remains sticky across lengthy catalog views and table pagination.
// 3. Constrained to width: min(880px, calc(100% - 32px)) so it never causes horizontal scrollbars on 360px mobile viewports.
// 4. Staged component part numbers use monospace font (--cq-font-mono) for rigorous engineering presentation.

import React from "react";
import type { ComponentData } from "../types";
import "./CompareTray.css";

/**
 * Props for the CompareTray component.
 */
export interface CompareTrayProps {
  /** Array of components currently selected for side-by-side comparison (up to 4) */
  selectedComponents: ComponentData[];
  /** Callback to remove a specific component from comparison */
  onRemove: (component: ComponentData) => void;
  /** Callback to clear all selected components from comparison */
  onClear: () => void;
  /** Callback to navigate to the comparison matrix view */
  onCompare: () => void;
}

export const CompareTray: React.FC<CompareTrayProps> = ({
  selectedComponents,
  onRemove,
  onClear,
  onCompare,
}) => {
  if (selectedComponents.length === 0) {
    return null;
  }

  return (
    <aside className="compare-bar" aria-label="Component comparison dock">
      <div className="compare-bar-info">
        <div className="compare-bar-title">
          <span className="compare-bar-icon">⇄</span>
          <div>
            <strong>Component Comparison</strong>
            <small>
              {selectedComponents.length} of 4 selected
              {selectedComponents.length < 2 && " (select at least 2)"}
            </small>
          </div>
        </div>

        <div className="compare-bar-chips">
          {selectedComponents.map((item) => (
            <span className="compare-chip mono-num" key={item._id}>
              {item.partNumber}
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item.partNumber} from comparison`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="compare-bar-actions">
        <button
          className="compare-bar-clear"
          type="button"
          onClick={onClear}
        >
          Clear all
        </button>

        <button
          className="compare-bar-submit"
          type="button"
          disabled={selectedComponents.length < 2}
          onClick={onCompare}
        >
          {selectedComponents.length < 2
            ? `Select 1 more (${selectedComponents.length}/4)`
            : `Compare (${selectedComponents.length}) ↗`}
        </button>
      </div>
    </aside>
  );
};

