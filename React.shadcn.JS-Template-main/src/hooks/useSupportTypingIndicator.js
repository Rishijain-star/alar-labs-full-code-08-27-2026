import { useCallback, useEffect, useRef, useState } from "react";

const TYPING_HIDE_MS = 3500;

/**
 * Debounced typing signals + remote typing state for support chat.
 */
export function useSupportTypingIndicator({ sendTyping, sendTypingStop, onTypingEvent }) {
  const [remoteTyping, setRemoteTyping] = useState(null);
  const hideTimerRef = useRef(null);
  const lastSentRef = useRef(0);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const handleRemoteTyping = useCallback(
    (payload) => {
      if (!payload || (payload.type !== "typing" && payload.type !== "typing_stop")) return;
      onTypingEvent?.(payload);
      if (payload.type === "typing_stop") {
        setRemoteTyping(null);
        clearHideTimer();
        return;
      }
      setRemoteTyping({
        userId: payload.userId,
        displayName: payload.displayName || (payload.senderRole === "admin" ? "Support" : "User"),
        senderRole: payload.senderRole,
      });
      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        setRemoteTyping(null);
        hideTimerRef.current = null;
      }, TYPING_HIDE_MS);
    },
    [clearHideTimer, onTypingEvent]
  );

  const notifyLocalTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < 1200) return;
    lastSentRef.current = now;
    sendTyping?.();
  }, [sendTyping]);

  const stopLocalTyping = useCallback(() => {
    sendTypingStop?.();
    lastSentRef.current = 0;
  }, [sendTypingStop]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return { remoteTyping, handleRemoteTyping, notifyLocalTyping, stopLocalTyping };
}
