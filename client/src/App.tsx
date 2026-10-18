import { useEffect, useMemo, useState } from "react";
import "./App.css";

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
  { name: "Capacitors", icon: "Ⅱ" },
  { name: "Inductors", icon: "∿" },
  { name: "Diodes and LEDs", icon: "▷" },
  { name: "BJTs and MOSFETs", icon: "⋈" },
  { name: "Integrated circuits (ICs)", icon: "▣" },
  { name: "Voltage regulators", icon: "ϟ" },
  { name: "Connectors", icon: "⊞" },
  { name: "Switches and protection components", icon: "⏻" },
];

function formatDimensions(pkg?: ComponentData["package"]): string {
  if (!pkg?.footprintDimensions) return "Not available";
  const { lengthMm, widthMm, heightMm } = pkg.footprintDimensions;
  const parts: string[] = [];
  if (lengthMm != null) parts.push(`L ${lengthMm} mm`);
  if (widthMm != null) parts.push(`W ${widthMm} mm`);
  if (heightMm != null) parts.push(`H ${heightMm} mm`);
  return parts.length > 0 ? parts.join(" × ") : "Not available";
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
    return "Not available";
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
    return "Not available";
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

function App() {
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [filterOptions, setFilterOptions] = useState<ComponentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeView, setActiveView] = useState<"library" | "compare">("library");
  const [selectedForCompare, setSelectedForCompare] = useState<ComponentData[]>([]);

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
            component.name.toLowerCase().includes(search.trim().toLowerCase()) ||
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
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            setActiveView("library");
          }}
        >
          <span className="brand-mark">C</span>
          <span>
            <strong>Cirqon</strong>
            <small>COMPONENT EXPLORER</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          className={activeView === "library" ? "nav-item active" : "nav-item"}
          type="button"
          onClick={() => setActiveView("library")}
        >
          <span>▦</span> Component Library
        </button>

        <button
          className={activeView === "compare" ? "nav-item active" : "nav-item"}
          type="button"
          onClick={() => setActiveView("compare")}
        >
          <span>⇄</span> Component Compare
          {selectedForCompare.length > 0 && (
            <span className="nav-badge">{selectedForCompare.length}</span>
          )}
        </button>

        <button className="nav-item" type="button">
          <span>⌘</span> PCB Design Assistant
        </button>

        <div className="sidebar-label category-heading">
          CATEGORIES
        </div>

        <nav className="category-list">
          {categories.map((category, index) => (
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
                setActiveView("library");
              }}
            >
              <span className="category-icon">{category.icon}</span>
              <span>{category.name}</span>

              {index === 0 && (
                <span className="category-count">
                  {components.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          API workspace
          <span className="version">v0.1</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {activeView === "compare"
                ? "Component Compare"
                : "Component Library"}
            </strong>
          </div>

          <div className="topbar-right">
            <span className="system-status">
              <span className="status-dot" /> Development
            </span>
            <div className="avatar">C</div>
          </div>
        </header>

        <section className="page-content">
          {activeView === "library" ? (
            <>
              <div className="welcome-row">
                <div>
                  <div className="eyebrow">ELECTRONICS WORKSPACE</div>
                  <h1>Component Library</h1>
                  <p className="subtitle">
                    Find, explore, and compare electronic components for your next
                    design.
                  </p>
                </div>

                <div className="library-badge">
                  <span className="badge-icon">▣</span>
                  <span>
                    <strong>Component database</strong>
                    <small>MongoDB powered</small>
                  </span>
                </div>
              </div>

              <section className="search-panel">
                <label htmlFor="component-search">
                  Search components
                </label>

                <div className="search-row">
                  <div className="search-input-wrap">
                    <span className="search-icon">⌕</span>
                    <input
                      id="component-search"
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name or part number (e.g. LM358)"
                    />
                  </div>

                  <button
                    className="filter-button"
                    type="button"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </button>
                </div>

                <div className="search-hint">
                  <span>↳</span> Search by part number or component name
                </div>

                <div className="filter-controls">
                  <div className="filter-field">
                    <label htmlFor="manufacturer-filter">
                      Manufacturer
                    </label>
                    <select
                      id="manufacturer-filter"
                      value={selectedManufacturer}
                      onChange={(event) =>
                        setSelectedManufacturer(event.target.value)
                      }
                    >
                      <option value="">All manufacturers</option>
                      {manufacturers.map((manufacturer) => (
                        <option key={manufacturer} value={manufacturer}>
                          {manufacturer}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-field">
                    <label htmlFor="package-filter">
                      Package type
                    </label>
                    <select
                      id="package-filter"
                      value={selectedPackage}
                      onChange={(event) =>
                        setSelectedPackage(event.target.value)
                      }
                    >
                      <option value="">All packages</option>
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
              </section>

              <div className="section-heading">
                <div>
                  <h2>Explore components</h2>
                  <p>
                    {selectedCategory === "All Components"
                      ? "Components from your Cirqon database"
                      : `Browsing ${selectedCategory}`}
                  </p>
                </div>

                <span className="result-count">
                  {loading
                    ? "Loading..."
                    : `${components.length} ${
                        components.length === 1 ? "component" : "components"
                      }`}
                </span>
              </div>

              <div className="component-grid">
                {loading ? (
                  <p className="empty-message">Loading components...</p>
                ) : error ? (
                  <p className="error-message">{error}</p>
                ) : components.length === 0 ? (
                  <p className="empty-message">
                    No components found. Try changing your search or filters.
                  </p>
                ) : (
                  components.map((component) => {
                    const isSelected = selectedForCompare.some(
                      (c) => c._id === component._id
                    );

                    return (
                      <article
                        className={
                          isSelected
                            ? "component-card selected-for-compare"
                            : "component-card"
                        }
                        key={component._id}
                      >
                        <div className="card-top">
                          <div className="component-illustration">
                            <span className="chip-pins">┊</span>
                            <span className="chip-body">
                              <span className="chip-dot" />
                              <span className="chip-name">
                                {component.partNumber}
                              </span>
                            </span>
                            <span className="chip-pins">┊</span>
                          </div>

                          <div className="card-top-side">
                            <span className="incomplete-tag">
                              <span />
                              {component.dataStatus === "verified"
                                ? "Verified"
                                : "Needs verification"}
                            </span>

                            <button
                              className={
                                isSelected
                                  ? "compare-card-btn active"
                                  : "compare-card-btn"
                              }
                              type="button"
                              onClick={() => toggleCompare(component)}
                              disabled={
                                !isSelected && selectedForCompare.length >= 4
                              }
                              title={
                                !isSelected && selectedForCompare.length >= 4
                                  ? "Maximum 4 components selected for comparison"
                                  : isSelected
                                  ? "Remove from comparison"
                                  : "Add to comparison (2–4 components)"
                              }
                            >
                              <span className="compare-card-icon">
                                {isSelected ? "✓" : "⇄"}
                              </span>
                              <span>{isSelected ? "Comparing" : "Compare"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="component-category">
                          {component.category}
                        </div>

                        <h3>{component.name}</h3>

                        <p className="part-number">{component.partNumber}</p>

                        <p className="component-description">
                          {component.description || "No description available."}
                        </p>

                        <div className="component-meta">
                          <div>
                            <span>MANUFACTURER</span>
                            <strong>{component.manufacturer}</strong>
                          </div>

                          <div>
                            <span>PACKAGE</span>
                            <strong>
                              {component.package?.name || "Not specified"}
                            </strong>
                          </div>
                        </div>

                        <button
                          className="details-button"
                          type="button"
                          onClick={() => setSelectedComponent(component)}
                        >
                          View component details <span>↗</span>
                        </button>
                      </article>
                    );
                  })
                )}
              </div>
            </>
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
                                  className="th-remove-btn"
                                  type="button"
                                  onClick={() => toggleCompare(c)}
                                  title={`Remove ${c.partNumber}`}
                                  aria-label={`Remove ${c.partNumber}`}
                                >
                                  ×
                                </button>
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
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="section-row">
                        <td colSpan={selectedForCompare.length + 1}>
                          General Identification
                        </td>
                      </tr>

                      <tr>
                        <td className="row-label">Part Number</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id} className="mono-val">
                            {c.partNumber || "Not available"}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="row-label">Name</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>{c.name || "Not available"}</td>
                        ))}
                      </tr>

                      <tr>
                        <td className="row-label">Category</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>{c.category || "Not available"}</td>
                        ))}
                      </tr>

                      <tr>
                        <td className="row-label">Manufacturer</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.manufacturer || "Not available"}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="row-label">Data Status</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            <span
                              className={
                                c.dataStatus === "verified"
                                  ? "verification-tag verified"
                                  : "verification-tag"
                              }
                            >
                              {c.dataStatus === "verified"
                                ? "Verified data"
                                : "Needs verification"}
                            </span>
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="row-label">Datasheet</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.datasheetUrl ? (
                              <a
                                className="table-link"
                                href={c.datasheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Open PDF ↗
                              </a>
                            ) : (
                              "Not available"
                            )}
                          </td>
                        ))}
                      </tr>

                      <tr className="section-row">
                        <td colSpan={selectedForCompare.length + 1}>
                          Package & Physical Footprint
                        </td>
                      </tr>

                      <tr>
                        <td className="row-label">Package Name</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.package?.name || "Not available"}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="row-label">Footprint Dimensions</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>{formatDimensions(c.package)}</td>
                        ))}
                      </tr>

                      <tr>
                        <td className="row-label">Pad Layout</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.package?.padLayout || "Not available"}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td className="row-label">Pin Count</td>
                        {selectedForCompare.map((c) => (
                          <td key={c._id}>
                            {c.pins && c.pins.length > 0
                              ? `${c.pins.length} pins`
                              : "Not available"}
                          </td>
                        ))}
                      </tr>

                      <tr className="section-row">
                        <td colSpan={selectedForCompare.length + 1}>
                          Technical Specifications
                        </td>
                      </tr>

                      {specKeysToDisplay.length === 0 ? (
                        <tr>
                          <td className="row-label">Specifications</td>
                          <td
                            colSpan={selectedForCompare.length}
                            className="muted-cell"
                          >
                            No technical specifications recorded for these
                            components.
                          </td>
                        </tr>
                      ) : (
                        specKeysToDisplay.map((specKey) => (
                          <tr key={specKey}>
                            <td className="row-label">
                              {formatSpecKeyLabel(specKey)}
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
                                    display === "Not available"
                                      ? "muted-cell"
                                      : ""
                                  }
                                >
                                  {display}
                                </td>
                              );
                            })}
                          </tr>
                        ))
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
                <div className="eyebrow">COMPONENT DETAILS</div>
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
              <div className="modal-summary">
                <span className="modal-category">
                  {selectedComponent.category}
                </span>
                <span
                  className={
                    selectedComponent.dataStatus === "verified"
                      ? "verification-status verified"
                      : "verification-status"
                  }
                >
                  {selectedComponent.dataStatus === "verified"
                    ? "Verified data"
                    : "Data needs verification"}
                </span>
              </div>

              <section className="modal-section">
                <h3>Overview</h3>
                <p>
                  {selectedComponent.description ||
                    "No description is available for this component."}
                </p>

                <div className="modal-info-grid">
                  <div>
                    <span>Manufacturer</span>
                    <strong>{selectedComponent.manufacturer}</strong>
                  </div>
                  <div>
                    <span>Part number</span>
                    <strong>{selectedComponent.partNumber}</strong>
                  </div>
                  <div>
                    <span>Package</span>
                    <strong>
                      {selectedComponent.package?.name || "Not specified"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h3>Technical specifications</h3>

                {selectedComponent.specifications &&
                Object.keys(selectedComponent.specifications).length > 0 ? (
                  <div className="specification-list">
                    {Object.entries(selectedComponent.specifications).map(
                      ([key, value]) => (
                        <div className="specification-row" key={key}>
                          <span>{key}</span>
                          <strong>
                            {typeof value === "object" && value !== null
                              ? JSON.stringify(value)
                              : String(value)}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="modal-muted">
                    No technical specifications have been added yet.
                  </p>
                )}
              </section>

              <section className="modal-section">
                <h3>Package information</h3>

                <div className="specification-list">
                  <div className="specification-row">
                    <span>Package name</span>
                    <strong>
                      {selectedComponent.package?.name || "Not specified"}
                    </strong>
                  </div>

                  <div className="specification-row">
                    <span>Footprint dimensions</span>
                    <strong>
                      {selectedComponent.package?.footprintDimensions
                        ? [
                            selectedComponent.package.footprintDimensions
                              .lengthMm != null
                              ? `L ${selectedComponent.package.footprintDimensions.lengthMm} mm`
                              : null,
                            selectedComponent.package.footprintDimensions
                              .widthMm != null
                              ? `W ${selectedComponent.package.footprintDimensions.widthMm} mm`
                              : null,
                            selectedComponent.package.footprintDimensions
                              .heightMm != null
                              ? `H ${selectedComponent.package.footprintDimensions.heightMm} mm`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" × ") || "Not specified"
                        : "Not specified"}
                    </strong>
                  </div>

                  <div className="specification-row">
                    <span>Pad layout</span>
                    <strong>
                      {selectedComponent.package?.padLayout ||
                        "Not specified"}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h3>Pin information</h3>

                {selectedComponent.pins &&
                selectedComponent.pins.length > 0 ? (
                  <div className="pin-table-wrap">
                    <table className="pin-table">
                      <thead>
                        <tr>
                          <th>Pin</th>
                          <th>Name</th>
                          <th>Function</th>
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
                    Pin information has not been added yet.
                  </p>
                )}
              </section>

              <section className="modal-section">
                <h3>Manufacturer resources</h3>

                <div className="modal-links">
                  {selectedComponent.datasheetUrl && (
                    <a
                      href={selectedComponent.datasheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open datasheet ↗
                    </a>
                  )}

                  {selectedComponent.manufacturerUrl && (
                    <a
                      href={selectedComponent.manufacturerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Manufacturer product page ↗
                    </a>
                  )}

                  {selectedComponent.package?.landPatternUrl && (
                    <a
                      href={selectedComponent.package.landPatternUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open land pattern ↗
                    </a>
                  )}

                  {!selectedComponent.datasheetUrl &&
                    !selectedComponent.manufacturerUrl &&
                    !selectedComponent.package?.landPatternUrl && (
                      <p className="modal-muted">
                        No manufacturer links are available yet.
                      </p>
                    )}
                </div>
              </section>

              {selectedComponent.dataStatus !== "verified" && (
                <p className="modal-warning">
                  Please verify technical values against the official
                  manufacturer datasheet before using this component in a
                  design.
                </p>
              )}
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