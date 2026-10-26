import React, { useState } from "react";
import {
  Search,
  Menu,
  X,
  Layers,
  GitCompare,
  Cpu,
  LogIn,
  UserPlus,
} from "lucide-react";
import "./Navbar.css";

/**
 * Navigation View Type
 * Defines the main reachable destinations within Cirqon.
 */
export type NavView = "home" | "library" | "compare" | "pcb" | "login" | "register";

interface NavbarProps {
  /** Current active view/tab in the application */
  activeView: string;
  /** Callback triggered when a user selects a navigation destination */
  onNavigate: (view: NavView) => void;
  /** Current global search query string */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Number of components currently selected in the compare tray */
  compareCount?: number;
}

/**
 * Navbar Component
 * 
 * Shared top navigation bar for Cirqon.
 * Responsibilities:
 * 1. Brand identity (logo + name).
 * 2. Primary section navigation (Library, Compare, PCB Assistant).
 * 3. Global quick-search input.
 * 4. Auth action triggers (Log in / Sign up).
 * 5. Responsive mobile menu toggle & drawer for small screens (< 768px).
 */
export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  searchQuery,
  onSearchChange,
  compareCount = 0,
}) => {
  // Local state controlling the mobile slide-down menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to handle navigation and close mobile menu simultaneously
  const handleNavClick = (view: NavView) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="site-header-container">
        {/* Brand Logo & Title */}
        <div
          className="brand-identity"
          onClick={() => handleNavClick("home")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleNavClick("home");
          }}
          title="Cirqon — Engineering Parts Discovery Home"
        >
          <div className="brand-logo-icon">
            {/* Minimal PCB trace mark */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="var(--cq-emerald)" strokeWidth="2" />
              <path d="M12 7V12L15 15" stroke="var(--cq-emerald)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="7" r="1.5" fill="var(--cq-emerald)" />
              <circle cx="15" cy="15" r="1.5" fill="var(--cq-emerald)" />
            </svg>
          </div>
          <span className="brand-title">Cirqon</span>
          <span className="brand-tag">Engineering</span>
        </div>

        {/* Primary Desktop Navigation Links */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-link ${activeView === "library" ? "active" : ""}`}
            onClick={() => handleNavClick("library")}
          >
            <Layers size={16} aria-hidden="true" />
            <span>Library</span>
          </button>

          <button
            type="button"
            className={`nav-link ${activeView === "compare" ? "active" : ""}`}
            onClick={() => handleNavClick("compare")}
          >
            <GitCompare size={16} aria-hidden="true" />
            <span>Compare</span>
            {compareCount > 0 && (
              <span className="nav-compare-count" title={`${compareCount} components selected`}>
                {compareCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`nav-link ${activeView === "pcb" ? "active" : ""}`}
            onClick={() => handleNavClick("pcb")}
          >
            <Cpu size={16} aria-hidden="true" />
            <span>PCB Assistant</span>
          </button>
        </nav>

        {/* Prominent Quick-Search Bar */}
        <div className="header-search-wrapper">
          <Search size={16} className="header-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Search by part number or keyword..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => {
              // If user focuses search and is on home or compare, switch to library
              if (activeView !== "library") {
                onNavigate("library");
              }
            }}
            aria-label="Search components by part number or keyword"
          />
          {searchQuery && (
            <button
              type="button"
              className="header-search-clear"
              onClick={() => onSearchChange("")}
              title="Clear search"
              aria-label="Clear search query"
            >
              ×
            </button>
          )}
        </div>

        {/* Authentication Buttons (UI Only in this task) */}
        <div className="header-auth-group">
          <button
            type="button"
            className="btn-auth-text"
            onClick={() => handleNavClick("login")}
            title="Log in to Cirqon"
          >
            <LogIn size={15} aria-hidden="true" />
            <span>Log in</span>
          </button>

          <button
            type="button"
            className="btn-auth-primary"
            onClick={() => handleNavClick("register")}
            title="Create an account"
          >
            <UserPlus size={15} aria-hidden="true" />
            <span>Sign up</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Collapsible Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div className="mobile-search-wrapper">
            <Search size={16} className="header-search-icon" aria-hidden="true" />
            <input
              type="text"
              className="header-search-input"
              placeholder="Search components or MPN..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search components in mobile menu"
            />
          </div>

          <div className="mobile-links">
            <button
              type="button"
              className={`mobile-nav-link ${activeView === "library" ? "active" : ""}`}
              onClick={() => handleNavClick("library")}
            >
              <Layers size={18} aria-hidden="true" />
              <span>Component Library</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-link ${activeView === "compare" ? "active" : ""}`}
              onClick={() => handleNavClick("compare")}
            >
              <GitCompare size={18} aria-hidden="true" />
              <span>Component Compare</span>
              {compareCount > 0 && (
                <span className="nav-compare-count">{compareCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`mobile-nav-link ${activeView === "pcb" ? "active" : ""}`}
              onClick={() => handleNavClick("pcb")}
            >
              <Cpu size={18} aria-hidden="true" />
              <span>PCB Design Assistant</span>
            </button>
          </div>

          <div className="mobile-auth-group">
            <button
              type="button"
              className="btn-auth-text mobile-auth-btn"
              onClick={() => handleNavClick("login")}
            >
              <LogIn size={16} aria-hidden="true" />
              <span>Log in</span>
            </button>

            <button
              type="button"
              className="btn-auth-primary mobile-auth-btn"
              onClick={() => handleNavClick("register")}
            >
              <UserPlus size={16} aria-hidden="true" />
              <span>Sign up</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

