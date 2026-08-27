import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to manage backend persistence while falling back to localStorage.
 * 
 * @param {object} options
 * @param {string} options.userId - The authenticated user ID (or guest)
 * @param {string} options.entityType - e.g. "exam_progress"
 * @param {string} options.entityId - e.g. "exam_123"
 * @param {object} options.currentState - The current state object to save
 * @param {boolean} options.enabled - Whether autosave is enabled
 * @param {number} options.debounceMs - Debounce time for saving
 */
export function useAssessmentAutoSave({
  userId,
  entityType,
  entityId,
  currentState,
  enabled = true,
  debounceMs = 1500,
}) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initialData, setInitialData] = useState(null);
  const { toast } = useToast();
  
  const fetchedForUserId = useRef(null);
  const isFirstMount = useRef(true);

  // Derive the local key based on the same parameters
  const localKey = `${entityType}_${userId || "guest"}_${entityId}`;

  useEffect(() => {
    if (!enabled || fetchedForUserId.current === userId) return;
    
    let isMounted = true;
    fetchedForUserId.current = userId;
    setIsInitializing(true);

    const loadLocal = () => {
      try {
        const local = localStorage.getItem(localKey);
        if (local) return JSON.parse(local);
      } catch {}
      return null;
    };

    if (!userId || userId === "guest") {
      // Guest users just rely on localStorage
      if (isMounted) {
        setInitialData(loadLocal());
        setIsInitializing(false);
      }
      return;
    }

    // Authenticated users fetch from backend
    api.get(`/autosave/${entityType}/${entityId}`)
      .then(res => {
        if (!isMounted) return;
        const backendData = res.data?.data?.draft?.data;
        if (backendData) {
          // Compare with local if necessary? The backend is source of truth.
          // In case local is somehow newer (e.g. offline save), we could compare timestamps.
          // But user requirement: "backend progress must remain the source of truth. Do not allow an old localStorage state to blindly overwrite newer backend progress."
          setInitialData(backendData);
        } else {
          // If no backend draft, fallback to local storage (could be migrating from unauthenticated session, or just lost sync)
          setInitialData(loadLocal());
        }
      })
      .catch(err => {
        console.error("Failed to load draft from server", err);
        // Fallback to local storage if backend fails (e.g. offline)
        if (isMounted) setInitialData(loadLocal());
      })
      .finally(() => {
        if (isMounted) setIsInitializing(false);
      });

    return () => { isMounted = false; };
  }, [userId, entityType, entityId, enabled, localKey]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    
    if (!enabled || isInitializing) return;

    // 1. Instantly save to local storage (offline buffer)
    try {
      localStorage.setItem(localKey, JSON.stringify(currentState));
    } catch {}

    // 2. Debounce and save to backend
    if (!userId || userId === "guest") return;

    const timer = setTimeout(() => {
      api.post(`/autosave/${entityType}/${entityId}`, { draftData: currentState })
        .catch(() => {
          // Fail silently, local storage already caught it
        });
    }, debounceMs);
    
    return () => clearTimeout(timer);
  }, [currentState, userId, entityType, entityId, enabled, isInitializing, debounceMs, localKey]);

  return { isInitializing, initialData, localKey };
}

export function clearAssessmentAutoSave(userId, entityType, entityId) {
  const localKey = `${entityType}_${userId || "guest"}_${entityId}`;
  try {
    localStorage.removeItem(localKey);
  } catch {}
  
  if (userId && userId !== "guest") {
    api.delete(`/autosave/${entityType}/${entityId}`).catch(() => {});
  }
}
