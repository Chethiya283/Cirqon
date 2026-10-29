import React from "react";
import { Link } from "react-router-dom";
import { Compass, Home, Layers, Cpu } from "lucide-react";
import "./NotFoundPage.css";

export const NotFoundPage = () => {
    return (<div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-badge">
          <Compass size={14} aria-hidden="true"/>
          <span>404 · Page not found</span>
        </div>

        <h1 className="not-found-title">Page Not Found</h1>

        <p className="not-found-description">
          The page or component you requested could not be found.
        </p>

        <div className="not-found-links-group">
          <Link to="/" className="not-found-primary-btn">
            <Home size={15} aria-hidden="true"/>
            <span>Return to Home</span>
          </Link>

          <Link to="/library" className="not-found-secondary-btn">
            <Layers size={15} aria-hidden="true"/>
            <span>Browse Library</span>
          </Link>

          <Link to="/pcb" className="not-found-secondary-btn">
            <Cpu size={15} aria-hidden="true"/>
            <span>PCB Assistant</span>
          </Link>
        </div>
      </div>
    </div>);
};
