import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Routes, Route } from "react-router-dom";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Bookmark,
  Layers,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import "./App.css";
import "./ComponentImage.css";
import { ComponentThumbnail } from "./ComponentImage";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ComponentDetailsModal } from "./components/ComponentDetailsModal";
import { CompareTray } from "./components/CompareTray";
import {
  CategoryCardsSection,
  CategoryIcon,
} from "./components/CategoryCardsSection";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { MyPartsPage } from "./pages/MyPartsPage";
import { AdminComponentsPage } from "./pages/AdminComponentsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useAuth } from "./auth/AuthContext";
import { useSavedParts } from "./auth/SavedPartsContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import type { ComponentData, SortField } from "./types";
import {
  isValidHttpUrl,
  resolveAssetUrl,
  formatDimensions,
  findUnitForSpecKey,
  formatSpecValue,
  formatSpecKeyLabel,
  getSpecPairs,
  isRowDivergent,
} from "./utils/formatters";
import {
  auditComponentFootprint,
  getProvenanceBadgeClass,
  renderValueWithMonoNumbers,
} from "./utils/footprint";
import {
  InteractiveFootprintViewer,
  PcbComponentPhotoPanel,
} from "./components/InteractiveFootprintViewer";
import { FootprintValidationPanel } from "./components/FootprintValidationPanel";

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
  const isPcbView = location.pathname === "/pcb";
  const isCompareView = location.pathname === "/compare";
  // VIVA EXPLANATION: The Library page is full width with its own two-column sticky sidebar.
  // Shared workspace sidebar is shown for /compare and /pcb, while /, /library, /my-parts, and auth routes are full-width.
  const showSidebar = !isHomeView && !isAuthView && !isMyPartsView && !isLibraryView;

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
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
  const [refreshIndex, setRefreshIndex] = useState(0);

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
  // Per-page category and parametric filter states so selecting a category on one page
  // does not unexpectedly alter another page's active category or filters.
  const [selectedCategory, setSelectedCategory] =
    useState("All Components");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");

  const [pcbCategory, setPcbCategory] = useState("All Components");
  const [pcbManufacturer, setPcbManufacturer] = useState("");
  const [pcbPackage, setPcbPackage] = useState("");

  const [compareCategory, setCompareCategory] = useState("All Components");
  const [compareManufacturer, setCompareManufacturer] = useState("");
  const [comparePackage, setComparePackage] = useState("");

  const activeCategory = isPcbView
    ? pcbCategory
    : isCompareView
    ? compareCategory
    : selectedCategory;
  const activeManufacturer = isPcbView
    ? pcbManufacturer
    : isCompareView
    ? compareManufacturer
    : selectedManufacturer;
  const activePackage = isPcbView
    ? pcbPackage
    : isCompareView
    ? comparePackage
    : selectedPackage;

  // Indicates whether any keyword search, category, or parametric filter is currently active on the Library page
  const hasActiveFilters = Boolean(
    selectedCategory !== "All Components" ||
    selectedManufacturer ||
    selectedPackage ||
    search.trim()
  );

  const [selectedComponent, setSelectedComponent] =
    useState<ComponentData | null>(null);

  // VIVA EXPLANATION: PCB Assistant query parameter synchronization.
  // Supports deep linking, browser bookmarks, refreshes, and direct navigation
  // via ?partNumber=LM358 or ?id=... without desynchronizing state.
  const pcbQueryParam = useMemo(() => {
    if (!isPcbView) return "";
    const params = new URLSearchParams(location.search);
    return (
      params.get("partNumber") ||
      params.get("component") ||
      params.get("id") ||
      ""
    ).trim();
  }, [isPcbView, location.search]);

  const selectedPcbComponent = useMemo(() => {
    if (!pcbQueryParam) return null;
    const q = pcbQueryParam.toLowerCase();
    return (
      components.find(
        (c) => c.partNumber?.toLowerCase() === q || c._id === pcbQueryParam
      ) ||
      filterOptions.find(
        (c) => c.partNumber?.toLowerCase() === q || c._id === pcbQueryParam
      ) ||
      null
    );
  }, [pcbQueryParam, components, filterOptions]);

  const displayedPcbComponents = useMemo(() => {
    if (selectedPcbComponent) {
      return [selectedPcbComponent];
    }
    return components;
  }, [selectedPcbComponent, components]);

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

  // Fetch components whenever the active page's search or filter changes.
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

        if (activeCategory !== "All Components") {
          params.set("category", activeCategory);
        }

        if (activeManufacturer) {
          params.set("manufacturer", activeManufacturer);
        }

        if (activePackage) {
          params.set("package", activePackage);
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
    activeCategory,
    activeManufacturer,
    activePackage,
    refreshIndex,
  ]);

  // Calculate manufacturer options using the other active filters on the current page.
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
              activeCategory === "All Components" ||
              component.category === activeCategory;

            const matchesPackage =
              !activePackage ||
              component.package?.name === activePackage;

            return matchesSearch && matchesCategory && matchesPackage;
          })
          .map((component) => component.manufacturer)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [filterOptions, search, activeCategory, activePackage]);

  // Calculate package options using the other active filters on the current page.
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
              activeCategory === "All Components" ||
              component.category === activeCategory;

            const matchesManufacturer =
              !activeManufacturer ||
              component.manufacturer === activeManufacturer;

            return matchesSearch && matchesCategory && matchesManufacturer;
          })
          .map((component) => component.package?.name)
          .filter((name): name is string => Boolean(name))
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [filterOptions, search, activeCategory, activeManufacturer]);

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
    if (isPcbView) {
      setPcbCategory("All Components");
      setPcbManufacturer("");
      setPcbPackage("");
      if (location.search) {
        navigate("/pcb");
      }
    } else if (isCompareView) {
      setCompareCategory("All Components");
      setCompareManufacturer("");
      setComparePackage("");
    } else {
      setSearch("");
      setSelectedCategory("All Components");
      setSelectedManufacturer("");
      setSelectedPackage("");
    }
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
            {/* Shared Library-design Category Cards Section */}
            <CategoryCardsSection
              categories={categories}
              categoryCounts={categoryCounts}
              selectedCategory={activeCategory}
              onSelectCategory={(catName) => {
                if (isPcbView) {
                  setPcbCategory(catName);
                  if (location.search) {
                    navigate("/pcb");
                  }
                } else if (isCompareView) {
                  setCompareCategory(catName);
                } else {
                  setSelectedCategory(catName);
                }
              }}
            />

            <div className="sidebar-section sidebar-filters">
              <div className="sidebar-label">Filters</div>

              <div className="filter-field">
                <label htmlFor="manufacturer-filter">Manufacturer</label>
                <select
                  id="manufacturer-filter"
                  value={activeManufacturer}
                  onChange={(event) => {
                    const val = event.target.value;
                    if (isPcbView) {
                      setPcbManufacturer(val);
                      if (location.search) {
                        navigate("/pcb");
                      }
                    } else if (isCompareView) {
                      setCompareManufacturer(val);
                    } else {
                      setSelectedManufacturer(val);
                    }
                  }}
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
                  value={activePackage}
                  onChange={(event) => {
                    const val = event.target.value;
                    if (isPcbView) {
                      setPcbPackage(val);
                      if (location.search) {
                        navigate("/pcb");
                      }
                    } else if (isCompareView) {
                      setComparePackage(val);
                    } else {
                      setSelectedPackage(val);
                    }
                  }}
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
            {/* VIVA EXPLANATION: React Error Boundary wraps all client views to prevent white screen crashes */}
            <ErrorBoundary>
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
                  <section
                    className="library-view-container"
                    aria-label="Component Catalog"
                  >
                    {/* VIVA EXPLANATION: Library Layout & Presentation Architecture
                      * 1. Page Header: Breadcrumb, title "Component library", short subtitle, result count.
                      * 2. Responsive Grid: repeat(auto-fill, minmax(260px, 1fr)) dynamically adjusts columns.
                      * 3. Card Hierarchy: Corners for Compare & Save -> 4:3 Image Stage -> Mono MPN -> 2-line Name -> Quiet Mfr/Pkg -> 3 Specs -> Datasheet text link + Primary 'View details'.
                      * 4. Image Aspect Ratio: Fixed 4:3 container with object-fit: contain on neutral surface, zero CLS, category-icon fallback.
                      * 5. Sticky Elements: Sticky table header (position: sticky; top: 0) and sticky bottom compare tray floating over content.
                      */}

                    {/* Catalog Heading Group */}
                    <div className="library-heading-group">
                      <nav className="library-breadcrumb" aria-label="Breadcrumb">
                        <span className="breadcrumb-root">Electronic Components</span>
                        <span className="breadcrumb-separator">/</span>
                        <strong className="breadcrumb-current">{selectedCategory}</strong>
                      </nav>

                      <div className="library-header-row">
                        <div className="library-title-block">
                          <div className="library-eyebrow">Component catalogue</div>
                          <div className="library-title-row">
                            <h1 className="library-title">Electronic Component Library</h1>
                            <span
                              className="library-header-count mono-num"
                              title={`${components.length} components available`}
                            >
                              {loading
                                ? "Loading..."
                                : `${components.length} ${
                                    components.length === 1 ? "component" : "components"
                                  }`}
                            </span>
                          </div>
                          <p className="library-subtitle">
                            Browse and filter electronic components, package dimensions, footprints, and datasheets.
                          </p>
                        </div>

                        {/* On-Page Quick Search Field */}
                        <div className="library-header-search">
                          <div className="library-search-container">
                            <Search size={16} className="library-search-icon" aria-hidden="true" />
                            <input
                              type="text"
                              id="library-page-search"
                              className="library-search-input"
                              placeholder="Search by part number or name..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              aria-label="Search components by part number or name"
                            />
                            {search && (
                              <button
                                type="button"
                                className="library-search-clear"
                                onClick={() => setSearch("")}
                                title="Clear search query"
                                aria-label="Clear search"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* VIVA EXPLANATION: Two-Column Sticky Sidebar Architecture
                      * 1. Layout: Two-column layout with 260px left sidebar and flex-1 main panel.
                      * 2. position: sticky: Top offset is `top: calc(var(--cq-navbar-height) + 16px)`.
                      * 3. align-self: flex-start: Prevents flex stretch from giving sidebar the same height as main content,
                      *    which would leave 0px room for sticking.
                      * 4. max-height + overflow-y: auto: Sidebar scrolls internally if categories + filters exceed viewport.
                      * 5. Under 900px: Collapses into horizontal touch-swipe category strip and collapsible filters panel.
                      */}
                    <div className="library-two-column-layout">
                      {/* Left Sticky Sidebar: Category Cards + Parametric Filters */}
                      <aside
                        className="library-sidebar"
                        aria-label="Component categories and parametric filters"
                      >
                        {/* Category Cards Section */}
                        <CategoryCardsSection
                          categories={categories}
                          categoryCounts={categoryCounts}
                          selectedCategory={selectedCategory}
                          onSelectCategory={setSelectedCategory}
                        />

                        {/* Mobile Collapsible Filters Toggle Button (<900px only) */}
                        <button
                          type="button"
                          className="library-mobile-filters-toggle"
                          onClick={() => setMobileFiltersOpen((prev) => !prev)}
                          aria-expanded={mobileFiltersOpen}
                          aria-label="Toggle parametric filters panel"
                        >
                          <div className="library-mobile-toggle-left">
                            <SlidersHorizontal size={15} aria-hidden="true" />
                            <span>Filters</span>
                            {(selectedManufacturer || selectedPackage) && (
                              <span
                                className="library-filter-active-indicator"
                                title="Active filters applied"
                              />
                            )}
                          </div>
                          <div className="library-mobile-toggle-right">
                            <span className="library-mobile-filter-summary">
                              {selectedManufacturer || selectedPackage
                                ? [selectedManufacturer, selectedPackage]
                                    .filter(Boolean)
                                    .join(" · ")
                                : "All"}
                            </span>
                            <span
                              className="library-mobile-chevron"
                              aria-hidden="true"
                            >
                              {mobileFiltersOpen ? "▲" : "▼"}
                            </span>
                          </div>
                        </button>

                        {/* Parametric Filters Section (Always visible >900px, collapsible <900px) */}
                        <div
                          className={`library-sidebar-filters ${
                            mobileFiltersOpen ? "mobile-open" : ""
                          }`}
                        >
                          <div className="library-sidebar-heading">Filters</div>

                          {/* Manufacturer Select */}
                          <div className="library-sidebar-field">
                            <label
                              htmlFor="library-sidebar-mfr"
                              className="library-sidebar-label"
                            >
                              Manufacturer
                            </label>
                            <div className="custom-select-container">
                              <select
                                id="library-sidebar-mfr"
                                className="custom-select"
                                value={selectedManufacturer}
                                onChange={(e) =>
                                  setSelectedManufacturer(e.target.value)
                                }
                                aria-label="Filter by component manufacturer"
                              >
                                <option value="">
                                  All Manufacturers ({manufacturers.length})
                                </option>
                                {manufacturers.map((mfr) => (
                                  <option key={mfr} value={mfr}>
                                    {mfr}
                                  </option>
                                ))}
                              </select>
                              <span
                                className="custom-select-caret"
                                aria-hidden="true"
                              >
                                ▾
                              </span>
                            </div>
                          </div>

                          {/* Package / Case Select */}
                          <div className="library-sidebar-field">
                            <label
                              htmlFor="library-sidebar-pkg"
                              className="library-sidebar-label"
                            >
                              Package / Case
                            </label>
                            <div className="custom-select-container">
                              <select
                                id="library-sidebar-pkg"
                                className="custom-select"
                                value={selectedPackage}
                                onChange={(e) =>
                                  setSelectedPackage(e.target.value)
                                }
                                aria-label="Filter by package or mounting case"
                              >
                                <option value="">
                                  All Packages ({packages.length})
                                </option>
                                {packages.map((pkg) => (
                                  <option key={pkg} value={pkg}>
                                    {pkg}
                                  </option>
                                ))}
                              </select>
                              <span
                                className="custom-select-caret"
                                aria-hidden="true"
                              >
                                ▾
                              </span>
                            </div>
                          </div>

                          {/* Reset Filters Button */}
                          <button
                            type="button"
                            className="library-sidebar-reset-btn"
                            onClick={clearFilters}
                            disabled={!hasActiveFilters}
                            title="Reset all search keywords and parametric filters"
                          >
                            <RotateCcw size={13} aria-hidden="true" />
                            <span>Reset filters</span>
                          </button>
                        </div>
                      </aside>

                      {/* Right Main Content Panel (Toolbar, Pills & Grid/Table) */}
                      <div className="library-main-panel">

                    {/* Unified Toolbar: Sorting, View Mode Toggle, Result Count */}
                    <div
                      className="library-toolbar"
                      role="region"
                      aria-label="Catalog sorting and view mode controls"
                    >
                      <div className="library-toolbar-filters">
                        {/* Sort Field & Direction Toggle */}
                        <div className="library-control-wrap">
                          <label
                            htmlFor="library-sort-select"
                            className="library-control-label"
                          >
                            Sort:
                          </label>
                          <div className="library-sort-group">
                            <div className="custom-select-container">
                              <select
                                id="library-sort-select"
                                className="custom-select"
                                value={sortField}
                                onChange={(e) =>
                                  setSortField(e.target.value as SortField)
                                }
                                aria-label="Sort components by attribute"
                              >
                                <option value="partNumber">
                                  Part Number (MPN)
                                </option>
                                <option value="name">Component Name</option>
                                <option value="manufacturer">
                                  Manufacturer
                                </option>
                                <option value="category">Category</option>
                                <option value="package">Package / Case</option>
                              </select>
                              <span
                                className="custom-select-caret"
                                aria-hidden="true"
                              >
                                ▾
                              </span>
                            </div>

                            <button
                              type="button"
                              className="library-sort-dir-btn"
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
                                sortDirection === "asc"
                                  ? "ascending"
                                  : "descending"
                              }`}
                            >
                              <span className="mono-num">
                                {sortDirection === "asc" ? "▲ ASC" : "▼ DESC"}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="library-toolbar-view-controls">
                        {/* Cards / Table View Mode Toggle */}
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
                            title="Card Grid View"
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

                        {/* Result Count Indicator */}
                        <span className="result-count">
                          {loading ? (
                            "Loading..."
                          ) : (
                            <>
                              <span className="mono-num">
                                {components.length}
                              </span>{" "}
                              {components.length === 1 ? "part" : "parts"} found
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Active Filter Pills (if active) */}
                    {hasActiveFilters && (
                      <div className="active-filter-pills">
                        <span className="active-filter-label">Active filters:</span>
                        {selectedCategory !== "All Components" && (
                          <button
                            className="filter-pill"
                            type="button"
                            onClick={() =>
                              setSelectedCategory("All Components")
                            }
                            title="Remove category filter"
                          >
                            Category: {selectedCategory} <span>×</span>
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
                            Search: “{search.trim()}” <span>×</span>
                          </button>
                        )}
                        <button
                          className="filter-pill-clear-all"
                          type="button"
                          onClick={clearFilters}
                          title="Reset all search keywords and active filters"
                        >
                          Clear all
                        </button>
                      </div>
                    )}

                {catalogLayout === "grid" ? (
                  <div className="catalog-cards-container">
                    {loading ? (
                      <div className="component-card-grid">
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <div className="product-card skeleton-card" key={idx} aria-hidden="true">
                            <div className="skeleton-corner-bar">
                              <div className="skeleton-line skeleton-corner-pill" />
                              <div className="skeleton-line skeleton-corner-btn" />
                            </div>
                            <div className="skeleton-thumb-box" />
                            <div className="skeleton-body">
                              <div className="skeleton-line skeleton-mpn" />
                              <div className="skeleton-line skeleton-title" />
                              <div className="skeleton-line skeleton-sub" />
                              <div className="skeleton-box skeleton-specs" />
                            </div>
                            <div className="skeleton-footer">
                              <div className="skeleton-line skeleton-link" />
                              <div className="skeleton-line skeleton-btn" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : error ? (
                      <div className="card-empty-feedback error-feedback">
                        <div className="empty-icon-wrap error-icon-wrap" aria-hidden="true">
                          <span className="empty-icon">⚠</span>
                        </div>
                        <h3 className="empty-title">Unable to retrieve component data</h3>
                        <p className="empty-desc">{error}</p>
                        <button
                          className="library-empty-reset-btn"
                          type="button"
                          onClick={() => setRefreshIndex((prev) => prev + 1)}
                        >
                          <RotateCcw size={14} /> Retry connection
                        </button>
                      </div>
                    ) : sortedComponents.length === 0 ? (
                      <div className="card-empty-feedback">
                        <div className="empty-icon-wrap" aria-hidden="true">
                          <Layers size={36} />
                        </div>
                        <h3 className="empty-title">No components match the active criteria</h3>
                        <p className="empty-desc">
                          {search.trim()
                            ? `No components matched "${search.trim()}". Try checking the part number spelling, using a broader keyword, or clearing active filters.`
                            : "Try adjusting the selected category or clearing manufacturer and package filters to view available parts."}
                        </p>
                        <button
                          className="library-empty-reset-btn"
                          type="button"
                          onClick={clearFilters}
                        >
                          <RotateCcw size={14} /> Reset all filters
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
                              {/* Corner controls: Compare checkbox on left, Status & Save bookmark on right */}
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
                                  <span className="card-compare-box" aria-hidden="true">
                                    {isSelected && "✓"}
                                  </span>
                                  <span className="card-compare-text">Compare</span>
                                </label>

                                <div className="card-top-right">
                                  <span
                                    className={`card-status-badge ${
                                      component.dataStatus === "verified"
                                        ? "verified"
                                        : "incomplete"
                                    }`}
                                    title={`Data completeness: ${
                                      component.dataStatus === "verified"
                                        ? "Complete catalogue specifications"
                                        : "Incomplete catalogue parameters"
                                    }`}
                                  >
                                    {component.dataStatus === "verified"
                                      ? "Complete"
                                      : "Incomplete"}
                                  </span>

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
                                </div>
                              </div>

                              {/* Fixed 4:3 Image Stage with category-icon fallback (no PHOTO badge) */}
                              <div
                                className="card-image-stage"
                                onClick={() => setSelectedComponent(component)}
                                title={`View technical details for ${component.name}`}
                              >
                                <ComponentThumbnail
                                  component={component}
                                  size="fluid"
                                  showProvenanceBadge={false}
                                  fallbackIcon={
                                    <div className="card-category-placeholder">
                                      <div className="card-category-placeholder-icon">
                                        <CategoryIcon categoryName={component.category} />
                                      </div>
                                      <span className="card-category-placeholder-label">
                                        {component.category}
                                      </span>
                                    </div>
                                  }
                                />
                              </div>

                              {/* Card Body */}
                              <div className="card-body">
                                <div className="card-mpn-row">
                                  <span
                                    className="card-mpn mono-num"
                                    onClick={() => setSelectedComponent(component)}
                                    title={`Manufacturer Part Number: ${component.partNumber}`}
                                  >
                                    {component.partNumber}
                                  </span>
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
                                  <span className="card-mfr-dot" aria-hidden="true">·</span>
                                  <span className="card-pkg">
                                    {component.package?.name || "Unspecified"}
                                  </span>
                                </div>

                                <div className="card-specs-list">
                                  {previewSpecs.length > 0 ? (
                                    previewSpecs.map((spec) => (
                                      <div className="card-spec-item" key={spec.key}>
                                        <span className="spec-k">{spec.label}:</span>
                                        <span className="spec-v mono-num" title={spec.value}>
                                          {spec.value}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="spec-empty">No discrete parameters</span>
                                  )}
                                </div>
                              </div>

                              {/* Card Footer: Small datasheet text link + PCB Assistant quick link + Primary View Details button */}
                              <div className="card-footer">
                                <div className="card-footer-links">
                                  {isValidHttpUrl(component.datasheetUrl) ? (
                                    <a
                                      className="card-datasheet-text-link"
                                      href={resolveAssetUrl(component.datasheetUrl)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title={`Open official datasheet PDF for ${component.partNumber}`}
                                    >
                                      Datasheet ↗
                                    </a>
                                  ) : (
                                    <span className="card-datasheet-text-link disabled">
                                      No PDF
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    className="card-pcb-link"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/pcb?partNumber=${encodeURIComponent(
                                          component.partNumber
                                        )}`
                                      );
                                    }}
                                    title={`Inspect PCB footprint and dimensions for ${component.partNumber}`}
                                  >
                                    PCB ↗
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  className="card-view-details-btn"
                                  onClick={() => setSelectedComponent(component)}
                                  title={`View complete specifications and footprint for ${component.name}`}
                                >
                                  View details
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
                          <th className="th-image" title="Component image">
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
                                <button
                                  className="filter-button reset-action-btn"
                                  type="button"
                                  onClick={() => setRefreshIndex((prev) => prev + 1)}
                                >
                                  <RotateCcw size={13} /> Retry Connection
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : sortedComponents.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="table-feedback-cell empty-cell">
                              <div className="empty-message-wrap">
                                <span className="empty-icon">⌕</span>
                                <strong>No components match the active criteria</strong>
                                <p>
                                  {search.trim()
                                    ? `No components matched "${search.trim()}". Try clearing search keywords or active filters.`
                                    : "Try clearing your keyword search or adjusting the selected category and filters."}
                                </p>
                                <button
                                  className="filter-button reset-action-btn"
                                  type="button"
                                  onClick={clearFilters}
                                >
                                  <RotateCcw size={13} /> Reset All Filters
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
                                        ? "Copied"
                                        : "Copy"}
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
                                      href={resolveAssetUrl(component.datasheetUrl)}
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
                                      className="table-action-btn table-pcb-btn"
                                      type="button"
                                      onClick={() =>
                                        navigate(
                                          `/pcb?partNumber=${encodeURIComponent(
                                            component.partNumber
                                          )}`
                                        )
                                      }
                                      title={`Inspect PCB footprint and dimensions for ${component.partNumber}`}
                                    >
                                      PCB ↗
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
                        </div>
                      </div>
                    </section>
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
                          <button
                            type="button"
                            className="breadcrumb-link-btn"
                            onClick={() => navigate("/pcb")}
                            title="View all components in PCB Assistant"
                          >
                            PCB Footprint Reference
                          </button>
                          {selectedPcbComponent && (
                            <>
                              {" "}
                              <span>/</span>{" "}
                              <strong>{selectedPcbComponent.partNumber}</strong>
                            </>
                          )}
                        </div>
                        <h1>PCB Footprint & Dimension Inspector</h1>
                        <p className="subtitle">
                          Inspect component physical dimensions, lead pitch, and layout guidelines with explicit provenance tracking.
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

                    {/* Viva Note: Legend explaining the 4 provenance categories so users know
                        whether a number is stored in the database, derived, a placeholder fallback, or missing. */}
                    <div className="pcb-provenance-legend" aria-label="Data provenance legend">
                      <span className="pcb-legend-title">Provenance legend:</span>
                      <div className="pcb-legend-items">
                        <span className="pcb-legend-item">
                          <span className="prov-badge prov-catalogue">Catalogue</span>
                          <span>Stored in the database (only called Datasheet if status is Verified)</span>
                        </span>
                        <span className="pcb-legend-item">
                          <span className="prov-badge prov-derived">Derived</span>
                          <span>Calculated from stored values (e.g. row span from pin count and pitch)</span>
                        </span>
                        <span className="pcb-legend-item">
                          <span className="prov-badge prov-placeholder">Placeholder</span>
                          <span>Code fallback when no value is stored (never drawn as real geometry)</span>
                        </span>
                        <span className="pcb-legend-item">
                          <span className="prov-badge prov-na">Not available</span>
                          <span>Missing in the database</span>
                        </span>
                      </div>
                    </div>

                    {loading && pcbQueryParam && !selectedPcbComponent ? (
                      <div className="card-empty-feedback">
                        <div className="empty-icon-wrap" aria-hidden="true">
                          <RotateCcw size={24} className="spinning" />
                        </div>
                        <h3 className="empty-title">Loading component footprint...</h3>
                        <p className="empty-desc">
                          Retrieving footprint parameters for &ldquo;{pcbQueryParam}&rdquo;.
                        </p>
                      </div>
                    ) : pcbQueryParam && !selectedPcbComponent && !loading ? (
                      <div className="pcb-not-found-card">
                        <div className="pcb-not-found-icon">⚠</div>
                        <h3>Component &ldquo;{pcbQueryParam}&rdquo; not found in catalogue</h3>
                        <p>
                          No electronic component matching part number or ID &ldquo;{pcbQueryParam}&rdquo; could be located in the Cirqon database.
                        </p>
                        <div className="pcb-not-found-actions">
                          <button
                            type="button"
                            className="pcb-show-all-btn"
                            onClick={() => navigate("/pcb")}
                          >
                            View all components ({filterOptions.length || components.length})
                          </button>
                          <button
                            type="button"
                            className="pcb-back-lib-btn"
                            onClick={() => navigate("/library")}
                          >
                            ← Back to Library
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {selectedPcbComponent && (
                          <div className="pcb-focused-banner">
                            <div className="pcb-focused-identity">
                              <div className="pcb-focused-title-row">
                                <span className="pcb-focused-badge">Active Part Focus</span>
                                <span className="pcb-focused-mpn">
                                  {selectedPcbComponent.partNumber}
                                </span>
                                <h2 className="pcb-focused-title">
                                  {selectedPcbComponent.name}
                                </h2>
                              </div>
                              <div className="pcb-focused-meta">
                                <span>{selectedPcbComponent.manufacturer}</span>
                                <span className="meta-dot">·</span>
                                <span>{selectedPcbComponent.category}</span>
                                <span className="meta-dot">·</span>
                                <span>
                                  {selectedPcbComponent.package?.name || "Unspecified Package"}
                                </span>
                                {(() => {
                                  const focusValidation = auditComponentFootprint(selectedPcbComponent).validation;
                                  return (
                                    <span
                                      className={`pcb-datastatus-inline ${focusValidation.statusBadgeClass}`}
                                      title={`Footprint Validation: ${focusValidation.statusLabel}`}
                                    >
                                      {focusValidation.statusLabel}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="pcb-focused-actions">
                              <button
                                className="pcb-show-all-btn"
                                type="button"
                                onClick={() => navigate("/pcb")}
                                title="Exit single component focus and view all catalogue components"
                              >
                                View all components ({filterOptions.length || components.length})
                              </button>
                              <button
                                className="pcb-back-lib-btn"
                                type="button"
                                onClick={() => navigate("/library")}
                                title="Return to component catalog"
                              >
                                ← Back to Library
                              </button>
                            </div>
                          </div>
                        )}

                        <div className={`pcb-grid ${selectedPcbComponent ? "single-focus-grid" : ""}`}>
                          {displayedPcbComponents.map((component) => {
                            const audit = auditComponentFootprint(component);
                            const isCardSelected = selectedPcbComponent
                              ? selectedPcbComponent._id === component._id
                              : selectedComponent?._id === component._id;
                            const sourceFields = [
                              audit.fields.package,
                              audit.fields.pinCount,
                              audit.fields.leadPitch,
                      audit.fields.bodySize,
                      audit.fields.padSize,
                      audit.fields.drill,
                      audit.fields.pinout,
                    ];

                    return (
                      <article
                        className={`pcb-card cad-grid-overlay ${
                          audit.canDrawFootprint ? "pcb-card-interactive" : ""
                        } ${isCardSelected ? "pcb-card-selected" : ""}`}
                        key={component._id}
                      >
                        {/* 1. Card Identity Header */}
                        <div className="pcb-card-header">
                          <div className="pcb-card-title-group">
                            <span className="part-number">
                              {component.partNumber}
                            </span>
                            <h3>{component.name}</h3>
                            <span className="pcb-card-mfr">
                              {component.manufacturer} · {component.category}
                            </span>
                          </div>
                          <div className="pcb-header-badges">
                            <span
                              className={`pcb-datastatus-badge ${audit.validation.statusBadgeClass}`}
                              title={`Footprint Validation: ${audit.validation.statusLabel}`}
                            >
                              {audit.validation.statusLabel}
                            </span>
                            <span className="filter-pill">
                              {component.package?.name || "Not available"}
                            </span>
                          </div>
                        </div>

                        {/* 2. Footprint Drawing & Interactive Inspection Area */}
                        <div className="pcb-card-footprint-section">
                          {audit.canDrawFootprint ? (
                            <InteractiveFootprintViewer
                              key={component._id}
                              component={component}
                              missingFields={audit.missingFields}
                              validation={audit.validation}
                            />
                          ) : (
                            <div className="pcb-empty-workspace">
                              <div
                                className="pcb-footprint-empty-state"
                                role="region"
                                aria-label={`Footprint unavailable for ${component.partNumber}`}
                              >
                                <div className="pcb-empty-state-title">
                                  Footprint Not Drawn
                                </div>
                                <p className="pcb-empty-state-reason">
                                  {renderValueWithMonoNumbers(audit.emptyStateReason)}
                                </p>
                                <div className="pcb-missing-banner">
                                  <strong>Missing:</strong> {audit.missingFields.join(", ")}
                                </div>
                                <FootprintValidationPanel
                                  validation={audit.validation}
                                  datasheetUrl={component.datasheetUrl}
                                  manufacturer={component.manufacturer}
                                  compact={true}
                                  initialExpanded={false}
                                />
                              </div>
                              <div className="pcb-side-column">
                                <PcbComponentPhotoPanel component={component} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. Specifications, Provenance Data Sources & Layout Notes */}
                        <div className="pcb-card-specs-section">
                          <div className="pcb-data-sources-panel">
                            <div className="pcb-data-sources-header">
                              <h4>Data sources</h4>
                              <span
                                className={`pcb-datastatus-inline ${audit.validation.statusBadgeClass}`}
                              >
                                {audit.validation.statusLabel}
                              </span>
                            </div>

                            <dl className="pcb-sources-list">
                              {sourceFields.map((field) => (
                                <div className="pcb-source-row" key={field.key}>
                                  <dt className="pcb-source-label">{field.label}</dt>
                                  <dd className="pcb-source-value-group">
                                    {field.key === "pinout" &&
                                    component.pins &&
                                    component.pins.length > 0 ? (
                                      <div className="pcb-pinout-chips">
                                        {component.pins.map((pin, idx) => (
                                          <span
                                            className="pcb-pin-chip"
                                            key={`${pin.number ?? idx}-${pin.name ?? ""}`}
                                          >
                                            <span className="pcb-mono-num">
                                              {pin.number}
                                            </span>
                                            <span>: {pin.name}</span>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="pcb-source-value">
                                        {renderValueWithMonoNumbers(field.value)}
                                      </span>
                                    )}
                                    <span className={getProvenanceBadgeClass(field.provenance)}>
                                      {field.provenance}
                                    </span>
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>

                          {component.package?.padLayout ? (
                            <p className="pcb-pad-note">
                              <strong>Layout Reference:</strong>{" "}
                              {renderValueWithMonoNumbers(component.package.padLayout)}
                            </p>
                          ) : (
                            <p className="pcb-pad-note muted">
                              No layout notes in database. Consult manufacturer land pattern.
                            </p>
                          )}
                        </div>

                        {/* 4. Action Links & Modal Trigger Footer */}
                        <div className="pcb-card-footer">
                          <div className="pcb-sources-links">
                            {isValidHttpUrl(component.datasheetUrl) ? (
                              <a
                                className="datasheet-card-link"
                                href={resolveAssetUrl(component.datasheetUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Datasheet PDF ↗
                              </a>
                            ) : (
                              <span className="pcb-link-missing">
                                Datasheet link: Not available
                              </span>
                            )}

                            {isValidHttpUrl(component.manufacturerUrl) ? (
                              <a
                                className="datasheet-card-link pcb-mfr-link"
                                href={component.manufacturerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Manufacturer Page ↗
                              </a>
                            ) : (
                              <span className="pcb-link-missing">
                                Manufacturer link: Not available
                              </span>
                            )}
                          </div>

                          <button
                            className="details-button"
                            type="button"
                            onClick={() => setSelectedComponent(component)}
                          >
                            {component.pins && component.pins.length > 0 ? (
                              <>
                                Pinout (<span className="pcb-mono-num">{component.pins.length}</span> Pins) <span>→</span>
                              </>
                            ) : (
                              <>
                                View Details <span>→</span>
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {displayedPcbComponents.length === 0 && !loading && (
                  <div className="card-empty-feedback">
                    <div className="empty-icon-wrap" aria-hidden="true">
                      <Layers size={36} />
                    </div>
                    <h3 className="empty-title">No components found</h3>
                    <p className="empty-desc">
                      No components match the active category or parametric filters in the PCB Assistant.
                    </p>
                    <button
                      className="library-empty-reset-btn"
                      type="button"
                      onClick={clearFilters}
                    >
                      <RotateCcw size={14} /> Reset all filters
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
                }
              />

              {/* Route 4: Side-by-Side Component Compare Workspace */}
              <Route
                path="/compare"
                element={
                  <section className="compare-view">
                    <div className="compare-header-container">
                      <nav className="compare-breadcrumb" aria-label="Breadcrumb">
                        <button
                          type="button"
                          className="compare-breadcrumb-link"
                          onClick={() => navigate("/library")}
                        >
                          Library
                        </button>
                        <span className="compare-breadcrumb-separator">/</span>
                        <span className="compare-breadcrumb-active">Component Comparison</span>
                      </nav>

                      <div className="compare-top-row">
                        <div className="compare-heading-group">
                          <div className="eyebrow">Component comparison</div>
                          <h1>Component Comparison</h1>
                          <p className="subtitle">
                            {selectedForCompare.length === 0
                              ? "Compare up to 4 components side by side across physical packaging, technical specifications, and pinout attributes."
                              : `Comparing ${selectedForCompare.length} of 4 components side by side across physical packaging, technical specifications, and pinout attributes.`}
                          </p>
                        </div>

                        <div className="compare-view-buttons">
                          <button
                            className="filter-button"
                            type="button"
                            onClick={() => navigate("/library")}
                          >
                            <ArrowLeft size={14} /> Back to Library
                          </button>

                          {selectedForCompare.length > 0 && (
                            <button
                              className="filter-button reset-filters-button"
                              type="button"
                              onClick={() => setSelectedForCompare([])}
                              title="Clear all components from comparison"
                            >
                              <Trash2 size={14} /> Clear comparison
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedForCompare.length < 2 ? (
                      <div className="compare-empty-container">
                        <div className="compare-empty-card">
                          <div className="compare-empty-icon-wrap">
                            <ArrowLeftRight size={24} />
                          </div>
                          <h2>Select at least 2 components to compare</h2>
                          <p>
                            {selectedForCompare.length === 1
                              ? `You have selected 1 component (${selectedForCompare[0].partNumber} — ${selectedForCompare[0].name}). Add at least 1 more component from the library to compare specifications side by side.`
                              : "You haven't selected any components yet. Choose 2 to 4 components from the component library or PCB assistant to compare their technical parameters, physical dimensions, and pin configurations."}
                          </p>

                          <div className="compare-slot-indicators">
                            {[0, 1, 2, 3].map((idx) => {
                              const comp = selectedForCompare[idx];
                              return comp ? (
                                <div key={comp._id} className="compare-slot-pill filled">
                                  <span className="slot-idx">{idx + 1}</span>
                                  <span className="slot-part" title={comp.partNumber}>
                                    {comp.partNumber}
                                  </span>
                                  <button
                                    type="button"
                                    className="slot-remove"
                                    onClick={() => toggleCompare(comp)}
                                    title={`Remove ${comp.partNumber}`}
                                    aria-label={`Remove ${comp.partNumber}`}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div
                                  key={idx}
                                  className={`compare-slot-pill empty ${idx === selectedForCompare.length ? "next-slot" : ""}`}
                                  onClick={() => navigate("/library")}
                                  role="button"
                                  tabIndex={0}
                                  title="Add component to this slot"
                                >
                                  <span className="slot-idx">{idx + 1}</span>
                                  <span className="slot-label">Empty Slot</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="compare-empty-actions">
                            <button
                              className="filter-button primary-accent"
                              type="button"
                              onClick={() => navigate("/library")}
                            >
                              Browse Component Library <ArrowRight size={14} />
                            </button>
                            {selectedForCompare.length === 1 && (
                              <button
                                className="filter-button"
                                type="button"
                                onClick={() => setSelectedForCompare([])}
                              >
                                Clear selection
                              </button>
                            )}
                          </div>
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
                                      <span className="th-part" title={c.partNumber}>
                                        {c.partNumber}
                                      </span>
                                      <button
                                        className="th-remove-btn"
                                        type="button"
                                        onClick={() => toggleCompare(c)}
                                        title={`Remove ${c.partNumber} from matrix`}
                                        aria-label={`Remove ${c.partNumber}`}
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                    <div className="compare-thumb-wrap">
                                      <ComponentThumbnail
                                        component={c}
                                        size="md"
                                        showProvenanceBadge
                                      />
                                    </div>
                                    <div className="th-name" title={c.name}>
                                      {c.name}
                                    </div>
                                    <div className="th-meta">
                                      <span className="th-manufacturer" title={c.manufacturer}>
                                        {c.manufacturer || "Manufacturer"}
                                      </span>
                                      <span className="th-package" title={c.package?.name}>
                                        {c.package?.name || "Standard"}
                                      </span>
                                    </div>
                                    <button
                                      className="th-details-button"
                                      type="button"
                                      onClick={() => setSelectedComponent(c)}
                                    >
                                      View full specs ↗
                                    </button>
                                  </div>
                                </th>
                              ))}
                              {selectedForCompare.length < 4 && (
                                <th className="component-col-header add-slot-col">
                                  <button
                                    className="add-slot-card"
                                    type="button"
                                    onClick={() => navigate("/library")}
                                    title="Add another component from catalogue to compare"
                                  >
                                    <div className="add-slot-icon-box">
                                      <Plus size={18} />
                                    </div>
                                    <span className="add-slot-text">Add Component</span>
                                    <span className="add-slot-count">
                                      ({selectedForCompare.length}/4 selected)
                                    </span>
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

                            <tr className={isRowDivergent(selectedForCompare.map((c) => c.partNumber)) ? "row-divergent" : ""}>
                              <td className="row-label">
                                <span>Part Number</span>
                                {isRowDivergent(selectedForCompare.map((c) => c.partNumber)) && (
                                  <span className="diff-badge">DIFF</span>
                                )}
                              </td>
                              {selectedForCompare.map((c) => (
                                <td key={c._id} className="mono-val">
                                  {c.partNumber || <span className="muted-cell">Not available</span>}
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
                                <td key={c._id}>
                                  {c.name || <span className="muted-cell">Not available</span>}
                                </td>
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
                                <td key={c._id}>
                                  {c.category || <span className="muted-cell">Not available</span>}
                                </td>
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
                                  {c.manufacturer || <span className="muted-cell">Not available</span>}
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
                                      href={resolveAssetUrl(c.datasheetUrl)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Open PDF ↗
                                    </a>
                                  ) : (
                                    <span className="muted-cell">Not available</span>
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
                                  {c.package?.name || <span className="muted-cell">Not available</span>}
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
                                  {c.package?.mountingType || <span className="muted-cell">Not available</span>}
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
                              {selectedForCompare.map((c) => {
                                const dims = formatDimensions(c.package);
                                return (
                                  <td key={c._id}>
                                    {dims !== "Not available" ? (
                                      dims
                                    ) : (
                                      <span className="muted-cell">Not available</span>
                                    )}
                                  </td>
                                );
                              })}
                              {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                            </tr>

                            <tr
                              className={
                                isRowDivergent(
                                  selectedForCompare.map((c) =>
                                    c.package?.pcbLayout?.leadPitchMm != null
                                      ? `${c.package.pcbLayout.leadPitchMm} mm`
                                      : null
                                  )
                                )
                                  ? "row-divergent"
                                  : ""
                              }
                            >
                              <td className="row-label">
                                <span>Lead Pitch</span>
                                {isRowDivergent(
                                  selectedForCompare.map((c) =>
                                    c.package?.pcbLayout?.leadPitchMm != null
                                      ? `${c.package.pcbLayout.leadPitchMm} mm`
                                      : null
                                  )
                                ) && <span className="diff-badge">DIFF</span>}
                              </td>
                              {selectedForCompare.map((c) => (
                                <td key={c._id}>
                                  {c.package?.pcbLayout?.leadPitchMm != null ? (
                                    `${c.package.pcbLayout.leadPitchMm} mm`
                                  ) : (
                                    <span className="muted-cell">Not available</span>
                                  )}
                                </td>
                              ))}
                              {selectedForCompare.length < 4 && <td className="add-slot-cell" />}
                            </tr>

                            <tr
                              className={
                                isRowDivergent(
                                  selectedForCompare.map((c) =>
                                    c.pins && c.pins.length > 0
                                      ? `${c.pins.length} pins`
                                      : null
                                  )
                                )
                                  ? "row-divergent"
                                  : ""
                              }
                            >
                              <td className="row-label">
                                <span>Pin Count</span>
                                {isRowDivergent(
                                  selectedForCompare.map((c) =>
                                    c.pins && c.pins.length > 0
                                      ? `${c.pins.length} pins`
                                      : null
                                  )
                                ) && <span className="diff-badge">DIFF</span>}
                              </td>
                              {selectedForCompare.map((c) => (
                                <td key={c._id}>
                                  {c.pins && c.pins.length > 0 ? (
                                    `${c.pins.length} pins`
                                  ) : (
                                    <span className="muted-cell">Not available</span>
                                  )}
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
                                  {c.package?.padLayout || <span className="muted-cell">Not available</span>}
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
                                  No technical specifications recorded for these components.
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
                                      const isMissing =
                                        !display ||
                                        display === "Not available" ||
                                        display === "—";
                                      return (
                                        <td
                                          key={c._id}
                                          className={isMissing ? "muted-cell" : ""}
                                        >
                                          {isMissing ? (
                                            <span className="muted-cell">Not available</span>
                                          ) : (
                                            display
                                          )}
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

              {/* Route 6: Administrative Component CRUD Management */}
              <Route
                path="/admin/components"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminComponentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all: Friendly 404 page for unknown URLs */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
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
