import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "@/store/slices/authSlice";
import {
  ACTIVITY_TICK_MS,
  IDLE_LOGOUT_MS,
  TOKEN_REFRESH_INTERVAL_MS,
  ensureFreshToken,
} from "@/lib/sessionActivity";

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
  "focusin",
];

/**
 * Keeps session alive while the user is active (mouse/keyboard).
 * Logs out only after 5 minutes of real inactivity.
 */
export default function SessionIdleManager() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s) => s.auth?.isAuthenticated);
  const lastActivityRef = useRef(Date.now());
  const lastRefreshRef = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    lastActivityRef.current = Date.now();
    lastRefreshRef.current = Date.now();

    let throttle = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - throttle < 1000) return;
      throttle = now;
      lastActivityRef.current = now;
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, onActivity, { passive: true });
    });

    const tick = async () => {
      const now = Date.now();
      const idleFor = now - lastActivityRef.current;

      if (idleFor >= IDLE_LOGOUT_MS) {
        dispatch(logout());
        navigate("/auth/login", { replace: true });
        return;
      }

      const sinceRefresh = now - lastRefreshRef.current;
      if (sinceRefresh >= TOKEN_REFRESH_INTERVAL_MS) {
        const ok = await ensureFreshToken();
        if (ok) lastRefreshRef.current = Date.now();
      }
    };

    void ensureFreshToken().then((ok) => {
      if (ok) lastRefreshRef.current = Date.now();
    });

    const intervalId = window.setInterval(() => {
      void tick();
    }, ACTIVITY_TICK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, onActivity);
      });
      window.clearInterval(intervalId);
    };
  }, [dispatch, isAuthenticated, navigate]);

  return null;
}
