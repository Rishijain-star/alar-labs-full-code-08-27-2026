import { useState, useEffect, useRef } from "react";
import api from "@/lib/axios";
import { toast } from "@/hooks/use-toast";

export function useAutoSave(prefix, editKey, currentState, onRestore) {
  const [saveStatus, setSaveStatus] = useState("idle");
  const [isRestoring, setIsRestoring] = useState(false);
  
  const isFirstRender = useRef(true);
  const initialFetchDone = useRef(false);
  
  const type = prefix;
  const id = editKey || "new";
  const enabled = !!prefix;

  // 1. Initial Fetch
  useEffect(() => {
    if (!enabled || initialFetchDone.current) return;
    
    let isMounted = true;
    initialFetchDone.current = true;
    
    if (type && id && id !== "new") {
      api.get(`/autosave/${type}/${id}`)
        .then(res => {
          if (!isMounted) return;
          const draftData = res.data?.data?.draft?.data;
          if (draftData) {
            setIsRestoring(true);
            if (typeof onRestore === "function") {
              onRestore(draftData);
            }
            toast({
              title: "Draft Restored",
              description: "Recovered your unsaved work from the server.",
              variant: "default",
            });
            setTimeout(() => { if (isMounted) setIsRestoring(false); }, 50);
          }
        })
        .catch(() => {});
    }
    
    return () => { isMounted = false; };
  }, [enabled, type, id, onRestore]);

  // 2. Debounce Save
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (!enabled || isRestoring) return;

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      api.post(`/autosave/${type}/${id}`, { draftData: currentState })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentState, enabled, type, id, isRestoring]);

  const clearDraft = async () => {
    try {
      if (type && id && id !== "new") {
        await api.delete(`/autosave/${type}/${id}`);
      }
      setSaveStatus("idle");
    } catch {}
  };

  return { saveStatus, isRestoring, clearDraft };
}
