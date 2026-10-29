import { Component } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import "./ErrorBoundary.css";

// Catches unhandled rendering errors to display a recovery screen instead of crashing
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Cirqon UI Error Boundary caught an exception:", error, errorInfo);
    }
    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
        });
        window.location.href = "/";
    };
    handleReload = () => {
        window.location.reload();
    };
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (<div className="error-boundary-container" role="alert">
          <div className="error-boundary-card">
            <div className="error-boundary-badge">
              <AlertTriangle size={15} aria-hidden="true"/>
              <span>Rendering error</span>
            </div>

            <h1 className="error-boundary-title">Something went wrong</h1>

            <p className="error-boundary-desc">
              An unexpected error occurred while rendering this view.
            </p>

            {this.state.error && (<div className="error-boundary-details">
                <code>{this.state.error.message || String(this.state.error)}</code>
              </div>)}

            <div className="error-boundary-actions">
              <button type="button" className="error-reload-btn" onClick={this.handleReload}>
                <RotateCcw size={14} aria-hidden="true"/>
                <span>Reload Page</span>
              </button>

              <button type="button" className="error-home-btn" onClick={this.handleReset}>
                <Home size={14} aria-hidden="true"/>
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>);
        }
        return this.props.children;
    }
}
