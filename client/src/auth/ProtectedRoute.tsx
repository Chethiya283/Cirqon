// Route guard component protecting authenticated views from unauthorized access.

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/**
 * Props for ProtectedRoute
 */
export interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * VIVA EXPLANATION:
 * 1. Declarative Route Guarding:
 *    Inspects the `user` and `loading` status provided by `useAuth()`.
 *    - If authentication state is still resolving on initial mount, it shows a minimal
 *      spinner/indicator to avoid premature redirect flickering.
 *    - If unauthenticated, it renders a React Router `<Navigate to="/login" replace />`,
 *      saving the current URL path in `state.from` so the user can be returned after login.
 *    - If authenticated, it renders the protected child components.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--cq-text-muted)" }}>
        Verifying user credentials...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};

