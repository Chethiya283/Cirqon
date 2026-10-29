import React, { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { Search, Menu, X, Layers, GitCompare, Cpu, Bookmark, LogIn, UserPlus, User, LogOut, SlidersHorizontal, } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { CirqonLogo } from "../common/CirqonLogo";
import "./Navbar.css";
export const Navbar = ({ searchQuery, onSearchChange, compareCount = 0, }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const handleSearchFocus = () => {
        if (window.location.pathname !== "/library") {
            navigate("/library");
        }
    };
    return (<header className="site-header">
      <div className="site-header-container">
        <div className="site-header-left">
          <Link to="/" className="brand-identity" title="Cirqon — Electronic Component Catalogue & PCB Assistant" onClick={() => setIsMobileMenuOpen(false)} aria-label="Cirqon — Return to homepage">
            <CirqonLogo size="md"/>
          </Link>

          <span className="header-brand-divider" aria-hidden="true"/>

          <nav className="desktop-nav" aria-label="Main Navigation">
            <NavLink to="/library" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Layers size={16} strokeWidth={1.75} className="nav-link-icon" aria-hidden="true"/>
              <span>Library</span>
            </NavLink>

            <NavLink to="/compare" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <GitCompare size={16} strokeWidth={1.75} className="nav-link-icon" aria-hidden="true"/>
              <span>Compare</span>
              {compareCount > 0 && (<span className="nav-compare-count" title={`${compareCount} components selected`}>
                  {compareCount}
                </span>)}
            </NavLink>

            <NavLink to="/pcb" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <Cpu size={16} strokeWidth={1.75} className="nav-link-icon" aria-hidden="true"/>
              <span>PCB Assistant</span>
            </NavLink>

            {user && (<NavLink to="/my-parts" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                <Bookmark size={16} strokeWidth={1.75} className="nav-link-icon" aria-hidden="true"/>
                <span>My Parts</span>
              </NavLink>)}

            {user?.role === "admin" && (<NavLink to="/admin/components" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                <SlidersHorizontal size={16} strokeWidth={1.75} className="nav-link-icon" aria-hidden="true"/>
                <span>Manage</span>
              </NavLink>)}
          </nav>
        </div>

        <div className="header-search-wrapper">
          <Search size={16} strokeWidth={1.75} className="header-search-icon" aria-hidden="true"/>
          <input type="text" className="header-search-input" placeholder="Search by part number or keyword..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} onFocus={handleSearchFocus} aria-label="Search components by part number or keyword"/>
          {searchQuery && (<button type="button" className="header-search-clear" onClick={() => onSearchChange("")} title="Clear search" aria-label="Clear search query">
              ×
            </button>)}
        </div>

        <div className="header-auth-group">
          {user ? (<>
              <div className="nav-user-identity" title={`Signed in as ${user.email}`}>
                <User size={16} strokeWidth={1.75} aria-hidden="true"/>
                <span className="nav-user-name">{user.name}</span>
              </div>
              <button type="button" className="btn-auth-text" onClick={logout} title="Log out of Cirqon">
                <LogOut size={16} strokeWidth={1.75} aria-hidden="true"/>
                <span>Log out</span>
              </button>
            </>) : (<>
              <Link to="/login" className="btn-auth-text" title="Log in to Cirqon">
                <LogIn size={16} strokeWidth={1.75} aria-hidden="true"/>
                <span>Log in</span>
              </Link>

              <Link to="/register" className="btn-auth-primary" title="Create an account">
                <UserPlus size={16} strokeWidth={1.75} aria-hidden="true"/>
                <span>Sign up</span>
              </Link>
            </>)}
        </div>

        <button type="button" className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen((prev) => !prev)} aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={isMobileMenuOpen}>
          {isMobileMenuOpen ? <X size={20} strokeWidth={1.75}/> : <Menu size={20} strokeWidth={1.75}/>}
        </button>
      </div>

      {isMobileMenuOpen && (<div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          <div className="mobile-search-wrapper">
            <Search size={16} className="header-search-icon" aria-hidden="true"/>
            <input type="text" className="header-search-input" placeholder="Search components or MPN..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} onFocus={handleSearchFocus} aria-label="Search components in mobile menu"/>
          </div>

          <div className="mobile-links">
            <NavLink to="/library" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
              <Layers size={18} aria-hidden="true"/>
              <span>Component Library</span>
            </NavLink>

            <NavLink to="/compare" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
              <GitCompare size={18} aria-hidden="true"/>
              <span>Component Compare</span>
              {compareCount > 0 && (<span className="nav-compare-count">{compareCount}</span>)}
            </NavLink>

            <NavLink to="/pcb" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
              <Cpu size={18} aria-hidden="true"/>
              <span>PCB Design Assistant</span>
            </NavLink>

            {user && (<NavLink to="/my-parts" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                <Bookmark size={18} aria-hidden="true"/>
                <span>My Saved Parts</span>
              </NavLink>)}

            {user?.role === "admin" && (<NavLink to="/admin/components" className={({ isActive }) => `mobile-nav-link ${isActive ? "active" : ""}`} onClick={() => setIsMobileMenuOpen(false)}>
                <SlidersHorizontal size={18} aria-hidden="true"/>
                <span>Manage</span>
              </NavLink>)}
          </div>

          <div className="mobile-auth-group">
            {user ? (<>
                <div className="mobile-user-identity">
                  <User size={16} aria-hidden="true"/>
                  <span>Signed in as <strong>{user.name}</strong></span>
                </div>
                <button type="button" className="btn-auth-text mobile-auth-btn" onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                }}>
                  <LogOut size={16} aria-hidden="true"/>
                  <span>Log out</span>
                </button>
              </>) : (<>
                <Link to="/login" className="btn-auth-text mobile-auth-btn" onClick={() => setIsMobileMenuOpen(false)}>
                  <LogIn size={16} aria-hidden="true"/>
                  <span>Log in</span>
                </Link>

                <Link to="/register" className="btn-auth-primary mobile-auth-btn" onClick={() => setIsMobileMenuOpen(false)}>
                  <UserPlus size={16} aria-hidden="true"/>
                  <span>Sign up</span>
                </Link>
              </>)}
          </div>
        </div>)}
    </header>);
};
