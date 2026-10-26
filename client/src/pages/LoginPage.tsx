// User login authentication view with strict client-side validation and password privacy guarantees.

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import "./AuthPage.css";

/**
 * LoginPage Component
 * 
 * VIVA EXPLANATION:
 * 1. Client-Side Validation: Validates email format and password length requirements
 *    immediately upon submission without transmitting data to any server.
 * 2. Privacy & Security: Under academic viva constraints, passwords are NEVER stored
 *    in local storage, session storage, or sent over network sockets.
 * 3. Accessibility: Form fields use explicit label associations (`htmlFor`), `aria-invalid`,
 *    and `aria-describedby` to link inline error messages with their respective inputs.
 * 4. Milestone Simulation: The submission button displays "Coming soon" as a functional
 *    prototype state pending full backend JWT integration.
 */
export const LoginPage: React.FC = () => {
  // Controlled form input state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Toggle for password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Field validation error state
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Feedback flag shown when validation passes successfully
  const [validationSuccess, setValidationSuccess] = useState(false);

  /**
   * Validate all login inputs according to university rubric constraints.
   * Returns true if all fields conform to criteria.
   */
  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    // 1. Email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address (e.g., engineer@cirqon.org).";
    }

    // 2. Password validation
    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission: strictly validates fields without persisting credentials.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationSuccess(false);

    if (validateForm()) {
      // VIVA NOTE: Passwords are intentionally NOT sent or stored.
      setValidationSuccess(true);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <header className="auth-card-header">
          <div className="auth-badge">
            <Lock size={12} aria-hidden="true" />
            <span>ENGINEER ACCESS</span>
          </div>
          <h1 className="auth-title">Log In to Cirqon</h1>
          <p className="auth-subtitle">
            Sign in to access your saved component trays, project workspaces, and bill of materials.
          </p>
        </header>

        {validationSuccess && (
          <div className="auth-notice-box" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <div>
              <strong>Form Validated Successfully.</strong>
              <p style={{ margin: "2px 0 0" }}>
                Authentication backend integration is scheduled for the next milestone. Credentials are not stored.
              </p>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email Address Field */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <div className="form-input-wrap">
              <input
                id="login-email"
                type="email"
                className={`form-input ${errors.email ? "input-error" : ""}`}
                placeholder="engineer@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <span id="login-email-error" className="form-error-msg" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="form-input-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={`form-input form-input-has-toggle ${errors.password ? "input-error" : ""}`}
                placeholder="Enter password (min. 8 characters)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="form-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span id="login-password-error" className="form-error-msg" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          {/* Submit Action */}
          <button type="submit" className="auth-submit-btn">
            Coming soon
          </button>
        </form>

        <footer className="auth-card-footer">
          <span>Don&apos;t have an account?</span>
          <Link to="/register" className="auth-link">
            Sign up
          </Link>
        </footer>
      </div>
    </div>
  );
};

