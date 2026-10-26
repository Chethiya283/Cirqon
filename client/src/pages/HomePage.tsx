// Public home landing page featuring a two-column hero with PCB trace background art,
// a real component photo collage, featured parts matrix, category taxonomy, and workflow pipeline.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Layers,
  Cpu,
  GitCompare,
  ArrowRight,
  Bookmark,
  UserPlus,
  Activity,
  BatteryCharging,
  Radio,
  Sun,
  Grid,
  Zap,
  Plug,
  Shield,
} from "lucide-react";
import type { ComponentData } from "../types";
import { useAuth } from "../auth/AuthContext";
import { ComponentThumbnail } from "../ComponentImage";
import { VERIFIED_PRODUCT_PHOTOS } from "../componentImageUtils";
import { getSpecPairs } from "../utils/formatters";
import "./HomePage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * FEATURED_MPNS: Configurable list of Manufacturer Part Numbers to highlight on the homepage.
 * - Used for both the hero collage and the featured components grid.
 * - Real data only: if a part is missing from the database or lacks imagery, it is skipped.
 */
const FEATURED_MPNS: string[] = [
  "NE555",
  "LM358",
  "LM7805",
  "1N4007",
  "BC547",
  "1N4148",
];

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

/**
 * Return a clean Lucide icon for each electronic component category.
 */
function getCategoryLucideIcon(categoryName: string) {
  switch (categoryName) {
    case "All Components":
      return <Layers size={22} aria-hidden="true" />;
    case "Resistors":
      return <Activity size={22} aria-hidden="true" />;
    case "Capacitors":
      return <BatteryCharging size={22} aria-hidden="true" />;
    case "Inductors":
      return <Radio size={22} aria-hidden="true" />;
    case "Diodes and LEDs":
      return <Sun size={22} aria-hidden="true" />;
    case "BJTs and MOSFETs":
      return <Cpu size={22} aria-hidden="true" />;
    case "Integrated circuits (ICs)":
      return <Grid size={22} aria-hidden="true" />;
    case "Voltage regulators":
      return <Zap size={22} aria-hidden="true" />;
    case "Connectors":
      return <Plug size={22} aria-hidden="true" />;
    case "Switches and protection components":
      return <Shield size={22} aria-hidden="true" />;
    default:
      return <Layers size={22} aria-hidden="true" />;
  }
}

/**
 * HomePage Component
 * 
 * VIVA EXPLANATION:
 * 1. Two-Column Hero Architecture:
 *    Desktop displays a balanced two-column hero: left column provides search and primary
 *    navigation actions; right column presents a 4:3 ratio component photo collage with
 *    subtle layering for physical depth.
 * 
 * 2. Real Data & Authentic Imagery:
 *    Components are filtered from `FEATURED_MPNS` against real database records. Fallback
 *    to procedural vector package illustrations prevents broken UI states without fake images.
 * 
 * 3. Low-Contrast Decorative SVG Background:
 *    The PCB trace inline SVG uses 45°/90° routing lines, annular vias, and SMD footprints
 *    with a restrained 8% opacity tint to guarantee WCAG AA contrast for text readability.
 * 
 * 4. Progressive Accessibility:
 *    Animations respect `prefers-reduced-motion` media queries, all interactive elements
 *    maintain visible focus rings, and monospace font is strictly reserved for MPNs and numbers.
 */
export const HomePage: React.FC<HomePageProps> = ({
  categoryCounts,
  categories,
  onSearch,
  onSelectCategory,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [localSearch, setLocalSearch] = useState("");
  const [catalogComponents, setCatalogComponents] = useState<ComponentData[]>([]);

  // Fetch live database components once on mount to populate real featured photos
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_BASE_URL}/components`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ComponentData[]) => {
        if (isMounted && Array.isArray(data)) {
          setCatalogComponents(data);
        }
      })
      .catch((err) => {
        console.error("Failed to load components for homepage:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Filter 3 to 4 real components from the database based on FEATURED_MPNS.
   * If a listed part is missing or lacks imagery, skip it.
   */
  const featuredList = useMemo(() => {
    if (catalogComponents.length === 0) return [];

    // Filter parts matching FEATURED_MPNS that have a real photo or verified photo mapping
    const matched = FEATURED_MPNS.map((mpn) =>
      catalogComponents.find(
        (c) => c.partNumber.toUpperCase() === mpn.toUpperCase()
      )
    ).filter(
      (c): c is ComponentData =>
        Boolean(c) && Boolean(c?.imageUrl || VERIFIED_PRODUCT_PHOTOS[c?.partNumber || ""])
    );

    // If fewer than 4 matched, supplement with any catalog parts with photos
    if (matched.length < 4) {
      const remaining = catalogComponents.filter(
        (c) =>
          !matched.some((m) => m._id === c._id) &&
          (c.imageUrl || VERIFIED_PRODUCT_PHOTOS[c.partNumber])
      );
      return [...matched, ...remaining].slice(0, 4);
    }

    return matched.slice(0, 4);
  }, [catalogComponents]);

  /**
   * Handle search submission: sets global search in App.tsx and navigates to /library.
   */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch.trim());
    navigate("/library");
  };

  /**
   * Handle category click: sets active category filter and navigates to /library.
   */
  const handleCategoryClick = (categoryName: string) => {
    onSelectCategory(categoryName);
    navigate("/library");
  };

  /**
   * Navigate directly to a specific component search in the library.
   */
  const handleOpenPart = (partNumber: string) => {
    onSearch(partNumber);
    navigate("/library");
  };

  return (
    <div className="home-page">
      {/* ========================================================
          1. Hero Section (Two-Column on Desktop, Stacked on Mobile)
          
          VIVA EXPLANATION:
          - The background photo is applied purely as a CSS background-image in HomePage.css
            rather than an <img> tag because it is decorative ambiance. Screen readers
            appropriately skip CSS backgrounds.
          - A flat semi-transparent overlay using the --cq-bg token (86% opacity) is applied
            via ::before to guarantee WCAG AA contrast (4.5:1+) for dark navy text over the image.
          ======================================================== */}
      <section className="home-hero-section" aria-labelledby="hero-headline">
        <div className="home-hero-layout">
          {/* Left Column: Heading, Search, and Action Buttons */}
          <div className="home-hero-left">
            <div className="home-hero-badge">
              <span className="home-hero-badge-dot" />
              <span>PRECISION ELECTRONIC COMPONENT CATALOGUE</span>
            </div>

            <h1 id="hero-headline" className="home-hero-headline">
              Engineering Parts Discovery &amp; Layout Assistant
            </h1>

            <p className="home-hero-sentence">
              Explore verified technical specifications, parametric CAD footprints,
              and real product imagery for electronic circuit design.
            </p>

            {/* Large Hero Search Box */}
            <form
              className="home-search-form"
              onSubmit={handleSearchSubmit}
              role="search"
            >
              <div className="home-search-input-wrap">
                <Search
                  className="home-search-icon"
                  size={20}
                  aria-hidden="true"
                />
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

            {/* Hero Navigation Buttons */}
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
          </div>

          {/* Right Column: Tidy Collage of 3 to 4 Real Component Photos */}
          <div className="home-hero-right" aria-label="Featured component photos">
            <div className="hero-collage-grid">
              {featuredList.slice(0, 4).map((comp, idx) => (
                <div
                  key={comp._id || comp.partNumber}
                  className={`hero-collage-tile tile-${idx + 1}`}
                  onClick={() => handleOpenPart(comp.partNumber)}
                  title={`View details for ${comp.name} (${comp.partNumber})`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleOpenPart(comp.partNumber);
                  }}
                >
                  <div className="hero-collage-thumb-wrapper">
                    <ComponentThumbnail
                      component={comp}
                      size="lg"
                      showProvenanceBadge={false}
                    />
                  </div>
                  <div className="hero-collage-caption">
                    <span className="hero-collage-mpn mono-num">
                      {comp.partNumber}
                    </span>
                    <span className="hero-collage-mfr">
                      {comp.manufacturer || "Component"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. Featured Components Section (Under Hero)
          ======================================================== */}
      {featuredList.length > 0 && (
        <section
          className="home-featured-section"
          aria-labelledby="featured-heading"
        >
          <div className="home-section-header">
            <div className="home-eyebrow">VERIFIED CATALOGUE</div>
            <h2 id="featured-heading" className="home-section-title">
              Featured Components
            </h2>
            <p className="home-section-desc">
              Essential integrated circuits, semiconductors, and passives with authentic photos and verified parametric specs.
            </p>
          </div>

          <div className="home-featured-grid">
            {featuredList.slice(0, 4).map((comp) => {
              const specPairs = getSpecPairs(comp.specifications, 1);
              const keySpec = specPairs[0];

              return (
                <article
                  key={comp._id || comp.partNumber}
                  className="home-featured-card"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleOpenPart(comp.partNumber);
                  }}
                  aria-label={`${comp.name} (${comp.partNumber})`}
                >
                  <div
                    className="featured-card-thumb-wrap"
                    onClick={() => handleOpenPart(comp.partNumber)}
                  >
                    <ComponentThumbnail
                      component={comp}
                      size="md"
                      showProvenanceBadge
                    />
                  </div>

                  <div className="featured-card-content">
                    <span className="featured-card-mpn mono-num">
                      {comp.partNumber}
                    </span>
                    <h3
                      className="featured-card-name"
                      onClick={() => handleOpenPart(comp.partNumber)}
                      title={comp.name}
                    >
                      {comp.name}
                    </h3>
                    <p className="featured-card-mfr">
                      {comp.manufacturer || "Verified Manufacturer"}
                    </p>

                    {keySpec && (
                      <div className="featured-card-spec">
                        <span className="featured-spec-k">
                          {keySpec.label}:
                        </span>{" "}
                        <span className="featured-spec-v mono-num">
                          {keySpec.value}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="featured-card-footer">
                    <button
                      type="button"
                      className="featured-card-link-btn"
                      onClick={() => handleOpenPart(comp.partNumber)}
                    >
                      <span>Inspect in Library</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================
          3. Real Category Grid (Enhanced with Lucide Icons)
          ======================================================== */}
      <section
        className="home-category-section"
        aria-labelledby="category-heading"
      >
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
                  {/* Soft tinted square with large Lucide icon */}
                  <div className="home-category-icon-box">
                    {getCategoryLucideIcon(category.name)}
                  </div>

                  <span className="home-category-badge">
                    <span className="mono-num">{count}</span>{" "}
                    {count === 1 ? "part" : "parts"}
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

      {/* ========================================================
          4. Three-Step "How It Works" with Original Line-Art SVGs
          ======================================================== */}
      <section
        className="home-workflow-section"
        aria-labelledby="workflow-heading"
      >
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
            <div className="home-workflow-illustration-wrap">
              <svg
                className="home-workflow-illustration"
                viewBox="0 0 80 60"
                fill="none"
                aria-hidden="true"
              >
                {/* Chip outline with pins */}
                <rect
                  x="14"
                  y="16"
                  width="34"
                  height="28"
                  rx="2"
                  stroke="var(--cq-border-strong)"
                  strokeWidth="1.5"
                  fill="var(--cq-surface)"
                />
                <circle cx="20" cy="22" r="1.5" fill="var(--cq-text-muted)" />
                {/* Left pins */}
                <line x1="8" y1="23" x2="14" y2="23" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="30" x2="14" y2="30" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="37" x2="14" y2="37" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                {/* Right pins */}
                <line x1="48" y1="23" x2="54" y2="23" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="48" y1="30" x2="54" y2="30" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="48" y1="37" x2="54" y2="37" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                {/* Magnifier lens focused over the chip */}
                <circle
                  cx="46"
                  cy="28"
                  r="14"
                  stroke="var(--cq-emerald)"
                  strokeWidth="2"
                  fill="var(--cq-surface)"
                  fillOpacity="0.85"
                />
                <line
                  x1="56"
                  y1="38"
                  x2="70"
                  y2="52"
                  stroke="var(--cq-emerald)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="46"
                  cy="28"
                  r="4"
                  stroke="var(--cq-emerald)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              </svg>
            </div>

            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">01</span>
              <div className="home-workflow-icon">
                <Search size={18} aria-hidden="true" />
              </div>
            </div>
            <h3 className="home-workflow-title">Find</h3>
            <p className="home-workflow-body">
              Search components by manufacturer part number (MPN), category, or package.
              Filter by verified parametric ratings and inspect authentic product photographs.
            </p>
          </div>

          {/* Step 2: Compare */}
          <div className="home-workflow-card">
            <div className="home-workflow-illustration-wrap">
              <svg
                className="home-workflow-illustration"
                viewBox="0 0 80 60"
                fill="none"
                aria-hidden="true"
              >
                {/* Left chip */}
                <rect
                  x="8"
                  y="16"
                  width="24"
                  height="28"
                  rx="2"
                  stroke="var(--cq-border-strong)"
                  strokeWidth="1.5"
                  fill="var(--cq-surface)"
                />
                <line x1="3" y1="23" x2="8" y2="23" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="3" y1="30" x2="8" y2="30" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="3" y1="37" x2="8" y2="37" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" />

                {/* Right chip */}
                <rect
                  x="48"
                  y="16"
                  width="24"
                  height="28"
                  rx="2"
                  stroke="var(--cq-emerald)"
                  strokeWidth="1.5"
                  fill="var(--cq-emerald-soft)"
                />
                <line x1="72" y1="23" x2="77" y2="23" stroke="var(--cq-emerald)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="72" y1="30" x2="77" y2="30" stroke="var(--cq-emerald)" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="72" y1="37" x2="77" y2="37" stroke="var(--cq-emerald)" strokeWidth="1.5" strokeLinecap="round" />

                {/* Divergence and comparison lines */}
                <path
                  d="M 36,26 L 43,26 M 40,23 L 43,26 L 40,29"
                  stroke="var(--cq-emerald)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 44,34 L 37,34 M 40,31 L 37,34 L 40,37"
                  stroke="var(--cq-text-muted)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">02</span>
              <div className="home-workflow-icon">
                <GitCompare size={18} aria-hidden="true" />
              </div>
            </div>
            <h3 className="home-workflow-title">Compare</h3>
            <p className="home-workflow-body">
              Select up to 4 components into the matrix to inspect specs side-by-side
              with automatic highlighting of divergent electrical values and tolerances.
            </p>
          </div>

          {/* Step 3: Design */}
          <div className="home-workflow-card">
            <div className="home-workflow-illustration-wrap">
              <svg
                className="home-workflow-illustration"
                viewBox="0 0 80 60"
                fill="none"
                aria-hidden="true"
              >
                {/* Silkscreen outline */}
                <rect
                  x="18"
                  y="12"
                  width="44"
                  height="36"
                  rx="2"
                  stroke="var(--cq-border-strong)"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                  fill="var(--cq-surface-subtle)"
                />
                {/* Pin 1 dot */}
                <circle cx="24" cy="18" r="2" fill="var(--cq-emerald)" />
                {/* Left SMT pads */}
                <rect x="10" y="16" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2" />
                <rect x="10" y="24" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2" />
                <rect x="10" y="32" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2" />
                <rect x="10" y="40" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2" />
                {/* Right SMT pads */}
                <rect x="64" y="16" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2" />
                <rect x="64" y="24" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2" />
                <rect x="64" y="32" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2" />
                <rect x="64" y="40" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2" />
                {/* Pitch dimension line */}
                <line x1="6" y1="24" x2="6" y2="32" stroke="var(--cq-blue)" strokeWidth="1" />
                <line x1="4" y1="24" x2="8" y2="24" stroke="var(--cq-blue)" strokeWidth="1" />
                <line x1="4" y1="32" x2="8" y2="32" stroke="var(--cq-blue)" strokeWidth="1" />
              </svg>
            </div>

            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">03</span>
              <div className="home-workflow-icon">
                <Cpu size={18} aria-hidden="true" />
              </div>
            </div>
            <h3 className="home-workflow-title">Design</h3>
            <p className="home-workflow-body">
              Verify CAD body dimensions, pin counts, lead pitch, and procedural
              SVG footprint diagrams directly before laying out printed circuit boards.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. Call To Action Restrained Band
          ======================================================== */}
      <section className="home-cta-section" aria-labelledby="cta-heading">
        <div className="home-cta-content">
          <div className="home-eyebrow">GET STARTED</div>
          <h2 id="cta-heading" className="home-cta-title">
            Ready to accelerate your circuit design?
          </h2>
          <p className="home-cta-desc">
            Discover verified electronic components, analyze side-by-side parametric
            matrices, and inspect procedural CAD layout footprints.
          </p>
        </div>

        <div className="home-cta-actions">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => navigate("/library")}
          >
            <Layers size={18} aria-hidden="true" />
            <span>Browse Components</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>

          {user ? (
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => navigate("/my-parts")}
            >
              <Bookmark size={18} aria-hidden="true" />
              <span>My Saved Parts</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => navigate("/register")}
            >
              <UserPlus size={18} aria-hidden="true" />
              <span>Create a free account</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
