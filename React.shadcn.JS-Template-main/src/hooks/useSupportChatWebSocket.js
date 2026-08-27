import { useEffect, useRef, useState } from "react";
import { cookieUtils } from "@/lib/cookies";
import { buildSupportWebSocketUrl } from "@/lib/supportChatWs";

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 800;
const APP_PING_MS = 25_000;

/**
 * Manages a single support-chat WebSocket: connect → auth → messages + typing.
 */
export function useSupportChatWebSocket(ticketId, { onMessage, onReady, onTyping, enabled = true } = {}) {
  const onMessageRef = useRef(onMessage);
  const onReadyRef = useRef(onReady);
  const onTypingRef = useRef(onTyping);
  onMessageRef.current = onMessage;
  onReadyRef.current = onReady;
  onTypingRef.current = onTyping;

  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !ticketId) {
      setConnected(false);
      return undefined;
    }

    let ws = null;
    let attempt = 0;
    let reconnectTimer = null;
    let stopped = false;
    let sawOpen = false;

    const clearReconnect = () => {
      if (reconnectTimer != null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      clearReconnect();
      const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.min(attempt, 8));
      attempt += 1;
      reconnectTimer = window.setTimeout(() => connect(), delay);
    };

    const connect = () => {
      if (stopped) return;
      const url = buildSupportWebSocketUrl(ticketId);
      const token = cookieUtils.getToken();
      if (!url || !token) {
        scheduleReconnect();
        return;
      }

      try {
        ws = new WebSocket(url);
        wsRef.current = ws;
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        sawOpen = true;
        attempt = 0;
        try {
          ws.send(JSON.stringify({ type: "auth", token }));
        } catch {
          try {
            ws.close();
          } catch {
            /* ignore */
          }
        }
      };

      ws.onmessage = (ev) => {
        let payload;
        try {
          payload = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (payload.type === "ready") {
          setConnected(true);
          onReadyRef.current?.();
          return;
        }
        if (payload.type === "message" && payload.message) {
          onMessageRef.current?.(payload.message);
          return;
        }
        if (payload.type === "typing" || payload.type === "typing_stop") {
          onTypingRef.current?.(payload);
          return;
        }
        if (payload.type === "pong") return;
        if (payload.type === "error") return;
      };

      ws.onerror = () => {
        /* onclose runs next */
      };

      ws.onclose = (ev) => {
        ws = null;
        wsRef.current = null;
        setConnected(false);
        if (stopped) return;
        const authOrForbidden = ev.code === 4403 || ev.code === 4401;
        if (authOrForbidden) return;
        const intentional = ev.code === 1000 && sawOpen;
        if (intentional) return;
        scheduleReconnect();
      };
    };

    connect();

    const pingTimer = window.setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: "ping" }));
        } catch {
          /* ignore */
        }
      }
    }, APP_PING_MS);

    return () => {
      stopped = true;
      setConnected(false);
      clearReconnect();
      clearInterval(pingTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close(1000);
          }
        } catch {
          /* ignore */
        }
        ws = null;
        wsRef.current = null;
      }
    };
  }, [ticketId, enabled]);

  const sendWs = (obj) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(JSON.stringify(obj));
    } catch {
      /* ignore */
    }
  };

  return {
    connected,
    sendTyping: () => sendWs({ type: "typing" }),
    sendTypingStop: () => sendWs({ type: "typing_stop" }),
  };
}
