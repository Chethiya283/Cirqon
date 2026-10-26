import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { Bookmark } from "lucide-react";
import "./App.css";
import "./ComponentImage.css";
import { ComponentThumbnail } from "./ComponentImage";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ComponentDetailsModal } from "./components/ComponentDetailsModal";
import { CompareTray } from "./components/CompareTray";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { MyPartsPage } from "./pages/MyPartsPage";
import { useAuth } from "./auth/AuthContext";
import { useSavedParts } from "./auth/SavedPartsContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import type { ComponentData, SortField } from "./types";
import {
  isValidHttpUrl,
  formatDimensions,
  findUnitForSpecKey,
  formatSpecValue,
  formatSpecKeyLabel,
  getSpecPairs,
  isRowDivergent,
} from "./utils/formatters";
import { renderFootprintSvg } from "./utils/footprint";

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

  // ========================================================
  // ROUTING (Single Source of Truth)
  // ========================================================
  // VIVA EXPLANATION:
  // The browser URL pathname is the single source of truth for the active view.
  // We do not store an `activeView` state variable that could become desynchronized
  // on browser Back/Forward navigation or direct page refreshes.
  // Instead, `activeView` is derived directly from React Router's `location.pathname`.
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedParts();

  const isHomeView = location.pathname === "/";
  const isAuthView = location.pathname === "/login" || location.pathname === "/register";
  const isMyPartsView = location.pathname === "/my-parts";
  const isLibraryView = location.pathname === "/library";
  const showSidebar = !isHomeView && !isAuthView && !isMyPartsView;

  /**
   * Handle bookmark save click.
   * If logged out, directs engineer to /login.
   * If logged in, toggles bookmark status.
   */
  const handleToggleSave = (e: React.MouseEvent, component: ComponentData) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    toggleSave(component);
  };

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
  


  function clearFilters() {
    setSearch("");
    setSelectedCategory("All Components");
    setSelectedManufacturer("");
    setSelectedPackage("");
  }

  return (
    <div className="app-shell">
      {/* Shared Site Shell Header (Navbar with Search & NavLinks) */}
      <Navbar
        searchQuery={search}
        onSearchChange={(query) => {
          setSearch(query);
          if (!isLibraryView) {
            navigate("/library");
          }
        }}
        compareCount={selectedForCompare.length}
      />

      <div className={`workspace-body ${!showSidebar ? "home-layout" : ""}`}>
        {showSidebar && (
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
                      if (!isLibraryView) {
                        navigate("/library");
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
        )}

        <main className="main-content">
          <section className="page-content">
            {/* VIVA EXPLANATION: React Router Routes map each URL pathname to a view */}
            <Routes>
              {/* Route 1: Public Home Page */}
              <Route
                path="/"
                element={
                  <HomePage
                    categoryCounts={categoryCounts}
                    categories={categories}
                    onSearch={(query) => {
                      setSearch(query);
                      navigate("/library");
                    }}
                    onSelectCategory={(categoryName) => {
                      setSelectedCategory(categoryName);
                      navigate("/library");
                    }}
                  />
                }
              />

              {/* Route 2: Authentication Views (UI Only) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Route 2: Component Library Catalog Workspace */}
              <Route
                path="/library"
                element={
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

                                <div className="card-top-actions">
                                  <button
                                    type="button"
                                    className={`card-bookmark-btn ${
                                      isSaved(component._id) ? "saved" : ""
                                    }`}
                                    onClick={(e) =>
                                      handleToggleSave(e, component)
                                    }
                                    aria-label={
                                      isSaved(component._id)
                                        ? `Remove ${component.partNumber} from saved parts`
                                        : `Save ${component.partNumber} to workspace`
                                    }
                                    title={
                                      isSaved(component._id)
                                        ? "Saved in workspace (click to remove)"
                                        : "Save component to workspace"
                                    }
                                  >
                                    <Bookmark
                                      size={15}
                                      fill={
                                        isSaved(component._id)
                                          ? "currentColor"
                                          : "none"
                                      }
                                      aria-hidden="true"
                                    />
                                  </button>

                                  <span className="card-cat-badge">
                                    {component.category}
                                  </span>
                                </div>
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
                                  <div className="table-actions-group">
                                    <button
                                      type="button"
                                      className={`table-bookmark-btn ${
                                        isSaved(component._id) ? "saved" : ""
                                      }`}
                                      onClick={(e) =>
                                        handleToggleSave(e, component)
                                      }
                                      aria-label={
                                        isSaved(component._id)
                                          ? `Remove ${component.partNumber} from saved parts`
                                          : `Save ${component.partNumber} to workspace`
                                      }
                                      title={
                                        isSaved(component._id)
                                          ? "Saved in workspace (click to remove)"
                                          : "Save component to workspace"
                                      }
                                    >
                                      <Bookmark
                                        size={14}
                                        fill={
                                          isSaved(component._id)
                                            ? "currentColor"
                                            : "none"
                                        }
                                        aria-hidden="true"
                                      />
                                    </button>

                                    <button
                                      className="table-action-btn"
                                      type="button"
                                      onClick={() =>
                                        setSelectedComponent(component)
                                      }
                                      title="View component technical details and pinout"
                                    >
                                      Details <span>→</span>
                                    </button>
                                  </div>
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
                }
              />

              {/* Route 3: PCB Footprint & Design Assistant Workspace */}
              <Route
                path="/pcb"
                element={
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
                        onClick={() => navigate("/library")}
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
                }
              />

              {/* Route 4: Side-by-Side Component Compare Workspace */}
              <Route
                path="/compare"
                element={
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
                          onClick={() => navigate("/library")}
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
                            onClick={() => navigate("/library")}
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
                                    onClick={() => navigate("/library")}
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
                }
              />

              {/* Route 5: Authenticated Engineer Saved Parts Workspace */}
              <Route
                path="/my-parts"
                element={
                  <ProtectedRoute>
                    <MyPartsPage
                      onSelectComponent={setSelectedComponent}
                    />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all: Redirect unknown URLs to / */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </section>
        </main>
      </div>

      {/* Shared Site Shell Footer */}
      <Footer />

      {isLibraryView && (
        <CompareTray
          selectedComponents={selectedForCompare}
          onRemove={toggleCompare}
          onClear={() => setSelectedForCompare([])}
          onCompare={() => navigate("/compare")}
        />
      )}

      <ComponentDetailsModal
        component={selectedComponent}
        onClose={() => setSelectedComponent(null)}
      />
    </div>
  );
}

export default App;
