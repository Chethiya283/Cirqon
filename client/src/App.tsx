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

const API_URL = "http://localhost:5000/api/components";

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

function App() {
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [filterOptions, setFilterOptions] = useState<ComponentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
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

        if (search.trim()) {
          params.set("search", search.trim());
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
    search,
    selectedCategory,
    selectedManufacturer,
    selectedPackage,
  ]);

  // Generate unique manufacturer and package options from the database.
  const manufacturers = useMemo(
    () =>
      [...new Set(
        filterOptions
          .map((component) => component.manufacturer)
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b)),
    [filterOptions]
  );

  const packages = useMemo(
    () =>
      [...new Set(
        filterOptions
          .map((component) => component.package?.name)
          .filter((name): name is string => Boolean(name))
      )].sort((a, b) => a.localeCompare(b)),
    [filterOptions]
  );

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
        <a className="brand" href="/">
          <span className="brand-mark">C</span>
          <span>
            <strong>Cirqon</strong>
            <small>COMPONENT EXPLORER</small>
          </span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <button className="nav-item active" type="button">
          <span>▦</span> Component Library
        </button>

        <button className="nav-item" type="button">
          <span>⇄</span> Component Compare
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
              onClick={() => setSelectedCategory(category.name)}
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
            <strong>Component Library</strong>
          </div>

          <div className="topbar-right">
            <span className="system-status">
              <span className="status-dot" /> Development
            </span>
            <div className="avatar">C</div>
          </div>
        </header>

        <section className="page-content">
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
              components.map((component) => (
                <article className="component-card" key={component._id}>
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

                    <span className="incomplete-tag">
                      <span />
                      {component.dataStatus === "verified"
                        ? "Verified"
                        : "Needs verification"}
                    </span>
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
              ))
            )}
          </div>

          <footer className="page-footer">
            <span>
              CIR<span className="footer-accent">Q</span>ON
            </span>
            <span>Built for electronics discovery and PCB design</span>
          </footer>
        </section>
      </main>

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