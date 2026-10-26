import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "./ComponentImage.css";
import { ComponentThumbnail } from "./ComponentImage";
import { getComponentImageInfo } from "./componentImageUtils";

type ComponentData = {
  _id: string;
  partNumber: string;
  name: string;
  category: string;
  manufacturer: string;
  description: string;
  imageUrl?: string;
  specifications?: Record<string, unknown>;
  package?: {
    name?: string;
    mountingType?: string;
    bodyDimensions?: {
      lengthMm?: number;
      widthMm?: number;
      heightMm?: number;
      seatedHeightMm?: number;
    };
    pcbLayout?: {
      leadPitchMm?: number;
      rowSpacingMm?: number;
      drillDiameterMm?: number;
      padDiameterMm?: number;
    };
    footprintDimensions?: {
      lengthMm?: number;
      widthMm?: number;
      heightMm?: number;
    };
    padLayout?: string;
    landPatternUrl?: string;
  };
  pins?: {
    number?: number;
    name?: string;
    function?: string;
  }[];
  datasheetUrl?: string;
  manufacturerUrl?: string;
  dataStatus: "verified" | "incomplete";
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const API_URL =
  import.meta.env.VITE_API_URL || `${API_BASE_URL}/components`;

const categories = [
  { name: "All Components", icon: "▦" },
  { name: "Resistors", icon: "⌁" },
  { name: "Capacitors", icon: "▤" },
  { name: "Inductors", icon: "∿" },
  { name: "Diodes and LEDs", icon: "◈" },
  { name: "BJTs and MOSFETs", icon: "◉" },
  { name: "Integrated circuits (ICs)", icon: "▣" },
  { name: "Voltage regulators", icon: "⚡" },
  { name: "Connectors", icon: "⌁" },
  { name: "Switches and protection components", icon: "⛨" },
];

function isValidHttpUrl(url?: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

function formatDimensions(pkg?: ComponentData["package"]): string {
  const dims =
    pkg?.bodyDimensions &&
    (pkg.bodyDimensions.lengthMm != null ||
      pkg.bodyDimensions.widthMm != null ||
      pkg.bodyDimensions.heightMm != null)
      ? pkg.bodyDimensions
      : pkg?.footprintDimensions;
  if (!dims) return "—";
  const { lengthMm, widthMm, heightMm } = dims;
  const parts: string[] = [];
  if (lengthMm != null) parts.push(`${lengthMm} mm L`);
  if (widthMm != null) parts.push(`${widthMm} mm W`);
  if (heightMm != null) parts.push(`${heightMm} mm H`);
  return parts.length > 0 ? parts.join(" × ") : "—";
}

function findUnitForSpecKey(
  key: string,
  specs?: Record<string, unknown>
): string | undefined {
  if (!specs) return undefined;
  if (typeof specs[`${key}Unit`] === "string") {
    return specs[`${key}Unit`] as string;
  }
  const baseKey = key.replace(/(Max|Min|Nom)$/, "");
  if (baseKey !== key && typeof specs[`${baseKey}Unit`] === "string") {
    return specs[`${baseKey}Unit`] as string;
  }
  return undefined;
}

function formatSpecValue(val: unknown, unit?: string): string {
  if (val === undefined || val === null || val === "") {
    return "—";
  }
  let display: string;
  if (typeof val === "boolean") {
    display = val ? "Yes" : "No";
  } else if (Array.isArray(val)) {
    display = val
      .map((item) =>
        typeof item === "object" && item !== null
          ? JSON.stringify(item)
          : String(item)
      )
      .join(", ");
  } else if (typeof val === "object") {
    display = JSON.stringify(val);
  } else {
    display = String(val).trim();
  }

  if (!display) {
    return "—";
  }

  if (unit && unit.trim()) {
    return `${display} ${unit.trim()}`;
  }
  return display;
}

function formatSpecKeyLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function getSpecPairs(
  specs?: Record<string, unknown>,
  limit?: number
): { key: string; label: string; value: string }[] {
  if (!specs) return [];
  const allKeys = Object.keys(specs);
  const filteredKeys = allKeys.filter((key) => {
    if (key.endsWith("Unit")) {
      const base = key.slice(0, -4);
      const hasPairedValue = allKeys.some(
        (k) => k !== key && (k === base || k.startsWith(base))
      );
      if (hasPairedValue) return false;
    }
    return true;
  });

  const pairs = filteredKeys
    .map((key) => {
      const unit = findUnitForSpecKey(key, specs);
      const value = formatSpecValue(specs[key], unit);
      return {
        key,
        label: formatSpecKeyLabel(key),
        value,
      };
    })
    .filter((item) => item.value !== "—" && item.value !== "Not available");

  return limit ? pairs.slice(0, limit) : pairs;
}

function isRowDivergent(values: (string | undefined | null)[]): boolean {
  const valid = values
    .map((v) => (v ?? "").trim())
    .filter((v) => v !== "" && v !== "—" && v !== "Not available");
  if (valid.length <= 1) return false;
  return new Set(valid).size > 1;
}

function renderFootprintSvg(component: ComponentData) {
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

type SortField =
  | "partNumber"
  | "name"
  | "manufacturer"
  | "category"
  | "package";

function App() {
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [filterOptions, setFilterOptions] = useState<ComponentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedMpn, setCopiedMpn] = useState<string | null>(null);

  function copyMpn(partNumber: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard
      .writeText(partNumber)
      .then(() => {
        setCopiedMpn(partNumber);
        setTimeout(() => {
          setCopiedMpn((prev) => (prev === partNumber ? null : prev));
        }, 1800);
      })
      .catch(() => {});
  }

  // Focus search input when pressing '/'
  useEffect(() => {
    function handleGlobalSlash(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        const el = document.getElementById(
          "component-search"
        ) as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select();
        }
      }
    }
    window.addEventListener("keydown", handleGlobalSlash);
    return () => window.removeEventListener("keydown", handleGlobalSlash);
  }, []);

  const [sortField, setSortField] = useState<SortField>("partNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  const [activeView, setActiveView] = useState<"library" | "compare" | "pcb">(
    "library"
  );
  const [catalogLayout, setCatalogLayout] = useState<"grid" | "table">("grid");
  const [selectedForCompare, setSelectedForCompare] = useState<ComponentData[]>(
    []
  );

  function toggleCompare(component: ComponentData) {
    setSelectedForCompare((prev) => {
      const exists = prev.some((c) => c._id === component._id);
      if (exists) {
        return prev.filter((c) => c._id !== component._id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, component];
    });
  }

  const sortedComponents = useMemo(() => {
    return [...components].sort((a, b) => {
      let aVal = "";
      let bVal = "";
      if (sortField === "partNumber") {
        aVal = a.partNumber || "";
        bVal = b.partNumber || "";
      } else if (sortField === "name") {
        aVal = a.name || "";
        bVal = b.name || "";
      } else if (sortField === "manufacturer") {
        aVal = a.manufacturer || "";
        bVal = b.manufacturer || "";
      } else if (sortField === "category") {
        aVal = a.category || "";
        bVal = b.category || "";
      } else if (sortField === "package") {
        aVal = a.package?.name || "";
        bVal = b.package?.name || "";
      }
      const cmp = aVal.localeCompare(bVal, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [components, sortField, sortDirection]);

  const specKeysToDisplay = useMemo(() => {
    const allKeys = Array.from(
      new Set(
        selectedForCompare.flatMap((c) =>
          c.specifications ? Object.keys(c.specifications) : []
        )
      )
    );

    return allKeys
      .filter((key) => {
        if (key.endsWith("Unit")) {
          const base = key.slice(0, -4);
          const hasPairedValue = allKeys.some(
            (k) => k !== key && (k === base || k.startsWith(base))
          );
          if (hasPairedValue) return false;
        }
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [selectedForCompare]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce text search input by 300ms
  useEffect(() => {
    // Clear immediately if search is empty, otherwise wait 300ms
    const delay = search.trim() ? 300 : 0;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);
  const [selectedCategory, setSelectedCategory] =
    useState("All Components");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");

  const [selectedComponent, setSelectedComponent] =
    useState<ComponentData | null>(null);

  // Load the full component list once to populate filter options.
  useEffect(() => {
    let cancelled = false;

    async function fetchFilterOptions() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Failed to load filter options");
        }

        const data: ComponentData[] = await response.json();

        if (!cancelled) {
          setFilterOptions(data);
        }
      } catch (err) {
        console.error("Filter options fetch failed:", err);
      }
    }

    fetchFilterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch components whenever a search or filter changes.
  useEffect(() => {
    let cancelled = false;

    async function fetchComponents() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (debouncedSearch.trim()) {
          params.set("search", debouncedSearch.trim());
        }

        if (selectedCategory !== "All Components") {
          params.set("category", selectedCategory);
        }

        if (selectedManufacturer) {
          params.set("manufacturer", selectedManufacturer);
        }

        if (selectedPackage) {
          params.set("package", selectedPackage);
        }

        const queryString = params.toString();
        const url = queryString
          ? `${API_URL}?${queryString}`
          : API_URL;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to load components");
        }

        const data: ComponentData[] = await response.json();

        if (!cancelled) {
          setComponents(data);
        }
      } catch (err) {
        console.error("Component fetch failed:", err);

        if (!cancelled) {
          setError(
            "Unable to load components. Check that the backend is running."
          );
          setComponents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchComponents();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    selectedCategory,
    selectedManufacturer,
    selectedPackage,
  ]);

  // Calculate manufacturer options using the other active filters.
  const manufacturers = useMemo(() => {
    return [
      ...new Set(
        filterOptions
          .filter((component) => {
            const matchesSearch =
              !search.trim() ||
              component.name.toLowerCase().includes(search.trim().toLowerCase()) ||
              component.partNumber
                .toLowerCase()
                .includes(search.trim().toLowerCase());

            const matchesCategory =
              selectedCategory === "All Components" ||
              component.category === selectedCategory;

            const matchesPackage =
              !selectedPackage ||
              component.package?.name === selectedPackage;

            return matchesSearch && matchesCategory && matchesPackage;
          })
          .map((component) => component.manufacturer)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [filterOptions, search, selectedCategory, selectedPackage]);

  // Calculate package options using the other active filters.
  const packages = useMemo(() => {
    return [
      ...new Set(
        filterOptions
          .filter((component) => {
            const matchesSearch =
              !search.trim() ||
              component.name
                .toLowerCase()
                .includes(search.trim().toLowerCase()) ||
              component.partNumber
                .toLowerCase()
                .includes(search.trim().toLowerCase());

            const matchesCategory =
              selectedCategory === "All Components" ||
              component.category === selectedCategory;

            const matchesManufacturer =
              !selectedManufacturer ||
              component.manufacturer === selectedManufacturer;

            return matchesSearch && matchesCategory && matchesManufacturer;
          })
          .map((component) => component.package?.name)
          .filter((name): name is string => Boolean(name))
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [filterOptions, search, selectedCategory, selectedManufacturer]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "All Components": filterOptions.length || components.length,
    };
    for (const item of filterOptions) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [filterOptions, components.length]);
  


  // Close the component details modal with the Escape key.
  useEffect(() => {
    if (!selectedComponent) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedComponent(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedComponent]);

  function clearFilters() {
    setSearch("");
    setSelectedCategory("All Components");
    setSelectedManufacturer("");
    setSelectedPackage("");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <a
            className="brand"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              setActiveView("library");
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v4" />
                <path d="M12 17v4" />
                <path d="M3 12h4" />
                <path d="M17 12h4" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
            </span>
            <span className="brand-text">
              <strong>Cirqon</strong>
              <small>PRECISION ENGINEERING WORKSPACE</small>
            </span>
          </a>

          <nav className="top-nav" aria-label="Workspace navigation">
            <button
              className={
                activeView === "library" ? "nav-item active" : "nav-item"
              }
              type="button"
              onClick={() => setActiveView("library")}
            >
              <span className="nav-icon">▦</span>
              <span>Component Library</span>
            </button>

            <button
              className={
                activeView === "compare" ? "nav-item active" : "nav-item"
              }
              type="button"
              onClick={() => setActiveView("compare")}
            >
              <span className="nav-icon">⇄</span>
              <span>Component Compare</span>
              {selectedForCompare.length > 0 && (
                <span className="nav-badge">{selectedForCompare.length}</span>
              )}
            </button>

            <button
              className={activeView === "pcb" ? "nav-item active" : "nav-item"}
              type="button"
              onClick={() => setActiveView("pcb")}
            >
              <span className="nav-icon">⌘</span>
              <span>PCB Design Assistant</span>
            </button>
          </nav>
        </div>

        <div className="topbar-search">
          <div className="search-input-wrap">
            <span className="search-icon">⌕</span>
            <input
              id="component-search"
              type="search"
              aria-label="Search components by part number or keyword"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (activeView !== "library") {
                  setActiveView("library");
                }
              }}
              placeholder="Search part number, IC, package, or specs (Press '/' to focus)..."
            />
            {search ? (
              <button
                className="clear-search-inline"
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            ) : (
              <kbd className="search-kbd" title="Press '/' anywhere to search">/</kbd>
            )}
          </div>
        </div>

        <div className="topbar-right">
          <div
            className={`system-status-indicator ${error ? "offline" : "online"}`}
            title={error ? "Backend service unreachable" : "Connected to catalog database"}
          >
            <span className={`status-dot ${error ? "offline" : "online"}`} />
            <span className="status-label">{error ? "Database Offline" : "Catalog Ready"}</span>
          </div>
        </div>
      </header>

      <div className="workspace-body">
        <aside className="sidebar" aria-label="Parametric and category filters">
          <div className="sidebar-section">
            <div className="sidebar-label">CATEGORIES</div>

            <nav className="category-list">
              {categories.map((category) => (
                <button
                  className={
                    selectedCategory === category.name
                      ? "category-item selected"
                      : "category-item"
                  }
                  key={category.name}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category.name);
                    if (activeView === "compare") {
                      setActiveView("library");
                    }
                  }}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span>{category.name}</span>

                  {categoryCounts[category.name] != null && (
                    <span className="category-count">
                      {categoryCounts[category.name]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="sidebar-section sidebar-filters">
            <div className="sidebar-label">PARAMETRIC FILTERS</div>

            <div className="filter-field">
              <label htmlFor="manufacturer-filter">Manufacturer</label>
              <select
                id="manufacturer-filter"
                value={selectedManufacturer}
                onChange={(event) =>
                  setSelectedManufacturer(event.target.value)
                }
              >
                <option value="">All manufacturers ({manufacturers.length})</option>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer} value={manufacturer}>
                    {manufacturer}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-field">
              <label htmlFor="package-filter">Package / Case</label>
              <select
                id="package-filter"
                value={selectedPackage}
                onChange={(event) => setSelectedPackage(event.target.value)}
              >
                <option value="">All packages ({packages.length})</option>
                {packages.map((packageName) => (
                  <option key={packageName} value={packageName}>
                    {packageName}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="filter-button reset-filters-button"
              type="button"
              onClick={clearFilters}
            >
              Reset all filters
            </button>
          </div>

          <div className="sidebar-footer">
            <span className="status-dot" />
            MongoDB Catalog
            <span className="version">v0.2</span>
          </div>
        </aside>

        <main className="main-content">
          <section className="page-content">
            {activeView === "library" ? (
              <>
                <div className="catalog-control-bar">
                  <div className="catalog-heading-group">
                    <div className="breadcrumb">
                      Catalog <span>/</span>{" "}
                      <strong>{selectedCategory}</strong>
                    </div>
                    <h1>
                      {selectedCategory === "All Components"
                        ? "Electronic Component Catalog"
                        : selectedCategory}
                    </h1>
                  </div>

                  <div className="catalog-toolbar-right">
                    {(selectedCategory !== "All Components" ||
                      selectedManufacturer ||
                      selectedPackage ||
                      search.trim()) && (
                      <div className="active-filter-pills">
                        {selectedCategory !== "All Components" && (
                          <button
                            className="filter-pill"
                            type="button"
                            onClick={() =>
                              setSelectedCategory("All Components")
                            }
                            title="Remove category filter"
                          >
                            {selectedCategory} <span>×</span>
                          </button>
                        )}
                        {selectedManufacturer && (
                          <button
                            className="filter-pill"
                            type="button"
                            onClick={() => setSelectedManufacturer("")}
                            title="Remove manufacturer filter"
                          >
                            Mfr: {selectedManufacturer} <span>×</span>
                          </button>
                        )}
                        {selectedPackage && (
                          <button
                            className="filter-pill"
                            type="button"
                            onClick={() => setSelectedPackage("")}
                            title="Remove package filter"
                          >
                            Pkg: {selectedPackage} <span>×</span>
                          </button>
                        )}
                        {search.trim() && (
                          <button
                            className="filter-pill"
                            type="button"
                            onClick={() => setSearch("")}
                            title="Clear search query"
                          >
                            “{search.trim()}” <span>×</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="catalog-sort-bar">
                      <label htmlFor="catalog-sort-select" className="sort-label">
                        Sort:
                      </label>
                      <select
                        id="catalog-sort-select"
                        className="catalog-sort-select"
                        value={sortField}
                        onChange={(e) => {
                          setSortField(e.target.value as SortField);
                        }}
                        aria-label="Sort component catalog by field"
                      >
                        <option value="partNumber">Part Number (MPN)</option>
                        <option value="name">Component Name</option>
                        <option value="manufacturer">Manufacturer</option>
                        <option value="category">Category</option>
                        <option value="package">Package / Case</option>
                      </select>
                      <button
                        type="button"
                        className="sort-dir-toggle-btn"
                        onClick={() =>
                          setSortDirection((prev) =>
                            prev === "asc" ? "desc" : "asc"
                          )
                        }
                        title={`Direction: ${
                          sortDirection === "asc"
                            ? "Ascending (A-Z)"
                            : "Descending (Z-A)"
                        }`}
                        aria-label={`Toggle sort direction, currently ${
                          sortDirection === "asc" ? "ascending" : "descending"
                        }`}
                      >
                        {sortDirection === "asc" ? "▲ ASC" : "▼ DESC"}
                      </button>
                    </div>

                    <div
                      className="view-mode-toggle"
                      role="group"
                      aria-label="Catalog Layout View"
                    >
                      <button
                        type="button"
                        className={`view-mode-btn ${
                          catalogLayout === "grid" ? "active" : ""
                        }`}
                        onClick={() => setCatalogLayout("grid")}
                        title="Card Grid View (Default)"
                        aria-pressed={catalogLayout === "grid"}
                      >
                        <span className="view-btn-icon">▦</span> Cards
                      </button>
                      <button
                        type="button"
                        className={`view-mode-btn ${
                          catalogLayout === "table" ? "active" : ""
                        }`}
                        onClick={() => setCatalogLayout("table")}
                        title="Engineering Table View"
                        aria-pressed={catalogLayout === "table"}
                      >
                        <span className="view-btn-icon">▤</span> Table
                      </button>
                    </div>

                    <span className="result-count">
                      {loading
                        ? "Loading..."
                        : `${components.length} ${
                            components.length === 1 ? "part" : "parts"
                          } found`}
                    </span>
                  </div>
                </div>

                {catalogLayout === "grid" ? (
                  <div className="catalog-cards-container">
                    {loading ? (
                      <div className="component-card-grid">
                        {Array.from({ length: 8 }).map((_, idx) => (
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
                      <div className="card-empty-feedback">
                        <span className="empty-icon">⚠</span>
                        <strong>Unable to retrieve component data</strong>
                        <p>{error}</p>
                      </div>
                    ) : sortedComponents.length === 0 ? (
                      <div className="card-empty-feedback">
                        <span className="empty-icon">⌕</span>
                        <strong>No components match the active criteria</strong>
                        <p>
                          Try clearing your keyword search or adjusting the selected category and filters.
                        </p>
                        <button
                          className="filter-button reset-action-btn"
                          type="button"
                          onClick={clearFilters}
                        >
                          Reset All Filters
                        </button>
                      </div>
                    ) : (
                      <div className="component-card-grid">
                        {sortedComponents.map((component) => {
                          const isSelected = selectedForCompare.some(
                            (c) => c._id === component._id
                          );
                          const previewSpecs = getSpecPairs(
                            component.specifications,
                            3
                          );

                          return (
                            <article
                              key={component._id}
                              className={`product-card ${
                                isSelected ? "selected-card" : ""
                              }`}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setSelectedComponent(component);
                                }
                              }}
                              aria-label={`${component.name} (${component.partNumber})`}
                            >
                              <div className="card-top-bar">
                                <label
                                  className="card-compare-label"
                                  onClick={(e) => e.stopPropagation()}
                                  title={
                                    !isSelected && selectedForCompare.length >= 4
                                      ? "Maximum 4 components selected for comparison"
                                      : isSelected
                                      ? `Remove ${component.partNumber} from comparison`
                                      : `Add ${component.partNumber} to comparison`
                                  }
                                >
                                  <input
                                    type="checkbox"
                                    className="card-compare-checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleCompare(component)}
                                    disabled={
                                      !isSelected && selectedForCompare.length >= 4
                                    }
                                    aria-label={`Select ${component.partNumber} for comparison`}
                                  />
                                  <span className="card-compare-box">
                                    {isSelected && "✓"}
                                  </span>
                                  <span className="card-compare-text">Compare</span>
                                </label>

                                <span className="card-cat-badge">
                                  {component.category}
                                </span>
                              </div>

                              <div
                                className="card-image-stage"
                                onClick={() => setSelectedComponent(component)}
                                title={`View technical details for ${component.name}`}
                              >
                                <ComponentThumbnail
                                  component={component}
                                  size="lg"
                                  showProvenanceBadge
                                />
                              </div>

                              <div className="card-body">
                                <div className="card-mpn-row">
                                  <span
                                    className="card-mpn"
                                    onClick={() => setSelectedComponent(component)}
                                    title={`Manufacturer Part Number: ${component.partNumber}`}
                                  >
                                    {component.partNumber}
                                  </span>
                                  <button
                                    type="button"
                                    className={`mpn-copy-btn ${
                                      copiedMpn === component.partNumber ? "copied" : ""
                                    }`}
                                    onClick={(e) => copyMpn(component.partNumber, e)}
                                    title="Copy MPN to clipboard"
                                  >
                                    {copiedMpn === component.partNumber ? "COPIED" : "COPY"}
                                  </button>
                                </div>

                                <h3
                                  className="card-name"
                                  onClick={() => setSelectedComponent(component)}
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
                                  onClick={() => setSelectedComponent(component)}
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
                ) : (
                  <div className="engineering-table-container">
                  <div className="table-responsive-wrapper">
                    <table className="engineering-data-table">
                      <thead>
                        <tr>
                          <th className="th-select" title="Compare selection (max 4 components)">
                            <span className="th-compare-icon">⇄</span> Compare
                          </th>
                          <th className="th-image" title="Component product photograph / package visual">
                            Image
                          </th>
                          <th
                            className={`th-mpn sortable-th ${sortField === "partNumber" ? "sorted" : ""}`}
                            onClick={() => handleSort("partNumber")}
                            title="Click to sort by Manufacturer Part Number"
                          >
                            <span className="th-label-wrap">
                              <span>Part Number (MPN)</span>
                              <span className={`sort-caret ${sortField === "partNumber" ? "active" : ""}`}>
                                {sortField === "partNumber"
                                  ? sortDirection === "asc"
                                    ? "▲"
                                    : "▼"
                                  : "↕"}
                              </span>
                            </span>
                          </th>
                          <th
                            className={`th-name sortable-th ${sortField === "name" ? "sorted" : ""}`}
                            onClick={() => handleSort("name")}
                            title="Click to sort by Component Name"
                          >
                            <span className="th-label-wrap">
                              <span>Component Name & Description</span>
                              <span className={`sort-caret ${sortField === "name" ? "active" : ""}`}>
                                {sortField === "name"
                                  ? sortDirection === "asc"
                                    ? "▲"
                                    : "▼"
                                  : "↕"}
                              </span>
                            </span>
                          </th>
                          <th
                            className={`th-mfr sortable-th ${sortField === "manufacturer" ? "sorted" : ""}`}
                            onClick={() => handleSort("manufacturer")}
                            title="Click to sort by Manufacturer"
                          >
                            <span className="th-label-wrap">
                              <span>Manufacturer</span>
                              <span className={`sort-caret ${sortField === "manufacturer" ? "active" : ""}`}>
                                {sortField === "manufacturer"
                                  ? sortDirection === "asc"
                                    ? "▲"
                                    : "▼"
                                  : "↕"}
                              </span>
                            </span>
                          </th>
                          <th
                            className={`th-category sortable-th ${sortField === "category" ? "sorted" : ""}`}
                            onClick={() => handleSort("category")}
                            title="Click to sort by Category"
                          >
                            <span className="th-label-wrap">
                              <span>Category</span>
                              <span className={`sort-caret ${sortField === "category" ? "active" : ""}`}>
                                {sortField === "category"
                                  ? sortDirection === "asc"
                                    ? "▲"
                                    : "▼"
                                  : "↕"}
                              </span>
                            </span>
                          </th>
                          <th
                            className={`th-package sortable-th ${sortField === "package" ? "sorted" : ""}`}
                            onClick={() => handleSort("package")}
                            title="Click to sort by Package"
                          >
                            <span className="th-label-wrap">
                              <span>Package / Case</span>
                              <span className={`sort-caret ${sortField === "package" ? "active" : ""}`}>
                                {sortField === "package"
                                  ? sortDirection === "asc"
                                    ? "▲"
                                    : "▼"
                                  : "↕"}
                              </span>
                            </span>
                          </th>
                          <th className="th-specs">Key Specifications</th>
                          <th className="th-datasheet">Datasheet</th>
                          <th className="th-actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={10} className="table-feedback-cell loading-cell">
                              <div className="table-loader">
                                <div className="loader-spinner" />
                                <span className="loader-text">Loading component catalog records...</span>
                              </div>
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td colSpan={10} className="table-feedback-cell error-cell">
                              <div className="table-error-wrap">
                                <span className="error-icon">⚠</span>
                                <strong>Unable to retrieve component data</strong>
                                <p>{error}</p>
                              </div>
                            </td>
                          </tr>
                        ) : sortedComponents.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="table-feedback-cell empty-cell">
                              <div className="empty-message-wrap">
                                <span className="empty-icon">⌕</span>
                                <strong>No components match the active criteria</strong>
                                <p>Try clearing your keyword search or adjusting the selected category and filters.</p>
                                <button className="filter-button reset-action-btn" type="button" onClick={clearFilters}>
                                   Reset All Filters
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          sortedComponents.map((component) => {
                            const isSelected = selectedForCompare.some(
                              (c) => c._id === component._id
                            );
                            const previewSpecs = getSpecPairs(
                              component.specifications,
                              3
                            );

                            return (
                              <tr
                                key={component._id}
                                className={
                                  isSelected
                                    ? "table-row selected-row"
                                    : "table-row"
                                }
                                onClick={() => setSelectedComponent(component)}
                                title="Click to view complete technical details"
                              >
                                <td
                                  className="td-select"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <label
                                    className="table-checkbox-container"
                                    title={
                                      !isSelected && selectedForCompare.length >= 4
                                        ? "Maximum 4 components selected for comparison"
                                        : isSelected
                                        ? `Remove ${component.partNumber} from comparison`
                                        : `Add ${component.partNumber} to comparison`
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      className="table-checkbox-input"
                                      checked={isSelected}
                                      onChange={() => toggleCompare(component)}
                                      disabled={
                                        !isSelected &&
                                        selectedForCompare.length >= 4
                                      }
                                      aria-label={`Select ${component.partNumber} for comparison`}
                                    />
                                    <span className="table-checkbox-box">
                                      {isSelected && "✓"}
                                    </span>
                                  </label>
                                </td>

                                <td
                                  className="td-image"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedComponent(component);
                                  }}
                                  title={`View ${component.name} details`}
                                >
                                  <ComponentThumbnail
                                    component={component}
                                    size="sm"
                                    showProvenanceBadge
                                  />
                                </td>

                                <td className="td-mpn">
                                  <div className="table-mpn-group">
                                    <span className="table-mpn">
                                      {component.partNumber}
                                    </span>
                                    <button
                                      className={`mpn-copy-btn ${
                                        copiedMpn === component.partNumber
                                          ? "copied"
                                          : ""
                                      }`}
                                      type="button"
                                      onClick={(e) =>
                                        copyMpn(component.partNumber, e)
                                      }
                                      title="Copy MPN to clipboard"
                                    >
                                      {copiedMpn === component.partNumber
                                        ? "COPIED"
                                        : "COPY"}
                                    </button>
                                  </div>
                                </td>

                                <td className="td-name">
                                  <div className="table-name-desc">
                                    <strong className="table-part-name">
                                      {component.name}
                                    </strong>
                                    <span
                                      className="table-part-desc"
                                      title={component.description}
                                    >
                                      {component.description || "—"}
                                    </span>
                                  </div>
                                </td>

                                <td className="td-mfr">
                                  <span className="table-mfr-text">
                                    {component.manufacturer || "—"}
                                  </span>
                                </td>

                                <td className="td-category">
                                  <span className="table-cat-badge">
                                    {component.category}
                                  </span>
                                </td>

                                <td className="td-package">
                                  <div className="table-pkg-info">
                                    <span className="table-pkg-name">
                                      {component.package?.name || "Unspecified"}
                                    </span>
                                    <span className="table-pkg-sub">
                                      {component.package?.mountingType || "Standard"}
                                      {component.pins && component.pins.length > 0
                                        ? ` · ${component.pins.length}P`
                                        : ""}
                                    </span>
                                  </div>
                                </td>

                                <td className="td-specs">
                                  <div className="table-specs-list">
                                    {previewSpecs.length > 0 ? (
                                      previewSpecs.map((spec) => (
                                        <span
                                          className="table-spec-item"
                                          key={spec.key}
                                          title={`${spec.label}: ${spec.value}`}
                                        >
                                          <span className="spec-k">
                                            {spec.label}:
                                          </span>
                                          <span className="spec-v">
                                            {spec.value}
                                          </span>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="table-muted-text">—</span>
                                    )}
                                  </div>
                                </td>

                                <td
                                  className="td-datasheet"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isValidHttpUrl(component.datasheetUrl) ? (
                                    <a
                                      className="table-datasheet-link"
                                      href={component.datasheetUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={`Open official datasheet PDF for ${component.partNumber}`}
                                    >
                                      PDF ↗
                                    </a>
                                  ) : (
                                    <span className="table-muted-text">—</span>
                                  )}
                                </td>

                                <td
                                  className="td-actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className="table-action-btn"
                                    type="button"
                                    onClick={() => setSelectedComponent(component)}
                                    title="View component technical details and pinout"
                                  >
                                    Details <span>→</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </>
            ) : activeView === "pcb" ? (
              <section className="pcb-assistant-view">
                <div className="catalog-control-bar">
                  <div className="catalog-heading-group">
                    <div className="breadcrumb">
                      Workspace <span>/</span>{" "}
                      <strong>PCB Footprint & Physical Dimension Reference</strong>
                    </div>
                    <h1>PCB Footprint & Dimension Inspector</h1>
                    <p className="subtitle">
                      Inspect component physical dimensions, lead pitch, and layout guidelines sourced from manufacturer specifications.
                    </p>
                  </div>

                  <button
                    className="filter-button"
                    type="button"
                    onClick={() => setActiveView("library")}
                  >
                    ← Back to Component Catalog
                  </button>
                </div>

                <div className="pcb-grid">
                  {components.map((component) => {
                    const dims = formatDimensions(component.package);
                    const pitch =
                      component.package?.pcbLayout?.leadPitchMm != null
                        ? `${component.package.pcbLayout.leadPitchMm} mm`
                        : "—";
                    const rowSpacing =
                      component.package?.pcbLayout?.rowSpacingMm != null
                        ? `${component.package.pcbLayout.rowSpacingMm} mm`
                        : null;
                    const drill =
                      component.package?.pcbLayout?.drillDiameterMm != null
                        ? `${component.package.pcbLayout.drillDiameterMm} mm`
                        : null;
                    const spacingOrDrill =
                      rowSpacing != null
                        ? `Row: ${rowSpacing}`
                        : drill != null
                        ? `Drill: ${drill}`
                        : "—";

                    return (
                      <article className="pcb-card cad-grid-overlay" key={component._id}>
                        <div className="pcb-card-header">
                          <div>
                            <span className="part-number">
                              {component.partNumber}
                            </span>
                            <h3>{component.name}</h3>
                          </div>
                          <span className="filter-pill">
                            {component.package?.name || "Unspecified"}
                          </span>
                        </div>

                        <div className="pcb-footprint-canvas">
                          <div className="cad-dimension-badge">PARAMETRIC FOOTPRINT SCHEMATIC</div>
                          {renderFootprintSvg(component)}
                        </div>

                        <div className="card-spec-strip">
                          <div className="spec-cell">
                            <span>Mounting</span>
                            <strong>
                              {component.package?.mountingType || "Unspecified"}
                            </strong>
                          </div>
                          <div className="spec-cell">
                            <span>Body Dimensions</span>
                            <strong>{dims}</strong>
                          </div>
                          <div className="spec-cell">
                            <span>Lead Pitch</span>
                            <strong>{pitch}</strong>
                          </div>
                          <div className="spec-cell">
                            <span>Layout Spacing</span>
                            <strong>{spacingOrDrill}</strong>
                          </div>
                        </div>

                        {component.package?.padLayout ? (
                          <p className="pcb-pad-note">
                            <strong>Layout Reference:</strong>{" "}
                            {component.package.padLayout}
                          </p>
                        ) : (
                          <p className="pcb-pad-note muted">
                            No layout notes in database. Consult manufacturer land pattern.
                          </p>
                        )}

                        <div className="card-footer-actions">
                          {isValidHttpUrl(component.datasheetUrl) && (
                            <a
                              className="datasheet-card-link"
                              href={component.datasheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Datasheet PDF ↗
                            </a>
                          )}
                          {component.pins && component.pins.length > 0 ? (
                            <button
                              className="details-button"
                              type="button"
                              onClick={() => setSelectedComponent(component)}
                            >
                              Pinout ({component.pins.length} Pins) <span>→</span>
                            </button>
                          ) : (
                            <button
                              className="details-button"
                              type="button"
                              onClick={() => setSelectedComponent(component)}
                            >
                              View Details <span>→</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : (
            <section className="compare-view">
              <div className="compare-top-row">
                <div>
                  <div className="eyebrow">COMPONENT MATRIX</div>
                  <h1>Component Comparison</h1>
                  <p className="subtitle">
                    Comparing {selectedForCompare.length} components side-by-side
                    across general attributes, packaging, and technical
                    specifications.
                  </p>
                </div>

                <div className="compare-view-buttons">
                  <button
                    className="filter-button"
                    type="button"
                    onClick={() => setActiveView("library")}
                  >
                    ← Back to Library
                  </button>

                  <button
                    className="filter-button reset-filters-button"
                    type="button"
                    onClick={() => setSelectedForCompare([])}
                  >
                    Clear comparison
                  </button>
                </div>
              </div>

              {selectedForCompare.length < 2 ? (
                <div className="compare-empty-container">
                  <div className="compare-empty-card">
                    <span className="compare-empty-icon">⇄</span>
                    <h2>Select at least 2 components to compare</h2>
                    <p>
                      {selectedForCompare.length === 1
                        ? `You have selected 1 component (${selectedForCompare[0].partNumber}). Select at least 1 more component from the library to compare side by side.`
                        : "You haven't selected any components yet. Choose 2 to 4 components from the component library to compare their technical specifications and physical dimensions."}
                    </p>
                    <button
                      className="filter-button primary-accent"
                      type="button"
                      onClick={() => setActiveView("library")}
                    >
                      ← Go to Component Library
                    </button>
                  </div>
                </div>
              ) : (
                <div className="compare-table-wrapper">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th className="feature-col-header">Component / Spec</th>
                        {selectedForCompare.map((c) => (
                          <th className="component-col-header" key={c._id}>
                            <div className="th-card">
                              <div className="th-header">
                                <span className="th-part">{c.partNumber}</span>
                                <button
                                  className="th-eject-btn"
                                  type="button"
                                  onClick={() => toggleCompare(c)}
                                  title={`Eject ${c.partNumber} from matrix`}
                                  aria-label={`Eject ${c.partNumber}`}
                                >
                                  [× Eject]
                                </button>
                              </div>
                              <div className="compare-thumb-wrap">
                                <ComponentThumbnail
                                  component={c}
                                  size="md"
                                  showProvenanceBadge
                                />
                              </div>
                              <div className="th-name">{c.name}</div>
                              <button
                                className="th-details-link"
                                type="button"
                                onClick={() => setSelectedComponent(c)}
                              >
                                View details ↗
                              </button>
                            </div>
                          </th>
                        ))}
                        {selectedForCompare.length < 4 && (
                          <th className="component-col-header add-slot-col">
                            <button
                              className="th-card add-slot-card"
                              type="button"
                              onClick={() => setActiveView("library")}
                              title="Select another component from catalog to compare"
                            >
                              <span className="add-slot-plus">+</span>
                              <span className="add-slot-text">Add Part Slot</span>
                              <span className="add-slot-count">({selectedForCompare.length}/4)</span>
                            </button>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="section-row">
                        <td colSpan={selectedForCompare.length + (selectedForCompare.length < 4 ? 2 : 1)}>
                          General Identification
                        </td>
                      </tr>

                      <tr className="row-divergent">
                        <td className="row-label">
                          <span>Part Number</span>
                          <span className="diff-badge">DIFF</span>
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id} className="mono-val">
                            {c.partNumber || "—"}
                          </td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => c.name)) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Name</span>
                          {isRowDivergent(selectedForCompare.map((c) => c.name)) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>{c.name || "—"}</td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => c.category)) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Category</span>
                          {isRowDivergent(selectedForCompare.map((c) => c.category)) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>{c.category || "—"}</td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => c.manufacturer)) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Manufacturer</span>
                          {isRowDivergent(selectedForCompare.map((c) => c.manufacturer)) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.manufacturer || "—"}
                          </td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr>
                        <td className="row-label">
                          <span>Datasheet</span>
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {isValidHttpUrl(c.datasheetUrl) ? (
                              <a
                                className="table-link"
                                href={c.datasheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open PDF ↗
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className="section-row">
                        <td colSpan={selectedForCompare.length + (selectedForCompare.length < 4 ? 2 : 1)}>
                          Package & Physical Footprint
                        </td>
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => c.package?.name)) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Package Name</span>
                          {isRowDivergent(selectedForCompare.map((c) => c.package?.name)) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.package?.name || "—"}
                          </td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => c.package?.mountingType)) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Mounting Type</span>
                          {isRowDivergent(selectedForCompare.map((c) => c.package?.mountingType)) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.package?.mountingType || "—"}
                          </td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => formatDimensions(c.package))) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Body Dimensions</span>
                          {isRowDivergent(selectedForCompare.map((c) => formatDimensions(c.package))) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>{formatDimensions(c.package)}</td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => c.package?.pcbLayout?.leadPitchMm != null ? `${c.package.pcbLayout.leadPitchMm} mm` : "—")) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Lead Pitch</span>
                          {isRowDivergent(selectedForCompare.map((c) => c.package?.pcbLayout?.leadPitchMm != null ? `${c.package.pcbLayout.leadPitchMm} mm` : "—")) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.package?.pcbLayout?.leadPitchMm != null
                              ? `${c.package.pcbLayout.leadPitchMm} mm`
                              : "—"}
                          </td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => c.pins && c.pins.length > 0 ? `${c.pins.length} pins` : "—")) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Pin Count</span>
                          {isRowDivergent(selectedForCompare.map((c) => c.pins && c.pins.length > 0 ? `${c.pins.length} pins` : "—")) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.pins && c.pins.length > 0
                              ? `${c.pins.length} pins`
                              : "—"}
                          </td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className={isRowDivergent(selectedForCompare.map((c) => c.package?.padLayout)) ? "row-divergent" : ""}>
                        <td className="row-label">
                          <span>Pad Layout Reference</span>
                          {isRowDivergent(selectedForCompare.map((c) => c.package?.padLayout)) && (
                            <span className="diff-badge">DIFF</span>
                          )}
                        </td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.package?.padLayout || "—"}
                          </td>
                        ))}
                        {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                      </tr>

                      <tr className="section-row">
                        <td colSpan={selectedForCompare.length + (selectedForCompare.length < 4 ? 2 : 1)}>
                          Technical Specifications
                        </td>
                      </tr>

                      {specKeysToDisplay.length === 0 ? (
                        <tr>
                          <td className="row-label">Specifications</td>
                          <td
                            colSpan={selectedForCompare.length + (selectedForCompare.length < 4 ? 1 : 0)}
                            className="muted-cell"
                          >
                            No technical specifications recorded for these
                            components.
                          </td>
                        </tr>
                      ) : (
                        specKeysToDisplay.map((specKey) => {
                          const valList = selectedForCompare.map((c) => {
                            const val = c.specifications?.[specKey];
                            const unit = findUnitForSpecKey(specKey, c.specifications);
                            return formatSpecValue(val, unit);
                          });
                          const rowDivergent = isRowDivergent(valList);

                          return (
                            <tr key={specKey} className={rowDivergent ? "row-divergent" : ""}>
                              <td className="row-label">
                                <span>{formatSpecKeyLabel(specKey)}</span>
                                {rowDivergent && <span className="diff-badge">DIFF</span>}
                              </td>
                              {selectedForCompare.map((c) => {
                                const val = c.specifications?.[specKey];
                                const unit = findUnitForSpecKey(
                                  specKey,
                                  c.specifications
                                );
                                const display = formatSpecValue(val, unit);
                                return (
                                  <td
                                    key={c._id}
                                    className={
                                      display === "—"
                                        ? "muted-cell"
                                        : ""
                                    }
                                  >
                                    {display}
                                  </td>
                                );
                              })}
                              {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <footer className="page-footer">
            <span>
              CIR<span className="footer-accent">Q</span>ON
            </span>
            <span>Built for electronics discovery and PCB design</span>
          </footer>
          </section>
        </main>
      </div>

      {selectedForCompare.length > 0 && activeView === "library" && (
        <aside className="compare-bar" aria-label="Component comparison dock">
          <div className="compare-bar-info">
            <div className="compare-bar-title">
              <span className="compare-bar-icon">⇄</span>
              <div>
                <strong>Component Comparison</strong>
                <small>
                  {selectedForCompare.length} of 4 selected
                  {selectedForCompare.length < 2 && " (select at least 2)"}
                </small>
              </div>
            </div>

            <div className="compare-bar-chips">
              {selectedForCompare.map((item) => (
                <span className="compare-chip" key={item._id}>
                  {item.partNumber}
                  <button
                    type="button"
                    onClick={() => toggleCompare(item)}
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
              onClick={() => setSelectedForCompare([])}
            >
              Clear all
            </button>

            <button
              className="compare-bar-submit"
              type="button"
              disabled={selectedForCompare.length < 2}
              onClick={() => setActiveView("compare")}
            >
              {selectedForCompare.length < 2
                ? `Select 1 more (${selectedForCompare.length}/4)`
                : `Compare (${selectedForCompare.length}) ↗`}
            </button>
          </div>
        </aside>
      )}

      {selectedComponent && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedComponent(null);
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
                  {selectedComponent.name}
                </h2>
                <p className="modal-part-number">
                  {selectedComponent.partNumber}
                </p>
              </div>

              <button
                className="modal-close"
                type="button"
                aria-label="Close component details"
                onClick={() => setSelectedComponent(null)}
              >
                 × 
              </button>
            </header>

            <div className="modal-content">
              {(() => {
                const imgInfo = getComponentImageInfo(selectedComponent);
                return (
                  <div className="modal-product-identity">
                    <ComponentThumbnail
                      component={selectedComponent}
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
                          {selectedComponent.category}
                        </span>
                        {selectedComponent.package?.mountingType && (
                          <span className="modal-category">
                            {selectedComponent.package.mountingType}
                          </span>
                        )}
                        {selectedComponent.package?.name && (
                          <span className="modal-category">
                            {selectedComponent.package.name}
                          </span>
                        )}
                      </div>
                      <p className="modal-quick-desc">
                        {selectedComponent.description ||
                          "No functional description recorded for this part."}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <section className="modal-section">
                <h3>General Information</h3>
                <p>
                  {selectedComponent.description ||
                    "No functional description recorded for this part."}
                </p>

                <div className="modal-info-grid">
                  <div>
                    <span>Manufacturer</span>
                    <strong>{selectedComponent.manufacturer || "—"}</strong>
                  </div>
                  <div>
                    <span>Part Number</span>
                    <strong>{selectedComponent.partNumber}</strong>
                  </div>
                  <div>
                    <span>Category</span>
                    <strong>{selectedComponent.category || "—"}</strong>
                  </div>
                  <div>
                    <span>Package Name</span>
                    <strong>
                      {selectedComponent.package?.name || "Unspecified"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h3>Electrical & Parametric Specifications</h3>

                {getSpecPairs(selectedComponent.specifications).length > 0 ? (
                  <div className="specification-list">
                    {getSpecPairs(selectedComponent.specifications).map(
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
                    {renderFootprintSvg(selectedComponent)}
                  </div>

                  <div className="specification-list">
                    <div className="specification-row">
                      <span>Package Designation</span>
                      <strong>
                        {selectedComponent.package?.name || "Unspecified"}
                      </strong>
                    </div>

                    <div className="specification-row">
                      <span>Mounting Technology</span>
                      <strong>
                        {selectedComponent.package?.mountingType || "Unspecified"}
                      </strong>
                    </div>

                    <div className="specification-row">
                      <span>Body Dimensions (L × W × H)</span>
                      <strong>
                        {formatDimensions(selectedComponent.package)}
                      </strong>
                    </div>

                    {selectedComponent.package?.bodyDimensions?.seatedHeightMm != null && (
                      <div className="specification-row">
                        <span>Seated Height</span>
                        <strong>
                          {selectedComponent.package.bodyDimensions.seatedHeightMm} mm
                        </strong>
                      </div>
                    )}

                    {selectedComponent.package?.pcbLayout?.leadPitchMm != null && (
                      <div className="specification-row">
                        <span>Lead Pitch</span>
                        <strong>
                          {selectedComponent.package.pcbLayout.leadPitchMm} mm
                        </strong>
                      </div>
                    )}

                    {selectedComponent.package?.pcbLayout?.rowSpacingMm != null && (
                      <div className="specification-row">
                        <span>Row Spacing</span>
                        <strong>
                          {selectedComponent.package.pcbLayout.rowSpacingMm} mm
                        </strong>
                      </div>
                    )}

                    {selectedComponent.package?.pcbLayout?.drillDiameterMm != null && (
                      <div className="specification-row">
                        <span>Recommended Drill Diameter</span>
                        <strong>
                          {selectedComponent.package.pcbLayout.drillDiameterMm} mm
                        </strong>
                      </div>
                    )}

                    {selectedComponent.package?.padLayout && (
                      <div className="specification-row">
                        <span>Pad Layout Reference</span>
                        <strong>
                          {selectedComponent.package.padLayout}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h3>
                  Pin Configuration
                  {selectedComponent.pins && selectedComponent.pins.length > 0 && (
                    <span className="pin-count-badge">
                      ({selectedComponent.pins.length} Pins)
                    </span>
                  )}
                </h3>

                {selectedComponent.pins &&
                selectedComponent.pins.length > 0 ? (
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
                        {selectedComponent.pins.map((pin, index) => (
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
                  {isValidHttpUrl(selectedComponent.datasheetUrl) && (
                    <a
                      href={selectedComponent.datasheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Official Datasheet PDF ↗
                    </a>
                  )}

                  {isValidHttpUrl(selectedComponent.manufacturerUrl) && (
                    <a
                      href={selectedComponent.manufacturerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Manufacturer Product Page ↗
                    </a>
                  )}

                  {isValidHttpUrl(selectedComponent.package?.landPatternUrl) && (
                    <a
                      href={selectedComponent.package?.landPatternUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      CAD Land Pattern ↗
                    </a>
                  )}

                  {!isValidHttpUrl(selectedComponent.datasheetUrl) &&
                    !isValidHttpUrl(selectedComponent.manufacturerUrl) &&
                    !isValidHttpUrl(selectedComponent.package?.landPatternUrl) && (
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
                onClick={() => setSelectedComponent(null)}
              >
                Close details
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
