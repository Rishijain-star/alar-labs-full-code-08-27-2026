import { useEffect, useRef, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/axios";
import { cookieUtils } from "@/lib/cookies";

const HEARTBEAT_MS = 10000; // persist accumulated time to the server every 10s

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
}

/**
 * Server-backed countdown that tracks ACTIVE time only.
 *
 * - Counts down from the content's allotted duration.
 * - Only ticks while the page is actually open and focused — switching tabs or
 *   navigating away pauses it (it does NOT keep running on wall-clock time).
 * - Persists accumulated time to the backend every ~10s (and on hide/unmount),
 *   so the total survives reloads and can't be lost. On load it resumes from the
 *   server total.
 */
export default function LabTimer({ entityId, isCourse = false, durationMinutes, className }) {
  const totalSeconds = Math.max(0, Math.round((Number(durationMinutes) || 0) * 60));
  const basePath = isCourse ? `/courses/${entityId}` : `/labs/${entityId}`;

  const baselineRef = useRef(0); // server-confirmed seconds
  const unsyncedRef = useRef(0); // active seconds accrued since the last save
  const [spent, setSpent] = useState(0); // baseline + unsynced, for display
  const [loaded, setLoaded] = useState(false);

  // Keep a stable flush fn in a ref so listeners always see the latest closure.
  const flushRef = useRef(() => {});
  flushRef.current = async (useKeepalive = false) => {
    const delta = unsyncedRef.current;
    if (!entityId || delta <= 0) return;
    unsyncedRef.current = 0;
    try {
      if (useKeepalive) {
        // Fired during page unload — use fetch+keepalive so it still completes.
        let token = null;
        try { token = cookieUtils.getToken(); } catch { token = null; }
        const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
        await fetch(`${apiBase}/me${basePath}/time`, {
          method: "PATCH",
          keepalive: true,
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ seconds: delta }),
        });
        baselineRef.current += delta;
      } else {
        const res = await api.patch(`/me${basePath}/time`, { seconds: delta }, { withCredentials: true });
        const serverTotal = Number(res?.data?.data?.timeSpentSeconds);
        baselineRef.current = Number.isFinite(serverTotal)
          ? serverTotal
          : baselineRef.current + delta;
      }
    } catch {
      // Save failed (offline / not enrolled) — keep the time to retry next beat.
      unsyncedRef.current += delta;
    }
  };

  // Load the saved total once.
  useEffect(() => {
    if (!entityId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/me${basePath}/time`, { withCredentials: true });
        const s = Number(res?.data?.data?.timeSpentSeconds) || 0;
        if (!cancelled) {
          baselineRef.current = s;
          setSpent(s);
        }
      } catch {
        /* guest / not enrolled — track locally only */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [basePath, entityId]);

  // Tick (active-only) + heartbeat + flush on hide/unmount.
  useEffect(() => {
    if (!entityId || !loaded || totalSeconds <= 0) return undefined;

    const isActive = () =>
      document.visibilityState === "visible" &&
      (typeof document.hasFocus !== "function" || document.hasFocus());

    const tick = setInterval(() => {
      if (!isActive()) return;
      if (baselineRef.current + unsyncedRef.current >= totalSeconds) return; // time's up
      unsyncedRef.current += 1;
      setSpent(baselineRef.current + unsyncedRef.current);
    }, 1000);

    const beat = setInterval(() => { flushRef.current(false); }, HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushRef.current(true);
    };
    const onPageHide = () => flushRef.current(true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      clearInterval(tick);
      clearInterval(beat);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flushRef.current(true); // persist remaining time when leaving the page
    };
  }, [entityId, loaded, totalSeconds]);

  if (totalSeconds <= 0) return null;

  const remaining = Math.max(0, totalSeconds - spent);
  const expired = remaining <= 0;
  const lowTime = !expired && remaining <= 60;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold shrink-0 tabular-nums",
        expired
          ? "border-red-200 bg-red-50 text-red-700"
          : lowTime
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-slate-50 text-slate-700",
        className
      )}
      title={expired ? "Time is up" : "Time remaining (counts only while this page is open)"}
    >
      {expired ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
      <span>{expired ? "Time's up" : formatClock(remaining)}</span>
    </div>
  );
}
