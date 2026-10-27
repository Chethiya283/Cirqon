import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid,
  Ruler,
} from "lucide-react";
import type { ComponentData } from "../types";
import {
  getDefaultAxialSpanMm,
  getFootprintGeometry,
  getProvenanceBadgeClass,
  renderFootprintSvg,
  renderValueWithMonoNumbers,
} from "../utils/footprint";

interface InteractiveFootprintViewerProps {
  component: ComponentData;
  missingFields: string[];
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 1.2;
const PAN_STEP_SVG = 14;

/**
 * InteractiveFootprintViewer (Phase 2)
 *
 * Viva Notes:
 * 1. ViewBox-based Pan & Zoom: Instead of CSS transforms (which blur rasterized layers or clip bounds),
 *    zooming and panning dynamically adjust the SVG `viewBox="x y w h"`, preserving crisp vector edges at any zoom.
 * 2. Non-Passive Wheel Listener: Uses a native `{ passive: false }` wheel listener on the canvas container
 *    so `e.preventDefault()` prevents page scrolling while zooming around the cursor position.
 * 3. Single Source of Truth for Pad Selection: `selectedPadNumber` and `hoveredPadNumber` live in one state
 *    hook here, synchronizing the SVG pad elements, the Pad Details panel, and the side-by-side Pad Table.
 */
export const InteractiveFootprintViewer: React.FC<
  InteractiveFootprintViewerProps
> = ({ component, missingFields }) => {
  const defaultAxialSpan = getDefaultAxialSpanMm(
    component.package?.bodyDimensions?.lengthMm ?? 5
  );
  const [axialSpanMm, setAxialSpanMm] = useState<number>(defaultAxialSpan);

  const geometry = useMemo(
    () => getFootprintGeometry(component, axialSpanMm),
    [component, axialSpanMm]
  );
  const {
    viewBoxWidth: baseW,
    viewBoxHeight: baseH,
    svgUnitsPerMm,
    pads,
    isAxialPackage,
  } = geometry;

  // Sorted pads by pin number (1..8) for the Pad Table
  const sortedPads = useMemo(
    () => [...pads].sort((a, b) => a.number - b.number),
    [pads]
  );

  // Single state location for view transform, pad selection, grid, and measurement
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [selectedPadNumber, setSelectedPadNumber] = useState<number | null>(
    sortedPads[0]?.number ?? null
  );
  const [hoveredPadNumber, setHoveredPadNumber] = useState<number | null>(null);
  const [measureMode, setMeasureMode] = useState<boolean>(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [svgRenderedWidthPx, setSvgRenderedWidthPx] = useState<number>(480);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragMovedRef = useRef<boolean>(false);

  // Measure the actual rendered SVG width so the millimeter scale bar stays calibrated to the SVG scale
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const updateWidth = () => {
      const svgEl = el.querySelector("svg");
      const w = svgEl?.getBoundingClientRect().width;
      if (w && w > 50) {
        setSvgRenderedWidthPx(w);
      }
    };

    updateWidth();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [component._id]);

  const currentViewW = baseW / zoom;
  const currentViewH = baseH / zoom;
  const viewBoxStr = `${pan.x.toFixed(2)} ${pan.y.toFixed(2)} ${currentViewW.toFixed(
    2
  )} ${currentViewH.toFixed(2)}`;

  // Zoom around a relative fraction (relX, relY in [0..1]) of the viewport
  const applyZoomAtFraction = (
    targetZoom: number,
    relX: number = 0.5,
    relY: number = 0.5
  ) => {
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, targetZoom));
    setZoom((prevZoom) => {
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, clampedZoom));
      if (Math.abs(nextZoom - prevZoom) < 0.001) return prevZoom;

      setPan((prevPan) => {
        const prevW = baseW / prevZoom;
        const prevH = baseH / prevZoom;
        const nextW = baseW / nextZoom;
        const nextH = baseH / nextZoom;

        const anchorSvgX = prevPan.x + relX * prevW;
        const anchorSvgY = prevPan.y + relY * prevH;

        return {
          x: anchorSvgX - relX * nextW,
          y: anchorSvgY - relY * nextH,
        };
      });

      return nextZoom;
    });
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setMeasurePoints([]);
  };

  // Native non-passive wheel listener so page does not scroll when wheeling over canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const relX =
        rect.width > 0
          ? Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
          : 0.5;
      const relY =
        rect.height > 0
          ? Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
          : 0.5;

      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, prevZoom * factor)
        );
        if (Math.abs(nextZoom - prevZoom) < 0.001) return prevZoom;

        setPan((prevPan) => {
          const prevW = baseW / prevZoom;
          const prevH = baseH / prevZoom;
          const nextW = baseW / nextZoom;
          const nextH = baseH / nextZoom;

          const anchorSvgX = prevPan.x + relX * prevW;
          const anchorSvgY = prevPan.y + relY * prevH;

          return {
            x: anchorSvgX - relX * nextW,
            y: anchorSvgY - relY * nextH,
          };
        });

        return nextZoom;
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [baseW, baseH]);

  // Convert client pointer coordinates to current SVG viewBox coordinates
  const clientToSvgCoords = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return { x: baseW / 2, y: baseH / 2 };
    const svgEl = el.querySelector("svg");
    const rect = (svgEl || el).getBoundingClientRect();
    const relX = rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5;
    const relY = rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5;
    return {
      x: pan.x + relX * currentViewW,
      y: pan.y + relY * currentViewH,
    };
  };

  // Pointer events for drag-to-pan and 2-finger touch pinch-zoom
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Allow normal button clicks on pads unless dragging or in measure mode
    const target = e.target as HTMLElement;
    const isPadTarget = Boolean(target.closest(".footprint-pad-group"));

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMovedRef.current = false;

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      lastPinchDistRef.current = Math.hypot(
        pts[1].x - pts[0].x,
        pts[1].y - pts[0].y
      );
      isDraggingRef.current = false;
    } else if (activePointersRef.current.size === 1 && (!isPadTarget || measureMode)) {
      isDraggingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    const prevPt = activePointersRef.current.get(e.pointerId)!;
    const dx = e.clientX - prevPt.x;
    const dy = e.clientY - prevPt.y;

    if (Math.hypot(dx, dy) > 3) {
      dragMovedRef.current = true;
    }

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (lastPinchDistRef.current && lastPinchDistRef.current > 10) {
        const ratio = dist / lastPinchDistRef.current;
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        const relX = rect.width > 0 ? (midX - rect.left) / rect.width : 0.5;
        const relY = rect.height > 0 ? (midY - rect.top) / rect.height : 0.5;
        applyZoomAtFraction(zoom * ratio, relX, relY);
      }
      lastPinchDistRef.current = dist;
    } else if (isDraggingRef.current && activePointersRef.current.size === 1) {
      const svgDx = rect.width > 0 ? (dx / rect.width) * currentViewW : 0;
      const svgDy = rect.height > 0 ? (dy / rect.height) * currentViewH : 0;
      setPan((prev) => ({
        x: prev.x - svgDx,
        y: prev.y - svgDy,
      }));
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const wasMeasureClick =
      measureMode &&
      !dragMovedRef.current &&
      activePointersRef.current.size === 1;

    if (wasMeasureClick) {
      const pt = clientToSvgCoords(e.clientX, e.clientY);
      setMeasurePoints((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
    }

    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      lastPinchDistRef.current = null;
    }
    if (activePointersRef.current.size === 0) {
      isDraggingRef.current = false;
    }
  };

  // Keyboard navigation when canvas is focused (+, -, arrow keys, 0, Escape)
  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      applyZoomAtFraction(zoom * ZOOM_STEP, 0.5, 0.5);
    } else if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      applyZoomAtFraction(zoom / ZOOM_STEP, 0.5, 0.5);
    } else if (e.key === "0") {
      e.preventDefault();
      handleResetView();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPan((p) => ({ ...p, x: p.x - PAN_STEP_SVG / zoom }));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setPan((p) => ({ ...p, x: p.x + PAN_STEP_SVG / zoom }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPan((p) => ({ ...p, y: p.y - PAN_STEP_SVG / zoom }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setPan((p) => ({ ...p, y: p.y + PAN_STEP_SVG / zoom }));
    } else if (e.key === "Escape") {
      setMeasurePoints([]);
      setHoveredPadNumber(null);
    }
  };

  // Dynamic scale bar calculation based on actual rendered SVG width, mm-to-SVG-unit ratio, and current zoom
  const scaleBarInfo = useMemo(() => {
    const candidateStepsMm = [0.5, 1, 2, 5];
    const pxPerSvgUnit =
      currentViewW > 0 ? svgRenderedWidthPx / currentViewW : 2.1 * zoom;
    const pxPerMm = svgUnitsPerMm * pxPerSvgUnit;

    let chosenMm = 2;
    for (const step of candidateStepsMm) {
      const barPx = step * pxPerMm;
      if (barPx >= 42 && barPx <= 135) {
        chosenMm = step;
        break;
      }
    }
    const barWidthPx = Math.round(
      Math.min(145, Math.max(32, chosenMm * pxPerMm))
    );
    return { mm: chosenMm, widthPx: barWidthPx };
  }, [svgUnitsPerMm, currentViewW, svgRenderedWidthPx, zoom]);

  // Measured distance in mm when 2 points are placed
  const measuredDistanceMm = useMemo(() => {
    if (measurePoints.length < 2) return null;
    const dx = measurePoints[1].x - measurePoints[0].x;
    const dy = measurePoints[1].y - measurePoints[0].y;
    const svgDist = Math.hypot(dx, dy);
    return Number((svgDist / svgUnitsPerMm).toFixed(2));
  }, [measurePoints, svgUnitsPerMm]);

  // Active pad for the inspection details panel (selected pad takes priority, or hovered pad)
  const inspectedPad = useMemo(() => {
    const targetNum = hoveredPadNumber ?? selectedPadNumber;
    if (targetNum == null) return null;
    return sortedPads.find((p) => p.number === targetNum) || null;
  }, [hoveredPadNumber, selectedPadNumber, sortedPads]);

  return (
    <div className="pcb-interactive-viewer">
      {/* Toolbar */}
      <div className="pcb-viewer-toolbar" role="toolbar" aria-label="Footprint viewer controls">
        <div className="pcb-toolbar-group">
          <button
            type="button"
            className="pcb-tool-btn"
            aria-label="Zoom in footprint"
            title="Zoom in (+)"
            onClick={() => applyZoomAtFraction(zoom * ZOOM_STEP, 0.5, 0.5)}
          >
            <ZoomIn size={14} aria-hidden="true" />
            <span>Zoom in</span>
          </button>
          <button
            type="button"
            className="pcb-tool-btn"
            aria-label="Zoom out footprint"
            title="Zoom out (-)"
            onClick={() => applyZoomAtFraction(zoom / ZOOM_STEP, 0.5, 0.5)}
          >
            <ZoomOut size={14} aria-hidden="true" />
            <span>Zoom out</span>
          </button>
          <button
            type="button"
            className="pcb-tool-btn"
            aria-label="Reset footprint zoom and pan"
            title="Reset view (0)"
            onClick={handleResetView}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        <div className="pcb-toolbar-group">
          <button
            type="button"
            className={`pcb-tool-btn ${showGrid ? "active" : ""}`}
            aria-label="Toggle millimeter grid overlay"
            aria-pressed={showGrid}
            onClick={() => setShowGrid((prev) => !prev)}
          >
            <Grid size={14} aria-hidden="true" />
            <span>mm Grid</span>
          </button>
          <button
            type="button"
            className={`pcb-tool-btn ${measureMode ? "active" : ""}`}
            aria-label="Toggle two-point distance measurement tool"
            aria-pressed={measureMode}
            onClick={() => {
              setMeasureMode((prev) => !prev);
              setMeasurePoints([]);
            }}
          >
            <Ruler size={14} aria-hidden="true" />
            <span>Measure</span>
          </button>
          {isAxialPackage && (
            <label
              className="pcb-axial-span-control"
              title="Axial leads are flexible; choose an illustrative PCB mounting bend span (not a fixed datasheet lead pitch)"
            >
              <span>Illustrative bend span:</span>
              <select
                className="pcb-axial-span-select"
                aria-label={`Select illustrative axial lead bend span for ${component.partNumber}`}
                value={axialSpanMm}
                onChange={(e) => setAxialSpanMm(Number(e.target.value))}
              >
                {defaultAxialSpan <= 7.62 && (
                  <option value={7.62}>7.62 mm (0.3&quot;)</option>
                )}
                <option value={10.16}>10.16 mm (0.4&quot;)</option>
                <option value={12.7}>12.70 mm (0.5&quot;)</option>
                <option value={15.24}>15.24 mm (0.6&quot;)</option>
              </select>
              <span className={getProvenanceBadgeClass("Placeholder")}>
                Placeholder
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Main Split Workspace: Interactive Canvas + Side-by-Side Pad Table */}
      <div className="pcb-viewer-workspace">
        <div className="pcb-canvas-column">
          <div
            ref={canvasRef}
            className={`pcb-footprint-canvas interactive-canvas ${
              measureMode ? "measure-cursor" : ""
            }`}
            tabIndex={0}
            role="application"
            aria-label={`Interactive footprint canvas for ${component.partNumber}. Use plus and minus keys to zoom, arrow keys to pan, and 0 to reset.`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrCancel}
            onPointerCancel={handlePointerUpOrCancel}
            onKeyDown={handleCanvasKeyDown}
          >
            <div className="cad-dimension-badge">
              {component.dataStatus === "verified"
                ? "Verified Footprint"
                : "Illustrative Footprint (Catalogue Dimensions)"}{" "}
              · <span className="pcb-mono-num">{Math.round(zoom * 100)}%</span>
            </div>

            {renderFootprintSvg(component, {
              viewBox: viewBoxStr,
              showGrid,
              selectedPadNumber,
              hoveredPadNumber,
              onSelectPad: measureMode
                ? undefined
                : (padNum) => setSelectedPadNumber(padNum),
              onHoverPad: (padNum) => setHoveredPadNumber(padNum),
              measurePoints,
              axialSpanMm,
            })}

            {/* Real-time mm scale bar */}
            <div className="pcb-scale-bar-overlay" aria-label={`Scale bar: ${scaleBarInfo.mm} millimeters`}>
              <div
                className="pcb-scale-bar-line"
                style={{ width: `${scaleBarInfo.widthPx}px` }}
              />
              <span className="pcb-scale-bar-label">
                <span className="pcb-mono-num">{scaleBarInfo.mm}</span> mm
              </span>
            </div>
          </div>

          {/* Two-Click Measurement Readout */}
          {measureMode && (
            <div className="pcb-measure-banner" role="status">
              <div className="pcb-measure-info">
                <strong>Measure tool:</strong>{" "}
                {measurePoints.length === 0 && "Click first point on canvas."}
                {measurePoints.length === 1 && "Click second point on canvas to measure distance."}
                {measurePoints.length === 2 && measuredDistanceMm != null && (
                  <>
                    Distance:{" "}
                    <span className="pcb-mono-num">{measuredDistanceMm}</span> mm{" "}
                    <span className={getProvenanceBadgeClass("Placeholder")}>
                      Placeholder
                    </span>{" "}
                    <span className="pcb-measure-caveat">
                      (scaled to body length; pad coordinates are schematic placeholders)
                    </span>
                  </>
                )}
              </div>
              {measurePoints.length > 0 && (
                <button
                  type="button"
                  className="pcb-measure-clear-btn"
                  onClick={() => setMeasurePoints([])}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Selected / Hovered Pad Details Panel */}
          <div className="pcb-pad-details-panel" aria-live="polite">
            <div className="pcb-pad-details-header">
              <h5>
                {inspectedPad
                  ? `Selected Pad Inspection (Pad ${inspectedPad.number})`
                  : "Pad Inspection"}
              </h5>
              <span className="pcb-pad-hint">
                Hover or click any pad or table row
              </span>
            </div>

            {inspectedPad ? (
              <div className="pcb-pad-details-grid">
                <div className="pcb-pad-detail-item">
                  <div className="pcb-pad-detail-top">
                    <span className="pcb-pad-detail-label">Pad number</span>
                    <span className={getProvenanceBadgeClass(inspectedPad.numberProvenance)}>
                      {inspectedPad.numberProvenance}
                    </span>
                  </div>
                  <div className="pcb-pad-detail-bottom">
                    <span className="pcb-mono-num">{inspectedPad.number}</span>
                  </div>
                </div>

                <div className="pcb-pad-detail-item">
                  <div className="pcb-pad-detail-top">
                    <span className="pcb-pad-detail-label">Pin name</span>
                    <span className={getProvenanceBadgeClass(inspectedPad.nameProvenance)}>
                      {inspectedPad.nameProvenance}
                    </span>
                  </div>
                  <div className="pcb-pad-detail-bottom">
                    <strong>{inspectedPad.name}</strong>
                  </div>
                </div>

                <div className="pcb-pad-detail-item">
                  <div className="pcb-pad-detail-top">
                    <span className="pcb-pad-detail-label">Pad shape</span>
                    <span className={getProvenanceBadgeClass(inspectedPad.shapeProvenance)}>
                      {inspectedPad.shapeProvenance}
                    </span>
                  </div>
                  <div className="pcb-pad-detail-bottom">
                    <span>{inspectedPad.shape} (illustrative)</span>
                  </div>
                </div>

                <div className="pcb-pad-detail-item">
                  <div className="pcb-pad-detail-top">
                    <span className="pcb-pad-detail-label">Pad width</span>
                    <span className={getProvenanceBadgeClass(inspectedPad.widthProvenance)}>
                      {inspectedPad.widthProvenance}
                    </span>
                  </div>
                  <div className="pcb-pad-detail-bottom">
                    {inspectedPad.widthProvenance === "Catalogue" ? (
                      <span>
                        <span className="pcb-mono-num">{inspectedPad.width}</span> mm
                      </span>
                    ) : (
                      <span className="pcb-na-cell">Not available</span>
                    )}
                  </div>
                </div>

                <div className="pcb-pad-detail-item">
                  <div className="pcb-pad-detail-top">
                    <span className="pcb-pad-detail-label">Pad height</span>
                    <span className={getProvenanceBadgeClass(inspectedPad.heightProvenance)}>
                      {inspectedPad.heightProvenance}
                    </span>
                  </div>
                  <div className="pcb-pad-detail-bottom">
                    {inspectedPad.heightProvenance === "Catalogue" ? (
                      <span>
                        <span className="pcb-mono-num">{inspectedPad.height}</span> mm
                      </span>
                    ) : (
                      <span className="pcb-na-cell">Not available</span>
                    )}
                  </div>
                </div>

                <div className="pcb-pad-detail-item">
                  <div className="pcb-pad-detail-top">
                    <span className="pcb-pad-detail-label">Drill diameter</span>
                    <span className={getProvenanceBadgeClass(inspectedPad.drillProvenance)}>
                      {inspectedPad.drillProvenance}
                    </span>
                  </div>
                  <div className="pcb-pad-detail-bottom">
                    {inspectedPad.drill != null ? (
                      <span>
                        <span className="pcb-mono-num">{inspectedPad.drill}</span> mm
                      </span>
                    ) : (
                      <span className="pcb-na-cell">Not available</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="pcb-pad-empty-msg">
                Select a pad on the footprint or in the pad table to inspect its dimensions and provenance.
              </p>
            )}
          </div>
        </div>

        {/* Side-by-Side Interactive Pad Table */}
        <div className="pcb-pad-table-wrapper">
          <div className="pcb-pad-table-title">
            Pad Table (<span className="pcb-mono-num">{sortedPads.length}</span> Pads)
          </div>
          <div className="pcb-pad-table-scroll">
            <table className="pcb-pad-table" aria-label={`Pads for ${component.partNumber}`}>
              <thead>
                <tr>
                  <th>Pad</th>
                  <th>Pin name</th>
                  <th>Shape</th>
                  <th>Size (W×H)</th>
                  <th>Drill</th>
                </tr>
              </thead>
              <tbody>
                {sortedPads.map((pad) => {
                  const isRowSelected = selectedPadNumber === pad.number;
                  const isRowHovered = hoveredPadNumber === pad.number;
                  return (
                    <tr
                      key={pad.number}
                      className={`pcb-pad-row ${isRowSelected ? "row-selected" : ""} ${
                        isRowHovered ? "row-hovered" : ""
                      }`}
                      tabIndex={0}
                      aria-selected={isRowSelected}
                      onClick={() => setSelectedPadNumber(pad.number)}
                      onMouseEnter={() => setHoveredPadNumber(pad.number)}
                      onMouseLeave={() => setHoveredPadNumber(null)}
                      onFocus={() => setHoveredPadNumber(pad.number)}
                      onBlur={() => setHoveredPadNumber(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedPadNumber(pad.number);
                        }
                      }}
                    >
                      <td>
                        <span className="pcb-mono-num">{pad.number}</span>
                      </td>
                      <td>
                        <strong>{pad.name}</strong>
                      </td>
                      <td>{pad.shape}</td>
                      <td>
                        {pad.widthProvenance === "Catalogue" ? (
                          <span className="pcb-mono-num">
                            {pad.width}×{pad.height} mm
                          </span>
                        ) : (
                          <span className="pcb-na-cell">Not available</span>
                        )}
                      </td>
                      <td>
                        {pad.drill != null ? (
                          <span className="pcb-mono-num">{pad.drill} mm</span>
                        ) : (
                          <span className="pcb-na-cell">Not available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Required Phase 1 Fabrication Disclaimer & Missing Banner */}
      <p className="pcb-fabrication-disclaimer">
        Illustrative footprint generated from stored catalogue dimensions. Confirm against the manufacturer datasheet before fabrication.
      </p>
      {missingFields.length > 0 && (
        <div className="pcb-missing-banner">
          <strong>Missing:</strong>{" "}
          {renderValueWithMonoNumbers(missingFields.join(", "))}
        </div>
      )}
    </div>
  );
};
