// Procedural SVG package footprint drawing functions for PCB layout dimension inspection.

import type { ComponentData } from "../types";

export function renderFootprintSvg(component: ComponentData) {
  const cat = (component.category || "").toLowerCase();
  const pkg = (component.package?.name || "").toLowerCase();
  const pinCount = component.pins?.length || 0;
  const leadPitch = component.package?.pcbLayout?.leadPitchMm ?? 2.54;
  const lengthMm =
    component.package?.bodyDimensions?.lengthMm ??
    component.package?.footprintDimensions?.lengthMm ??
    10;
  const widthMm =
    component.package?.bodyDimensions?.widthMm ??
    component.package?.footprintDimensions?.widthMm ??
    6;

  // 1. IC / DIP / SOIC / QFP
  if (
    cat.includes("ic") ||
    cat.includes("circuit") ||
    pkg.includes("dip") ||
    pkg.includes("soic") ||
    pkg.includes("sop") ||
    pkg.includes("qfp") ||
    pinCount >= 6
  ) {
    const pinsPerSide = Math.max(
      3,
      Math.min(8, Math.ceil((pinCount || 8) / 2))
    );
    return (
      <svg
        className="footprint-svg"
        viewBox="0 0 220 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="IC Footprint Vector Diagram"
      >
        <rect
          x="50"
          y="20"
          width="120"
          height="90"
          rx="4"
          fill="#FFFFFF"
          stroke="#172B4D"
          strokeWidth="1.5"
        />
        <path
          d="M50 55 A10 10 0 0 1 50 75"
          fill="#F4F6F8"
          stroke="#172B4D"
          strokeWidth="1.5"
        />
        <circle cx="66" cy="36" r="3.5" fill="#147D64" />
        {Array.from({ length: pinsPerSide }).map((_, i) => {
          const y = 30 + i * (70 / (pinsPerSide - 1 || 1));
          return (
            <g key={`l-${i}`}>
              <rect
                x="25"
                y={y - 4}
                width="25"
                height="8"
                rx="1.5"
                fill="#FFFFFF"
                stroke="#147D64"
                strokeWidth="1.2"
              />
              <text
                x="18"
                y={y + 3}
                fill="#52647A"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="end"
              >
                {i + 1}
              </text>
            </g>
          );
        })}
        {Array.from({ length: pinsPerSide }).map((_, i) => {
          const y = 30 + i * (70 / (pinsPerSide - 1 || 1));
          return (
            <g key={`r-${i}`}>
              <rect
                x="170"
                y={y - 4}
                width="25"
                height="8"
                rx="1.5"
                fill="#FFFFFF"
                stroke="#3267A8"
                strokeWidth="1.2"
              />
              <text
                x="202"
                y={y + 3}
                fill="#52647A"
                fontSize="8"
                fontFamily="monospace"
              >
                {pinsPerSide * 2 - i}
              </text>
            </g>
          );
        })}
        <line
          x1="50"
          y1="120"
          x2="170"
          y2="120"
          stroke="#7B899B"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text
          x="110"
          y="126"
          fill="#52647A"
          fontSize="8"
          fontFamily="monospace"
          textAnchor="middle"
        >
          {lengthMm} mm L × {widthMm} mm W
        </text>
        <text
          x="110"
          y="68"
          fill="#172B4D"
          fontSize="9"
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "IC PACKAGE"}
        </text>
      </svg>
    );
  }

  // 2. Transistors / 3-pin TO-220 / TO-92 / SOT
  if (
    cat.includes("bjt") ||
    cat.includes("mosfet") ||
    cat.includes("transistor") ||
    pkg.includes("to-") ||
    pkg.includes("sot") ||
    pinCount === 3
  ) {
    return (
      <svg
        className="footprint-svg"
        viewBox="0 0 220 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Transistor Footprint Vector Diagram"
      >
        <rect
          x="70"
          y="15"
          width="80"
          height="20"
          rx="2"
          fill="#F1F5F9"
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />
        <circle
          cx="110"
          cy="25"
          r="5"
          fill="#FFFFFF"
          stroke="#3267A8"
          strokeWidth="1"
        />
        <rect
          x="70"
          y="35"
          width="80"
          height="50"
          rx="3"
          fill="#FFFFFF"
          stroke="#172B4D"
          strokeWidth="1.5"
        />
        <text
          x="110"
          y="62"
          fill="#172B4D"
          fontSize="9"
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "3-LEAD TRANSISTOR"}
        </text>
        <g>
          <rect
            x="80"
            y="85"
            width="10"
            height="28"
            rx="1.5"
            fill="#FFFFFF"
            stroke="#147D64"
            strokeWidth="1.2"
          />
          <text
            x="85"
            y="122"
            fill="#52647A"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
          >
            1
          </text>
        </g>
        <g>
          <rect
            x="105"
            y="85"
            width="10"
            height="28"
            rx="1.5"
            fill="#FFFFFF"
            stroke="#147D64"
            strokeWidth="1.2"
          />
          <text
            x="110"
            y="122"
            fill="#52647A"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
          >
            2
          </text>
        </g>
        <g>
          <rect
            x="130"
            y="85"
            width="10"
            height="28"
            rx="1.5"
            fill="#FFFFFF"
            stroke="#147D64"
            strokeWidth="1.2"
          />
          <text
            x="135"
            y="122"
            fill="#52647A"
            fontSize="8"
            fontFamily="monospace"
            textAnchor="middle"
          >
            3
          </text>
        </g>
        <line
          x1="85"
          y1="98"
          x2="135"
          y2="98"
          stroke="#B7791F"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text
          x="165"
          y="102"
          fill="#B7791F"
          fontSize="8"
          fontFamily="monospace"
        >
          {leadPitch}mm pitch
        </text>
      </svg>
    );
  }

  // 3. Resistors, Inductors, Diodes (2-terminal Axial / SMD)
  if (
    cat.includes("resistor") ||
    cat.includes("diode") ||
    cat.includes("inductor") ||
    pkg.includes("0805") ||
    pkg.includes("1206") ||
    pkg.includes("axial")
  ) {
    const isDiode = cat.includes("diode") || cat.includes("led");
    return (
      <svg
        className="footprint-svg"
        viewBox="0 0 220 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="2-Terminal Passive Footprint Vector Diagram"
      >
        <rect
          x="30"
          y="55"
          width="35"
          height="20"
          rx="2"
          fill="#E8F5F0"
          stroke="#147D64"
          strokeWidth="1.5"
        />
        <text
          x="47"
          y="68"
          fill="#147D64"
          fontSize="9"
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight="600"
        >
          A
        </text>
        <rect
          x="65"
          y="45"
          width="90"
          height="40"
          rx="4"
          fill="#FFFFFF"
          stroke="#C9D4E0"
          strokeWidth="1.5"
        />
        {isDiode ? (
          <line
            x1="135"
            y1="45"
            x2="135"
            y2="85"
            stroke="#147D64"
            strokeWidth="5"
            strokeLinecap="round"
          />
        ) : (
          <g opacity="0.8">
            <line
              x1="85"
              y1="45"
              x2="85"
              y2="85"
              stroke="#B7791F"
              strokeWidth="3"
            />
            <line
              x1="97"
              y1="45"
              x2="97"
              y2="85"
              stroke="#3267A8"
              strokeWidth="3"
            />
            <line
              x1="109"
              y1="45"
              x2="109"
              y2="85"
              stroke="#147D64"
              strokeWidth="3"
            />
          </g>
        )}
        <rect
          x="155"
          y="55"
          width="35"
          height="20"
          rx="2"
          fill="#E8F5F0"
          stroke="#147D64"
          strokeWidth="1.5"
        />
        <text
          x="172"
          y="68"
          fill="#147D64"
          fontSize="9"
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight="600"
        >
          {isDiode ? "K" : "B"}
        </text>
        <line
          x1="30"
          y1="102"
          x2="190"
          y2="102"
          stroke="#7B899B"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <text
          x="110"
          y="116"
          fill="#52647A"
          fontSize="8"
          fontFamily="monospace"
          textAnchor="middle"
        >
          Span: {lengthMm} mm · Width: {widthMm} mm
        </text>
        <text
          x="110"
          y="36"
          fill="#172B4D"
          fontSize="9"
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "2-TERMINAL DEVICE"}
        </text>
      </svg>
    );
  }

  // 4. Capacitors (Radial / SMD)
  if (cat.includes("capacitor")) {
    return (
      <svg
        className="footprint-svg"
        viewBox="0 0 220 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Capacitor Footprint Vector Diagram"
      >
        <circle
          cx="110"
          cy="60"
          r="40"
          fill="#FFFFFF"
          stroke="#172B4D"
          strokeWidth="1.5"
        />
        <circle
          cx="110"
          cy="60"
          r="36"
          fill="none"
          stroke="#DCE3EB"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <path
          d="M74 46 A40 40 0 0 0 74 74 L81 74 A32 32 0 0 1 81 46 Z"
          fill="#E2E8F0"
        />
        <text
          x="77"
          y="63"
          fill="#52647A"
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
        >
          -
        </text>
        <circle
          cx="98"
          cy="60"
          r="6"
          fill="#E8F5F0"
          stroke="#147D64"
          strokeWidth="1.5"
        />
        <circle cx="98" cy="60" r="2.5" fill="#FFFFFF" stroke="#147D64" strokeWidth="0.8" />
        <circle
          cx="122"
          cy="60"
          r="6"
          fill="#EBF3FC"
          stroke="#3267A8"
          strokeWidth="1.5"
        />
        <circle cx="122" cy="60" r="2.5" fill="#FFFFFF" stroke="#3267A8" strokeWidth="0.8" />
        <text
          x="110"
          y="118"
          fill="#52647A"
          fontSize="8"
          fontFamily="monospace"
          textAnchor="middle"
        >
          Lead Pitch: {leadPitch} mm · ⌀{widthMm} mm
        </text>
        <text
          x="110"
          y="15"
          fill="#172B4D"
          fontSize="9"
          fontFamily="monospace"
          textAnchor="middle"
          fontWeight="600"
        >
          {component.package?.name || "RADIAL ELECTROLYTIC"}
        </text>
      </svg>
    );
  }

  // Default CAD Schematic
  return (
    <svg
      className="footprint-svg"
      viewBox="0 0 220 130"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Parametric CAD Footprint"
    >
      <rect
        x="40"
        y="25"
        width="140"
        height="75"
        rx="3"
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth="1.5"
      />
      <line
        x1="110"
        y1="20"
        x2="110"
        y2="105"
        stroke="#E2E8F0"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <line
        x1="35"
        y1="62.5"
        x2="185"
        y2="62.5"
        stroke="#E2E8F0"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <circle
        cx="110"
        cy="62.5"
        r="4"
        fill="none"
        stroke="#147D64"
        strokeWidth="1.2"
      />
      <text
        x="110"
        y="50"
        fill="#172B4D"
        fontSize="10"
        fontFamily="monospace"
        textAnchor="middle"
        fontWeight="600"
      >
        {component.package?.name || "GENERIC FOOTPRINT"}
      </text>
      <text
        x="110"
        y="78"
        fill="#52647A"
        fontSize="8"
        fontFamily="monospace"
        textAnchor="middle"
      >
        {lengthMm} × {widthMm} mm
      </text>
      <text
        x="110"
        y="118"
        fill="#7B899B"
        fontSize="8"
        fontFamily="monospace"
        textAnchor="middle"
      >
        PARAMETRIC CAD REFERENCE
      </text>
    </svg>
  );
}

