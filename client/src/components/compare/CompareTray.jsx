import React from "react";
import "./CompareTray.css";
export const CompareTray = ({ selectedComponents, onRemove, onClear, onCompare, }) => {
    if (selectedComponents.length === 0) {
        return null;
    }
    return (<aside className="compare-bar" aria-label="Component comparison dock">
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
          {selectedComponents.map((item) => (<span className="compare-chip mono-num" key={item._id}>
              {item.partNumber}
              <button type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item.partNumber} from comparison`}>
                ×
              </button>
            </span>))}
        </div>
      </div>

      <div className="compare-bar-actions">
        <button className="compare-bar-clear" type="button" onClick={onClear}>
          Clear all
        </button>

        <button className="compare-bar-submit" type="button" disabled={selectedComponents.length < 2} onClick={onCompare}>
          {selectedComponents.length < 2
            ? `Select 1 more (${selectedComponents.length}/4)`
            : `Compare (${selectedComponents.length}) ↗`}
        </button>
      </div>
    </aside>);
};
