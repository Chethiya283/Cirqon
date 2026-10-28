// 404 Not Found Page for unmatched client routes in Cirqon.
import React from "react";
import { Link } from "react-router-dom";
import { Compass, Home, Layers, Cpu } from "lucide-react";
import "./NotFoundPage.css";
/**
 * NotFoundPage Component
 *
 * VIVA EXPLANATION:
 * 1. User Navigation Continuity:
 *    Instead of a jarring white screen or a silent redirect that leaves engineers wondering
 *    why a bookmarked or linked URL changed, this view explicitly informs the user that the
 *    route does not exist and offers clear pathways back to the primary workspaces.
 * 2. Visual System Alignment:
 *    Implements Cirqon's design tokens (warm-neutral surface, high-contrast navy typography,
 *    and emerald interactive accents) maintaining visual harmony across the entire application.
 */
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
