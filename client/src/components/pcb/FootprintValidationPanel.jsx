// Interactive Footprint Validation component presenting validation status, engineering checklist, and design notices.
import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Minus, ShieldCheck, XCircle, } from "lucide-react";
import { getCheckStateClass, getProvenanceBadgeClass, renderValueWithMonoNumbers, } from "../../utils/footprint";
import { isValidHttpUrl, resolveAssetUrl } from "../../utils/formatters";
import "./FootprintValidationPanel.css";
export const FootprintValidationPanel = ({ validation, datasheetUrl, manufacturer, compact = false, initialExpanded = true, }) => {
    const [expanded, setExpanded] = useState(initialExpanded);
    const getStatusIcon = () => {
        switch (validation.status) {
            case "verified":
                return <ShieldCheck size={16} aria-hidden="true"/>;
            case "illustrative":
                return <AlertTriangle size={16} aria-hidden="true"/>;
            case "incomplete":
                return <XCircle size={16} aria-hidden="true"/>;
        }
    };
    const getCheckIcon = (state) => {
        switch (state) {
            case "passed":
                return <CheckCircle2 size={13} className="check-icon-svg passed" aria-hidden="true"/>;
            case "unverified":
                return <AlertTriangle size={13} className="check-icon-svg unverified" aria-hidden="true"/>;
            case "missing":
                return <XCircle size={13} className="check-icon-svg missing" aria-hidden="true"/>;
            case "not-applicable":
                return <Minus size={13} className="check-icon-svg na" aria-hidden="true"/>;
        }
    };
    return (<section className={`footprint-validation-panel ${validation.statusBadgeClass} ${compact ? "compact-panel" : ""}`} aria-label="Footprint Validation Status and Engineering Checklist">
      {/* 1. Header with Status Badge and Requirements Counter */}
      <header className="validation-panel-header">
        <div className="validation-status-group">
          <span className={`validation-status-pill ${validation.statusBadgeClass}`} title={`Validation status: ${validation.statusLabel}`}>
            {getStatusIcon()}
            <span>{validation.statusLabel}</span>
          </span>

          <span className="validation-score-pill" title={`${validation.passedCount} of ${validation.totalApplicableCount} applicable engineering requirements passed.`}>
            <span className="pcb-mono-num">{validation.passedCount}</span>/
            <span className="pcb-mono-num">
              {validation.totalApplicableCount}
            </span>{" "}
            Verified
          </span>
        </div>

        <button type="button" className="validation-expand-btn" onClick={() => setExpanded((prev) => !prev)} aria-expanded={expanded} aria-label={expanded ? "Collapse requirement checklist" : "Expand requirement checklist"}>
          <span>{expanded ? "Hide Checklist" : "Show Checklist"}</span>
          {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
      </header>

      {/* 2. Concise Summary Paragraph */}
      <p className="validation-summary-text">{validation.summary}</p>

      {/* Notice about per-field datasheet source references required for Verified status */}
      {validation.requirementsNotice && (<p className="validation-requirements-notice">
          {validation.requirementsNotice}
        </p>)}

      {/* 3. High-Priority Engineering Warning Banner */}
      {validation.warningNotice && (<div className={`validation-warning-callout ${validation.status === "incomplete" ? "warning-critical" : "warning-caution"}`} role="alert">
          <div className="warning-callout-icon">
            <AlertTriangle size={15}/>
          </div>
          <div className="warning-callout-content">
            <strong>
              {validation.status === "incomplete"
                ? "Incomplete Data:"
                : "Design Notice:"}
            </strong>{" "}
            {validation.warningNotice}
          </div>
        </div>)}

      {/* 4. Detailed Requirements Checklist */}
      {expanded && (<div className="validation-checklist-wrapper">
          <div className="validation-checklist-title">
            <span>Applicable Package Requirements</span>
            <span className="validation-checklist-legend">
              <span className="legend-chip passed">✓ Passed</span>
              <span className="legend-chip unverified">⚠ Unverified / Fallback</span>
              <span className="legend-chip missing">✕ Missing</span>
              <span className="legend-chip na">— N/A</span>
            </span>
          </div>

          <ul className="validation-checklist" role="list">
            {validation.checks.map((check) => (<li key={check.id} className={`validation-check-item ${getCheckStateClass(check.state)}`}>
                <div className="check-item-indicator" title={`State: ${check.state}`}>
                  {getCheckIcon(check.state)}
                </div>

                <div className="check-item-body">
                  <div className="check-item-header">
                    <span className="check-item-label">{check.label}</span>
                    <div className="check-item-meta">
                      {check.sourceOrProvenance &&
                    check.sourceOrProvenance !== "N/A" && (<span className={getProvenanceBadgeClass(check.sourceOrProvenance)}>
                            {check.sourceOrProvenance}
                          </span>)}
                    </div>
                  </div>

                  <div className="check-item-value">
                    {renderValueWithMonoNumbers(check.valueDescription)}
                  </div>

                  {check.detail && (<p className="check-item-detail">{check.detail}</p>)}
                </div>
              </li>))}
          </ul>

          {/* 5. Datasheet Citation Link */}
          {isValidHttpUrl(datasheetUrl) && (<div className="validation-datasheet-citation">
              <span className="citation-label">Authoritative Source:</span>
              <a href={resolveAssetUrl(datasheetUrl)} target="_blank" rel="noopener noreferrer" className="citation-link" title={`Open official ${manufacturer || ""} datasheet`}>
                <span>{manufacturer ? `${manufacturer} Datasheet` : "Manufacturer Datasheet"} PDF</span>
                <ExternalLink size={12}/>
              </a>
            </div>)}
        </div>)}
    </section>);
};
