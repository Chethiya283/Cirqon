import React from "react";
import { Cpu, ExternalLink } from "lucide-react";
import "./Footer.css";

interface FooterProps {
  /** Optional callback to navigate to a specific view when clicking footer links */
  onNavigate?: (view: "home" | "library" | "compare" | "pcb") => void;
}

/**
 * Footer Component
 * 
 * Shared public website footer providing:
 * 1. Brand summary & engineering platform context.
 * 2. Quick navigation links to core workspaces.
 * 3. Component category references matching database taxonomy.
 * 4. Technical metadata and academic project attribution.
 */
export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="site-footer">
      <div className="site-footer-container">
        {/* Brand Column */}
        <div className="footer-col brand-col">
          <div className="footer-brand-header">
            <div className="brand-logo-icon">
              <Cpu size={18} color="var(--cq-emerald)" aria-hidden="true" />
            </div>
            <span className="brand-title">Cirqon</span>
          </div>

          <p className="footer-description">
            A parametric electronic component discovery platform and PCB design assistant
            engineered for hardware designers, researchers, and university engineering labs.
          </p>

          <div className="footer-status-pill">
            <span className="status-indicator-dot" />
            <span>Catalogue Online · 11 Verified Parts</span>
          </div>
        </div>

        {/* Platform Workspaces */}
        <div className="footer-col">
          <h4 className="footer-heading">Workspaces</h4>
          <ul className="footer-links-list">
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigate?.("library")}
              >
                Component Library
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigate?.("compare")}
              >
                Component Compare
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigate?.("pcb")}
              >
                PCB Footprint Assistant
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigate?.("home")}
              >
                Catalogue Overview
              </button>
            </li>
          </ul>
        </div>

        {/* Component Taxonomy */}
        <div className="footer-col">
          <h4 className="footer-heading">Component Families</h4>
          <ul className="footer-links-list">
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigate?.("library")}
              >
                Integrated Circuits & Op-Amps
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigate?.("library")}
              >
                Voltage Regulators (TO-220)
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigate?.("library")}
              >
                Diodes & BJT Transistors
              </button>
            </li>
            <li>
              <button
                type="button"
                className="footer-link-btn"
                onClick={() => onNavigate?.("library")}
              >
                Passives: R, C & L
              </button>
            </li>
          </ul>
        </div>

        {/* Project Attribution & References */}
        <div className="footer-col">
          <h4 className="footer-heading">Project & Standards</h4>
          <ul className="footer-links-list">
            <li className="footer-text-item">University Engineering Project</li>
            <li className="footer-text-item">Full MERN + TypeScript + Vite Stack</li>
            <li>
              <a
                href="https://www.ti.com"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-ext-link"
              >
                <span>Texas Instruments Datasheets</span>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
            <li>
              <a
                href="https://www.vishay.com"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-ext-link"
              >
                <span>Vishay Semiconductor Specs</span>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright & Design System Bar */}
      <div className="footer-bottom-bar">
        <div className="footer-bottom-container">
          <span className="copyright-text">
            © 2026 Cirqon. Built for academic viva demonstration.
          </span>
          <span className="footer-system-tag">
            Precision Light Theme · High Contrast WCAG AA
          </span>
        </div>
      </div>
    </footer>
  );
};

