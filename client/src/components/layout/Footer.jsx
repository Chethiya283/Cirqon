import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { CirqonLogo } from "../common/CirqonLogo";
import "./Footer.css";
export const Footer = () => {
    return (<footer className="site-footer">
      <div className="site-footer-container">
        <div className="footer-col brand-col">
          <div className="footer-brand-header">
            <CirqonLogo size="md"/>
          </div>

          <p className="footer-description">
            Electronic component catalogue and PCB design assistant.
          </p>

          <div className="footer-status-pill">
            <span className="status-indicator-dot"/>
            <span>11 catalogue components</span>
          </div>
        </div>

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
              <Link to="/" className="footer-link-btn">
                Catalogue Overview
              </Link>
            </li>
          </ul>
        </div>

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

        <div className="footer-col">
          <h4 className="footer-heading">Datasheet References</h4>
          <ul className="footer-links-list">
            <li>
              <a href="https://www.ti.com" target="_blank" rel="noopener noreferrer" className="footer-ext-link">
                <span>Texas Instruments Datasheets</span>
                <ExternalLink size={12} aria-hidden="true"/>
              </a>
            </li>
            <li>
              <a href="https://www.vishay.com" target="_blank" rel="noopener noreferrer" className="footer-ext-link">
                <span>Vishay Semiconductor Specs</span>
                <ExternalLink size={12} aria-hidden="true"/>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom-bar">
        <div className="footer-bottom-container">
          <span className="copyright-text">
            © 2026 Cirqon
          </span>
          <span className="footer-photo-credit">
            Component images are illustrations.
          </span>
        </div>
      </div>
    </footer>);
};
