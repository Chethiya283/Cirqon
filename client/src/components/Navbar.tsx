import React, { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
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

interface NavbarProps {
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
 * 
 * VIVA EXPLANATION:
 * - Uses React Router's `NavLink` for navigation links. `NavLink` automatically
 *   detects if its destination matches the current browser URL (`isActive`)
 *   and applies the `.active` CSS class without requiring manual state tracking.
 * - The URL is the single source of truth for the active page.
 */
export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  compareCount = 0,
}) => {
  const navigate = useNavigate();
  // Local state controlling the mobile slide-down menu drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // When user interacts with search on another page, navigate to library
  const handleSearchFocus = () => {
    if (window.location.pathname !== "/library") {
      navigate("/library");
    }
  };

  return (
    <header className="site-header">
      <div className="site-header-container">
        {/* Brand Logo & Title Link */}
        <Link
          to="/library"
          className="brand-identity"
          title="Cirqon — Engineering Parts Discovery Home"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="brand-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="var(--cq-emerald)" strokeWidth="2" />
              <path d="M12 7V12L15 15" stroke="var(--cq-emerald)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="7" r="1.5" fill="var(--cq-emerald)" />
              <circle cx="15" cy="15" r="1.5" fill="var(--cq-emerald)" />
            </svg>
          </div>
          <span className="brand-title">Cirqon</span>
          <span className="brand-tag">Engineering</span>
        </Link>

        {/* Primary Desktop Navigation (Uses NavLink for automated active state) */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <NavLink
            to="/library"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Layers size={16} aria-hidden="true" />
            <span>Library</span>
          </NavLink>

          <NavLink
            to="/compare"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <GitCompare size={16} aria-hidden="true" />
            <span>Compare</span>
            {compareCount > 0 && (
              <span className="nav-compare-count" title={`${compareCount} components selected`}>
                {compareCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/pcb"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <Cpu size={16} aria-hidden="true" />
            <span>PCB Assistant</span>
          </NavLink>
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
            onFocus={handleSearchFocus}
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

        {/* Authentication Buttons (UI Only until Step 5) */}
        <div className="header-auth-group">
          <button
            type="button"
            className="btn-auth-text"
            title="Log in to Cirqon (Coming in Step 5)"
          >
            <LogIn size={15} aria-hidden="true" />
            <span>Log in</span>
          </button>

          <button
            type="button"
            className="btn-auth-primary"
            title="Create an account (Coming in Step 5)"
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
              onFocus={handleSearchFocus}
              aria-label="Search components in mobile menu"
            />
          </div>

          <div className="mobile-links">
            <NavLink
              to="/library"
              className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Layers size={18} aria-hidden="true" />
              <span>Component Library</span>
            </NavLink>

            <NavLink
              to="/compare"
              className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <GitCompare size={18} aria-hidden="true" />
              <span>Component Compare</span>
              {compareCount > 0 && (
                <span className="nav-compare-count">{compareCount}</span>
              )}
            </NavLink>

            <NavLink
              to="/pcb"
              className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Cpu size={18} aria-hidden="true" />
              <span>PCB Design Assistant</span>
            </NavLink>
          </div>

          <div className="mobile-auth-group">
            <button
              type="button"
              className="btn-auth-text mobile-auth-btn"
              title="Coming in Step 5"
            >
              <LogIn size={16} aria-hidden="true" />
              <span>Log in</span>
            </button>

            <button
              type="button"
              className="btn-auth-primary mobile-auth-btn"
              title="Coming in Step 5"
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
