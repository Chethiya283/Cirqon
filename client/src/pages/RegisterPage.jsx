import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, UserPlus, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";
export const RegisterPage = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);const validateForm = () => {
        const newErrors = {};
        if (!name.trim()) {
            newErrors.name = "Full name is required.";
        }
        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            newErrors.email = "Email address is required.";
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            newErrors.email = "Please enter a valid email address (e.g., engineer@cirqon.org).";
        }
        if (!password) {
            newErrors.password = "Password is required.";
        }
        else if (password.length < 8) {
            newErrors.password = "Password must be at least 8 characters.";
        }
        if (!confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password.";
        }
        else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError(null);
        if (!validateForm())
            return;
        try {
            setIsSubmitting(true);
            await register(name.trim(), email.trim(), password);
            navigate("/login", {
                state: {
                    successNote: "Registration successful! You can now log in with your credentials.",
                },
            });
        }
        catch (err) {
            const msg = err instanceof Error
                ? (err.name === "TypeError" || err.message.toLowerCase().includes("fetch")
                    ? "Unable to connect to the authentication server. Please verify that the backend is running."
                    : err.message)
                : "Registration failed. Please try again.";
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
            <UserPlus size={12} aria-hidden="true"/>
            <span>Create account</span>
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">
            Create an account to save components and add project notes.
          </p>
        </header>

        {serverError && (<div className="auth-error-box" role="alert">
            <AlertCircle size={18} aria-hidden="true"/>
            <div>
              <strong>Registration Failed</strong>
              <p style={{ margin: "2px 0 0" }}>{serverError}</p>
            </div>
          </div>)}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="register-name" className="form-label">
              Full Name
            </label>
            <div className="form-input-wrap">
              <input id="register-name" type="text" className={`form-input ${errors.name ? "input-error" : ""}`} placeholder="Jane Doe, EE" value={name} onChange={(e) => {
            setName(e.target.value);
            if (errors.name)
                setErrors((prev) => ({ ...prev, name: undefined }));
        }} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "register-name-error" : undefined} autoComplete="name" disabled={isSubmitting}/>
            </div>
            {errors.name && (<span id="register-name-error" className="form-error-msg" role="alert">
                {errors.name}
              </span>)}
          </div>

          <div className="form-group">
            <label htmlFor="register-email" className="form-label">
              Email Address
            </label>
            <div className="form-input-wrap">
              <input id="register-email" type="email" className={`form-input ${errors.email ? "input-error" : ""}`} placeholder="engineer@domain.com" value={email} onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email)
                setErrors((prev) => ({ ...prev, email: undefined }));
        }} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "register-email-error" : undefined} autoComplete="email" disabled={isSubmitting}/>
            </div>
            {errors.email && (<span id="register-email-error" className="form-error-msg" role="alert">
                {errors.email}
              </span>)}
          </div>

          <div className="form-group">
            <label htmlFor="register-password" className="form-label">
              Password
            </label>
            <div className="form-input-wrap">
              <input id="register-password" type={showPassword ? "text" : "password"} className={`form-input form-input-has-toggle ${errors.password ? "input-error" : ""}`} placeholder="At least 8 characters" value={password} onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password)
                setErrors((prev) => ({ ...prev, password: undefined }));
        }} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "register-password-error" : undefined} autoComplete="new-password" disabled={isSubmitting}/>
              <button type="button" className="form-toggle-btn" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} disabled={isSubmitting}>
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {errors.password && (<span id="register-password-error" className="form-error-msg" role="alert">
                {errors.password}
              </span>)}
            {!errors.password && (<span className="form-hint">Must contain at least 8 characters.</span>)}
          </div>

          <div className="form-group">
            <label htmlFor="register-confirm-password" className="form-label">
              Confirm Password
            </label>
            <div className="form-input-wrap">
              <input id="register-confirm-password" type={showConfirmPassword ? "text" : "password"} className={`form-input form-input-has-toggle ${errors.confirmPassword ? "input-error" : ""}`} placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }
        }} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined} autoComplete="new-password" disabled={isSubmitting}/>
              <button type="button" className="form-toggle-btn" onClick={() => setShowConfirmPassword((prev) => !prev)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} disabled={isSubmitting}>
                {showConfirmPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {errors.confirmPassword && (<span id="register-confirm-error" className="form-error-msg" role="alert">
                {errors.confirmPassword}
              </span>)}
          </div>

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
    </div>);
};
