import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// Persists session across reloads; validated with GET /api/auth/me on mount
const TOKEN_STORAGE_KEY = "cirqon_auth_token";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children, }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    // True if a token is in storage and needs verification on mount
    const [loading, setLoading] = useState(() => {
        return Boolean(localStorage.getItem(TOKEN_STORAGE_KEY));
    });

    useEffect(() => {
        const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!savedToken) {
            return;
        }
        let isMounted = true;

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
            .then((userData) => {
            if (!isMounted)
                return;
            setUser(userData);
            setToken(savedToken);
        })
            .catch(() => {
            if (!isMounted)
                return;
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

    const login = async (email, password) => {
        let response;
        try {
            response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });
        }
        catch {
            throw new Error("Unable to connect to authentication server. Please check that the backend is running.");
        }
        let data;
        try {
            data = await response.json();
        }
        catch {
            throw new Error("Received invalid response from authentication server.");
        }
        if (!response.ok) {
            throw new Error(data.message || "Invalid email or password.");
        }
        if (!data.token || !data.user) {
            throw new Error("Incomplete authentication payload returned by server.");
        }
        localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
        setToken(data.token);
        setUser(data.user);
    };

    const register = async (name, email, password) => {
        let response;
        try {
            response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, email, password }),
            });
        }
        catch {
            throw new Error("Unable to connect to authentication server. Please check that the backend is running.");
        }
        let data;
        try {
            data = await response.json();
        }
        catch {
            throw new Error("Received invalid response from registration server.");
        }
        if (!response.ok) {
            throw new Error(data.message || "Failed to create account.");
        }
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        setToken(null);
    };

    return (<AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            register,
            logout,
        }}>
      {children}
    </AuthContext.Provider>);
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
