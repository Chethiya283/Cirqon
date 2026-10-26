// Public home landing page featuring a restrained hero search, real category matrix, and engineering workflow overview.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Layers, Cpu, GitCompare, ArrowRight } from "lucide-react";
import "./HomePage.css";

/**
 * Props for the HomePage component.
 * 
 * VIVA EXPLANATION:
 * - `categoryCounts` and `categories` are passed down from App.tsx where they are derived
 *   from real MongoDB database records. No mock or hardcoded statistics are displayed.
 * - `onSearch` and `onSelectCategory` communicate state changes back up to the root,
 *   ensuring that navigating to /library immediately applies the user's intent.
 */
export interface HomePageProps {
  /** Record mapping each category name to its live count of components in MongoDB */
  categoryCounts: Record<string, number>;
  /** Real category metadata (name, icon) configured in App.tsx */
  categories: { name: string; icon: string }[];
  /** Callback to set the active search query in App.tsx */
  onSearch: (query: string) => void;
  /** Callback to select a category filter in App.tsx */
  onSelectCategory: (categoryName: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  categoryCounts,
  categories,
  onSearch,
  onSelectCategory,
}) => {
  const navigate = useNavigate();
  // Local state for the hero search input before submitting
  const [localSearch, setLocalSearch] = useState("");

  /**
   * Handle form submission for the hero search box.
   * Updates global search state and routes to /library.
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch.trim());
    navigate("/library");
  };

  /**
   * Handle clicking a category card.
   * Sets the selected category filter and routes to /library.
   */
  const handleCategoryClick = (categoryName: string) => {
    onSelectCategory(categoryName);
    navigate("/library");
  };

  return (
    <div className="home-page">
      {/* 1. Restrained Hero Section */}
      <section className="home-hero-section" aria-labelledby="hero-headline">
        <div className="home-hero-badge">
          <span className="home-hero-badge-dot" />
          <span>PRECISION ELECTRONIC COMPONENT CATALOGUE</span>
        </div>

        <h1 id="hero-headline" className="home-hero-headline">
          Engineering Parts Discovery &amp; Layout Assistant
        </h1>

        <p className="home-hero-sentence">
          Explore verified technical specifications, parametric CAD footprints, and real product imagery for electronic circuit design.
        </p>

        {/* Large Hero Search Box */}
        <form className="home-search-form" onSubmit={handleSearchSubmit} role="search">
          <div className="home-search-input-wrap">
            <Search className="home-search-icon" size={20} aria-hidden="true" />
            <input
              type="text"
              className="home-search-input"
              placeholder="Search by part number, manufacturer, or keyword (e.g., NE555, LM7805)..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              aria-label="Search components by part number, manufacturer, or keyword"
            />
            {localSearch && (
              <button
                type="button"
                className="home-search-clear"
                onClick={() => setLocalSearch("")}
                aria-label="Clear search query"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <button type="submit" className="home-search-submit">
            Search Catalogue
          </button>
        </form>

        {/* Hero Call-To-Action Buttons */}
        <div className="home-hero-actions">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => navigate("/library")}
          >
            <Layers size={18} aria-hidden="true" />
            <span>Browse Components</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="btn-hero-secondary"
            onClick={() => navigate("/pcb")}
          >
            <Cpu size={18} aria-hidden="true" />
            <span>Open PCB Assistant</span>
          </button>
        </div>
      </section>

      {/* 2. Real Category Grid */}
      <section className="home-category-section" aria-labelledby="category-heading">
        <div className="home-section-header">
          <div className="home-eyebrow">COMPONENT TAXONOMY</div>
          <h2 id="category-heading" className="home-section-title">
            Explore Component Families
          </h2>
          <p className="home-section-desc">
            Browse verified parts organized by electronic component class with direct parametric inventory counts.
          </p>
        </div>

        <div className="home-category-grid">
          {categories.map((category) => {
            const count = categoryCounts[category.name] ?? 0;
            return (
              <button
                key={category.name}
                type="button"
                className="home-category-card"
                onClick={() => handleCategoryClick(category.name)}
                title={`Explore ${category.name} (${count} items in database)`}
              >
                <div className="home-category-header">
                  <span className="home-category-icon" aria-hidden="true">
                    {category.icon}
                  </span>
                  <span className="home-category-badge">
                    <span className="mono-num">{count}</span> {count === 1 ? "part" : "parts"}
                  </span>
                </div>
                <h3 className="home-category-name">{category.name}</h3>
                <span className="home-category-link">
                  Explore family <span>→</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Three-Step "How It Works" Section */}
      <section className="home-workflow-section" aria-labelledby="workflow-heading">
        <div className="home-section-header">
          <div className="home-eyebrow">ENGINEERING PIPELINE</div>
          <h2 id="workflow-heading" className="home-section-title">
            How It Works
          </h2>
          <p className="home-section-desc">
            A structured workflow connecting component selection directly to physical PCB design.
          </p>
        </div>

        <div className="home-workflow-row">
          {/* Step 1: Find */}
          <div className="home-workflow-card">
            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">01</span>
              <div className="home-workflow-icon">
                <Search size={20} aria-hidden="true" />
              </div>
            </div>
            <h3 className="home-workflow-title">Find</h3>
            <p className="home-workflow-body">
              Search components by manufacturer part number (MPN), category, or package. Filter by verified parametric ratings and view authentic product photographs.
            </p>
          </div>

          {/* Step 2: Compare */}
          <div className="home-workflow-card">
            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">02</span>
              <div className="home-workflow-icon">
                <GitCompare size={20} aria-hidden="true" />
              </div>
            </div>
            <h3 className="home-workflow-title">Compare</h3>
            <p className="home-workflow-body">
              Select up to 4 components into the compare tray to inspect specs side-by-side with automatic highlighting of divergent electrical values and tolerances.
            </p>
          </div>

          {/* Step 3: Design */}
          <div className="home-workflow-card">
            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">03</span>
              <div className="home-workflow-icon">
                <Cpu size={20} aria-hidden="true" />
              </div>
            </div>
            <h3 className="home-workflow-title">Design</h3>
            <p className="home-workflow-body">
              Verify CAD body dimensions, pin counts, lead pitch, and procedural SVG footprint diagrams directly before laying out printed circuit boards.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

