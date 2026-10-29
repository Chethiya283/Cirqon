import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, Cpu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSavedParts } from "../../context/SavedPartsContext";
import { ComponentThumbnail } from "../common/ComponentImage";
import { getComponentImageInfo } from "../../utils/componentImageUtils";
import { auditComponentFootprint, getProvenanceBadgeClass, renderFootprintSvg, renderValueWithMonoNumbers, } from "../../utils/footprint";
import { FootprintValidationPanel } from "../pcb/FootprintValidationPanel";
import { formatDimensions, getSpecPairs, isValidHttpUrl, resolveAssetUrl, } from "../../utils/formatters";
import "./ComponentDetailsModal.css";
export const ComponentDetailsModal = ({ component, onClose, }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isSaved, toggleSave } = useSavedParts();
    useEffect(() => {
        if (!component)
            return;
        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [component, onClose]);
    if (!component)
        return null;
    const saved = isSaved(component._id);
    const handleToggleSave = () => {
        if (!user) {
            navigate("/login");
            return;
        }
        toggleSave(component);
    };
    return (<div className="modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
                onClose();
            }
        }}>
      <section className="component-modal" role="dialog" aria-modal="true" aria-labelledby="modal-component-name">
        <header className="modal-header">
          <div>
            <div className="eyebrow">Component details</div>
            <h2 id="modal-component-name">
              {component.name}
            </h2>
            <p className="modal-part-number">
              {component.partNumber}
            </p>
          </div>

          <div className="modal-header-actions">
            <button type="button" className={`modal-save-btn ${saved ? "saved" : ""}`} onClick={handleToggleSave} aria-label={saved
            ? `Remove ${component.partNumber} from saved parts`
            : `Save ${component.partNumber} to workspace`} title={saved
            ? "Saved in workspace (click to remove)"
            : "Save component to workspace"}>
              <Bookmark size={15} fill={saved ? "currentColor" : "none"} aria-hidden="true"/>
              <span>{saved ? "Saved" : "Save Part"}</span>
            </button>

            <button className="modal-close" type="button" aria-label="Close component details" onClick={onClose}>
              ×
            </button>
          </div>
        </header>

        <div className="modal-content">
          {(() => {
            const imgInfo = getComponentImageInfo(component);
            return (<div className="modal-product-identity">
                <ComponentThumbnail component={component} size="lg" showProvenanceBadge/>
                <div className="modal-product-meta">
                  <div className="modal-photo-provenance-bar">
                    <span className={`photo-indicator-tag ${imgInfo.provenance === "package-spec"
                    ? "spec"
                    : "verified"}`}>
                      {imgInfo.provenance === "package-spec"
                    ? "Package illustration"
                    : "Component illustration"}
                    </span>
                    <span>{imgInfo.provenanceLabel}</span>
                  </div>
                  <div className="modal-summary">
                    <span className="modal-category">
                      {component.category}
                    </span>
                    {component.package?.mountingType && (<span className="modal-category">
                        {component.package.mountingType}
                      </span>)}
                    {component.package?.name && (<span className="modal-category">
                        {component.package.name}
                      </span>)}
                  </div>
                  <p className="modal-quick-desc">
                    {component.description ||
                    "No functional description recorded for this part."}
                  </p>
                </div>
              </div>);
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

            {getSpecPairs(component.specifications).length > 0 ? (<div className="specification-list">
                {getSpecPairs(component.specifications).map((spec) => (<div className="specification-row" key={spec.key}>
                      <span>{spec.label}</span>
                      <strong>{spec.value}</strong>
                    </div>))}
              </div>) : (<p className="modal-muted">
                No discrete electrical parameters are recorded in the catalog for this part.
              </p>)}
          </section>

          {(() => {
            const footprintAudit = auditComponentFootprint(component);
            const hasStoredBodyDims = (component.package?.bodyDimensions?.lengthMm != null &&
                component.package?.bodyDimensions?.widthMm != null) ||
                (component.package?.footprintDimensions?.lengthMm != null &&
                    component.package?.footprintDimensions?.widthMm != null);
            return (<section className="modal-section modal-mechanical-section">
                <div className="modal-mechanical-header">
                  <div className="modal-mechanical-title-group">
                    <h3>Package & Mechanical Dimensions</h3>
                    <span className={`pcb-datastatus-badge ${footprintAudit.validation.statusBadgeClass}`} title={`Footprint Validation: ${footprintAudit.validation.statusLabel}`}>
                      {footprintAudit.validation.statusLabel}
                    </span>
                  </div>
                  <button type="button" className="modal-mechanical-pcb-btn" onClick={() => {
                    onClose();
                    navigate(`/pcb?partNumber=${encodeURIComponent(component.partNumber)}`);
                }} title={`Open ${component.partNumber} in PCB Design Assistant`}>
                    <Cpu size={14}/> View in PCB Assistant ↗
                  </button>
                </div>

                <div className="modal-footprint-grid">
                  <div className="modal-footprint-col">
                    {footprintAudit.canDrawFootprint ? (<>
                        <div className="modal-footprint-preview cad-grid-overlay">
                          <span className="cad-dimension-badge">
                            {footprintAudit.validation.status === "verified"
                        ? "Datasheet-checked Footprint"
                        : "Illustrative Footprint (Visualization Only)"}
                          </span>
                          {renderFootprintSvg(component)}
                        </div>
                        <p className="pcb-fabrication-disclaimer modal-footprint-disclaimer">
                          {footprintAudit.validation.status === "verified"
                        ? "Datasheet-checked against official manufacturer documentation. Confirm land pattern dimensions against fabricator rules."
                        : "Illustrative drawing from stored outline and terminal data. Confirm land pattern dimensions against datasheet and fabricator rules."}
                        </p>
                        {footprintAudit.missingFields.length > 0 && (<div className="pcb-missing-banner">
                            <strong>Missing:</strong>{" "}
                            {renderValueWithMonoNumbers(footprintAudit.missingFields.join(", "))}
                          </div>)}
                      </>) : (<div className="pcb-footprint-empty-state modal-footprint-empty" role="region" aria-label={`Footprint unavailable for ${component.partNumber}`}>
                        <div className="pcb-empty-state-title">
                          Footprint Not Drawn
                        </div>
                        <p className="pcb-empty-state-reason">
                          {renderValueWithMonoNumbers(footprintAudit.emptyStateReason)}
                        </p>
                        <div className="pcb-missing-banner">
                          <strong>Missing:</strong>{" "}
                          {renderValueWithMonoNumbers(footprintAudit.missingFields.join(", "))}
                        </div>
                      </div>)}
                  </div>

                  <div className="specification-list">
                    <div className="specification-row">
                      <span>Package Designation</span>
                      <div className="modal-spec-val-with-prov">
                        <strong>
                          {component.package?.name || "Not available"}
                        </strong>
                        <span className={getProvenanceBadgeClass(component.package?.name
                    ? "Catalogue"
                    : "Not available")}>
                          {component.package?.name
                    ? "Catalogue"
                    : "Not available"}
                        </span>
                      </div>
                    </div>

                    <div className="specification-row">
                      <span>Mounting Technology</span>
                      <div className="modal-spec-val-with-prov">
                        <strong>
                          {component.package?.mountingType || "Not available"}
                        </strong>
                        <span className={getProvenanceBadgeClass(component.package?.mountingType
                    ? "Catalogue"
                    : "Not available")}>
                          {component.package?.mountingType
                    ? "Catalogue"
                    : "Not available"}
                        </span>
                      </div>
                    </div>

                    <div className="specification-row">
                      <span>Pin Count</span>
                      <div className="modal-spec-val-with-prov">
                        <span className="pcb-source-value">
                          {renderValueWithMonoNumbers(footprintAudit.fields.pinCount.value)}
                        </span>
                        <span className={getProvenanceBadgeClass(footprintAudit.fields.pinCount.provenance)}>
                          {footprintAudit.fields.pinCount.provenance}
                        </span>
                      </div>
                    </div>

                    <div className="specification-row">
                      <span>Body Dimensions (L × W × H)</span>
                      <div className="modal-spec-val-with-prov">
                        <span className="pcb-source-value">
                          {hasStoredBodyDims
                    ? renderValueWithMonoNumbers(formatDimensions(component.package))
                    : "Not available"}
                        </span>
                        <span className={getProvenanceBadgeClass(hasStoredBodyDims ? "Catalogue" : "Not available")}>
                          {hasStoredBodyDims ? "Catalogue" : "Not available"}
                        </span>
                      </div>
                    </div>

                    {component.package?.bodyDimensions?.seatedHeightMm !=
                    null && (<div className="specification-row">
                        <span>Seated Height</span>
                        <div className="modal-spec-val-with-prov">
                          <span className="pcb-source-value">
                            <span className="pcb-mono-num">
                              {component.package.bodyDimensions.seatedHeightMm}
                            </span>{" "}
                            mm
                          </span>
                          <span className={getProvenanceBadgeClass("Catalogue")}>
                            Catalogue
                          </span>
                        </div>
                      </div>)}

                    <div className="specification-row">
                      <span>Lead Pitch</span>
                      <div className="modal-spec-val-with-prov">
                        <span className="pcb-source-value">
                          {renderValueWithMonoNumbers(footprintAudit.fields.leadPitch.value)}
                        </span>
                        <span className={getProvenanceBadgeClass(footprintAudit.fields.leadPitch.provenance)}>
                          {footprintAudit.fields.leadPitch.provenance}
                        </span>
                      </div>
                    </div>

                    {component.package?.pcbLayout?.rowSpacingMm != null && (<div className="specification-row">
                        <span>Row Spacing</span>
                        <div className="modal-spec-val-with-prov">
                          <span className="pcb-source-value">
                            <span className="pcb-mono-num">
                              {component.package.pcbLayout.rowSpacingMm}
                            </span>{" "}
                            mm
                          </span>
                          <span className={getProvenanceBadgeClass("Catalogue")}>
                            Catalogue
                          </span>
                        </div>
                      </div>)}

                    <div className="specification-row">
                      <span>Pad Size / Diameter</span>
                      <div className="modal-spec-val-with-prov">
                        <span className="pcb-source-value">
                          {component.package?.pcbLayout?.padDiameterMm !=
                    null ? (<>
                              <span className="pcb-mono-num">
                                {component.package.pcbLayout.padDiameterMm}
                              </span>{" "}
                              mm
                            </>) : ("Not available")}
                        </span>
                        <span className={getProvenanceBadgeClass(component.package?.pcbLayout?.padDiameterMm != null
                    ? "Catalogue"
                    : "Not available")}>
                          {component.package?.pcbLayout?.padDiameterMm != null
                    ? "Catalogue"
                    : "Not available"}
                        </span>
                      </div>
                    </div>

                    <div className="specification-row">
                      <span>Recommended Drill Diameter</span>
                      <div className="modal-spec-val-with-prov">
                        <span className="pcb-source-value">
                          {component.package?.pcbLayout?.drillDiameterMm !=
                    null ? (<>
                              <span className="pcb-mono-num">
                                {component.package.pcbLayout.drillDiameterMm}
                              </span>{" "}
                              mm
                            </>) : ("Not available")}
                        </span>
                        <span className={getProvenanceBadgeClass(component.package?.pcbLayout?.drillDiameterMm !=
                    null
                    ? "Catalogue"
                    : "Not available")}>
                          {component.package?.pcbLayout?.drillDiameterMm != null
                    ? "Catalogue"
                    : "Not available"}
                        </span>
                      </div>
                    </div>

                    {component.package?.padLayout && (<div className="specification-row">
                        <span>Pad Layout Reference</span>
                        <div className="modal-spec-val-with-prov">
                          <span className="pcb-source-value">
                            {renderValueWithMonoNumbers(component.package.padLayout)}
                          </span>
                          <span className={getProvenanceBadgeClass("Catalogue")}>
                            Catalogue
                          </span>
                        </div>
                      </div>)}
                  </div>
                </div>

                <div className="modal-validation-panel-container">
                  <FootprintValidationPanel validation={footprintAudit.validation} datasheetUrl={component.datasheetUrl} manufacturer={component.manufacturer} compact={true} initialExpanded={false}/>
                </div>
              </section>);
        })()}

          <section className="modal-section">
            <h3>
              Pin Configuration
              {component.pins && component.pins.length > 0 && (<span className="pin-count-badge">
                  ({component.pins.length} Pins)
                </span>)}
            </h3>

            {component.pins &&
            component.pins.length > 0 ? (<div className="pin-table-wrap">
                <table className="pin-table">
                  <thead>
                    <tr>
                      <th>Pin</th>
                      <th>Name</th>
                      <th>Function / Signal Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {component.pins.map((pin, index) => (<tr key={`${pin.number ?? "pin"}-${index}`}>
                        <td>{pin.number ?? "—"}</td>
                        <td>{pin.name || "—"}</td>
                        <td>{pin.function || "—"}</td>
                      </tr>))}
                  </tbody>
                </table>
              </div>) : (<p className="modal-muted">
                No discrete pin mapping required or recorded for this component.
              </p>)}
          </section>

          <section className="modal-section">
            <h3>Documentation & Manufacturer References</h3>

            <div className="modal-links">
              {isValidHttpUrl(component.datasheetUrl) && (<a href={resolveAssetUrl(component.datasheetUrl)} target="_blank" rel="noopener noreferrer">
                  Official Datasheet PDF ↗
                </a>)}

              {isValidHttpUrl(component.manufacturerUrl) && (<a href={component.manufacturerUrl} target="_blank" rel="noopener noreferrer">
                  Manufacturer Product Page ↗
                </a>)}

              {isValidHttpUrl(component.package?.landPatternUrl) && (<a href={component.package?.landPatternUrl} target="_blank" rel="noopener noreferrer">
                  CAD Land Pattern ↗
                </a>)}

              {!isValidHttpUrl(component.datasheetUrl) &&
            !isValidHttpUrl(component.manufacturerUrl) &&
            !isValidHttpUrl(component.package?.landPatternUrl) && (<p className="modal-muted">
                    No external documentation URLs recorded for this component.
                  </p>)}
            </div>
          </section>
        </div>

        <footer className="modal-footer">
          <div className="modal-footer-actions">
            <button className="filter-button primary-accent modal-pcb-action-btn" type="button" onClick={() => {
            onClose();
            navigate(`/pcb?partNumber=${encodeURIComponent(component.partNumber)}`);
        }} title={`Inspect ${component.partNumber} footprint in PCB Assistant`}>
              <Cpu size={15}/> View in PCB Assistant
            </button>
          </div>
          <button className="filter-button" type="button" onClick={onClose}>
            Close details
          </button>
        </footer>
      </section>
    </div>);
};
