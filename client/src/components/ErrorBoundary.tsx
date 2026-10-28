// React Error Boundary protecting against client-side crashes and rendering failures.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import "./ErrorBoundary.css";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 * 
 * VIVA EXPLANATION:
 * 1. Declarative Crash Containment:
 *    React unmounts the entire component tree if an unhandled rendering error occurs,
 *    resulting in a blank white screen. This class component intercepts errors via
 *    `componentDidCatch` and `getDerivedStateFromError`, keeping the application shell intact.
 * 2. Self-Healing User Recovery:
 *    Provides engineers with a one-click "Reload Page" action (`window.location.reload()`)
 *    and a "Return to Home" fallback, ensuring users are never trapped in a broken state.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Cirqon UI Error Boundary caught an exception:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
    window.location.href = "/";
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-container" role="alert">
          <div className="error-boundary-card">
            <div className="error-boundary-badge">
              <AlertTriangle size={15} aria-hidden="true" />
              <span>Rendering error</span>
            </div>

            <h1 className="error-boundary-title">Something went wrong</h1>

            <p className="error-boundary-desc">
              An unexpected error occurred while rendering this view.
            </p>

            {this.state.error && (
              <div className="error-boundary-details">
                <code>{this.state.error.message || String(this.state.error)}</code>
              </div>
            )}

            <div className="error-boundary-actions">
              <button
                type="button"
                className="error-reload-btn"
                onClick={this.handleReload}
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                className="error-home-btn"
                onClick={this.handleReset}
              >
                <Home size={14} aria-hidden="true" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
