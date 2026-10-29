import React, { createContext, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { useAuth } from "./AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const SavedPartsContext = createContext(undefined);

// Maintains bookmarks in memory with Set-based O(1) ID lookups; synced with backend on login
export const SavedPartsProvider = ({ children, }) => {
    const { token } = useAuth();
    const [savedItems, setSavedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const prevTokenRef = useRef(token);

    const retryLoad = () => {
        setError(null);
        setLoading(true);
        setRefreshTrigger((prev) => prev + 1);
    };

    useEffect(() => {
        if (!token) {
            if (prevTokenRef.current) {
                setSavedItems([]);
                setError(null);
            }
            prevTokenRef.current = token;
            return;
        }
        prevTokenRef.current = token;
        let isMounted = true;
        // Queue loading state asynchronously to prevent cascading render warning
        Promise.resolve().then(() => {
            if (isMounted) {
                setLoading(true);
                setError(null);
            }
        });

        fetch(`${API_BASE_URL}/saved-parts`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
            if (!res.ok) {
                throw new Error("Failed to load saved parts from workspace.");
            }
            return res.json();
        })
            .then((data) => {
            if (!isMounted)
                return;
            const valid = (data.savedParts || [])
                .filter((item) => item && item.component && typeof item.component === "object")
                .map((item) => ({
                ...item,
                quantity: typeof item.quantity === "number" ? item.quantity : 1,
                note: typeof item.note === "string" ? item.note : "",
            }));
            setSavedItems(valid);
        })
            .catch((err) => {
            if (!isMounted)
                return;
            console.error("Failed to load saved components:", err);
            setError("Unable to connect to the saved parts workspace. Please verify the backend server is running.");
        })
            .finally(() => {
            if (isMounted) {
                setLoading(false);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [token, refreshTrigger]);

    const savedParts = useMemo(() => savedItems
        .map((item) => item.component)
        .filter(Boolean), [savedItems]);

    const savedIds = useMemo(() => new Set(savedParts.map((c) => c._id)), [savedParts]);

    const isSaved = (id) => {
        return savedIds.has(id);
    };

    const toggleSave = async (component) => {
        if (!token) {
            return;
        }
        const componentId = component._id;
        const existingItem = savedItems.find((item) => item.component?._id === componentId);
        if (existingItem) {
            // Optimistically remove bookmark before awaiting API response
            setSavedItems((prev) => prev.filter((item) => item.component?._id !== componentId));
            try {
                const response = await fetch(`${API_BASE_URL}/saved-parts/${componentId}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("Failed to delete saved part.");
                }
            }
            catch (err) {
                console.error("Error removing component:", err);
                // Rollback on failure
                setSavedItems((prev) => [...prev, existingItem]);
                setError("Unable to remove component from workspace. Please verify the backend server is running.");
            }
        }
        else {
            const optimisticItem = {
                _id: `temp-${Date.now()}`,
                user: "current",
                component,
                quantity: 1,
                note: "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            // Optimistically add bookmark before awaiting API response
            setSavedItems((prev) => [optimisticItem, ...prev]);
            try {
                const response = await fetch(`${API_BASE_URL}/saved-parts`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ componentId }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || "Failed to save part.");
                }
                if (data.savedPart) {
                    setSavedItems((prev) => [
                        data.savedPart,
                        ...prev.filter((item) => item.component?._id !== componentId &&
                            item._id !== optimisticItem._id),
                    ]);
                }
            }
            catch (err) {
                console.error("Error saving component:", err);
                // Rollback on failure
                setSavedItems((prev) => prev.filter((item) => item._id !== optimisticItem._id));
                setError("Unable to save component to workspace. Please verify the backend server is running.");
            }
        }
    };

    const updateSavedPart = async (componentId, updates) => {
        if (!token) {
            throw new Error("You must be logged in to update saved components.");
        }
        let response;
        try {
            response = await fetch(`${API_BASE_URL}/saved-parts/${componentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });
        }
        catch {
            throw new Error("Unable to connect to the backend server. Please verify that the server is running.");
        }
        let data;
        try {
            data = await response.json();
        }
        catch {
            throw new Error("Invalid response received from server.");
        }
        if (!response.ok) {
            throw new Error(data.message || "Failed to update saved component details.");
        }
        const updated = data.savedPart;
        if (updated) {
            setSavedItems((prev) => prev.map((item) => item.component?._id === componentId
                ? {
                    ...item,
                    quantity: typeof updated.quantity === "number"
                        ? updated.quantity
                        : item.quantity,
                    note: typeof updated.note === "string" ? updated.note : item.note,
                }
                : item));
        }
    };

    return (<SavedPartsContext.Provider value={{
            savedParts,
            savedItems,
            savedIds,
            loading,
            error,
            isSaved,
            toggleSave,
            updateSavedPart,
            retryLoad,
        }}>
      {children}
    </SavedPartsContext.Provider>);
};

// eslint-disable-next-line react-refresh/only-export-components
export function useSavedParts() {
    const context = useContext(SavedPartsContext);
    if (!context) {
        throw new Error("useSavedParts must be used within a SavedPartsProvider");
    }
    return context;
}
