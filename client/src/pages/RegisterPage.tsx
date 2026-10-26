// User registration authentication view with strict client-side validation and password privacy guarantees.

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react";
import "./AuthPage.css";

/**
 * RegisterPage Component
 * 
 * VIVA EXPLANATION:
 * 1. Comprehensive Validation: Checks name presence, email syntax validity, password length (>= 8),
 *    and matching confirm password values directly in browser memory before any action.
 * 2. Privacy & Security: In accordance with university project guidelines, credentials are NEVER stored
 *    in browser storage or sent across API requests.
 * 3. Accessibility: Adheres to WCAG standards with explicit labels (`htmlFor`), input error status (`aria-invalid`),
 *    and linked error descriptions (`aria-describedby`).
 * 4. Milestone Simulation: The submission button displays "Coming soon" representing the milestone UI state.
 */
export const RegisterPage: React.FC = () => {
  // Controlled input states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggle flags for password and confirm password fields
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation error state dictionary
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Feedback flag shown when client-side validation passes
  const [validationSuccess, setValidationSuccess] = useState(false);

  /**
   * Run client-side validation against all registration constraints.
   * Returns true only when every field is compliant.
   */
  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    // 1. Full name validation
    if (!name.trim()) {
      newErrors.name = "Full name is required.";
    }

    // 2. Email format validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address (e.g., engineer@cirqon.org).";
    }

    // 3. Password minimum length validation
    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    // 4. Password confirmation match validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle registration form submission: validates inputs without persisting data.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationSuccess(false);

    if (validateForm()) {
      // VIVA NOTE: User credentials are intentionally NOT transmitted or stored.
      setValidationSuccess(true);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <header className="auth-card-header">
          <div className="auth-badge">
            <UserPlus size={12} aria-hidden="true" />
            <span>ACCOUNT CREATION</span>
          </div>
          <h1 className="auth-title">Create Engineer Account</h1>
          <p className="auth-subtitle">
            Join the precision electronic component platform to save custom pinouts and BOM matrices.
          </p>
        </header>

        {validationSuccess && (
          <div className="auth-notice-box" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <div>
              <strong>Registration Form Validated.</strong>
              <p style={{ margin: "2px 0 0" }}>
                Backend user persistence is scheduled for the next milestone. Credentials are not stored.
              </p>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Full Name Field */}
          <div className="form-group">
            <label htmlFor="register-name" className="form-label">
              Full Name
            </label>
            <div className="form-input-wrap">
              <input
                id="register-name"
                type="text"
                className={`form-input ${errors.name ? "input-error" : ""}`}
                placeholder="Jane Doe, EE"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "register-name-error" : undefined}
                autoComplete="name"
              />
            </div>
            {errors.name && (
              <span id="register-name-error" className="form-error-msg" role="alert">
                {errors.name}
              </span>
            )}
          </div>

          {/* Email Address Field */}
          <div className="form-group">
            <label htmlFor="register-email" className="form-label">
              Email Address
            </label>
            <div className="form-input-wrap">
              <input
                id="register-email"
                type="email"
                className={`form-input ${errors.email ? "input-error" : ""}`}
                placeholder="engineer@domain.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "register-email-error" : undefined}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <span id="register-email-error" className="form-error-msg" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="register-password" className="form-label">
              Password
            </label>
            <div className="form-input-wrap">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                className={`form-input form-input-has-toggle ${errors.password ? "input-error" : ""}`}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "register-password-error" : undefined}
                autoComplete="new-password"
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
              <span id="register-password-error" className="form-error-msg" role="alert">
                {errors.password}
              </span>
            )}
            {!errors.password && (
              <span className="form-hint">Must contain at least 8 characters.</span>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="register-confirm-password" className="form-label">
              Confirm Password
            </label>
            <div className="form-input-wrap">
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                className={`form-input form-input-has-toggle ${errors.confirmPassword ? "input-error" : ""}`}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="form-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span id="register-confirm-error" className="form-error-msg" role="alert">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* Submit Action */}
          <button type="submit" className="auth-submit-btn">
            Coming soon
          </button>
        </form>

        <footer className="auth-card-footer">
          <span>Already have an account?</span>
          <Link to="/login" className="auth-link">
            Log in
          </Link>
        </footer>
      </div>
    </div>
  );
};

