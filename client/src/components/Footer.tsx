import React from "react";
import { Link } from "react-router-dom";
import { Cpu, ExternalLink } from "lucide-react";
import "./Footer.css";

/**
 * Footer Component
 * 
 * Shared public website footer providing:
 * 1. Brand summary & engineering platform context.
 * 2. Quick navigation links to core workspaces using React Router `Link`.
 * 3. Component category references matching database taxonomy.
 * 4. Technical metadata and academic project attribution.
 */
export const Footer: React.FC = () => {
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
              <Link to="/library" className="footer-link-btn">
                Component Library
              </Link>
            </li>
            <li>
              <Link to="/compare" className="footer-link-btn">
                Component Compare
              </Link>
            </li>
            <li>
              <Link to="/pcb" className="footer-link-btn">
                PCB Footprint Assistant
              </Link>
            </li>
            <li>
              <Link to="/library" className="footer-link-btn">
                Catalogue Overview
              </Link>
            </li>
          </ul>
        </div>

        {/* Component Taxonomy */}
        <div className="footer-col">
          <h4 className="footer-heading">Component Families</h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/library" className="footer-link-btn">
                Integrated Circuits & Op-Amps
              </Link>
            </li>
            <li>
              <Link to="/library" className="footer-link-btn">
                Voltage Regulators (TO-220)
              </Link>
            </li>
            <li>
              <Link to="/library" className="footer-link-btn">
                Diodes & BJT Transistors
              </Link>
            </li>
            <li>
              <Link to="/library" className="footer-link-btn">
                Passives: R, C & L
              </Link>
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
