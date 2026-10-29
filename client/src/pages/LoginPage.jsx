// User login authentication view with client validation, API integration, and password privacy guarantees.
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";
/**
 * LoginPage Component
 *
 * VIVA EXPLANATION:
 * 1. API Integration with State Management:
 *    Invokes `login(email, password)` from `AuthContext`, which issues `POST /api/auth/login`.
 *    Upon receiving a 200 OK, the JWT and user profile are persisted globally, and the user
 *    is routed to the root application view ("/").
 * 2. Generic Error Handling:
 *    Displays the backend error message inline if authentication fails (e.g., HTTP 401
 *    "Invalid email or password."), protecting against user enumeration.
 * 3. Cross-Page State Handoff:
 *    Reads `location.state?.successNote` passed from `RegisterPage` to display a helpful
 *    onboarding notification upon registration completion.
 */
export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    // Retrieve optional registration success note from router location state
    const registrationSuccessNote = location.state?.successNote;
    // Controlled form input state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    // Toggle for password visibility
    const [showPassword, setShowPassword] = useState(false);
    // Field validation error state
    const [errors, setErrors] = useState({});
    // Server error message received from API
    const [serverError, setServerError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    /**
     * Validate all login inputs according to university rubric constraints.
     */
    const validateForm = () => {
        const newErrors = {};
        // 1. Email validation
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            newErrors.email = "Email address is required.";
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            newErrors.email = "Please enter a valid email address (e.g., engineer@cirqon.org).";
        }
        // 2. Password validation (required only on login; length policy is enforced on registration)
        if (!password) {
            newErrors.password = "Password is required.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    /**
     * Handle form submission: validates inputs and calls backend login API.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError(null);
        if (!validateForm())
            return;
        try {
            setIsSubmitting(true);
            await login(email.trim(), password);
            // Navigate to home page upon successful authentication
            navigate("/");
        }
        catch (err) {
            const msg = err instanceof Error
                ? (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
                    ? "Unable to connect to the authentication server. Please verify that the backend is running."
                    : err.message)
                : "Invalid email or password.";
            setServerError(msg);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="auth-page-wrapper">
      <div className="auth-card">
        <header className="auth-card-header">
          <div className="auth-badge">
            <Lock size={12} aria-hidden="true"/>
            <span>Account login</span>
          </div>
          <h1 className="auth-title">Log in to Cirqon</h1>
          <p className="auth-subtitle">
            Sign in to access your saved components and project notes.
          </p>
        </header>

        {registrationSuccessNote && !serverError && (<div className="auth-notice-box" role="status">
            <CheckCircle2 size={18} aria-hidden="true"/>
            <div>
              <strong>Account Created</strong>
              <p style={{ margin: "2px 0 0" }}>{registrationSuccessNote}</p>
            </div>
          </div>)}

        {serverError && (<div className="auth-error-box" role="alert">
            <AlertCircle size={18} aria-hidden="true"/>
            <div>
              <strong>Authentication Failed</strong>
              <p style={{ margin: "2px 0 0" }}>{serverError}</p>
            </div>
          </div>)}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email Address Field */}
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email Address
            </label>
            <div className="form-input-wrap">
              <input id="login-email" type="email" className={`form-input ${errors.email ? "input-error" : ""}`} placeholder="engineer@domain.com" value={email} onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email)
                setErrors((prev) => ({ ...prev, email: undefined }));
        }} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "login-email-error" : undefined} autoComplete="email" disabled={isSubmitting}/>
            </div>
            {errors.email && (<span id="login-email-error" className="form-error-msg" role="alert">
                {errors.email}
              </span>)}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="form-input-wrap">
              <input id="login-password" type={showPassword ? "text" : "password"} className={`form-input form-input-has-toggle ${errors.password ? "input-error" : ""}`} placeholder="Enter your password" value={password} onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password)
                setErrors((prev) => ({ ...prev, password: undefined }));
        }} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "login-password-error" : undefined} autoComplete="current-password" disabled={isSubmitting}/>
              <button type="button" className="form-toggle-btn" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} disabled={isSubmitting}>
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {errors.password && (<span id="login-password-error" className="form-error-msg" role="alert">
                {errors.password}
              </span>)}
          </div>

          {/* Submit Action */}
          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <footer className="auth-card-footer">
          <span>Don&apos;t have an account?</span>
          <Link to="/register" className="auth-link">
            Sign up
          </Link>
        </footer>
      </div>
    </div>);
};
