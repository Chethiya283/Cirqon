import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Layers, Cpu, GitCompare, ArrowRight, Bookmark, UserPlus, Activity, BatteryCharging, Radio, Sun, Grid, Zap, Plug, Shield, } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./HomePage.css";
function getCategoryLucideIcon(categoryName) {
    switch (categoryName) {
        case "All Components":
            return <Layers size={22} aria-hidden="true"/>;
        case "Resistors":
            return <Activity size={22} aria-hidden="true"/>;
        case "Capacitors":
            return <BatteryCharging size={22} aria-hidden="true"/>;
        case "Inductors":
            return <Radio size={22} aria-hidden="true"/>;
        case "Diodes and LEDs":
            return <Sun size={22} aria-hidden="true"/>;
        case "BJTs and MOSFETs":
            return <Cpu size={22} aria-hidden="true"/>;
        case "Integrated circuits (ICs)":
            return <Grid size={22} aria-hidden="true"/>;
        case "Voltage regulators":
            return <Zap size={22} aria-hidden="true"/>;
        case "Connectors":
            return <Plug size={22} aria-hidden="true"/>;
        case "Switches and protection components":
            return <Shield size={22} aria-hidden="true"/>;
        default:
            return <Layers size={22} aria-hidden="true"/>;
    }
}
export const HomePage = ({ categoryCounts, categories, onSearch, onSelectCategory, }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [localSearch, setLocalSearch] = useState("");
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        onSearch(localSearch.trim());
        navigate("/library");
    };
    const handleCategoryClick = (categoryName) => {
        onSelectCategory(categoryName);
        navigate("/library");
    };
    return (<div className="home-page">
      <section className="home-hero-section" aria-labelledby="hero-headline">
        <div className="home-hero-content">
          <div className="home-hero-badge">
            <span className="home-hero-badge-dot"/>
            <span>Electronic Component Catalogue</span>
          </div>

          <h1 id="hero-headline" className="home-hero-headline">
            Electronic Component Catalogue &amp; PCB Assistant
          </h1>

          <p className="home-hero-sentence">
            Browse and compare electronic components, inspect footprints,
            and reference technical datasheets.
          </p>

          <form className="home-search-form" onSubmit={handleSearchSubmit} role="search">
            <div className="home-search-input-wrap">
              <Search className="home-search-icon" size={20} aria-hidden="true"/>
              <input type="text" className="home-search-input" placeholder="Search by part number, manufacturer, or keyword (e.g., NE555, LM7805)..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} aria-label="Search components by part number, manufacturer, or keyword"/>
              {localSearch && (<button type="button" className="home-search-clear" onClick={() => setLocalSearch("")} aria-label="Clear search query">
                  <X size={16} aria-hidden="true"/>
                </button>)}
            </div>
            <button type="submit" className="home-search-submit">
              Search Catalogue
            </button>
          </form>

          <div className="home-hero-actions">
            <button type="button" className="btn-hero-primary" onClick={() => navigate("/library")}>
              <Layers size={18} aria-hidden="true"/>
              <span>Browse Components</span>
              <ArrowRight size={16} aria-hidden="true"/>
            </button>

            <button type="button" className="btn-hero-secondary" onClick={() => navigate("/pcb")}>
              <Cpu size={18} aria-hidden="true"/>
              <span>Open PCB Assistant</span>
            </button>
          </div>
        </div>
      </section>

      <section className="home-category-section" aria-labelledby="category-heading">
        <div className="home-section-header">
          <div className="home-eyebrow">Categories</div>
          <h2 id="category-heading" className="home-section-title">
            Explore Component Families
          </h2>
          <p className="home-section-desc">
            Browse components by category.
          </p>
        </div>

        <div className="home-category-grid">
          {categories.map((category) => {
            const count = categoryCounts[category.name] ?? 0;
            return (<button key={category.name} type="button" className="home-category-card" onClick={() => handleCategoryClick(category.name)} title={`Explore ${category.name} (${count} items in database)`}>
                <div className="home-category-header">
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
              </button>);
        })}
        </div>
      </section>

      <section className="home-workflow-section" aria-labelledby="workflow-heading">
        <div className="home-section-header">
          <div className="home-eyebrow">Workflow</div>
          <h2 id="workflow-heading" className="home-section-title">
            How It Works
          </h2>
          <p className="home-section-desc">
            A structured workflow connecting component selection directly to physical PCB design.
          </p>
        </div>

        <div className="home-workflow-row">
          <div className="home-workflow-card">
            <div className="home-workflow-illustration-wrap">
              <svg className="home-workflow-illustration" viewBox="0 0 80 60" fill="none" aria-hidden="true">
                <rect x="14" y="16" width="34" height="28" rx="2" stroke="var(--cq-border-strong)" strokeWidth="1.5" fill="var(--cq-surface)"/>
                <circle cx="20" cy="22" r="1.5" fill="var(--cq-text-muted)"/>
                <line x1="8" y1="23" x2="14" y2="23" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8" y1="30" x2="14" y2="30" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8" y1="37" x2="14" y2="37" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="48" y1="23" x2="54" y2="23" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="48" y1="30" x2="54" y2="30" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="48" y1="37" x2="54" y2="37" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="46" cy="28" r="14" stroke="var(--cq-emerald)" strokeWidth="2" fill="var(--cq-surface)" fillOpacity="0.85"/>
                <line x1="56" y1="38" x2="70" y2="52" stroke="var(--cq-emerald)" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="46" cy="28" r="4" stroke="var(--cq-emerald)" strokeWidth="1" strokeDasharray="2 2"/>
              </svg>
            </div>

            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">01</span>
              <div className="home-workflow-icon">
                <Search size={18} aria-hidden="true"/>
              </div>
            </div>
            <h3 className="home-workflow-title">Find</h3>
            <p className="home-workflow-body">
              Search components by manufacturer part number (MPN), category, or package.
              Filter by specifications and inspect package dimensions.
            </p>
          </div>

          <div className="home-workflow-card">
            <div className="home-workflow-illustration-wrap">
              <svg className="home-workflow-illustration" viewBox="0 0 80 60" fill="none" aria-hidden="true">
                <rect x="8" y="16" width="24" height="28" rx="2" stroke="var(--cq-border-strong)" strokeWidth="1.5" fill="var(--cq-surface)"/>
                <line x1="3" y1="23" x2="8" y2="23" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="3" y1="30" x2="8" y2="30" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="3" y1="37" x2="8" y2="37" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round"/>

                <rect x="48" y="16" width="24" height="28" rx="2" stroke="var(--cq-emerald)" strokeWidth="1.5" fill="var(--cq-emerald-soft)"/>
                <line x1="72" y1="23" x2="77" y2="23" stroke="var(--cq-emerald)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="72" y1="30" x2="77" y2="30" stroke="var(--cq-emerald)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="72" y1="37" x2="77" y2="37" stroke="var(--cq-emerald)" strokeWidth="1.5" strokeLinecap="round"/>

                <path d="M 36,26 L 43,26 M 40,23 L 43,26 L 40,29" stroke="var(--cq-emerald)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M 44,34 L 37,34 M 40,31 L 37,34 L 40,37" stroke="var(--cq-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">02</span>
              <div className="home-workflow-icon">
                <GitCompare size={18} aria-hidden="true"/>
              </div>
            </div>
            <h3 className="home-workflow-title">Compare</h3>
            <p className="home-workflow-body">
              Select up to 4 components to compare specifications side-by-side
              with highlighting of differing values.
            </p>
          </div>

          <div className="home-workflow-card">
            <div className="home-workflow-illustration-wrap">
              <svg className="home-workflow-illustration" viewBox="0 0 80 60" fill="none" aria-hidden="true">
                <rect x="18" y="12" width="44" height="36" rx="2" stroke="var(--cq-border-strong)" strokeWidth="1" strokeDasharray="3 2" fill="var(--cq-surface-subtle)"/>
                <circle cx="24" cy="18" r="2" fill="var(--cq-emerald)"/>
                <rect x="10" y="16" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2"/>
                <rect x="10" y="24" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2"/>
                <rect x="10" y="32" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2"/>
                <rect x="10" y="40" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2"/>
                <rect x="64" y="16" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2"/>
                <rect x="64" y="24" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2"/>
                <rect x="64" y="32" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2"/>
                <rect x="64" y="40" width="6" height="4" rx="0.5" fill="var(--cq-emerald-soft)" stroke="var(--cq-emerald)" strokeWidth="1.2"/>
                <line x1="6" y1="24" x2="6" y2="32" stroke="var(--cq-blue)" strokeWidth="1"/>
                <line x1="4" y1="24" x2="8" y2="24" stroke="var(--cq-blue)" strokeWidth="1"/>
                <line x1="4" y1="32" x2="8" y2="32" stroke="var(--cq-blue)" strokeWidth="1"/>
              </svg>
            </div>

            <div className="home-workflow-top">
              <span className="home-workflow-step mono-num">03</span>
              <div className="home-workflow-icon">
                <Cpu size={18} aria-hidden="true"/>
              </div>
            </div>
            <h3 className="home-workflow-title">Design</h3>
            <p className="home-workflow-body">
              Check package dimensions, pin counts, lead pitch, and
              footprint drawings before PCB layout.
            </p>
          </div>
        </div>
      </section>

      <section className="home-cta-section" aria-labelledby="cta-heading">
        <div className="home-cta-content">
          <div className="home-eyebrow">Get started</div>
          <h2 id="cta-heading" className="home-cta-title">
            Start exploring the catalogue
          </h2>
          <p className="home-cta-desc">
            Browse the component catalogue, compare specifications,
            and inspect package footprints.
          </p>
        </div>

        <div className="home-cta-actions">
          <button type="button" className="btn-hero-primary" onClick={() => navigate("/library")}>
            <Layers size={18} aria-hidden="true"/>
            <span>Browse Components</span>
            <ArrowRight size={16} aria-hidden="true"/>
          </button>

          {user ? (<button type="button" className="btn-hero-secondary" onClick={() => navigate("/my-parts")}>
              <Bookmark size={18} aria-hidden="true"/>
              <span>My Saved Parts</span>
            </button>) : (<button type="button" className="btn-hero-secondary" onClick={() => navigate("/register")}>
              <UserPlus size={18} aria-hidden="true"/>
              <span>Create a free account</span>
            </button>)}
        </div>
      </section>
    </div>);
};
