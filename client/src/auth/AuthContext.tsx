// Authentication context and provider managing user session, JWT storage, and authentication API calls.

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Single, centralized key for JWT persistence in localStorage.
 * 
 * VIVA EXPLANATION:
 * LOCALSTORAGE SECURITY TRADE-OFF:
 * - Advantage: Convenient and persistent across browser page reloads and multiple tabs
 *   without requiring stateful server sessions.
 * - Trade-off: LocalStorage is accessible by any JavaScript running in the same origin.
 *   If the application were vulnerable to Cross-Site Scripting (XSS), an attacker could
 *   read `localStorage.getItem()`. To mitigate this, React escapes text content by default
 *   to prevent HTML injection, and we never execute untrusted scripts.
 */
const TOKEN_STORAGE_KEY = "cirqon_auth_token";

export interface AuthContextType {
  /** Authenticated user profile, or null when logged out */
  user: AuthUser | null;
  /** JWT bearer token string, or null when logged out */
  token: string | null;
  /** True while verifying saved token on application mount */
  loading: boolean;
  /** Authenticate user with email and password */
  login: (email: string, password: string) => Promise<void>;
  /** Register a new user account with name, email, and password */
  register: (name: string, email: string, password: string) => Promise<void>;
  /** Log out the current user and purge persisted token */
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 * 
 * VIVA EXPLANATION:
 * 1. Context & Provider Pattern:
 *    React Context allows authentication state to be shared globally across the component
 *    tree without prop-drilling. The `AuthProvider` wraps root components and supplies
 *    the active user, token, and auth methods to any child calling `useAuth()`.
 * 
 * 2. Bearer Authentication Scheme:
 *    The token is transmitted in the standard HTTP `Authorization` header as:
 *    `Authorization: Bearer <token>`
 *    The term "Bearer" indicates that the carrier possessing the token is granted access,
 *    allowing the backend to verify the stateless cryptographic signature without database sessions.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Initialize loading: false if no token is stored; true if an active verification is needed
  const [loading, setLoading] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
  });

  // Restore authenticated session on application mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!savedToken) {
      return;
    }

    let isMounted = true;

    // Validate the saved token against the backend profile route
    fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${savedToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Token expired or invalid");
        }
        return res.json();
      })
      .then((userData: AuthUser) => {
        if (!isMounted) return;
        setUser(userData);
        setToken(savedToken);
      })
      .catch(() => {
        if (!isMounted) return;
        // Clear invalidated token from localStorage in one central place
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in an existing user and store JWT.
   */
  const login = async (email: string, password: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Invalid email or password.");
    }

    // Persist token in localStorage in ONE place
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  };

  /**
   * Register a new user account.
   */
  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create account.");
    }
  };

  /**
   * Log out user: clears state and removes token from localStorage.
   */
  const logout = (): void => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to consume authentication context in any React component.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
