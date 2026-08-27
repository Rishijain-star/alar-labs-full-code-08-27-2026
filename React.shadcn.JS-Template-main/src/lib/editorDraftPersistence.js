import { useEffect, useRef } from "react";
import api from "@/lib/axios";
import { toast } from "@/lib/toast";

/** Prevents duplicate restore within the same page load (e.g. React Strict Mode). */
const restoredKeysThisPageLoad = new Set();

export function getEditorDraftKey(prefix, editKey = "new") {
  return `${prefix}:${editKey || "new"}`;
}

export function clearEditorDraft(storageKey) {
  try {
    const [type, ...rest] = storageKey.split(":");
    const id = rest.join(":");
    if (type && id) {
      api.delete(`/autosave/${type}/${id}`).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

/** Strip non-serializable file fields before persisting. */
export function stripEditorFileFields(entity = {}) {
  if (!entity || typeof entity !== "object") return entity;
  const { _thumbnailFile, _introVideoFile, ...rest } = entity;
  return rest;
}

/**
 * Restore draft on mount + debounced auto-save to server.
 */
export function useEditorDraftPersistence({
  storageKey,
  enabled,
  onRestore,
  getSnapshot,
  deps = [],
}) {
  const restoredRef = useRef(false);
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!enabled || restoredRef.current || restoredKeysThisPageLoad.has(storageKey) || initialFetchDone.current) return;
    
    let isMounted = true;
    initialFetchDone.current = true;
    
    const [type, ...rest] = storageKey.split(":");
    const id = rest.join(":");
    
    if (type && id) {
      api.get(`/autosave/${type}/${id}`)
        .then(res => {
          if (!isMounted) return;
          if (res.data?.data?.draft) {
            onRestore(res.data.data.draft.data);
            toast({
              title: "Draft Restored",
              description: "Recovered your unsaved work from the server.",
              variant: "default",
            });
            restoredRef.current = true;
            restoredKeysThisPageLoad.add(storageKey);
          }
        })
        .catch(err => {
          console.error("Failed to load draft from server", err);
        });
    }

    return () => { isMounted = false; };
  }, [storageKey, enabled, onRestore]);

  useEffect(() => {
    if (!enabled) return;
    
    const [type, ...rest] = storageKey.split(":");
    const id = rest.join(":");
    
    const timer = setTimeout(() => {
      const snap = getSnapshot();
      if (type && id && snap) {
        api.post(`/autosave/${type}/${id}`, { draftData: snap }).catch(() => {});
      }
    }, 1500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled, ...deps]);
}
