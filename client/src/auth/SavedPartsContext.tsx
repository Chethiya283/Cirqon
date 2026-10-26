// Context and hook for managing bookmarked electronic components per authenticated user.

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ComponentData, SavedPartItem } from "../types";
import { useAuth } from "./AuthContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export interface SavedPartsContextType {
  /** Array of populated component objects saved by the engineer */
  savedParts: ComponentData[];
  /** Set of component string IDs for instant O(1) membership lookups */
  savedIds: Set<string>;
  /** Indicates whether the saved parts are currently being loaded from the server */
  loading: boolean;
  /** Fast O(1) check whether a given component ID is saved */
  isSaved: (id: string) => boolean;
  /** Save or unsave a component, persisting changes to MongoDB */
  toggleSave: (component: ComponentData) => Promise<void>;
}

const SavedPartsContext = createContext<SavedPartsContextType | undefined>(
  undefined
);

/**
 * SavedPartsProvider Component
 * 
 * VIVA EXPLANATION:
 * 1. Reactive State Synchronization:
 *    Maintains the user's saved parts in memory across all catalog cards, table rows,
 *    modal dialogs, and workspace pages so saving in one place updates the entire UI instantly.
 * 
 * 2. O(1) Constant-Time Lookup via Set:
 *    We maintain both `savedParts` (array of full components for rendering) and
 *    `savedIds` (a Set of MongoDB ObjectIds). Checking `savedIds.has(componentId)` takes
 *    O(1) constant time, avoiding expensive O(N) array scans across hundreds of cards.
 * 
 * 3. Token-Based API Authorization:
 *    Requests to `/api/saved-parts` attach the active JWT in the `Authorization: Bearer <token>`
 *    header. The backend extracts `req.user._id` from the verified token, guaranteeing data isolation.
 * 
 * 4. Automatic Session Lifecycle Clearing:
 *    When `token` transitions to null on logout, the saved state is cleared immediately so
 *    stale bookmarks are never exposed to another engineer on the same workstation.
 */
export const SavedPartsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token } = useAuth();
  const [savedParts, setSavedParts] = useState<ComponentData[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const prevTokenRef = useRef<string | null>(token);

  useEffect(() => {
    // When the user logs out, purge cached bookmarks
    if (!token) {
      if (prevTokenRef.current) {
        setSavedParts([]);
        setSavedIds(new Set());
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
          throw new Error("Failed to retrieve saved components");
        }
        return res.json();
      })
      .then((data: SavedPartItem[]) => {
        if (!isMounted) return;
        // Extract populated component documents (filtering out any null references)
        const components = data
          .map((item) => item.component)
          .filter(Boolean) as ComponentData[];

        setSavedParts(components);
        setSavedIds(new Set(components.map((c) => c._id)));
      })
      .catch((err) => {
        console.error("Error loading saved parts:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  /**
   * Fast O(1) membership check using Set lookup.
   */
  const isSaved = (id: string): boolean => {
    return savedIds.has(id);
  };

  /**
   * Toggle save status for a component.
   * If saved -> DELETE /api/saved-parts/:componentId
   * If not saved -> POST /api/saved-parts { componentId }
   */
  const toggleSave = async (component: ComponentData): Promise<void> => {
    if (!token) {
      return;
    }

    const componentId = component._id;
    const currentlySaved = savedIds.has(componentId);

    if (currentlySaved) {
      // Optimistically update local state for instant responsive UI feedback
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(componentId);
        return next;
      });
      setSavedParts((prev) => prev.filter((c) => c._id !== componentId));

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
      } catch (err) {
        console.error("Error removing saved component:", err);
        // Rollback state on network error
        setSavedIds((prev) => new Set(prev).add(componentId));
        setSavedParts((prev) => [component, ...prev]);
        throw err;
      }
    } else {
      // Optimistically add to local state
      setSavedIds((prev) => new Set(prev).add(componentId));
      setSavedParts((prev) => [
        component,
        ...prev.filter((c) => c._id !== componentId),
      ]);

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
        // If the server returns a populated component, sync with server's representation
        if (data.savedPart?.component) {
          setSavedParts((prev) => [
            data.savedPart.component,
            ...prev.filter((c) => c._id !== componentId),
          ]);
        }
      } catch (err) {
        console.error("Error saving component:", err);
        // Rollback state on network error
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(componentId);
          return next;
        });
        setSavedParts((prev) => prev.filter((c) => c._id !== componentId));
        throw err;
      }
    }
  };

  return (
    <SavedPartsContext.Provider
      value={{
        savedParts,
        savedIds,
        loading,
        isSaved,
        toggleSave,
      }}
    >
      {children}
    </SavedPartsContext.Provider>
  );
};

/**
 * Custom hook to consume the SavedPartsContext.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSavedParts(): SavedPartsContextType {
  const context = useContext(SavedPartsContext);
  if (!context) {
    throw new Error("useSavedParts must be used within a SavedPartsProvider");
  }
  return context;
}
