
import { useEffect, useState } from "react";
import "./App.css";

type ComponentData = {
  _id: string;
  partNumber: string;
  name: string;
  category: string;
  manufacturer: string;
  description: string;
  package?: {
    name?: string;
  };
  dataStatus: "verified" | "incomplete";
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchComponents() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `http://localhost:5000/api/components?search=${encodeURIComponent(search)}`
        );

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
  }, [search]);

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

        <button className="nav-item active">
          <span>▦</span> Component Library
        </button>

        <button className="nav-item">
          <span>⇄</span> Component Compare
        </button>

        <button className="nav-item">
          <span>⌘</span> PCB Design Assistant
        </button>

        <div className="sidebar-label category-heading">CATEGORIES</div>

        <nav className="category-list">
          {categories.map((category, index) => (
            <button
              className={
                index === 0
                  ? "category-item selected"
                  : "category-item"
              }
              key={category.name}
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
            Workspace <span>/</span> <strong>Component Library</strong>
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
          </section>

          <div className="section-heading">
            <div>
              <h2>Explore components</h2>
              <p>Components from your Cirqon database</p>
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
              <p className="empty-message">
                Loading components...
              </p>
            ) : error ? (
              <p className="error-message">{error}</p>
            ) : components.length === 0 ? (
              <p className="empty-message">
                No components found. Try another search.
              </p>
            ) : (
              components.map((component) => (
                <article
                  className="component-card"
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

                  <p className="part-number">
                    {component.partNumber}
                  </p>

                  <p className="component-description">
                    {component.description ||
                      "No description available."}
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

                  <button className="details-button" type="button">
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
            <span>
              Built for electronics discovery and PCB design
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
