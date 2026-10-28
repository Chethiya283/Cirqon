import React from "react";
import "./CirqonLogo.css";

interface CirqonLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * CirqonLogo Component
 *
 * Typography-based brand logo for Cirqon that subtly communicates electronics
 * and PCB design through the typography itself:
 *
 * 1. Letter 'i': The font dot is replaced with an authentic PCB annular ring via node
 *    (teal outer ring with a precision drill hole).
 * 2. Letter 'q': The descender transitions into an authentic 45-degree chamfered PCB
 *    circuit trace terminating in a circular copper via pad.
 * 3. Typography: Grounded in the application's bold, clean Inter heading font
 *    (--cq-font-heading) with precision letter spacing.
 * 4. Accessibility: Contains `.cq-logo-sr-only` ("Cirqon") and aria-label so screen
 *    readers immediately announce the brand name without interference from decorative SVGs.
 * 5. Theme Support: Uses design tokens (--cq-text-primary, --cq-teal, --cq-teal-hover)
 *    and transparent vector cutouts, ensuring seamless rendering across light and dark surfaces.
 */
export const CirqonLogo: React.FC<CirqonLogoProps> = ({
  className = "",
  size = "md",
}) => {
  return (
    <span
      className={`cirqon-brand-logo size-${size} ${className}`.trim()}
      aria-label="Cirqon"
    >
      <span className="cq-logo-sr-only">Cirqon</span>
      <span aria-hidden="true" className="cq-logo-visual">
        <span className="cq-char-c">C</span>
        <span className="cq-char-i">
          <svg
            className="cq-i-via-svg"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M 5 0.8 A 4.2 4.2 0 1 0 5 9.2 A 4.2 4.2 0 1 0 5 0.8 Z M 5 3.3 A 1.7 1.7 0 1 1 5 6.7 A 1.7 1.7 0 1 1 5 3.3 Z"
            />
          </svg>
          ı
        </span>
        <span className="cq-char-r">r</span>
        <span className="cq-char-q">
          q
          <svg
            className="cq-q-trace-svg"
            viewBox="0 0 18 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              className="cq-q-trace-line"
              d="M 1.5 2 L 5.5 8 L 10.5 8"
            />
            <path
              className="cq-q-via-ring"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M 13 5.5 A 2.5 2.5 0 1 0 13 10.5 A 2.5 2.5 0 1 0 13 5.5 Z M 13 7 A 1 1 0 1 1 13 9 A 1 1 0 1 1 13 7 Z"
            />
          </svg>
        </span>
        <span className="cq-char-o">o</span>
        <span className="cq-char-n">n</span>
      </span>
    </span>
  );
};

