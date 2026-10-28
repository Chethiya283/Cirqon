// Context and hook for managing bookmarked electronic components per authenticated user.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { useAuth } from "./AuthContext";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const SavedPartsContext = createContext(undefined);
/**
 * SavedPartsProvider Component
 *
 * VIVA EXPLANATION:
 * 1. Reactive State Synchronization:
 *    Maintains the user's saved parts in memory across all catalog cards, table rows,
 *    modal dialogs, and workspace pages so saving or updating notes/quantities in one place
 *    updates the entire UI instantly without requiring a page reload.
 *
 * 2. O(1) Constant-Time Lookup via Set:
 *    We maintain both `savedItems` (array of full bookmarks with quantity/note) and
 *    `savedIds` (a Set of MongoDB ObjectIds). Checking `savedIds.has(componentId)` takes
 *    O(1) constant time, avoiding expensive O(N) array scans across hundreds of cards.
 *
 * 3. Token-Based API Authorization & Isolation:
 *    Requests to `/api/saved-parts` attach the active JWT in the `Authorization: Bearer <token>`
 *    header. The backend extracts `req.user._id` from the verified token, guaranteeing data isolation
 *    and preventing Insecure Direct Object References (IDOR).
 *
 * 4. Automatic Session Lifecycle Clearing:
 *    When `token` transitions to null on logout, the saved state is cleared immediately so
 *    stale bookmarks are never exposed to another engineer on the same workstation.
 */
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
        // When the user logs out, purge cached bookmarks
        if (!token) {
            if (prevTokenRef.current) {
                setSavedItems([]);
                setError(null);
                setLoading(false);
            }
            prevTokenRef.current = null;
            return;
        }
        prevTokenRef.current = token;
        let isMounted = true;
        // Asynchronously initiate loading state to avoid synchronous effect cascading render
        Promise.resolve().then(() => {
            if (isMounted) {
                setLoading(true);
                setError(null);
            }
        });
        fetch(`${API_BASE_URL}/saved-parts`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((res) => {
            if (!res.ok) {
                throw new Error(`Failed to retrieve saved components (HTTP ${res.status})`);
            }
            return res.json();
        })
            .then((data) => {
            if (!isMounted)
                return;
            // Filter out any items with missing component documents and normalize quantity/note
            const validItems = (Array.isArray(data) ? data : [])
                .filter((item) => Boolean(item && item.component))
                .map((item) => ({
                ...item,
                quantity: typeof item.quantity === "number" ? item.quantity : 1,
                note: typeof item.note === "string" ? item.note : "",
            }));
            setSavedItems(validItems);
            setError(null);
        })
            .catch((err) => {
            if (!isMounted)
                return;
            console.error("Error loading saved parts:", err);
            setError("Unable to load saved components. Please ensure the backend server is running.");
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
    /**
     * Derived array of populated ComponentData objects for backward-compatibility
     * with components that consume `savedParts`.
     */
    const savedParts = useMemo(() => savedItems
        .map((item) => item.component)
        .filter(Boolean), [savedItems]);
    /**
     * Fast O(1) membership lookup set derived from active bookmarks.
     */
    const savedIds = useMemo(() => new Set(savedParts.map((c) => c._id)), [savedParts]);
    /**
     * Fast O(1) membership check using Set lookup.
     */
    const isSaved = (id) => {
        return savedIds.has(id);
    };
    /**
     * Toggle save status for a component.
     * If saved -> DELETE /api/saved-parts/:componentId
     * If not saved -> POST /api/saved-parts { componentId }
     */
    const toggleSave = async (component) => {
        if (!token) {
            return;
        }
        const componentId = component._id;
        const existingItem = savedItems.find((item) => item.component?._id === componentId);
        if (existingItem) {
            // Optimistically update local state for instant responsive UI feedback
            setSavedItems((prev) => prev.filter((item) => item.component?._id !== componentId));
            try {
                const response = await fetch(`${API_BASE_URL}/saved-parts/${componentId}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!response.ok) {
                    throw new Error("Failed to remove saved component on server");
                }
            }
            catch (err) {
                console.error("Error removing saved component:", err);
                // Rollback state on network error
                setSavedItems((prev) => [existingItem, ...prev]);
                setError("Unable to remove saved component. Please verify the backend server is running.");
            }
        }
        else {
            // Optimistically add to local state
            const optimisticItem = {
                _id: `temp-${Date.now()}`,
                user: "",
                component,
                quantity: 1,
                note: "",
                createdAt: new Date().toISOString(),
            };
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
                if (!response.ok) {
                    throw new Error("Failed to save component on server");
                }
                const data = await response.json();
                // Replace optimistic placeholder with verified server record
                if (data.savedPart?.component) {
                    setSavedItems((prev) => [
                        data.savedPart,
                        ...prev.filter((item) => item.component?._id !== componentId &&
                            item._id !== optimisticItem._id),
                    ]);
                }
            }
            catch (err) {
                console.error("Error saving component:", err);
                // Rollback state on network error
                setSavedItems((prev) => prev.filter((item) => item._id !== optimisticItem._id));
                setError("Unable to save component to workspace. Please verify the backend server is running.");
            }
        }
    };
    /**
     * Update quantity and/or design note for a saved part.
     * Sends PUT /api/saved-parts/:componentId with authenticated token.
     */
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
/**
 * Custom hook to consume the SavedPartsContext.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSavedParts() {
    const context = useContext(SavedPartsContext);
    if (!context) {
        throw new Error("useSavedParts must be used within a SavedPartsProvider");
    }
    return context;
}
