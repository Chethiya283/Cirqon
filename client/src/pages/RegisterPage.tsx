// User registration view with client validation, API integration, and password privacy safeguards.

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import "./AuthPage.css";

/**
 * RegisterPage Component
 * 
 * VIVA EXPLANATION:
 * 1. Client-Side + Server-Side Defense in Depth:
 *    Inputs are first validated locally to give instant user feedback, followed by
 *    rigorous backend validation (format, length, duplicate email detection).
 * 2. API Integration:
 *    Invokes `register()` from `AuthContext`, which sends `POST /api/auth/register`.
 * 3. Error Handling:
 *    Catches API error responses (such as HTTP 409 for duplicate emails) and presents
 *    clear, accessible inline feedback.
 * 4. Post-Registration Flow:
 *    Navigates to `/login` with an informational state message, prompting the engineer
 *    to authenticate and receive their JWT session.
 */
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Controlled input states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggle flags for password and confirm password fields
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation error state
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Server error message received from API
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Run client-side validation against all registration constraints.
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
   * Handle form submission: validates inputs and calls backend registration API.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      await register(name.trim(), email.trim(), password);
      // Navigate to /login with a success notification banner
      navigate("/login", {
        state: {
          successNote: "Registration successful! You can now log in with your credentials.",
        },
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
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

        {serverError && (
          <div className="auth-error-box" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <div>
              <strong>Registration Failed</strong>
              <p style={{ margin: "2px 0 0" }}>{serverError}</p>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="form-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="form-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                disabled={isSubmitting}
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
          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
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
