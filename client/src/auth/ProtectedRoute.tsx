// Route guard component protecting authenticated views and administrative workflows.

import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "./AuthContext";

/**
 * Props for ProtectedRoute
 */
export interface ProtectedRouteProps {
  children?: React.ReactNode;
  /** Optional role requirement (e.g. "admin") to restrict access */
  requiredRole?: "user" | "admin";
}

/**
 * ProtectedRoute Component
 * 
 * VIVA EXPLANATION:
 * 1. Declarative Route Guarding (Defense in Depth / Presentation Layer):
 *    - Inspects `user`, `token`, and `loading` provided by `AuthContext`.
 *    - While loading initial credentials, renders a non-blocking skeleton/spinner to
 *      prevent premature redirect flickering.
 *    - Unauthenticated callers are redirected to `/login`, preserving `state.from`
 *      for post-authentication redirection.
 * 2. Role-Based Access Control (RBAC) Client-Side Boundary:
 *    - If `requiredRole` is specified and the authenticated `user.role` does not match,
 *      renders a polite HTTP 403 Forbidden message with a navigation link home.
 *    - VIVA DISTINCTION: Client-side routing guards are strictly a UX enhancement (preventing
 *      users from seeing empty/broken interfaces). Real authorization and security boundaries
 *      are enforced independently on the backend by Express middleware (`requireAdmin`).
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--cq-text-muted)",
          fontFamily: "var(--cq-font-sans)",
        }}
      >
        Verifying user credentials...
      </div>
    );
  }

  // 1. Unauthenticated users are sent to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Authenticated users lacking the required role see a clear 403 screen
  if (requiredRole && user.role !== requiredRole) {
    return (
      <div
        className="forbidden-access-container"
        style={{
          padding: "64px 24px",
          maxWidth: "520px",
          margin: "40px auto",
          textAlign: "center",
          background: "var(--cq-surface)",
          border: "1px solid var(--cq-border-default)",
          borderRadius: "var(--cq-radius-md)",
          boxShadow: "var(--cq-shadow-sm)",
          fontFamily: "var(--cq-font-sans)",
        }}
        role="alert"
        aria-live="polite"
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "var(--cq-radius-pill)",
            background: "var(--cq-error-soft)",
            color: "var(--cq-error)",
            marginBottom: "var(--cq-space-4)",
          }}
        >
          <ShieldAlert size={28} aria-hidden="true" />
        </div>

        <h2
          style={{
            margin: "0 0 var(--cq-space-2)",
            fontSize: "var(--cq-text-xl)",
            fontWeight: "var(--cq-weight-bold)",
            color: "var(--cq-text-primary)",
          }}
        >
          403: Admins only
        </h2>

        <p
          style={{
            margin: "0 0 var(--cq-space-6)",
            fontSize: "var(--cq-text-base)",
            color: "var(--cq-text-secondary)",
            lineHeight: "var(--cq-leading-normal)",
          }}
        >
          You are signed in as <strong>{user.email}</strong> ({user.role}), which does not have administrator privileges to manage components.
        </p>

        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--cq-space-2)",
            padding: "8px 18px",
            background: "var(--cq-emerald)",
            color: "var(--cq-text-inverse)",
            borderRadius: "var(--cq-radius-sm)",
            fontWeight: "var(--cq-weight-semibold)",
            fontSize: "var(--cq-text-base)",
            textDecoration: "none",
            transition: "background var(--cq-transition-fast)",
          }}
        >
          Return to Catalogue Home
        </Link>
      </div>
    );
  }

  return children ? <>{children}</> : null;
};
